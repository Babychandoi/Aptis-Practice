package vn.weconex.aptis.progress.web;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.progress.repository.DashboardStatsRepository;

/**
 * Số liệu bảng điều khiển: chuỗi ngày học, hoạt động 14 ngày, điểm kỹ năng.
 *
 * <p>Bài đang làm dở và kết quả gần đây không nằm ở đây — frontend đã có API
 * danh sách bài làm, lặp lại chỉ thêm một chỗ phải giữ cho khớp.
 */
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class DashboardController {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int ACTIVITY_DAYS = 14;
    private static final int SKILL_WINDOW_DAYS = 30;
    /** Chuỗi ngày dài hơn thế này hiếm, và truy vấn không cần quét cả lịch sử. */
    private static final int STREAK_LOOKBACK_DAYS = 400;

    private final DashboardStatsRepository statsRepository;
    private final CurrentUser currentUser;

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        String userId = currentUser.requireUserId();
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(VN);

        Map<LocalDate, Long> secondsByDay = new HashMap<>();
        for (Object[] row : statsRepository.activeDays(userId, now.minus(Duration.ofDays(STREAK_LOOKBACK_DAYS)))) {
            secondsByDay.put(((Date) row[0]).toLocalDate(), ((Number) row[1]).longValue());
        }

        List<ActivityDay> activity = new ArrayList<>();
        for (int i = ACTIVITY_DAYS - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            activity.add(new ActivityDay(day, Math.round(secondsByDay.getOrDefault(day, 0L) / 60.0)));
        }

        List<SkillScore> skills = new ArrayList<>();
        for (Object[] row : statsRepository.skillScores(userId, now.minus(Duration.ofDays(SKILL_WINDOW_DAYS)))) {
            double percent = ((Number) row[1]).doubleValue();
            skills.add(new SkillScore((String) row[0], round1(percent / 2), ((Number) row[2]).intValue()));
        }

        return new DashboardResponse(streakOf(secondsByDay, today), activity, skills);
    }

    /**
     * Số ngày liên tiếp có luyện tập tính tới hôm nay.
     *
     * <p>Hôm nay chưa học thì vẫn tính chuỗi tới hôm qua: sáng mở app mà thấy
     * chuỗi về 0 trong khi ngày còn dài là sai và làm người học nản.
     */
    static int streakOf(Map<LocalDate, Long> activeDays, LocalDate today) {
        LocalDate day = activeDays.containsKey(today) ? today : today.minusDays(1);
        int streak = 0;
        while (activeDays.containsKey(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    private static double round1(double value) {
        return BigDecimal.valueOf(value).setScale(1, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    public record DashboardResponse(int streakDays, List<ActivityDay> activity, List<SkillScore> skills) {}

    public record ActivityDay(LocalDate date, long minutes) {}

    /** score50: điểm trung bình quy về thang 50 của Aptis. */
    public record SkillScore(String componentCode, double score50, int attempts) {}
}
