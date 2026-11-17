package vn.weconex.aptis.studyplan;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.platform.notification.NotificationSender;

/**
 * Nhắc học qua email khi học viên bỏ lộ trình.
 *
 * <p>Gửi khi: lộ trình đã bật nhắc, chưa tới ngày thi, tài khoản đang hoạt động, đã
 * {@link #AWAY_DAYS} ngày không làm đề nào, và lần nhắc trước cách ít nhất
 * {@link #GAP_DAYS} ngày. Nhắc dồn dập thì học viên tắt luôn thay vì quay lại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudyPlanReminderService {

    static final int AWAY_DAYS = 2;
    static final int GAP_DAYS = 3;
    private static final int BATCH = 200;
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbc;
    private final NotificationSender notifications;

    /** @return số mail đã gửi */
    public int sendDueReminders() {
        LocalDate today = LocalDate.now(VN);
        List<Map<String, Object>> due = jdbc.queryForList("""
                SELECT sp.user_id, u.email, sp.target_level, sp.exam_date,
                       GREATEST(
                           COALESCE((SELECT MAX(aqs.answered_at) FROM attempt_question_sets aqs
                                       JOIN test_attempts ta ON ta.id = aqs.attempt_id WHERE ta.user_id = sp.user_id), '1970-01-01'),
                           COALESCE((SELECT MAX(mfp.updated_at) FROM monthly_focus_progress mfp WHERE mfp.user_id = sp.user_id), '1970-01-01'),
                           sp.created_at) AS last_active
                FROM study_plans sp JOIN users u ON u.id = sp.user_id
                WHERE sp.reminders_enabled = 1 AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
                  AND sp.exam_date > ?
                  AND (sp.last_reminded_at IS NULL OR sp.last_reminded_at < UTC_TIMESTAMP() - INTERVAL ? DAY)
                HAVING last_active < UTC_TIMESTAMP() - INTERVAL ? DAY
                LIMIT ?
                """, java.sql.Date.valueOf(today), GAP_DAYS, AWAY_DAYS, BATCH);
        int sent = 0;
        for (Map<String, Object> row : due) {
            String userId = (String) row.get("user_id");
            try {
                LocalDate lastActive = ((java.time.LocalDateTime) toLocalDateTime(row.get("last_active"))).plusHours(7).toLocalDate();
                int away = (int) Math.max(AWAY_DAYS, ChronoUnit.DAYS.between(lastActive, today));
                LocalDate exam = ((java.sql.Date) row.get("exam_date")).toLocalDate();
                int daysLeft = (int) Math.max(0, ChronoUnit.DAYS.between(today, exam));
                String target = "C1".equals(row.get("target_level")) ? "C" : (String) row.get("target_level");
                notifications.sendStudyReminder((String) row.get("email"), away, daysLeft, target);
                jdbc.update("UPDATE study_plans SET last_reminded_at = UTC_TIMESTAMP() WHERE user_id = ?", userId);
                sent++;
            } catch (RuntimeException ex) {
                // Một mail lỗi không chặn cả lượt; lần chạy sau thử lại.
                log.warn("Không gửi được nhắc học cho {}: {}", userId, ex.getMessage());
            }
        }
        return sent;
    }

    private static Object toLocalDateTime(Object v) {
        if (v instanceof Timestamp t) {
            return t.toLocalDateTime();
        }
        if (v instanceof java.time.LocalDateTime t) {
            return t;
        }
        return java.time.LocalDateTime.parse(v.toString().replace(' ', 'T').substring(0, 19));
    }
}
