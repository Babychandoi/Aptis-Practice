package vn.weconex.aptis.evaluation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;

/**
 * Ghi nhận job chấm thất bại trong transaction độc lập.
 *
 * <p>Bắt buộc phải tách bean riêng với {@code REQUIRES_NEW}: khi job lỗi,
 * transaction của lần xử lý đó bị rollback. Nếu ghi retry_count trong cùng
 * transaction thì nó cũng bị rollback, job mãi ở retry_count = 0 và worker
 * retry vô hạn thay vì dừng ở MAX_RETRY.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationJobFailureRecorder {

    private final EvaluationJobRepository jobRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String jobId, String error, int maxRetry) {
        EvaluationJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }

        job.markFailed(truncate(error), maxRetry);
        jobRepository.save(job);

        log.warn("Job chấm {} thất bại lần {}/{}: {}",
                jobId, job.getRetryCount(), maxRetry, error);
    }

    /** Cột error_message là TEXT nhưng stack trace dài không giúp gì thêm. */
    private static String truncate(String error) {
        if (error == null) {
            return "Lỗi không rõ";
        }
        return error.length() <= 1000 ? error : error.substring(0, 1000);
    }
}
