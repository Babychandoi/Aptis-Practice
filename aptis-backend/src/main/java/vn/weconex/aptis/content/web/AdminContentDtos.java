package vn.weconex.aptis.content.web;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.common.util.Enums.ContentStatus;

public final class AdminContentDtos {

    private AdminContentDtos() {
    }

    // ---------- Tạo / sửa ----------

    public record CreateQuestionSetRequest(
            @NotBlank String partId,
            @NotBlank String taskTypeId,
            String topicId,
            @Size(max = 255) String topicName,
            @NotBlank @Size(max = 100) String code,
            @Size(max = 255) String title,
            @Min(1) @Max(5) Integer difficulty,
            @Min(1) @Max(5) Integer hotness,
            @Min(2000) @Max(2100) Integer examYear,
            CefrLevel cefrMin,
            CefrLevel cefrMax,
            @NotNull AccessLevel accessLevel,
            @Positive Integer estimatedSeconds,
            @NotNull @Valid ContentPayload content) {
    }

    public record UpdateQuestionSetRequest(
            String topicId,
            @Size(max = 255) String topicName,
            @Size(max = 255) String title,
            @Min(1) @Max(5) Integer difficulty,
            @Min(1) @Max(5) Integer hotness,
            @Min(2000) @Max(2100) Integer examYear,
            CefrLevel cefrMin,
            CefrLevel cefrMax,
            AccessLevel accessLevel,
            @Positive Integer estimatedSeconds,
            @Valid ContentPayload content) {
    }

    /**
     * Nội dung câu hỏi do biên tập viên gửi lên. Answer key nằm ở đây —
     * đây là API nội bộ, đã qua RBAC nên được phép nhận và trả đáp án.
     */
    public record ContentPayload(
            String instructions,
            RichContentPayload stimulus,
            List<SectionPayload> sections,
            @NotEmpty @Valid List<ItemPayload> items,
            List<AssetRefPayload> assets,
            SettingsPayload settings,
            ScoringPayload scoring) {
    }

    public record RichContentPayload(String type, String format, String value) {
    }

    public record SectionPayload(
            @NotBlank String id, String label, RichContentPayload content) {
    }

    public record OptionPayload(@NotBlank String id, String code, String content) {
    }

    public record ItemPayload(
            @NotBlank String id,
            @Min(1) int sequenceNo,
            RichContentPayload prompt,
            @NotBlank String responseType,
            Boolean required,
            @Positive Double maxScore,
            List<OptionPayload> options,
            List<OptionPayload> leftItems,
            List<OptionPayload> rightItems,
            Map<String, Object> constraints,
            String rubricCode,
            AnswerKeyPayload answerKey,
            RichContentPayload explanation) {
    }

    public record AnswerKeyPayload(
            String type,
            String selectedOptionId,
            List<String> selectedOptionIds,
            Map<String, String> matches,
            List<String> orderedOptionIds,
            List<String> acceptedValues,
            Boolean caseSensitive) {
    }

    public record AssetRefPayload(@NotBlank String assetId, String role, Integer displayOrder) {
    }

    public record SettingsPayload(
            Boolean shuffleOptions,
            Boolean shuffleItems,
            Integer maxAudioPlays,
            Boolean showAnswerAfterEachItem,
            Boolean allowReview) {
    }

    public record ScoringPayload(String strategy, Boolean partialCredit) {
    }

    // ---------- Chuyển trạng thái ----------

    public record TransitionRequest(@Size(max = 500) String note) {
    }

    /**
     * Kết quả publish. {@code errors} rỗng nghĩa là đã publish thành công.
     */
    public record PublishResultResponse(
            String questionSetId,
            String status,
            int revision,
            String contentChecksum,
            List<String> errors) {
    }

    // ---------- Đọc ----------

    public record AdminQuestionSetResponse(
            String id,
            String code,
            String title,
            String partId,
            String partName,
            String componentCode,
            String taskTypeCode,
            String topicId,
            String topicName,
            Byte difficulty,
            Byte hotness,
            Integer examYear,
            CefrLevel cefrMin,
            CefrLevel cefrMax,
            AccessLevel accessLevel,
            ContentStatus status,
            int currentRevision,
            String contentChecksum,
            int itemCount,
            Integer estimatedSeconds,
            double maxScore,
            Instant publishedAt,
            String createdBy,
            String updatedBy,
            Instant createdAt,
            Instant updatedAt,
            /** Chỉ có ở API chi tiết; API danh sách để null cho gọn payload. */
            ContentPayload content) {
    }

    public record RevisionSummaryResponse(
            int revision,
            String changeSummary,
            String createdBy,
            Instant createdAt) {
    }

    /** Xem trước bằng đúng bản mà học viên sẽ thấy (đã lược đáp án). */
    public record PreviewResponse(
            String questionSetId,
            int revision,
            boolean answersHidden,
            Object content) {
    }
}
