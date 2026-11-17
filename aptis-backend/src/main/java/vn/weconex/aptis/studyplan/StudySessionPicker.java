package vn.weconex.aptis.studyplan;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.studyplan.StudyPlanner.Phase;
import vn.weconex.aptis.studyplan.StudyPlanner.Skill;
import vn.weconex.aptis.studyplan.StudyPlanner.Task;
import vn.weconex.aptis.studyplan.StudyPlanner.TaskType;

/**
 * Chọn đề cho một phiên luyện của lộ trình, để học viên không phải tự chọn giữa cả kho.
 *
 * <p>Độ ưu tiên: chủ đề đang được dự đoán (HOT, bản dự đoán mới nhất) → chủ đề nhiều sao
 * của Đề trọng điểm tháng → đề học viên đang làm sai → đề chưa làm → còn lại. Phần dành
 * cho đề dự đoán tăng dần theo chặng: Nền tảng 20%, Tăng tốc 50%, Nước rút toàn bộ.
 * Đề vừa làm đạt trong ba ngày gần đây bị gác lại, chỉ dùng khi không đủ đề.
 */
@Component
@RequiredArgsConstructor
public class StudySessionPicker {

    /** Đề có điểm lần gần nhất dưới ngưỡng này coi là đang sai, cần ôn. */
    static final double WEAK_RATIO = 0.6;
    private static final int RECENT_DAYS = 3;
    private static final String LIVE = "qs.status = 'PUBLISHED' AND qs.listed = 1 AND qs.owner_teacher_id IS NULL";

    private final JdbcTemplate jdbc;

    /** Lần làm gần nhất của một đề. */
    record Last(Double ratio, Instant at) {
        boolean weak() {
            return ratio != null && ratio < WEAK_RATIO;
        }
    }

    /** Id các đề của phiên, theo thứ tự làm. Rỗng khi kho không có đề phù hợp. */
    public List<String> pick(String userId, Task task, Phase phase, LocalDate today) {
        return switch (task.type()) {
            case REVIEW -> review(userId, task.count());
            case PREDICTION_PRACTICE -> predictionPractice(userId, task.skill(), task.count(), today);
            case GRAMMAR, VOCAB, PART_PRACTICE, MONTHLY_FOCUS -> partSession(userId, task, phase, today);
            default -> List.of();
        };
    }

    /** Số đề (Grammar/Vocab, Listening, Reading) học viên đang làm sai. */
    public int weakCount(String userId) {
        return weakObjective(userId).values().stream().mapToInt(List::size).sum();
    }

    // ------------------------------------------------------------------ phiên theo Part

    private List<String> partSession(String userId, Task task, Phase phase, LocalDate today) {
        String partId = partId(task.skill(), task.part());
        if (partId == null) {
            return List.of();
        }
        List<String> all = jdbc.queryForList(
                "SELECT qs.id FROM question_sets qs WHERE " + LIVE + " AND qs.part_id = ? ORDER BY qs.code", String.class, partId);
        Map<String, Last> history = history(userId, "qs.part_id = ?", partId);
        boolean practice = task.type() == TaskType.PART_PRACTICE || task.type() == TaskType.MONTHLY_FOCUS;
        List<String> predicted = practice ? predicted(today, "HOT", "qs.part_id = ?", partId) : List.of();
        List<String> focus = practice ? jdbc.queryForList("""
                SELECT i.question_set_id FROM monthly_focus_items i
                JOIN question_sets qs ON qs.id = i.question_set_id
                LEFT JOIN monthly_focus_topics t ON t.page_key = i.page_key AND t.topic_key = i.topic_key
                WHERE qs.part_id = ? AND qs.status = 'PUBLISHED' AND qs.listed = 1
                ORDER BY COALESCE(t.stars, 0) DESC, COALESCE(t.topic_rank, 9999), i.display_order
                """, String.class, partId) : List.of();
        return compose(task.count(), phase, task.type() == TaskType.MONTHLY_FOCUS, predicted, focus, all, history, Instant.now());
    }

