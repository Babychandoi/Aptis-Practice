package vn.weconex.aptis.practice.web;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

public final class PracticeDtos {

    private PracticeDtos() {
    }

    // ---------- Tạo lượt làm bài ----------

    /**
     * @param questionSetCount số bộ muốn luyện; bỏ trống = lấy toàn bộ Part.
     *                         Trần 300 để chặn giá trị vô lý, không phải để giới
     *                         hạn nội dung — Part lớn nhất hiện có 260 bộ và
     *                         giao diện đã phân trang từng đề.
     */
    public record CreatePartAttemptRequest(
            @NotBlank String partId,
            @Min(1) @Max(300) Integer questionSetCount,
            /** true = chỉ lấy bộ câu hỏi đã làm sai */
            boolean onlyIncorrect,
            /** true = chỉ lấy bộ chưa làm */
            boolean onlyNew,
            boolean timed) {
    }

    /**
     * Luyện tùy chọn (PHẦN IV §37). Mọi bộ lọc đều tùy chọn; backend luôn
     * giới hạn kết quả theo quyền truy cập hiện tại.
     */
    public record CreateCustomAttemptRequest(
            List<String> componentIds,
            List<String> partIds,
            List<String> topicIds,
            CefrLevel cefrMin,
            CefrLevel cefrMax,
            @Min(1) @Max(5) Integer difficultyMin,
            @Min(1) @Max(5) Integer difficultyMax,
            @Min(1) @Max(300) Integer questionSetCount,
            /** Số bộ cần lấy chính xác theo từng Part; dùng khi ghép bài test full kỹ năng. */
            Map<String, @Min(1) @Max(300) Integer> partQuestionSetCounts,
            boolean onlyNew,
            boolean onlyIncorrect,
            boolean shuffle,
            boolean timed) {
    }

    // ---------- Đọc lượt làm bài ----------

    /**
     * @param itemBankPart Part này là NGÂN HÀNG CÂU RỜI: mỗi bộ chỉ chứa một câu
     *                     và đề thi thật gộp nhiều câu lại (Writing Part 1,
     *                     Speaking Part 1). Client dùng để bỏ danh sách "chọn chủ
     *                     đề" — ở đây không có chủ đề, chỉ có câu — và hiện dải
     *                     câu đang làm thay cho tên chủ đề.
     */
    public record AttemptResponse(
            String id,
            String mode,
            String status,
            String accessLevelUsed,
            String componentId,
            String partId,
            String blueprintId,
            Instant startedAt,
            Instant submittedAt,
            Instant expiresAt,
            Integer durationSeconds,
            int timeSpentSeconds,
            int totalItems,
            int answeredItems,
            int correctItems,
            Double rawScore,
            Double maxScore,
            Double percentageScore,
            String cefrLevel,
            boolean itemBankPart,
            List<ComponentScoreResponse> componentScores,
            List<ComponentProgressResponse> componentProgress,
            List<AttemptQuestionSetResponse> questionSets) {
    }

    public record ComponentScoreResponse(
            String componentId,
            String componentCode,
            String componentName,
            int displayOrder,
            Double rawScore,
            Double maxScore,
            Double percentageScore,
            Double scaledScore,
            String cefrLevel) {
    }

    /**
     * Tiến độ một kỹ năng trong bài thi đủ 5 kỹ năng. Rỗng với luyện từng part.
     *
     * @param expiresAt   mốc hết giờ của riêng kỹ năng này; null = chưa tới lượt
     * @param submittedAt đã nộp thì client khóa hẳn kỹ năng, không cho sửa hay
     *                    xem lại
     */
    public record ComponentProgressResponse(
            String componentId,
            String componentCode,
            int displayOrder,
            int durationSeconds,
            Instant startedAt,
            Instant expiresAt,
            Instant submittedAt) {
    }

    /**
     * Nội dung đã lược answer key khi lượt chưa nộp.
     */
    /**
     * @param hotness độ hot 1-5 do biên tập viên đặt; client dùng để hiện số
     *                ngọn lửa và lọc "đề nhiều lửa". Null nếu chưa đặt.
     * @param examYear năm ghi nhận đề ra thi, ví dụ 2026; client dùng để lọc
     *                 theo năm. Null nếu chưa rõ.
     */
    public record AttemptQuestionSetResponse(
            String attemptQuestionSetId,
            String questionSetId,
            int displayOrder,
            String status,
            double maxScore,
            Double awardedScore,
            int audioPlayCount,
            Integer maxAudioPlays,
            Integer hotness,
            Integer examYear,
            QuestionSetDocument content,
            SavedResponse savedResponse) {
    }

