package vn.weconex.aptis.asset.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.web.AssetDtos;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.AuthPrincipal;
import vn.weconex.aptis.common.util.Enums.AccessScope;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.service.ContentAccessService;

/**
 * Luồng upload an toàn theo PHẦN III §28:
 * xin URL -> kiểm tra quyền -> tạo asset UPLOADING -> client upload trực tiếp
 * -> client báo hoàn tất -> backend xác minh -> READY.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetService {

    /** Chặn upload loại file không dùng đến (PHẦN VII §51). */
    private static final Map<AssetType, Set<String>> ALLOWED_MIME_TYPES = Map.of(
            AssetType.IMAGE, Set.of("image/jpeg", "image/png", "image/webp"),
            AssetType.AUDIO, Set.of("audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"),
            AssetType.USER_RECORDING, Set.of("audio/webm", "audio/mp4", "audio/ogg", "audio/wav"),
            AssetType.AVATAR, Set.of("image/jpeg", "image/png", "image/webp"),
            AssetType.DOCUMENT, Set.of("application/pdf"),
            AssetType.IMPORT_FILE, Set.of(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/zip"));

    private static final Map<AssetType, Long> MAX_SIZE_BYTES = Map.of(
            AssetType.IMAGE, 5L * 1024 * 1024,
            AssetType.AVATAR, 2L * 1024 * 1024,
            AssetType.AUDIO, 20L * 1024 * 1024,
            AssetType.USER_RECORDING, 10L * 1024 * 1024,
            AssetType.DOCUMENT, 20L * 1024 * 1024,
            AssetType.IMPORT_FILE, 50L * 1024 * 1024);

    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;
    private final QuestionSetDocumentRepository documentRepository;
    private final ContentAccessService contentAccessService;
    private final AptisProperties properties;

    @Transactional
    public AssetDtos.UploadUrlResponse createUploadUrl(
            AuthPrincipal principal, AssetDtos.UploadUrlRequest request) {

        AssetType assetType = request.assetType();
        validateMimeType(assetType, request.mimeType());
        validateSize(assetType, request.fileSize());
        requireUploadPermission(principal, assetType);

        String assetId = UUID.randomUUID().toString();
        String bucket = resolveBucket(assetType);
        // Object key do backend sinh, dùng UUID — không lấy filename người dùng
        String objectKey = buildObjectKey(assetType, assetId, principal.userId(), request);

        Asset asset = new Asset();
        asset.setId(assetId);
        asset.setBucketName(bucket);
        asset.setObjectKey(objectKey);
        asset.setAssetType(assetType);
        asset.setMimeType(request.mimeType());
        asset.setOriginalFilename(request.filename());
        asset.setFileSize(request.fileSize());
        asset.setStatus(AssetStatus.UPLOADING);
        asset.setAccessScope(resolveAccessScope(assetType));
        asset.setCreatedBy(principal.userId());
        if (isUserOwned(assetType)) {
            asset.setOwnerUserId(principal.userId());
        }
        assetRepository.save(asset);

        String uploadUrl = storageClient.presignedUploadUrl(bucket, objectKey);

        return new AssetDtos.UploadUrlResponse(
                assetId,
                uploadUrl,
                objectKey,
                bucket,
                (int) properties.minio().presignedUrlTtl().toSeconds());
    }

    /**
     * Xác minh file thật trên storage trước khi đổi sang READY — không tin
     * kích thước/checksum client báo.
     */
    @Transactional
    public AssetDtos.AssetResponse completeUpload(
            AuthPrincipal principal, String assetId, AssetDtos.CompleteUploadRequest request) {

        Asset asset = requireOwnedOrStaff(principal, assetId);

        if (asset.isReady()) {
            return toResponse(asset, null);
        }

        var stat = storageClient.statObject(asset.getBucketName(), asset.getObjectKey())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.ASSET_NOT_READY, "Chưa tìm thấy file trên storage"));

        Long limit = MAX_SIZE_BYTES.get(asset.getAssetType());
        if (limit != null && stat.size() > limit) {
            // File đã lên nhưng vượt hạn mức: xóa để không chiếm dung lượng
            storageClient.removeObject(asset.getBucketName(), asset.getObjectKey());
            asset.markFailed();
            throw new ApiException(
                    ErrorCode.ASSET_TOO_LARGE,
                    "File vượt kích thước cho phép",
                    Map.of("size", stat.size(), "limit", limit));
        }

        if (request != null
                && request.checksumSha256() != null
                && asset.getChecksumSha256() != null
                && !request.checksumSha256().equalsIgnoreCase(asset.getChecksumSha256())) {
            throw new ApiException(ErrorCode.ASSET_CHECKSUM_MISMATCH, "Checksum không khớp");
        }

        asset.markReady(stat.size(), request == null ? null : request.checksumSha256());
        if (request != null) {
            if (request.durationMs() != null) {
                asset.setDurationMs(request.durationMs());
            }
            if (request.width() != null) {
                asset.setWidth(request.width());
            }
            if (request.height() != null) {
                asset.setHeight(request.height());
            }
        }

        return toResponse(assetRepository.save(asset), null);
    }

    /**
     * Signed URL ngắn hạn. Asset của người dùng chỉ chính chủ hoặc staff có
     * quyền mới xin được; asset nội dung phải qua kiểm tra entitlement.
     */
    @Transactional(readOnly = true)
    public AssetDtos.AssetResponse signedUrl(AuthPrincipal principal, String assetId) {
        Asset asset = requireOwnedOrStaff(principal, assetId);

        if (asset.getOwnerUserId() == null) {
            requireContentAssetAccess(principal, asset);
        }

        if (!asset.isReady()) {
            throw new ApiException(ErrorCode.ASSET_NOT_READY, "File chưa sẵn sàng");
        }

        String url = storageClient.presignedDownloadUrl(asset.getBucketName(), asset.getObjectKey());
        return toResponse(asset, url);
    }

    @Transactional
    public void delete(AuthPrincipal principal, String assetId) {
        Asset asset = requireOwnedOrStaff(principal, assetId);

        storageClient.removeObject(asset.getBucketName(), asset.getObjectKey());
        // Xóa mềm: giữ metadata để đối soát, tránh mất dấu asset đã dùng trong đề cũ
        asset.setStatus(AssetStatus.DELETED);
        assetRepository.save(asset);
    }

    // -----------------------------------------------------------------

    /**
     * Chặn rò rỉ nội dung Premium qua đường file.
     *
     * <p>Asset nội dung không có {@code ownerUserId} nên {@link
     * #requireOwnedOrStaff} cho qua. Trước đây luồng dừng ở đó: bất kỳ tài khoản
     * đã đăng nhập nào biết assetId cũng xin được signed URL, kể cả audio của
     * bài Premium — chỉ cần một học viên Premium gửi assetId cho người khác.
     *
     * <p>Ở đây suy ngược ra bộ câu hỏi đang dùng asset rồi kiểm entitlement qua
     * {@link ContentAccessService}, đúng cửa mà mọi đường truy cập nội dung khác
     * đều đi qua.
     *
     * <p>Không tìm thấy bộ nào (asset mồ côi, hoặc vừa upload chưa gắn vào đề)
     * thì từ chối: chỉ staff mới đọc được. Fail closed.
     */
    private void requireContentAssetAccess(AuthPrincipal principal, Asset asset) {
        if (isContentStaff(principal)) {
            return;
        }

        List<String> questionSetIds = documentRepository.findByAssetId(asset.getId()).stream()
                .map(QuestionSetDocument::getQuestionSetId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (!contentAccessService.canAccessAny(principal.userId(), questionSetIds)) {
            throw ApiException.forbidden("Không có quyền truy cập file này");
        }
    }

    /**
     * Người làm nội dung phải nghe/xem được file mình vừa tải lên, kể cả khi
     * asset chưa gắn vào bộ câu hỏi nào — nên {@code asset:write} cũng được qua.
     */
    private static boolean isContentStaff(AuthPrincipal principal) {
        return principal.hasPermission("asset:write")
                || principal.hasPermission("evaluation:review")
                || principal.hasRole("ADMIN")
                || principal.hasRole("SUPER_ADMIN");
    }

    private Asset requireOwnedOrStaff(AuthPrincipal principal, String assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> ApiException.notFound("Asset", assetId));

        if (asset.getOwnerUserId() == null) {
            // Asset nội dung: không có chủ nên không xét được ở đây. Quyền do
            // requireContentAssetAccess kiểm, gọi riêng ở signedUrl.
            return asset;
        }
        boolean owner = asset.getOwnerUserId().equals(principal.userId());
        boolean canReview = principal.hasPermission("evaluation:review")
                || principal.hasRole("ADMIN")
                || principal.hasRole("SUPER_ADMIN");

        if (!owner && !canReview) {
            throw ApiException.forbidden("Không có quyền truy cập file này");
        }
        return asset;
    }

    private void requireUploadPermission(AuthPrincipal principal, AssetType assetType) {
        boolean userScoped = isUserOwned(assetType);
        if (userScoped) {
            return; // học viên tự upload ghi âm và avatar
        }
        if (!principal.hasPermission("asset:write")) {
            throw ApiException.forbidden("Không có quyền tải file nội dung");
        }
    }

    private static boolean isUserOwned(AssetType assetType) {
        return assetType == AssetType.USER_RECORDING || assetType == AssetType.AVATAR;
    }

    private void validateMimeType(AssetType assetType, String mimeType) {
        Set<String> allowed = ALLOWED_MIME_TYPES.get(assetType);
        if (allowed == null || !allowed.contains(mimeType)) {
            throw new ApiException(
                    ErrorCode.ASSET_TYPE_NOT_ALLOWED,
                    "Loại file không được phép: " + mimeType,
                    Map.of("assetType", assetType, "allowed", allowed == null ? Set.of() : allowed));
        }
    }

    private void validateSize(AssetType assetType, Long declaredSize) {
        Long limit = MAX_SIZE_BYTES.get(assetType);
        if (limit != null && declaredSize != null && declaredSize > limit) {
            throw new ApiException(
                    ErrorCode.ASSET_TOO_LARGE,
                    "File vượt kích thước cho phép",
                    Map.of("size", declaredSize, "limit", limit));
        }
    }

    private String resolveBucket(AssetType assetType) {
        AptisProperties.Minio.Buckets buckets = properties.minio().buckets();
        return switch (assetType) {
            case USER_RECORDING -> buckets.userRecordings();
            case AVATAR -> buckets.userUploads();
            case IMPORT_FILE -> buckets.imports();
            case EXPORT_FILE -> buckets.exports();
            case IMAGE, AUDIO, VIDEO, DOCUMENT -> buckets.content();
        };
    }

    private AccessScope resolveAccessScope(AssetType assetType) {
        // Mọi asset nội dung và file người dùng đều qua signed URL,
        // không có URL vĩnh viễn (PHẦN VII §51)
        return AccessScope.SIGNED_URL;
    }

    /**
     * Quy ước object key theo PHẦN III §27.
     */
    private String buildObjectKey(
            AssetType assetType,
            String assetId,
            String userId,
            AssetDtos.UploadUrlRequest request) {

        String extension = extensionFor(request.mimeType());

        return switch (assetType) {
            case USER_RECORDING -> "users/%s/speaking/%s/%s/%s%s".formatted(
                    userId,
                    orDefault(request.attemptId(), "unknown"),
                    orDefault(request.questionSetId(), "unknown"),
                    assetId,
                    extension);
            case AVATAR -> "users/%s/avatars/%s%s".formatted(userId, assetId, extension);
            case IMPORT_FILE -> "imports/%s/%s/%s%s".formatted(
                    userId, orDefault(request.jobId(), assetId), assetId, extension);
            case EXPORT_FILE -> "exports/%s/%s/%s%s".formatted(
                    userId, orDefault(request.jobId(), assetId), assetId, extension);
            default -> "content/%s/%s/%s/%s/%s/%s%s".formatted(
                    orDefault(request.examVersionId(), "common"),
                    orDefault(request.componentCode(), "common"),
                    orDefault(request.partCode(), "common"),
                    orDefault(request.questionSetId(), "unassigned"),
                    folderFor(assetType),
                    assetId,
                    extension);
        };
    }

    private static String folderFor(AssetType assetType) {
        return switch (assetType) {
            case AUDIO -> "audio";
            case IMAGE -> "images";
            case VIDEO -> "video";
            default -> "files";
        };
    }

    private static String extensionFor(String mimeType) {
        return switch (mimeType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "audio/mpeg" -> ".mp3";
            case "audio/mp4" -> ".m4a";
            case "audio/webm" -> ".webm";
            case "audio/ogg" -> ".ogg";
            case "audio/wav" -> ".wav";
            case "application/pdf" -> ".pdf";
            case "application/zip" -> ".zip";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> ".xlsx";
            default -> "";
        };
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static AssetDtos.AssetResponse toResponse(Asset asset, String signedUrl) {
        return new AssetDtos.AssetResponse(
                asset.getId(),
                asset.getAssetType().name(),
                asset.getMimeType(),
                asset.getStatus().name(),
                asset.getFileSize(),
                asset.getDurationMs(),
                asset.getWidth(),
                asset.getHeight(),
                signedUrl);
    }
}
