package vn.weconex.aptis.evaluation.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;

/**
 * Điều phối batch job chấm.
 *
 * <p>Tách khỏi {@link EvaluationWorker} là bắt buộc, không phải để cho gọn:
 * {@code @Transactional} chỉ có hiệu lực khi được gọi qua proxy Spring. Nếu
 * vòng lặp batch nằm cùng class với {@code processOne}, lời gọi nội bộ sẽ bỏ
 * qua proxy — job được chấm nhưng {@code markCompleted} không bao giờ commit,
 * và worker chấm lại cùng job mãi mãi.
 *
 * <p>Bản thân dispatcher KHÔNG có transaction: mỗi job commit độc lập, và việc
 * ghi nhận thất bại cũng cần transaction riêng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationDispatcher {

    static final int MAX_RETRY = 3;

    private final EvaluationJobRepository jobRepository;
    private final EvaluationWorker worker;
    private final EvaluationJobFailureRecorder failureRecorder;

    /**
     * @return số job đã chấm xong trong batch này
     */
    public int processBatch(int batchSize) {
        List<EvaluationJob> queued = jobRepository.findQueued(
                JobStatus.QUEUED, PageRequest.of(0, batchSize));

        int processed = 0;
        for (EvaluationJob job : queued) {
            String jobId = job.getId();
            try {
                if (worker.processOne(jobId)) {
                    processed++;
                }
            } catch (Exception ex) {
                // Transaction của processOne đã rollback nên không ghi được gì
                // từ trong đó — phải ghi nhận ở transaction độc lập
                failureRecorder.recordFailure(jobId, ex.getMessage(), MAX_RETRY);
            }
        }
        return processed;
    }
}
