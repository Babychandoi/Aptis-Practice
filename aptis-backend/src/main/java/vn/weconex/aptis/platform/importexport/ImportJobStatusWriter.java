package vn.weconex.aptis.platform.importexport;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi trạng thái import job trong transaction độc lập.
 *
 * <p>{@code REQUIRES_NEW} cho {@link #markFailed}: khi job lỗi, transaction của
 * lần xử lý đã rollback nên ghi trạng thái trong đó cũng mất — job sẽ mãi ở
 * QUEUED và bị xử lý lại vô hạn.
 */
@Service
@RequiredArgsConstructor
public class ImportJobStatusWriter {

    private final ImportJobRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessing(String jobId) {
        repository.findById(jobId).ifPresent(job -> {
            job.markProcessing();
            repository.save(job);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFinished(
            String jobId, int total, int success, int failed, String errorReportAssetId) {

        repository.findById(jobId).ifPresent(job -> {
            job.markFinished(total, success, failed, errorReportAssetId);
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

    private static String truncate(String error) {
        if (error == null) {
            return "Lỗi không rõ";
        }
        return error.length() <= 2000 ? error : error.substring(0, 2000);
    }
}
