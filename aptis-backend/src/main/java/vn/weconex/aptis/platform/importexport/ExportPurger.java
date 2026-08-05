package vn.weconex.aptis.platform.importexport;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;

/**
 * Xóa file báo cáo quá hạn, mỗi job một transaction.
 *
 * <p>Bean riêng là bắt buộc: gọi {@code @Transactional} từ vòng lặp trong cùng
 * class sẽ bỏ qua proxy Spring, cả batch dồn vào một transaction và một job
 * hỏng sẽ cuốn theo các job đã dọn xong.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportPurger {

    private final ExportJobRepository exportJobRepository;
    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;

    /**
     * @return true nếu đã dọn; false nếu bỏ qua để lượt sau thử lại
     */
    @Transactional
    public boolean purgeOne(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId).orElse(null);
        if (job == null || job.getResultAssetId() == null) {
            return false;
        }

        Asset asset = assetRepository.findById(job.getResultAssetId()).orElse(null);
        if (asset != null) {
            try {
                // Xóa file TRƯỚC khi bỏ tham chiếu. Làm ngược lại thì file sẽ
                // nằm lại MinIO mà không còn gì trỏ tới để dọn.
                storageClient.removeObject(asset.getBucketName(), asset.getObjectKey());
            } catch (RuntimeException ex) {
                log.warn("Chưa xóa được file báo cáo {}/{}, sẽ thử lại lượt sau",
                        asset.getBucketName(), asset.getObjectKey(), ex);
                return false;
            }
            assetRepository.delete(asset);
        }

        job.setResultAssetId(null);
        return true;
    }
}
