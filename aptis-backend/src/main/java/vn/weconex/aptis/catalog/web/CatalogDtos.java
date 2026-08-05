package vn.weconex.aptis.catalog.web;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record ExamProductResponse(String id, String code, String name, String description) {
    }

    public record ExamVersionResponse(String id, String code, String name, String examProductId) {
    }

    public record ComponentResponse(
            String id,
            String code,
            String name,
            String description,
            int displayOrder,
            Integer durationSeconds,
            Double maxScore) {
    }

    public record PartResponse(
            String id,
            String code,
            String name,
            String description,
            String instructions,
            int displayOrder,
            Integer defaultDurationSeconds,
            long publishedQuestionSetCount) {
    }

    /**
     * {@code canAccess} = false thì frontend hiển thị ổ khóa và nút nâng cấp;
     * nội dung chi tiết không được trả kèm.
     */
    public record QuestionSetSummaryResponse(
            String id,
            String code,
            String title,
            String taskTypeCode,
            String topicName,
            Byte hotness,
            int itemCount,
            Integer estimatedSeconds,
            String accessLevel,
            boolean canAccess,
            String lockReason) {
    }

    public record TopicResponse(String id, String code, String name) {
    }

}
