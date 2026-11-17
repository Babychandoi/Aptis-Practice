package vn.weconex.aptis.platform.syncjob;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.platform.notification.NotificationSender;

/**
 * Sức khỏe nguồn đề mà lộ trình học dựa vào: dự đoán đề hằng ngày, bài khởi động và
 * đợt nhập đề Chủ nhật — đều do job trên máy chủ (Task Scheduler) đổ vào DB.
 *
 * <p>Kiểm bằng kết quả (hôm nay đã có bản dự đoán chưa) chứ không chỉ bằng nhật ký chạy:
 * máy tắt, Task Scheduler không gọi, Docker chết… thì job không ghi được gì, nhưng thiếu
 * dữ liệu hôm nay thì vẫn thấy ngay.
 */
@Slf4j
@Service
public class SyncHealthService {

    static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    /** Job sáng chạy 07:00; quá giờ này mà chưa có bản hôm nay là hỏng. */
    static final LocalTime DAILY_DEADLINE = LocalTime.of(7, 45);
    /** Nhập đề chạy Chủ nhật 03:00 — cho thêm một ngày dự phòng. */
    static final int WEEKLY_MAX_AGE_DAYS = 8;
    static final List<String> WEEKLY_JOBS = List.of(
            "aptisprep-weekly", "aptisprep-monthly-focus", "aptisprep-practice-curate", "rebuild-skill-mocks");

    private final JdbcTemplate jdbc;
    private final NotificationSender sender;
    private final String alertEmail;

    public SyncHealthService(
            JdbcTemplate jdbc,
            NotificationSender sender,
            @Value("${aptis.ops.alert-email:${aptis.billing.transfer-notify-email:}}") String alertEmail) {
        this.jdbc = jdbc;
        this.sender = sender;
        this.alertEmail = alertEmail == null ? "" : alertEmail.strip();
    }

    public record Check(String key, String label, boolean ok, String detail) {
    }

    public record Health(boolean ok, List<Check> checks) {
    }

    public Health check() {
        return check(LocalDateTime.now(VN));
    }

    Health check(LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        boolean pastDeadline = !now.toLocalTime().isBefore(DAILY_DEADLINE);
        List<Check> checks = new ArrayList<>();

        LocalDate prediction = jdbc.queryForObject(
                "SELECT MAX(predict_date) FROM exam_predictions WHERE status = 'PUBLISHED' AND predict_date <= ?",
                LocalDate.class, today);
        checks.add(daily("prediction", "Dự đoán đề hôm nay", prediction, today, pastDeadline));

        LocalDate warmUp = jdbc.queryForObject(
                "SELECT MAX(day_key) FROM daily_warm_ups WHERE day_key <= ?", LocalDate.class, today);
        checks.add(daily("warm-up", "Khởi động hôm nay", warmUp, today, pastDeadline));

        Timestamp weeklyOk = jdbc.queryForObject(
                "SELECT MAX(finished_at) FROM sync_job_runs WHERE job = 'aptisprep-weekly' AND status = 'OK'",
                Timestamp.class);
        if (weeklyOk == null) {
            checks.add(new Check("weekly", "Nhập đề Chủ nhật", true, "Chưa có lần chạy nào được ghi lại"));
        } else {
            LocalDate last = weeklyOk.toLocalDateTime().toLocalDate();
            long age = java.time.temporal.ChronoUnit.DAYS.between(last, today);
            checks.add(new Check("weekly", "Nhập đề Chủ nhật", age <= WEEKLY_MAX_AGE_DAYS,
                    "Lần thành công gần nhất " + fmt(last) + (age > WEEKLY_MAX_AGE_DAYS ? " — quá " + WEEKLY_MAX_AGE_DAYS + " ngày" : "")));
        }

        // Bước nào lần chạy gần nhất (trong 8 ngày) bị lỗi dù đã thử lại.
        List<String> failed = jdbc.queryForList("""
                SELECT r.job FROM sync_job_runs r
                JOIN (SELECT job, MAX(finished_at) at FROM sync_job_runs GROUP BY job) l
                  ON l.job = r.job AND l.at = r.finished_at
                WHERE r.status = 'FAILED' AND r.finished_at >= ?
                ORDER BY r.job
                """, String.class, Timestamp.valueOf(now.minusDays(WEEKLY_MAX_AGE_DAYS)));
        checks.add(new Check("failed-steps", "Bước bị lỗi gần đây", failed.isEmpty(),
                failed.isEmpty() ? "Không có" : String.join(", ", failed)));

        return new Health(checks.stream().allMatch(Check::ok), checks);
    }

    private static Check daily(String key, String label, LocalDate latest, LocalDate today, boolean pastDeadline) {
        if (latest != null && latest.equals(today)) {
            return new Check(key, label, true, "Đã có bản " + fmt(today));
        }
        String detail = latest == null ? "Chưa có bản nào" : "Bản mới nhất " + fmt(latest);
        // Trước giờ job sáng chạy thì thiếu bản hôm nay là bình thường.
        return new Check(key, label, !pastDeadline, pastDeadline ? detail : detail + " (job sáng chưa tới giờ)");
    }

    private static String fmt(LocalDate d) {
        return d.getDayOfMonth() + "/" + d.getMonthValue();
    }

    /**
     * Gửi email cảnh báo nếu có mục hỏng. Trả về true khi đã gửi.
     */
    public boolean alertIfUnhealthy() {
        Health health = check();
        if (health.ok()) {
            return false;
        }
        List<String> problems = health.checks().stream()
                .filter(c -> !c.ok())
                .map(c -> c.label() + ": " + c.detail())
                .toList();
        log.warn("Nguồn đề cho lộ trình đang hỏng: {}", problems);
        if (alertEmail.isEmpty()) {
            log.warn("Chưa đặt aptis.ops.alert-email (hoặc TRANSFER_NOTIFY_EMAIL) — không gửi được cảnh báo");
            return false;
        }
        sender.sendSyncAlert(alertEmail, problems);
        return true;
    }
}
