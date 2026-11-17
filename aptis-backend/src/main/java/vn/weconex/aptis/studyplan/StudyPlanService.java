package vn.weconex.aptis.studyplan;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.ContentAccessService;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.practice.service.AttemptService;
import vn.weconex.aptis.studyplan.StudyPlanner.Skill;
import vn.weconex.aptis.studyplan.StudyPlanner.TaskType;

/**
 * Lộ trình học cá nhân: bài test năng lực, đặt mục tiêu, tình hình từng ngày và phiên
 * luyện do hệ thống chọn đề.
 *
 * <p>Điểm khởi đầu lấy theo thứ tự: bài test năng lực → điểm các bài đã làm trong 60
 * ngày (người dùng cũ) → trình độ tự khai. Điểm hiện tại cập nhật theo các bài thi thử
 * (test kỹ năng / đủ 5 kỹ năng) làm sau khi đặt lộ trình.
 *
 * <p>Tài khoản miễn phí làm được bài test năng lực một lần và xem {@link #FREE_DAYS}
 * ngày đầu lộ trình; phiên luyện vẫn theo quyền nội dung như luyện thường.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudyPlanService {

    public static final String PLACEMENT_BLUEPRINT_ID = "19000000-0000-4000-8000-0000000000a1";
    public static final String PLACEMENT_SHORT_BLUEPRINT_ID = "19000000-0000-4000-8000-0000000000a2";
    public static final int FREE_DAYS = 7;
    private static final int DEFAULT_WEEKS = 8;
    private static final int HISTORY_DAYS = 60;
    /** Bài Speaking/Writing chấm xong trong chừng này ngày thì nhắc xem nhận xét. */
    private static final int FEEDBACK_DAYS = 3;
    private static final int MAX_REST_DAYS = 3;
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> TARGETS = Set.of("B1", "B2", "C1");
    private static final Set<String> RESULT_LEVELS = Set.of("A1", "A2", "B1", "B2", "C1", "C2", "NA");
    /** Điểm (thang 50) gán cho trình độ tự khai: giữa khoảng của bậc đó. */
    private static final Map<String, Double> SELF_SCORE = Map.of("A1", 8.0, "A2", 20.0, "B1", 31.0, "B2", 41.0, "C1", 47.0);
    private static final TypeReference<Map<String, Map<String, Object>>> BASELINE = new TypeReference<>() { };
    private static final TypeReference<List<StudyPlanner.Task>> TASKS = new TypeReference<>() { };
    private static final TypeReference<List<Integer>> INTS = new TypeReference<>() { };
    /** Part cần ít nhất chừng này đề đã chấm mới tính tỉ lệ đúng. */
    private static final int MIN_SETS_FOR_ACCURACY = 3;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final EntitlementService entitlements;
    private final AttemptService attemptService;
    private final StudySessionPicker picker;
    private final QuestionSetRepository questionSetRepository;
    private final ContentAccessService contentAccessService;

    @Autowired(required = false)
    private Clock clock;

    LocalDate today() {
        return LocalDate.now(clock == null ? Clock.system(VN) : clock.withZone(VN));
    }

    /** Kết quả tính lộ trình: bản trả về giao diện và bản tóm tắt để mở phiên luyện. */
    private record Computed(StudyPlanDtos.PlanResponse response, StudyPlanner.Summary summary) {
    }

    // ------------------------------------------------------------------ đọc

    @Transactional
    public StudyPlanDtos.StudyPlanResponse view(String userId) {
        boolean premium = entitlements.hasPremiumAccess(userId);
        StudyPlanDtos.PlacementResponse placement = placement(userId);
        Map<String, StudyPlanDtos.SkillEstimate> estimate = estimate(userId, placement);
        StudyPlanDtos.PlanResponse plan = loadPlan(userId)
                .map(row -> compute(userId, row, premium).response())
                .orElse(null);
        return new StudyPlanDtos.StudyPlanResponse(placement, estimate, plan, premium, FREE_DAYS);
    }

    private StudyPlanDtos.PlacementResponse placement(String userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT pa.attempt_id, pa.kind, ta.status FROM placement_attempts pa
                LEFT JOIN test_attempts ta ON ta.id = pa.attempt_id WHERE pa.user_id = ?
                """, userId);
        if (rows.isEmpty()) {
            return new StudyPlanDtos.PlacementResponse("NONE", null, Map.of(), null);
        }
        String attemptId = (String) rows.get(0).get("attempt_id");
        String status = String.valueOf(rows.get(0).get("status"));
        Map<String, Double> scores = componentScores(attemptId);
        String state = switch (status) {
            case "COMPLETED" -> scores.size() >= 5 ? "DONE" : "SCORING";
            case "SCORING" -> "SCORING";
            default -> "IN_PROGRESS";
        };
        return new StudyPlanDtos.PlacementResponse(state, attemptId, scores, (String) rows.get(0).get("kind"));
    }

    /** Điểm thang 50 từng kỹ năng của một lượt làm. */
    private Map<String, Double> componentScores(String attemptId) {
        Map<String, Double> out = new LinkedHashMap<>();
        jdbc.query("""
                SELECT c.code, s.percentage_score FROM attempt_component_scores s
                JOIN components c ON c.id = s.component_id WHERE s.attempt_id = ? ORDER BY c.display_order
                """, rs -> {
            double pct = rs.getDouble("percentage_score");
            if (!rs.wasNull()) {
                out.put(rs.getString("code"), round1(pct / 2));
            }
        }, attemptId);
        return out;
    }

    /** Ước lượng trình độ: bài test năng lực nếu xong, không thì điểm các bài đã làm trong 60 ngày. */
    private Map<String, StudyPlanDtos.SkillEstimate> estimate(String userId, StudyPlanDtos.PlacementResponse placement) {
        Map<String, StudyPlanDtos.SkillEstimate> out = new LinkedHashMap<>();
        if ("DONE".equals(placement.status())) {
            placement.scores().forEach((code, score) -> out.put(code, new StudyPlanDtos.SkillEstimate(score, "PLACEMENT", 1)));
            return out;
        }
        Timestamp since = Timestamp.from(Instant.now().minus(Duration.ofDays(HISTORY_DAYS)));
        jdbc.query("""
                SELECT c.code, AVG(s.percentage_score) pct, COUNT(*) n
                FROM attempt_component_scores s
                JOIN test_attempts ta ON ta.id = s.attempt_id
                JOIN components c ON c.id = s.component_id
                WHERE ta.user_id = ? AND ta.status = 'COMPLETED' AND ta.completed_at >= ? AND s.percentage_score IS NOT NULL
                GROUP BY c.code
                """, rs -> {
            int n = rs.getInt("n");
            // Một bài lẻ chưa đủ tin cậy để xếp lộ trình.
            if (n >= 2) {
                out.put(rs.getString("code"), new StudyPlanDtos.SkillEstimate(round1(rs.getDouble("pct") / 2), "HISTORY", n));
            }
        }, userId, since);
        return out;
    }

    private Optional<Map<String, Object>> loadPlan(String userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM study_plans WHERE user_id = ?", userId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    private Computed compute(String userId, Map<String, Object> row, boolean premium) {
        String target = (String) row.get("target_level");
        int targetScore = StudyPlanner.LEVEL_FLOOR.getOrDefault(target, 38);
        LocalDate exam = toLocalDate(row.get("exam_date"));
        LocalDate start = toLocalDate(row.get("start_date"));
        int minutes = ((Number) row.get("minutes_per_day")).intValue();
        Map<String, Map<String, Object>> baseline = readBaseline(row.get("baseline"));
        LocalDateTime createdAt = toLocalDateTime(row.get("created_at"));
        List<Integer> restDays = readInts(row.get("rest_days"));
        boolean reminders = isTrue(row.get("reminders_enabled"));

        Map<String, Double> recent = recentMockScores(userId, createdAt);
        Map<Skill, Double> current = new EnumMap<>(Skill.class);
        List<StudyPlanDtos.SkillResponse> skills = new ArrayList<>();
        double scoreChange = 0;
        boolean changed = false;
        for (Skill s : Skill.values()) {
            Map<String, Object> b = baseline.getOrDefault(s.name(), Map.of());
            Double base = b.get("score") instanceof Number n ? n.doubleValue() : null;
            Double now = recent.getOrDefault(s.name(), base);
            current.put(s, now);
            if (base != null && recent.containsKey(s.name())) {
                scoreChange += recent.get(s.name()) - base;
                changed = true;
            }
            double gap = now == null ? StudyPlanner.UNKNOWN_GAP : Math.max(0, targetScore - now);
            skills.add(new StudyPlanDtos.SkillResponse(s.name(), base, (String) b.get("source"), now, targetScore, round1(gap)));
        }

        LocalDate today = today();
        StudyPlanner.Input input = new StudyPlanner.Input(start, exam, minutes, targetScore, current,
                partAccuracy(userId), frozenDays(userId, start, today), new HashSet<>(restDays), picker.weakCount(userId));
        StudyPlanner.Summary sum = StudyPlanner.summarize(input, today, loadActivity(userId, start),
                premium ? null : FREE_DAYS, lastTestBefore(userId, today));
        freezeToday(userId, sum.todayPlan(), input.frozen());

        List<StudyPlanDtos.TaskResponse> tasks = new ArrayList<>(sum.today().stream()
                .map(t -> new StudyPlanDtos.TaskResponse(t.task().key(), t.task().type().name(),
                        t.task().skill() == null ? null : t.task().skill().name(), t.task().part(),
                        t.task().count(), t.task().minutes(), t.done(), t.carried(),
                        StudyPlanner.SESSION_TYPES.contains(t.task().type()), null))
                .toList());
        boolean dayOff = sum.today().stream().anyMatch(t -> t.task().type() == TaskType.DAY_OFF);
        if (!sum.todayLocked() && !dayOff && sum.todayPlan() != null) {
            feedbackTask(userId, today).ifPresent(tasks::add);
        }
        List<StudyPlanDtos.DayResponse> week = sum.week().stream()
                .map(d -> new StudyPlanDtos.DayResponse(d.date(), d.phase() == null ? null : d.phase().name(),
                        d.total(), d.done(), d.locked(), d.date().equals(today)))
                .toList();
        List<StudyPlanDtos.PhaseResponse> phases = sum.phases().stream()
                .map(p -> new StudyPlanDtos.PhaseResponse(p.phase().name(), p.from(), p.to(), p.days()))
                .toList();

        boolean examPassed = !today.isBefore(exam);
        StudyPlanDtos.ExamResultResponse examResult = examResult(userId, exam);
        double totalGap = sum.gaps().values().stream().mapToDouble(Double::doubleValue).sum();
        List<String> warnings = new ArrayList<>();
        if (examPassed) {
            if (examResult == null) {
                warnings.add("Đã tới ngày thi. Thi xong hãy báo kết quả để hệ thống gợi ý lộ trình tiếp theo.");
            }
        } else if (totalGap > sum.daysLeft() * 0.8) {
            // Ước chừng một kỹ năng lên khoảng 1 điểm (thang 50) mỗi 2-3 ngày học đều.
            warnings.add("Mục tiêu khá xa so với thời gian còn lại. Cân nhắc lùi ngày thi hoặc tăng thời gian học mỗi ngày.");
        }
        if (sum.testOverdue()) {
            warnings.add("Đã " + StudyPlanner.TEST_REMINDER_DAYS + " ngày chưa có bài test nào. Hôm nay làm thêm một bài test kỹ năng để lộ trình cập nhật đúng trình độ.");
        }
        List<String> unknown = skills.stream().filter(s -> s.current() == null).map(StudyPlanDtos.SkillResponse::code).toList();
        if (!unknown.isEmpty()) {
            warnings.add("Chưa rõ điểm: " + String.join(", ", unknown) + ". Làm một bài test kỹ năng đó để lộ trình chính xác hơn.");
        }

        StudyPlanDtos.ReportResponse report = new StudyPlanDtos.ReportResponse(sum.last7Done(), sum.last7Total(),
                activeDays(userId, today), likelihood(totalGap, sum.daysLeft(), sum.last7Done(), sum.last7Total(), sum.dayIndex()),
                changed ? round1(scoreChange) : null);

        StudyPlanDtos.PlanResponse response = new StudyPlanDtos.PlanResponse(target, targetScore, exam,
                isTrue(row.get("exam_date_estimated")),
                minutes, start, sum.phase().name(), sum.dayIndex(), sum.totalDays(), sum.daysLeft(), sum.progressPercent(),
                phases, skills, new StudyPlanDtos.TodayResponse(today, sum.todayLocked(), tasks), week, warnings,
                restDays, reminders, report, examPassed, examResult);
        return new Computed(response, sum);
    }

    /**
     * Khả năng đạt mục tiêu nếu giữ nhịp 7 ngày qua — ước lượng thô để động viên, không
     * phải dự báo điểm: tổng điểm còn thiếu so với sức học còn lại (khoảng 0,8 điểm/ngày
     * khi làm đủ việc, nhân với tỉ lệ việc đã làm). Hai ngày đầu chưa đủ dữ liệu để
     * nói đúng hướng hay chậm nên trả NEW.
     */
    static String likelihood(double totalGap, int daysLeft, int done7, int total7, int dayIndex) {
        if (dayIndex <= 2) {
            return "NEW";
        }
        if (totalGap <= 0.5) {
            return "HIGH";
        }
        double pace = total7 == 0 ? 0.5 : Math.max(0.2, (double) done7 / total7);
        double capacity = daysLeft * 0.8 * pace;
        if (totalGap <= capacity * 0.6) {
            return "HIGH";
        }
        return totalGap <= capacity ? "MEDIUM" : "LOW";
    }

    /** Số ngày (trong 7 ngày gần nhất) có làm ít nhất một đề. */
    private int activeDays(String userId, LocalDate today) {
        Integer n = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT DATE(DATE_ADD(aqs.answered_at, INTERVAL 7 HOUR)))
                FROM attempt_question_sets aqs JOIN test_attempts ta ON ta.id = aqs.attempt_id
                WHERE ta.user_id = ? AND aqs.answered_at >= ?
                """, Integer.class, userId, Timestamp.valueOf(today.minusDays(6).atStartOfDay().minusHours(7)));
        return n == null ? 0 : n;
    }

    /**
     * Bài Speaking/Writing vừa chấm xong mà chưa mở xem nhận xét: thêm việc "xem nhận xét
     * AI" trỏ thẳng tới trang kết quả. Mở rồi trong hôm nay thì hiện là đã xong.
     */
    private Optional<StudyPlanDtos.TaskResponse> feedbackTask(String userId, LocalDate today) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT ta.id, ta.completed_at,
                       (SELECT c.code FROM attempt_question_sets aqs
                          JOIN question_sets qs ON qs.id = aqs.question_set_id
                          JOIN parts p ON p.id = qs.part_id JOIN components c ON c.id = p.component_id
                         WHERE aqs.attempt_id = ta.id AND c.code IN ('SPEAKING', 'WRITING') LIMIT 1) skill
                FROM test_attempts ta
                WHERE ta.user_id = ? AND ta.status = 'COMPLETED' AND ta.completed_at >= ?
                ORDER BY ta.completed_at DESC LIMIT 5
                """, userId, Timestamp.from(Instant.now().minus(Duration.ofDays(FEEDBACK_DAYS))));
        for (Map<String, Object> r : rows) {
            String skill = (String) r.get("skill");
            if (skill == null) {
                continue;
            }
            String attemptId = (String) r.get("id");
            String path = "/attempts/" + attemptId + "/result";
            List<Timestamp> views = jdbc.queryForList(
                    "SELECT MAX(created_at) FROM page_views WHERE user_id = ? AND path = ? AND created_at >= ?",
                    Timestamp.class, userId, path, r.get("completed_at"));
            Timestamp seen = views.isEmpty() ? null : views.get(0);
            boolean seenToday = seen != null
                    && seen.toLocalDateTime().plusHours(7).toLocalDate().equals(today);
            if (seen != null && !seenToday) {
                continue;
            }
            return Optional.of(new StudyPlanDtos.TaskResponse("feedback:" + attemptId, TaskType.FEEDBACK.name(), skill,
                    null, 1, 10, seenToday, false, false, path));
        }
        return Optional.empty();
    }

    private StudyPlanDtos.ExamResultResponse examResult(String userId, LocalDate exam) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT level, note FROM exam_results WHERE user_id = ? AND exam_date = ?", userId, Date.valueOf(exam));
        return rows.isEmpty() ? null
                : new StudyPlanDtos.ExamResultResponse(exam, (String) rows.get(0).get("level"), (String) rows.get(0).get("note"));
    }

    /** Tỉ lệ điểm (0-1) từng Part trong 60 ngày, chỉ tính Part có đủ đề đã chấm. */
    private Map<Skill, Map<Integer, Double>> partAccuracy(String userId) {
        Map<Skill, Map<Integer, Double>> out = new EnumMap<>(Skill.class);
        Timestamp since = Timestamp.from(Instant.now().minus(Duration.ofDays(HISTORY_DAYS)));
        jdbc.query("""
                SELECT c.code, p.display_order, SUM(aqs.awarded_score) got, SUM(aqs.max_score) total, COUNT(*) n
                FROM attempt_question_sets aqs
                JOIN test_attempts ta ON ta.id = aqs.attempt_id
                JOIN question_sets qs ON qs.id = aqs.question_set_id
                JOIN parts p ON p.id = qs.part_id
                JOIN components c ON c.id = p.component_id
                WHERE ta.user_id = ? AND aqs.status = 'SCORED' AND aqs.awarded_score IS NOT NULL AND aqs.max_score > 0
                  AND aqs.answered_at >= ?
                GROUP BY c.code, p.display_order
                """, rs -> {
            if (rs.getInt("n") < MIN_SETS_FOR_ACCURACY) {
                return;
            }
            try {
                Skill skill = Skill.valueOf(rs.getString("code"));
                out.computeIfAbsent(skill, k -> new HashMap<>())
                        .put(rs.getInt("display_order"), rs.getDouble("got") / rs.getDouble("total"));
            } catch (IllegalArgumentException ignored) {
                // kỹ năng không thuộc lộ trình
            }
        }, userId, since);
        return out;
    }

    /** Ngày gần nhất trước hôm nay có nộp bài test kỹ năng hoặc đề thi thử. */
    private LocalDate lastTestBefore(String userId, LocalDate today) {
        List<java.sql.Date> rows = jdbc.queryForList("""
                SELECT MAX(DATE(DATE_ADD(completed_at, INTERVAL 7 HOUR))) FROM test_attempts
                WHERE user_id = ? AND mode = 'MOCK_TEST' AND status = 'COMPLETED' AND completed_at < ?
                """, java.sql.Date.class, userId, Timestamp.valueOf(today.atStartOfDay().minusHours(7)));
        return rows.isEmpty() || rows.get(0) == null ? null : rows.get(0).toLocalDate();
    }

    /** Việc đã chốt của các ngày từ đầu lộ trình tới hôm nay. */
    private Map<LocalDate, List<StudyPlanner.Task>> frozenDays(String userId, LocalDate start, LocalDate today) {
        Map<LocalDate, List<StudyPlanner.Task>> out = new HashMap<>();
        jdbc.query("SELECT day, tasks FROM study_plan_days WHERE user_id = ? AND day BETWEEN ? AND ?", rs -> {
            try {
                out.put(rs.getDate("day").toLocalDate(), objectMapper.readValue(rs.getString("tasks"), TASKS));
            } catch (Exception ex) {
                log.warn("Bỏ qua ngày lộ trình hỏng của {}: {}", userId, ex.getMessage());
            }
        }, userId, Date.valueOf(start), Date.valueOf(today));
        return out;
    }

    /** Chốt việc của hôm nay ở lần mở đầu tiên trong ngày. */
    private void freezeToday(String userId, StudyPlanner.Day day, Map<LocalDate, List<StudyPlanner.Task>> frozen) {
        if (day == null || frozen.containsKey(day.date())) {
            return;
        }
        try {
            jdbc.update("INSERT IGNORE INTO study_plan_days (user_id, day, tasks, created_at) VALUES (?, ?, CAST(? AS JSON), UTC_TIMESTAMP())",
                    userId, Date.valueOf(day.date()), objectMapper.writeValueAsString(day.tasks()));
        } catch (Exception ex) {
            // Không chốt được thì lần sau tính lại — không làm hỏng trang.
            log.warn("Không chốt được việc ngày {} của {}: {}", day.date(), userId, ex.getMessage());
        }
    }

    /** Điểm từ hai bài thi thử gần nhất của từng kỹ năng, làm sau khi đặt lộ trình. */
    private Map<String, Double> recentMockScores(String userId, LocalDateTime since) {
        Map<String, List<Double>> byCode = new HashMap<>();
        jdbc.query("""
                SELECT c.code, s.percentage_score FROM attempt_component_scores s
                JOIN test_attempts ta ON ta.id = s.attempt_id
                JOIN components c ON c.id = s.component_id
                WHERE ta.user_id = ? AND ta.mode = 'MOCK_TEST' AND ta.status = 'COMPLETED'
                  AND ta.completed_at >= ? AND s.percentage_score IS NOT NULL
                ORDER BY ta.completed_at DESC
                """, rs -> {
            byCode.computeIfAbsent(rs.getString("code"), k -> new ArrayList<>()).add(rs.getDouble("percentage_score"));
        }, userId, Timestamp.valueOf(since));
        Map<String, Double> out = new HashMap<>();
        byCode.forEach((code, list) -> out.put(code,
                round1(list.stream().limit(2).mapToDouble(Double::doubleValue).average().orElse(0) / 2)));
        return out;
    }

    /** Bài đã làm theo ngày (giờ Việt Nam) từ ngày bắt đầu lộ trình. */
    private StudyPlanner.Activity loadActivity(String userId, LocalDate from) {
        Timestamp since = Timestamp.valueOf(from.atStartOfDay().minusHours(7));
        Map<String, Skill> skillOf = new HashMap<>();
        Map<String, Integer> partNo = new HashMap<>();
        jdbc.query("SELECT p.id, c.code, p.display_order FROM parts p JOIN components c ON c.id = p.component_id", rs -> {
            try {
                skillOf.put(rs.getString("id"), Skill.valueOf(rs.getString("code")));
                partNo.put(rs.getString("id"), rs.getInt("display_order"));
            } catch (IllegalArgumentException ignored) {
                // kỹ năng không thuộc lộ trình
            }
        });

        Map<String, Integer> answered = new HashMap<>();
        jdbc.query("""
                SELECT DATE(DATE_ADD(aqs.answered_at, INTERVAL 7 HOUR)) d, qs.part_id,
                       COUNT(DISTINCT aqs.question_set_id) n
                FROM attempt_question_sets aqs
                JOIN test_attempts ta ON ta.id = aqs.attempt_id
                JOIN question_sets qs ON qs.id = aqs.question_set_id
                -- Chỉ đề thật sự trả lời: đề bỏ trống cũng thành SCORED (0 điểm) khi nộp bài
                -- nhưng không có answered_at.
                WHERE ta.user_id = ? AND aqs.status IN ('ANSWERED', 'SCORED') AND aqs.answered_at >= ?
                GROUP BY d, qs.part_id
                """, rs -> {
            Skill s = skillOf.get(rs.getString("part_id"));
            if (s != null) {
                answered.merge(rs.getDate("d").toLocalDate() + "|" + s + "|" + partNo.get(rs.getString("part_id")),
                        rs.getInt("n"), Integer::sum);
            }
        }, userId, since);

        Map<String, Integer> focus = new HashMap<>();
        jdbc.query("""
                SELECT DATE(DATE_ADD(updated_at, INTERVAL 7 HOUR)) d, page_key, COUNT(*) n
                FROM monthly_focus_progress WHERE user_id = ? AND updated_at >= ? GROUP BY d, page_key
                """, rs -> {
            focus.put(rs.getDate("d").toLocalDate() + "|" + rs.getString("page_key"), rs.getInt("n"));
        }, userId, since);

        Set<String> mocks = new HashSet<>();
        jdbc.query("""
                SELECT DATE(DATE_ADD(ta.completed_at, INTERVAL 7 HOUR)) d, c.code
                FROM test_attempts ta LEFT JOIN components c ON c.id = ta.component_id
                WHERE ta.user_id = ? AND ta.mode = 'MOCK_TEST' AND ta.completed_at >= ?
                """, rs -> {
            String code = rs.getString("code");
            mocks.add(rs.getDate("d").toLocalDate() + "|" + (code == null ? "FULL" : code));
        }, userId, since);

        Set<String> views = new HashSet<>();
        jdbc.query("""
                SELECT DISTINCT DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) d, page_key FROM page_views
                WHERE user_id = ? AND created_at >= ? AND page_key IN ('exam-prediction', 'news-post', 'study-tips')
                """, rs -> {
            views.add(rs.getDate("d").toLocalDate() + "|" + rs.getString("page_key"));
        }, userId, since);

        Map<String, Integer> sessions = new HashMap<>();
        jdbc.query("""
                SELECT s.task_key, COUNT(aqs.id) n FROM study_plan_sessions s
                LEFT JOIN attempt_question_sets aqs ON aqs.attempt_id = s.attempt_id AND aqs.answered_at IS NOT NULL
                WHERE s.user_id = ? AND s.day >= ? GROUP BY s.task_key
                """, rs -> {
            sessions.put(rs.getString("task_key"), rs.getInt("n"));
        }, userId, Date.valueOf(from));

        return new StudyPlanner.Activity() {
            @Override
            public int answeredSets(LocalDate day, Skill skill, int part) {
                return answered.getOrDefault(day + "|" + skill + "|" + part, 0);
            }

            @Override
            public int monthlyFocus(LocalDate day, String pageKey) {
                return focus.getOrDefault(day + "|" + pageKey, 0);
            }

            @Override
            public boolean skillTest(LocalDate day, Skill skill) {
                return mocks.contains(day + "|" + skill);
            }

            @Override
            public boolean fullMock(LocalDate day) {
                return mocks.contains(day + "|FULL");
            }

            @Override
            public boolean viewed(LocalDate day, String pageKey) {
                return views.contains(day + "|" + pageKey);
            }

            @Override
            public int sessionAnswered(String taskKey) {
                return sessions.getOrDefault(taskKey, 0);
            }
        };
    }

    // ------------------------------------------------------------------ ghi

    /** Bắt đầu (hoặc làm tiếp) bài test năng lực. Mỗi tài khoản một lần, bản đầy đủ hoặc rút gọn. */
    @Transactional
    public StudyPlanDtos.PlacementStartResponse startPlacement(String userId, String kind) {
        List<String> existing = jdbc.queryForList(
                "SELECT attempt_id FROM placement_attempts WHERE user_id = ?", String.class, userId);
        if (!existing.isEmpty()) {
            return new StudyPlanDtos.PlacementStartResponse(existing.get(0));
        }
        boolean shortTest = "SHORT".equalsIgnoreCase(kind);
        // Không kiểm Premium: test năng lực mở cho mọi tài khoản, một lần.
        String attemptId = attemptService.createAssignmentBlueprintAttempt(userId,
                shortTest ? PLACEMENT_SHORT_BLUEPRINT_ID : PLACEMENT_BLUEPRINT_ID).getId();
        jdbc.update("INSERT INTO placement_attempts (user_id, attempt_id, kind, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
                userId, attemptId, shortTest ? "SHORT" : "FULL");
        log.info("Học viên {} bắt đầu test năng lực {} ({})", userId, attemptId, shortTest ? "rút gọn" : "đầy đủ");
        return new StudyPlanDtos.PlacementStartResponse(attemptId);
    }

    /**
     * Mở phiên luyện cho một việc hôm nay: chọn sẵn đúng số đề theo độ ưu tiên rồi tạo
     * lượt làm bài. Bấm lại thì trả lượt cũ, không tạo đề mới.
     */
    @Transactional
    public StudyPlanDtos.StartTaskResponse startTask(String userId, String taskKey) {
        List<Map<String, Object>> existing = jdbc.queryForList("""
                SELECT s.attempt_id, s.set_count, ta.status FROM study_plan_sessions s
                LEFT JOIN test_attempts ta ON ta.id = s.attempt_id WHERE s.user_id = ? AND s.task_key = ?
                """, userId, taskKey);
        if (!existing.isEmpty() && !"EXPIRED".equals(existing.get(0).get("status")) && existing.get(0).get("status") != null) {
            return new StudyPlanDtos.StartTaskResponse((String) existing.get(0).get("attempt_id"),
                    ((Number) existing.get(0).get("set_count")).intValue());
        }
        Map<String, Object> row = loadPlan(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa có lộ trình"));
        boolean premium = entitlements.hasPremiumAccess(userId);
        StudyPlanner.Summary sum = compute(userId, row, premium).summary();
        if (sum.todayLocked()) {
            throw ApiException.premiumRequired();
        }
        StudyPlanner.Task task = sum.today().stream().map(StudyPlanner.TaskStatus::task)
                .filter(t -> t.key().equals(taskKey)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED, "Việc này không thuộc lộ trình hôm nay"));
        if (!StudyPlanner.SESSION_TYPES.contains(task.type())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Việc này không mở thành phiên luyện");
        }

        List<String> ids = picker.pick(userId, task, sum.phase(), today());
        Map<String, QuestionSet> byId = questionSetRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(QuestionSet::getId, Function.identity()));
        List<QuestionSet> sets = ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
        // Phiên lộ trình không mở khoá nội dung: chưa có Premium thì chỉ giữ đề được phép làm.
        if (!premium) {
            Map<String, ContentAccessService.AccessDecision> access = contentAccessService.evaluateAll(userId, sets);
            sets = sets.stream().filter(qs -> access.get(qs.getId()) != null && access.get(qs.getId()).allowed()).toList();
            if (sets.isEmpty()) {
                throw ApiException.premiumRequired();
            }
        }
        if (sets.isEmpty()) {
            throw new ApiException(ErrorCode.NOT_ENOUGH_QUESTION_SETS, "Chưa có đề phù hợp cho việc này");
        }
        String attemptId = attemptService.createAssignmentAttempt(userId, sets, false).getId();
        jdbc.update("""
                INSERT INTO study_plan_sessions (user_id, task_key, day, attempt_id, set_count, created_at)
                VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE attempt_id = VALUES(attempt_id), set_count = VALUES(set_count), created_at = UTC_TIMESTAMP()
                """, userId, taskKey, Date.valueOf(today()), attemptId, sets.size());
        return new StudyPlanDtos.StartTaskResponse(attemptId, sets.size());
    }

    /** Học viên báo kết quả thi thật cho ngày thi của lộ trình hiện tại. */
    @Transactional
    public StudyPlanDtos.StudyPlanResponse reportExam(String userId, StudyPlanDtos.ExamResultRequest request) {
        String level = request.level().trim().toUpperCase();
        if (!RESULT_LEVELS.contains(level)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Kết quả không hợp lệ");
        }
        Map<String, Object> row = loadPlan(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa có lộ trình"));
        LocalDate exam = toLocalDate(row.get("exam_date"));
        if (today().isBefore(exam)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa tới ngày thi");
        }
        String note = request.note() == null ? null : request.note().strip();
        if (note != null && note.length() > 500) {
            note = note.substring(0, 500);
        }
        jdbc.update("""
                INSERT INTO exam_results (user_id, exam_date, level, target_level, note, created_at)
                VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE level = VALUES(level), note = VALUES(note)
                """, userId, Date.valueOf(exam), level, row.get("target_level"), note);
        return view(userId);
    }

    /** Đặt hoặc đổi mục tiêu. Điểm khởi đầu giữ nguyên khi đổi, chỉ bổ sung kỹ năng còn trống. */
    @Transactional
    public StudyPlanDtos.StudyPlanResponse save(String userId, StudyPlanDtos.SavePlanRequest request) {
        String target = request.targetLevel().trim().toUpperCase();
        if (!TARGETS.contains(target)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Mục tiêu phải là B1, B2 hoặc C1");
        }
        LocalDate today = today();
        boolean estimated = request.examDate() == null;
        LocalDate exam = estimated ? today.plusWeeks(DEFAULT_WEEKS) : request.examDate();
        if (!exam.isAfter(today)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Ngày thi phải sau hôm nay");
        }
        String self = request.selfLevel() == null ? null : request.selfLevel().trim().toUpperCase();

        StudyPlanDtos.PlacementResponse placement = placement(userId);
        Map<String, StudyPlanDtos.SkillEstimate> estimate = estimate(userId, placement);
        var old = loadPlan(userId);

        List<Integer> restDays = request.restDays() != null
                ? new ArrayList<>(new TreeSet<>(request.restDays()))
                : old.map(r -> readInts(r.get("rest_days"))).orElse(List.of());
        if (restDays.stream().anyMatch(d -> d < 1 || d > 7)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Ngày nghỉ không hợp lệ");
        }
        if (restDays.size() > MAX_REST_DAYS) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Nghỉ tối đa " + MAX_REST_DAYS + " ngày mỗi tuần");
        }
        boolean reminders = request.remindersEnabled() != null
                ? request.remindersEnabled()
                : old.map(r -> isTrue(r.get("reminders_enabled"))).orElse(true);

        // Thi xong rồi đặt mục tiêu mới: bắt đầu lộ trình mới với điểm hiện tại.
        boolean restart = old.isPresent() && !today.isBefore(toLocalDate(old.get().get("exam_date")));
        Map<String, Map<String, Object>> baseline = old.filter(r -> !restart).map(r -> readBaseline(r.get("baseline")))
                .orElseGet(LinkedHashMap::new);
        Map<String, Double> latest = restart ? recentMockScores(userId, toLocalDateTime(old.get().get("created_at"))) : Map.of();
        for (Skill s : Skill.values()) {
            Map<String, Object> cur = baseline.get(s.name());
            if (cur != null && cur.get("score") instanceof Number) {
                continue;
            }
            StudyPlanDtos.SkillEstimate e = estimate.get(s.name());
            Map<String, Object> value = new LinkedHashMap<>();
            if (latest.containsKey(s.name())) {
                value.put("score", latest.get(s.name()));
                value.put("source", "HISTORY");
            } else if (e != null) {
                value.put("score", e.score());
                value.put("source", e.source());
            } else if (self != null && SELF_SCORE.containsKey(self)) {
                value.put("score", SELF_SCORE.get(self));
                value.put("source", "SELF");
            } else {
                value.put("score", null);
                value.put("source", null);
            }
            baseline.put(s.name(), value);
        }
        String json;
        String restJson;
        try {
            json = objectMapper.writeValueAsString(baseline);
            restJson = objectMapper.writeValueAsString(restDays);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }

        if (old.isPresent() && !restart) {
            jdbc.update("""
                    UPDATE study_plans SET target_level = ?, exam_date = ?, exam_date_estimated = ?, minutes_per_day = ?,
                           rest_days = CAST(? AS JSON), reminders_enabled = ?, baseline = CAST(? AS JSON),
                           updated_at = UTC_TIMESTAMP() WHERE user_id = ?
                    """, target, Date.valueOf(exam), estimated, request.minutesPerDay(), restJson, reminders, json, userId);
        } else {
            jdbc.update("DELETE FROM study_plan_days WHERE user_id = ?", userId);
            jdbc.update("""
                    INSERT INTO study_plans (user_id, target_level, exam_date, exam_date_estimated, minutes_per_day,
                                             rest_days, reminders_enabled, baseline, start_date, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, CAST(? AS JSON), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
                    ON DUPLICATE KEY UPDATE target_level = VALUES(target_level), exam_date = VALUES(exam_date),
                        exam_date_estimated = VALUES(exam_date_estimated), minutes_per_day = VALUES(minutes_per_day),
                        rest_days = VALUES(rest_days), reminders_enabled = VALUES(reminders_enabled),
                        baseline = VALUES(baseline), start_date = VALUES(start_date),
                        created_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
                    """, userId, target, Date.valueOf(exam), estimated, request.minutesPerDay(), restJson, reminders,
                    json, Date.valueOf(today));
        }
        // Mục tiêu mới áp dụng từ hôm nay: bỏ việc đã chốt của hôm nay trở đi.
        jdbc.update("DELETE FROM study_plan_days WHERE user_id = ? AND day >= ?", userId, Date.valueOf(today));
        // Hồ sơ dùng chung mục tiêu và ngày thi (trang chủ, đếm ngược).
        jdbc.update("UPDATE user_profiles SET target_cefr_level = ?, target_exam_date = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?",
                target, estimated ? null : Date.valueOf(exam), userId);
        return view(userId);
    }

    // ------------------------------------------------------------------ tiện ích

    private Map<String, Map<String, Object>> readBaseline(Object raw) {
        if (raw == null) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, Map<String, Object>> m = objectMapper.readValue(raw.toString(), BASELINE);
            return m == null ? new LinkedHashMap<>() : new LinkedHashMap<>(m);
        } catch (Exception ex) {
            return new LinkedHashMap<>();
        }
    }

    private List<Integer> readInts(Object raw) {
        if (raw == null) {
            return List.of();
        }
        try {
            List<Integer> list = objectMapper.readValue(raw.toString(), INTS);
            return list == null ? List.of() : list;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private static boolean isTrue(Object v) {
        return Boolean.TRUE.equals(v) || (v instanceof Number n && n.intValue() == 1);
    }

    private static LocalDate toLocalDate(Object v) {
        if (v instanceof LocalDate d) {
            return d;
        }
        if (v instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        return LocalDate.parse(v.toString().substring(0, 10));
    }

    private static LocalDateTime toLocalDateTime(Object v) {
        if (v instanceof LocalDateTime t) {
            return t;
        }
        if (v instanceof Timestamp t) {
            return t.toLocalDateTime();
        }
        if (v instanceof Instant i) {
            return LocalDateTime.ofInstant(i, ZoneOffset.UTC);
        }
        return LocalDateTime.parse(v.toString().replace(' ', 'T').substring(0, 19));
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
