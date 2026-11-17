package vn.weconex.aptis.studyplan;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Hành trình người mới với lộ trình học, cho quản trị.
 *
 * <p>Trả lời: trong số người đăng ký mấy ngày qua, bao nhiêu người mở trang lộ trình,
 * làm bài test năng lực (bản đầy đủ hay rút gọn, có làm xong không), đặt mục tiêu, học
 * buổi đầu, còn học sau 7 ngày và báo kết quả thi — và từng người đang dừng ở đâu.
 * Các bước không bắt buộc theo thứ tự (bỏ qua test vẫn đặt được mục tiêu), nên mỗi bước
 * đếm độc lập.
 */
@RestController
@RequestMapping("/api/v1/admin/study-plans")
@RequiredArgsConstructor
public class AdminStudyPlanController {

    /** Bước xa nhất học viên đã đạt, theo thứ tự hành trình. */
    static final List<String> STAGES = List.of(
            "SIGNED_UP", "VISITED", "PLACEMENT_STARTED", "PLACEMENT_DONE", "PLAN_SET", "STUDIED", "RETAINED", "EXAM_REPORTED");
    private static final int LIST_LIMIT = 300;
    private static final String STAFF = """
            SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id
            WHERE r.code IN ('ADMIN', 'SUPER_ADMIN')""";

    private final JdbcTemplate jdbc;
    private final UserEntitlementRepository entitlementRepository;

    public record JourneyUser(
            String userId, String email, String fullName, Instant signedUpAt, boolean premium,
            boolean visited, String placementKind, String placementStatus,
            String targetLevel, LocalDate examDate, LocalDate planStart, boolean remindersEnabled,
            Instant lastActiveAt, int activeDays, String examResult, String stage) {
    }

    public record FunnelStep(String key, String label, int count, int percent) {
    }

    public record JourneyOverview(
            int days,
            List<FunnelStep> funnel,
            Map<String, Integer> placementByKind,
            Map<String, Integer> placementDoneByKind,
            Map<String, Integer> targets,
            Map<String, Integer> examResults,
            int examReached,
            int remindersSent,
            List<JourneyUser> users) {
    }

