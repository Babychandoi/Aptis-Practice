package vn.weconex.aptis.asset.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import vn.weconex.aptis.common.util.Enums.AssetType;

public final class AssetDtos {

    private AssetDtos() {
    }

    /**
     * Các trường ngữ cảnh (examVersionId, attemptId...) chỉ dùng để dựng object
     * key theo quy ước §27; không có trường nào của client trở thành tên file.
     */
    public record UploadUrlRequest(
            @NotNull AssetType assetType,
            @NotBlank String mimeType,
            String filename,
            @Positive Long fileSize,

            String examVersionId,
            String componentCode,
            String partCode,
            String questionSetId,
            String attemptId,
            String jobId) {
    }

    public record UploadUrlResponse(
            String assetId,
            String uploadUrl,
            String objectKey,
            String bucket,
            int expiresInSeconds) {
    }

    public record CompleteUploadRequest(
            String checksumSha256,
            Long durationMs,
            Integer width,
            Integer height) {
    }

    public record AssetResponse(
            String id,
            String assetType,
            String mimeType,
            String status,
            Long fileSize,
            Long durationMs,
            Integer width,
            Integer height,
            /** Chỉ có giá trị khi gọi endpoint signed-url */
            String signedUrl) {
    }
}