    /**
     * Ghép danh sách đề theo độ ưu tiên.
     *
     * @param focusFirst việc "Đề trọng điểm": đề trọng điểm đứng trước đề sai/đề mới
     * @param all        mọi đề của Part theo mã đề
     */
    static List<String> compose(int count, Phase phase, boolean focusFirst, List<String> predicted, List<String> focus,
                                List<String> all, Map<String, Last> history, Instant now) {
        Instant recentCut = now.minus(Duration.ofDays(RECENT_DAYS));
        Set<String> recentGood = new HashSet<>();
        List<String> weak = new ArrayList<>();
        List<String> fresh = new ArrayList<>();
        for (String id : all) {
            Last last = history.get(id);
            if (last == null) {
                fresh.add(id);
            } else if (last.weak()) {
                weak.add(id);
            } else if (last.at() != null && last.at().isAfter(recentCut)) {
                recentGood.add(id);
            }
        }
        // Đề sai lâu nhất ôn trước.
        weak.sort(Comparator.comparing((String id) -> history.get(id).at(), Comparator.nullsFirst(Comparator.naturalOrder())));

        Set<String> allowed = new HashSet<>(all);
        LinkedHashSet<String> out = new LinkedHashSet<>();
        double share = phase == Phase.SPRINT ? 1.0 : phase == Phase.ACCELERATE ? 0.5 : 0.2;
        int quota = (int) Math.round(count * share);
        for (String id : predicted) {
            if (out.size() >= quota) {
                break;
            }
            if (allowed.contains(id) && !recentGood.contains(id)) {
                out.add(id);
            }
        }
        List<List<String>> order = focusFirst || phase != Phase.FOUNDATION
                ? List.of(focus, weak, fresh, predicted, all)
                : List.of(weak, fresh, focus, predicted, all);
        for (List<String> source : order) {
            for (String id : source) {
                if (out.size() >= count) {
                    break;
                }
                if (allowed.contains(id) && !recentGood.contains(id)) {
                    out.add(id);
                }
            }
        }
        // Vẫn thiếu: dùng cả đề vừa làm đạt.
        for (String id : all) {
            if (out.size() >= count) {
                break;
            }
            out.add(id);
        }
        return new ArrayList<>(out);
    }

    // ------------------------------------------------------------------ ôn câu sai

    /** Đề đang sai của một kỹ năng (kỹ năng nhiều đề sai nhất), sai lâu nhất trước. */
    private List<String> review(String userId, int count) {
        Map<String, List<String>> byComponent = weakObjective(userId);
        return byComponent.values().stream().max(Comparator.comparingInt(List::size))
                .map(list -> list.subList(0, Math.min(count, list.size())))
                .orElse(List.of());
    }

    /** componentCode -> đề đang sai (sai lâu nhất trước), chỉ kỹ năng chấm tự động. */
    private Map<String, List<String>> weakObjective(String userId) {
        Map<String, String> componentOf = new HashMap<>();
        Map<String, Last> history = new LinkedHashMap<>();
        jdbc.query("""
                SELECT aqs.question_set_id, aqs.awarded_score, aqs.max_score, aqs.answered_at, c.code
                FROM attempt_question_sets aqs
                JOIN test_attempts ta ON ta.id = aqs.attempt_id
                JOIN question_sets qs ON qs.id = aqs.question_set_id
                JOIN parts p ON p.id = qs.part_id
                JOIN components c ON c.id = p.component_id
                WHERE ta.user_id = ? AND aqs.answered_at IS NOT NULL AND aqs.status = 'SCORED'
                  AND c.code IN ('GRAMMAR_VOCABULARY', 'LISTENING', 'READING') AND %s
                ORDER BY aqs.answered_at
                """.formatted(LIVE), rs -> {
            String id = rs.getString("question_set_id");
            double max = rs.getDouble("max_score");
            Double ratio = rs.getObject("awarded_score") == null || max <= 0 ? null : rs.getDouble("awarded_score") / max;
            history.put(id, new Last(ratio, rs.getTimestamp("answered_at").toInstant()));
            componentOf.put(id, rs.getString("code"));
        }, userId);
        Map<String, List<String>> out = new HashMap<>();
        history.entrySet().stream()
                .filter(e -> e.getValue().weak())
                .sorted(Map.Entry.comparingByValue(Comparator.comparing(Last::at)))
                .forEach(e -> out.computeIfAbsent(componentOf.get(e.getKey()), k -> new ArrayList<>()).add(e.getKey()));
        return out;
    }

    // ------------------------------------------------------------------ đề dự đoán