    @GetMapping
    @PreAuthorize("hasAuthority('analytics:read')")
    @Transactional(readOnly = true)
    public JourneyOverview overview(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String stage) {
        int safeDays = Math.max(1, Math.min(365, days));
        Timestamp since = Timestamp.from(Instant.now().minus(safeDays, ChronoUnit.DAYS));

        Set<String> premiumIds = new HashSet<>(
                entitlementRepository.findUserIdsWithNonTrialEntitlement(UserEntitlement.PREMIUM_CONTENT_ACCESS));
        List<JourneyUser> users = new ArrayList<>();
        jdbc.query("""
                SELECT u.id, u.email, u.created_at, p.full_name,
                       EXISTS (SELECT 1 FROM page_views pv WHERE pv.user_id = u.id AND pv.page_key = 'study-plan') visited,
                       pa.kind placement_kind, pa.attempt_id placement_attempt, ta.status placement_status,
                       sp.target_level, sp.exam_date, sp.start_date, sp.created_at plan_created, sp.reminders_enabled,
                       er.level exam_result,
                       (SELECT MAX(aqs.answered_at) FROM attempt_question_sets aqs
                          JOIN test_attempts t ON t.id = aqs.attempt_id
                         WHERE t.user_id = u.id AND aqs.answered_at IS NOT NULL) last_active,
                       (SELECT COUNT(DISTINCT DATE(DATE_ADD(aqs.answered_at, INTERVAL 7 HOUR)))
                          FROM attempt_question_sets aqs JOIN test_attempts t ON t.id = aqs.attempt_id
                         WHERE t.user_id = u.id AND sp.created_at IS NOT NULL AND aqs.answered_at >= sp.created_at
                           AND (pa.attempt_id IS NULL OR t.id <> pa.attempt_id)) active_days,
                       EXISTS (SELECT 1 FROM attempt_question_sets aqs JOIN test_attempts t ON t.id = aqs.attempt_id
                                WHERE t.user_id = u.id AND sp.start_date IS NOT NULL
                                  AND aqs.answered_at >= DATE_SUB(TIMESTAMP(DATE_ADD(sp.start_date, INTERVAL 7 DAY)), INTERVAL 7 HOUR)
                                  AND (pa.attempt_id IS NULL OR t.id <> pa.attempt_id)) retained
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                LEFT JOIN placement_attempts pa ON pa.user_id = u.id
                LEFT JOIN test_attempts ta ON ta.id = pa.attempt_id
                LEFT JOIN study_plans sp ON sp.user_id = u.id
                LEFT JOIN (SELECT user_id, MAX(level) level FROM exam_results GROUP BY user_id) er ON er.user_id = u.id
                WHERE u.created_at >= ? AND u.deleted_at IS NULL AND u.status <> 'LOCKED'
                  AND u.id NOT IN (%s)
                ORDER BY u.created_at DESC
                """.formatted(STAFF), rs -> {
            String id = rs.getString("id");
            boolean visited = rs.getBoolean("visited");
            String kind = rs.getString("placement_kind");
            String pStatus = rs.getString("placement_status");
            boolean planSet = rs.getString("target_level") != null;
            int activeDays = rs.getInt("active_days");
            boolean retained = rs.getBoolean("retained");
            String result = rs.getString("exam_result");
            String reached = "SIGNED_UP";
            if (visited) reached = "VISITED";
            if (kind != null) reached = "PLACEMENT_STARTED";
            if ("COMPLETED".equals(pStatus)) reached = "PLACEMENT_DONE";
            if (planSet) reached = "PLAN_SET";
            if (planSet && activeDays > 0) reached = "STUDIED";
            if (planSet && retained) reached = "RETAINED";
            if (result != null) reached = "EXAM_REPORTED";
            Timestamp last = rs.getTimestamp("last_active");
            java.sql.Date exam = rs.getDate("exam_date");
            java.sql.Date start = rs.getDate("start_date");
            users.add(new JourneyUser(id, rs.getString("email"), rs.getString("full_name"),
                    rs.getTimestamp("created_at").toInstant(), premiumIds.contains(id),
                    visited || kind != null || planSet, kind, pStatus,
                    rs.getString("target_level"), exam == null ? null : exam.toLocalDate(),
                    start == null ? null : start.toLocalDate(), rs.getBoolean("reminders_enabled"),
                    last == null ? null : last.toInstant(), activeDays, result, reached));
        }, since);

        int total = users.size();
        int[] counts = new int[STAGES.size()];
        Map<String, Integer> byKind = new LinkedHashMap<>(Map.of("FULL", 0, "SHORT", 0));
        Map<String, Integer> doneByKind = new LinkedHashMap<>(Map.of("FULL", 0, "SHORT", 0));
        for (JourneyUser u : users) {
            counts[0]++;
            if (u.visited()) counts[1]++;
            if (u.placementKind() != null) {
                counts[2]++;
                byKind.merge(u.placementKind(), 1, Integer::sum);
            }
            if ("COMPLETED".equals(u.placementStatus())) {
                counts[3]++;
                doneByKind.merge(u.placementKind(), 1, Integer::sum);
            }
            if (u.targetLevel() != null) counts[4]++;
            if (u.targetLevel() != null && u.activeDays() > 0) counts[5]++;
            if ("RETAINED".equals(u.stage()) || ("EXAM_REPORTED".equals(u.stage()) && u.activeDays() > 1)) counts[6]++;
            if (u.examResult() != null) counts[7]++;
        }
        String[] labels = {"Đăng ký", "Mở trang lộ trình", "Bắt đầu test năng lực", "Làm xong test năng lực",
                "Đặt mục tiêu", "Học buổi đầu", "Còn học sau 7 ngày", "Báo kết quả thi"};
        List<FunnelStep> funnel = new ArrayList<>();
        for (int i = 0; i < STAGES.size(); i++) {
            funnel.add(new FunnelStep(STAGES.get(i), labels[i], counts[i], total == 0 ? 0 : Math.round(counts[i] * 100f / total)));
        }

        // Toàn bộ lộ trình (không chỉ người mới): mục tiêu, kết quả thi, nhắc học.
        Map<String, Integer> targets = new LinkedHashMap<>();
        jdbc.query("SELECT target_level, COUNT(*) n FROM study_plans GROUP BY target_level ORDER BY target_level",
                rs -> { targets.put(rs.getString("target_level"), rs.getInt("n")); });
        Map<String, Integer> results = new LinkedHashMap<>();
        int[] reached = {0};
        List<String> rank = List.of("A1", "A2", "B1", "B2", "C1", "C2");
        jdbc.query("SELECT level, target_level FROM exam_results", rs -> {
            String level = rs.getString("level");
            results.merge(level, 1, Integer::sum);
            String target = rs.getString("target_level");
            if (target != null && rank.indexOf(level) >= 0 && rank.indexOf(level) >= rank.indexOf(target)) {
                reached[0]++;
            }
        });
        Integer reminders = jdbc.queryForObject(
                "SELECT COUNT(*) FROM study_plans WHERE last_reminded_at >= ?", Integer.class, since);

        List<JourneyUser> list = users.stream()
                .filter(u -> stage == null || stage.isBlank() || stage.equals(u.stage()))
                .limit(LIST_LIMIT)
                .toList();
        return new JourneyOverview(safeDays, funnel, byKind, doneByKind, targets, results, reached[0],
                reminders == null ? 0 : reminders, list);
    }
}
