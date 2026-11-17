package vn.weconex.aptis.studyplan;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class StudyPlanDtos {

    private StudyPlanDtos() {
    }

    /**
     * @param placement bài test năng lực của học viên
     * @param estimate  điểm ước lượng từ bài đã làm (thang 50) — dùng khi chưa có lộ trình
     * @param plan      null khi chưa đặt mục tiêu
     */
    public record StudyPlanResponse(
            PlacementResponse placement,
            Map<String, SkillEstimate> estimate,
            PlanResponse plan,
            boolean premium,
            int freeDays) {
    }

    /**
     * @param status NONE | IN_PROGRESS | SCORING | DONE
     * @param kind   FULL (đủ cấu trúc) | SHORT (rút gọn); null khi chưa làm
     */
    public record PlacementResponse(String status, String attemptId, Map<String, Double> scores, String kind) {
    }

    public record SkillEstimate(Double score, String source, int attempts) {
    }

    public record PlanResponse(
            String targetLevel,
            int targetScore,
            LocalDate examDate,
            boolean examDateEstimated,
            int minutesPerDay,
            LocalDate startDate,
            String phase,
            int dayIndex,
            int totalDays,
            int daysLeft,
            int progressPercent,
            List<PhaseResponse> phases,
            List<SkillResponse> skills,
            TodayResponse today,
            List<DayResponse> week,
            List<String> warnings,
            List<Integer> restDays,
            boolean remindersEnabled,
            ReportResponse report,
            /** Đã tới hoặc qua ngày thi. */
            boolean examPassed,
            ExamResultResponse examResult) {
    }

    /**
     * Tình hình 7 ngày gần nhất.
     *
     * @param likelihood  khả năng đạt mục tiêu nếu giữ nhịp hiện tại: HIGH | MEDIUM | LOW (ước lượng)
     * @param scoreChange tổng điểm thay đổi so với lúc bắt đầu, trên các kỹ năng đã có điểm mới
     */
    public record ReportResponse(int last7Done, int last7Total, int activeDays7, String likelihood, Double scoreChange) {
    }

    public record ExamResultResponse(LocalDate examDate, String level, String note) {
    }

    public record PhaseResponse(String phase, LocalDate from, LocalDate to, int days) {
    }

    /** Điểm thang 50: lúc bắt đầu, hiện tại (bài test gần nhất), mục tiêu. */
    public record SkillResponse(String code, Double baseline, String baselineSource, Double current, int target, double gap) {
    }

    public record TodayResponse(LocalDate date, boolean locked, List<TaskResponse> tasks) {
    }

    /**
     * @param session true: bấm vào thì gọi POST /study-plan/tasks/start để mở phiên luyện với đề chọn sẵn
     * @param href    đường dẫn riêng của việc (xem nhận xét AI một bài cụ thể); null thì giao diện tự suy ra
     */
    public record TaskResponse(
            String key, String type, String skill, Integer part, int count, int minutes, boolean done, boolean carried,
            boolean session, String href) {
    }

    public record DayResponse(LocalDate date, String phase, int total, int done, boolean locked, boolean today) {
    }

    /**
     * @param examDate   null = chưa biết, hệ thống đặt 8 tuần
     * @param selfLevel  trình độ tự khai (A1…C1) khi chưa làm test và chưa có bài đã làm
     */
    public record SavePlanRequest(
            @NotBlank String targetLevel,
            LocalDate examDate,
            @Min(15) @Max(240) int minutesPerDay,
            String selfLevel,
            /** Ngày nghỉ trong tuần, ISO 1-7; null = giữ nguyên. */
            List<Integer> restDays,
            /** Nhắc qua email khi bỏ học; null = giữ nguyên. */
            Boolean remindersEnabled) {
    }

    /** @param kind FULL | SHORT; bỏ trống = FULL */
    public record PlacementStartRequest(String kind) {
    }

    public record PlacementStartResponse(String attemptId) {
    }

    public record StartTaskRequest(@NotBlank String key) {
    }

    public record StartTaskResponse(String attemptId, int setCount) {
    }

    /** @param level A1…C1 hoặc NA (chưa có kết quả / chưa thi) */
    public record ExamResultRequest(@NotBlank String level, String note) {
    }
}
