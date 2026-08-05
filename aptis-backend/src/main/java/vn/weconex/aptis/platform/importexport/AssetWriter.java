package vn.weconex.aptis.platform.importexport;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.util.Enums.AccessScope;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;

/**
 * Ghi từng asset của gói ZIP, mỗi file một transaction.
 *
 * <p>Bean riêng là bắt buộc: gọi {@code @Transactional} từ vòng lặp trong cùng
 * class sẽ bỏ qua proxy Spring, cả gói dồn vào một transaction và một file lỗi
 * sẽ cuốn theo các file đã vào.
 */
@Service
@RequiredArgsConstructor
public class AssetWriter {

    private static final List<String> AUDIO_EXTENSIONS = List.of("mp3", "m4a", "wav", "ogg");

    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveOne(
            String actorId, String bucket, String filename, String extension, byte[] data) {

        String assetId = UUID.randomUUID().toString();
        // Object key sinh từ UUID chứ không từ tên file trong ZIP: tên do người
        // ngoài đặt, dùng thẳng sẽ mở đường ghi đè file khác.
        String objectKey = "content/%s/%s.%s".formatted(assetId, assetId, extension);
        String mimeType = mimeTypeOf(extension);

        storageClient.upload(bucket, objectKey, data, mimeType);

        Asset asset = new Asset();
        asset.setId(assetId);
        asset.setBucketName(bucket);
        asset.setObjectKey(objectKey);
        asset.setAssetType(AUDIO_EXTENSIONS.contains(extension)
                ? AssetType.AUDIO
                : AssetType.IMAGE);
        asset.setMimeType(mimeType);
        asset.setOriginalFilename(filename);
        asset.setFileSize((long) data.length);
        // Nội dung đề thi luôn qua signed URL, không để công khai
        asset.setAccessScope(AccessScope.SIGNED_URL);
        asset.setStatus(AssetStatus.READY);
        asset.setCreatedBy(actorId);
        assetRepository.save(asset);
    }

    static String mimeTypeOf(String extension) {
        return switch (extension) {
            case "mp3" -> "audio/mpeg";
            case "m4a" -> "audio/mp4";
            case "wav" -> "audio/wav";
            case "ogg" -> "audio/ogg";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            default -> "application/octet-stream";
        };
    }
}
