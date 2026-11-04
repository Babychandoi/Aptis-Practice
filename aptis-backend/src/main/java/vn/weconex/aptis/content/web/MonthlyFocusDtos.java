package vn.weconex.aptis.content.web;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

public final class MonthlyFocusDtos {

    private MonthlyFocusDtos() {
    }

    /** Kết quả một lần làm câu: Speaking/Writing không tự chấm được nên chỉ ghi DONE. */
    public enum Result { CORRECT, WRONG, DONE }

    /**
     * Một trang luyện trọng điểm. Học viên chưa Premium vẫn thấy cả danh sách, nhưng
     * chỉ {@code freeLimit} câu đầu có nội dung; câu còn lại {@code locked = true}.
     */
    public record PageResponse(
            String pageKey,
            boolean premium,
            int freeLimit,
            List<TopicResponse> topics,
            List<ItemResponse> items,
            List<TipResponse> tips) {
    }

    /** Chủ đề trong trang (gom các phiên bản) hoặc câu lạc bộ Writing. */
    public record TopicResponse(
            String topicKey,
            String title,
            Integer stars,
            Integer rank,
            String iconName,
            String color,
            String description) {
    }

    /**
     * Một đề của trang. {@code content} đã lộ đáp án và giải thích — trình luyện trọng
     * điểm chấm ngay trên trình duyệt; null khi {@code locked}.
     */
    public record ItemResponse(
            String questionSetId,
            String topicKey,
            Integer clubPart,
            Integer version,
            String title,
            boolean locked,
            QuestionSetDocument content) {
    }

    public record TipResponse(String title, String description, List<String> content) {
    }

    /** Số đề của từng trang, cho các thẻ ở trang chọn kỹ năng/Part. */
    public record SummaryResponse(Map<String, Integer> counts) {
    }

    public record ProgressEntry(String questionSetId, int attempts, int correctAttempts, Result lastResult) {
    }

    public record RecordProgressRequest(@NotBlank String questionSetId, @NotNull Result result) {
    }

    /** URL ký ngắn hạn cho audio/ảnh của một đề, theo assetId. */
    public record AssetUrlsResponse(Map<String, String> urls) {
    }

    /** Trang Writing: topic dự đoán ưu tiên cao của ngày gần nhất + danh sách câu lạc bộ. */
    public record WritingOverviewResponse(
            LocalDate predictDate,
            List<String> hotTopics,
            List<TopicResponse> clubs) {
    }
}
