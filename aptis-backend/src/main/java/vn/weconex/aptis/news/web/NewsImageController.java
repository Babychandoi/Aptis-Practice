package vn.weconex.aptis.news.web;

import java.time.Duration;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.util.Enums.AssetType;

/**
 * Phục vụ ảnh trong bài viết bảng tin.
 *
 * <p>Vì sao cần endpoint riêng thay vì signed URL: bài viết đọc tự do, mà signed
 * URL sống 10 phút và cần đăng nhập để xin — dùng nó thì hôm sau mở lại bài là
 * ảnh hỏng, và khách chưa đăng nhập không thấy ảnh nào.
 *
 * <p>Vì sao stream qua backend thay vì trỏ thẳng vào MinIO: không phải mở chính
 * sách công khai cho cả bucket, và địa chỉ MinIO nội bộ không lộ ra ngoài.
 *
 * <p>Chỉ nhận đúng {@code NEWS_IMAGE}. Loại asset khác trả 404 dù biết id — nếu
 * không thì đây thành đường vòng đọc mọi asset nội dung Premium mà không cần
 * đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/news/images")
@RequiredArgsConstructor
public class NewsImageController {

    /**
     * Ảnh không bao giờ đổi nội dung — tên object mang UUID, sửa ảnh là tải file
     * mới — nên cache dài, cho cả trình duyệt và Cloudflare.
     */
    private static final Duration CACHE_TTL = Duration.ofDays(365);

    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;

    @GetMapping("/{assetId}")
    public ResponseEntity<byte[]> image(@PathVariable String assetId) {
        Asset asset = assetRepository.findById(assetId)
                .filter(item -> item.getAssetType() == AssetType.NEWS_IMAGE)
                .filter(Asset::isReady)
                .orElseThrow(() -> ApiException.notFound("NewsImage", assetId));

        byte[] content = storageClient.download(asset.getBucketName(), asset.getObjectKey());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        asset.getMimeType() == null ? "image/jpeg" : asset.getMimeType()))
                .cacheControl(CacheControl.maxAge(CACHE_TTL).cachePublic().immutable())
                .body(content);
    }
}