    /** Đề của các chủ đề đang được dự đoán trong một kỹ năng; thiếu thì bù đề trọng điểm tháng. */
    private List<String> predictionPractice(String userId, Skill skill, int count, LocalDate today) {
        if (skill == null) {
            return List.of();
        }
        String scope = "p.component_id = (SELECT id FROM components WHERE code = ?)";
        Map<String, Last> history = history(userId, scope, skill.name());
        Instant recentCut = Instant.now().minus(Duration.ofDays(RECENT_DAYS));
        LinkedHashSet<String> candidates = new LinkedHashSet<>(predicted(today, "HOT", scope, skill.name()));
        candidates.addAll(predicted(today, "BACKUP", scope, skill.name()));
        candidates.addAll(jdbc.queryForList("""
                SELECT i.question_set_id FROM monthly_focus_items i
                JOIN question_sets qs ON qs.id = i.question_set_id
                JOIN parts p ON p.id = qs.part_id
                LEFT JOIN monthly_focus_topics t ON t.page_key = i.page_key AND t.topic_key = i.topic_key
                WHERE %s AND qs.status = 'PUBLISHED' AND qs.listed = 1
                ORDER BY COALESCE(t.stars, 0) DESC, i.display_order
                """.formatted(scope), String.class, skill.name()));
        List<String> out = new ArrayList<>();
        // Lượt 1: đề chưa làm hoặc đang sai; lượt 2: đề đã làm lâu; lượt 3: còn lại.
        for (int pass = 0; pass < 3 && out.size() < count; pass++) {
            for (String id : candidates) {
                if (out.size() >= count) {
                    break;
                }
                if (out.contains(id)) {
                    continue;
                }
                Last last = history.get(id);
                boolean recent = last != null && !last.weak() && last.at() != null && last.at().isAfter(recentCut);
                boolean ok = pass == 0 ? last == null || last.weak() : pass == 1 ? !recent : true;
                if (ok) {
                    out.add(id);
                }
            }
        }
        return out;
    }

    /** Đề thuộc chủ đề của bản dự đoán mới nhất tính tới {@code today}, theo thứ tự trong bản dự đoán. */
    private List<String> predicted(LocalDate today, String priority, String scope, String scopeArg) {
        return new ArrayList<>(new LinkedHashSet<>(jdbc.queryForList("""
                SELECT qs.id FROM exam_predictions ep
                JOIN question_sets qs ON qs.topic_id = ep.topic_id
                JOIN parts p ON p.id = qs.part_id
                WHERE ep.status = 'PUBLISHED' AND ep.priority = ?
                  AND ep.predict_date = (SELECT MAX(predict_date) FROM exam_predictions
                                         WHERE status = 'PUBLISHED' AND predict_date <= ?)
                  AND (ep.part_id = qs.part_id OR (ep.part_id IS NULL AND ep.component_id = p.component_id))
                  AND %s AND %s
                ORDER BY ep.display_order, qs.code
                """.formatted(LIVE, scope), String.class, priority, Date.valueOf(today), scopeArg)));
    }

    // ------------------------------------------------------------------ tiện ích

    /** Lần làm gần nhất của từng đề trong phạm vi {@code scope}. */
    private Map<String, Last> history(String userId, String scope, String scopeArg) {
        Map<String, Last> out = new HashMap<>();
        jdbc.query("""
                SELECT aqs.question_set_id, aqs.awarded_score, aqs.max_score, aqs.answered_at
                FROM attempt_question_sets aqs
                JOIN test_attempts ta ON ta.id = aqs.attempt_id
                JOIN question_sets qs ON qs.id = aqs.question_set_id
                JOIN parts p ON p.id = qs.part_id
                WHERE ta.user_id = ? AND aqs.answered_at IS NOT NULL AND aqs.status IN ('ANSWERED', 'SCORED') AND %s
                ORDER BY aqs.answered_at
                """.formatted(scope), rs -> {
            double max = rs.getDouble("max_score");
            Double ratio = rs.getObject("awarded_score") == null || max <= 0 ? null : rs.getDouble("awarded_score") / max;
            Timestamp at = rs.getTimestamp("answered_at");
            out.put(rs.getString("question_set_id"), new Last(ratio, at == null ? null : at.toInstant()));
        }, userId, scopeArg);
        return out;
    }

    private String partId(Skill skill, Integer part) {
        if (skill == null || part == null) {
            return null;
        }
        List<String> ids = jdbc.queryForList("""
                SELECT p.id FROM parts p JOIN components c ON c.id = p.component_id
                WHERE c.code = ? AND p.display_order = ?
                """, String.class, skill.name(), part);
        return ids.isEmpty() ? null : ids.get(0);
    }
}
