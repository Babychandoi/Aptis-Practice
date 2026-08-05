package vn.weconex.aptis.platform.importexport;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;

/**
 * Ghi trạng thái export job và metadata asset trong transaction độc lập.
 *
 * <p>{@code REQUIRES_NEW} cho {@link #markFailed} — cùng lý do như
 * {@link ImportJobStatusWriter}: transaction của lần xử lý đã rollback.
 */
@Service
@RequiredArgsConstructor
public class ExportJobStatusWriter {

    private final ExportJobRepository repository;
    private final AssetRepository assetRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessing(String jobId) {
        repository.findById(jobId).ifPresent(job -> {
            job.markProcessing();
            repository.save(job);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(String jobId, String resultAssetId) {
        repository.findById(jobId).ifPresent(job -> {
            job.markCompleted(resultAssetId);
            repository.save(job);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String jobId, String error) {
        repository.findById(jobId).ifPresent(job -> {
            job.markFailed(truncate(error));
            repository.save(job);
        });
    }

    /**
     * Asset phải commit trước khi job trỏ tới nó, nếu không job COMPLETED có thể
     * tham chiếu asset chưa tồn tại.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Asset saveAsset(Asset asset) {
        return assetRepository.save(asset);
    }

    private static String truncate(String error) {
        if (error == null) {
            return "Lỗi không rõ";
        }
        return error.length() <= 2000 ? error : error.substring(0, 2000);
    }
}