    public record SavedResponse(
            String status,
            Instant answeredAt,
            List<ItemResponsePayload> itemResponses) {
    }

    // ---------- Ghi câu trả lời ----------

    public record SaveResponsesRequest(
            @NotEmpty List<ItemResponsePayload> itemResponses,
            /** Thời gian đã dùng cho bộ câu hỏi này, tính bởi client */
            Integer timeSpentSeconds) {
    }

    /**
     * Chỉ trường tương ứng responseType được đọc, các trường khác bỏ qua.
     */
    public record ItemResponsePayload(
            @NotBlank String itemId,
            @NotBlank String responseType,
            String selectedOptionId,
            List<String> selectedOptionIds,
            Map<String, String> matches,
            List<String> orderedOptionIds,
            String textValue,
            String recordingAssetId) {
    }

    // ---------- Kết quả ----------

    public record AttemptResultResponse(
            String attemptId,
            String status,
            Double rawScore,
            Double maxScore,
            Double percentageScore,
            CefrLevel cefrLevel,
            int totalItems,
            int correctItems,
            int incorrectItems,
            int timeSpentSeconds,
            Instant completedAt,
            List<PartScoreResponse> partScores,
            List<QuestionSetResultResponse> questionSetResults,
            /** true khi còn evaluation job đang chờ (Speaking/Writing) */
            boolean pendingEvaluation) {
    }

    public record PartScoreResponse(
            String partId,
            String partName,
            Double rawScore,
            Double maxScore,
            Double percentageScore,
            int totalItems,
            int correctItems,
            int incorrectItems) {
    }

    /**
     * Sau khi nộp mới trả answerKey và explanation.
     */
    public record QuestionSetResultResponse(
            String attemptQuestionSetId,
            String questionSetId,
            String title,
            int displayOrder,
            Double awardedScore,
            double maxScore,
            String status,
            QuestionSetDocument content,
            SavedResponse savedResponse,
            List<ItemScoreResponse> itemScores) {
    }

    public record ItemScoreResponse(
            String itemId,
            double rawScore,
            double maxScore,
            boolean correct) {
    }

    /**
     * Kết quả chấm riêng một bộ câu hỏi giữa lượt làm bài.
     *
     * <p>{@code content} là bản đã tiết lộ answer key của ĐÚNG bộ vừa chấm —
     * các bộ khác trong lượt vẫn bị lược cho tới khi nộp.
     */
    public record QuestionSetScoreResponse(
            String questionSetId,
            double awardedScore,
            double maxScore,
            int correctItems,
            int totalItems,
            List<ItemScoreResponse> itemScores,
            vn.weconex.aptis.content.mongo.QuestionSetDocument content) {
    }

    // ---------- Audio ----------

    public record AudioPlayResponse(int audioPlayCount, Integer maxAudioPlays, String signedUrl) {
    }

    // ---------- Thi thử ----------

    public record MockTestResponse(
            String id,
            String componentId,
            String code,
            String name,
            String description,
            String accessLevel,
            Integer durationSeconds,
            /** false → frontend hiển thị ổ khóa và nút nâng cấp */
            boolean canAccess,
            List<MockTestPartResponse> parts,
            int totalQuestionSets) {
    }

    public record MockTestPartResponse(
            String partId,
            String partName,
            String componentCode,
            int questionSetCount,
            int displayOrder) {
    }

    // ---------- Kết quả chấm AI ----------

    public record EvaluationResultResponse(
            String questionSetId,
            String evaluatorType,
            String model,
            double totalScore,
            double maxScore,
            String cefrLevel,
            String transcript,
            List<CriterionScoreResponse> criteria,
            FeedbackResponse feedback) {
    }

    public record CriterionScoreResponse(
            String code, String name, double score, double maxScore, String feedback) {
    }

    public record FeedbackResponse(
            String summary,
            List<String> strengths,
            List<String> weaknesses,
            List<String> suggestions,
            String correctedVersion) {
    }
}
