package vn.weconex.aptis.evaluation.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
public class EvaluationDispatcher {

    static final int MAX_RETRY = 3;

    private final EvaluationJobRepository jobRepository;
    private final EvaluationWorker worker;
    private final EvaluationJobFailureRecorder failureRecorder;

    /**
     * Luồng chấm song song. Dùng pool riêng thay vì ForkJoinPool.commonPool():
     * chấm bài là tác vụ chờ mạng dài, để chung sẽ chiếm hết luồng của mọi thứ
     * khác trong JVM.
     */
    private final ExecutorService executor;

    public EvaluationDispatcher(
            EvaluationJobRepository jobRepository,
            EvaluationWorker worker,
            EvaluationJobFailureRecorder failureRecorder,
            @Value("${aptis.evaluation.worker-threads:8}") int workerThreads) {
        this.jobRepository = jobRepository;
        this.worker = worker;
        this.failureRecorder = failureRecorder;
        this.executor = Executors.newFixedThreadPool(Math.max(1, workerThreads), runnable -> {
            Thread thread = new Thread(runnable, "evaluation-worker");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Transactional
    public int recoverStaleJobs() {
        java.time.Instant staleThreshold = java.time.Instant.now().minus(java.time.Duration.ofMinutes(2));
        return jobRepository.requeueStaleJobs(
                JobStatus.QUEUED, JobStatus.PROCESSING, staleThreshold, MAX_RETRY);
    }

    /**
     * @return số job đã chấm xong trong batch này
     */
    public int processBatch(int batchSize) {
        try {
            int recovered = recoverStaleJobs();
            if (recovered > 0) {
                log.warn("Đã tự động khôi phục {} job chấm Speaking/Writing bị kẹt ở PROCESSING", recovered);
            }
        } catch (Exception ex) {
            log.error("Lỗi khi khôi phục stale evaluation jobs: {}", ex.getMessage());
        }

        List<EvaluationJob> queued = jobRepository.findQueued(
                JobStatus.QUEUED, PageRequest.of(0, batchSize));
        if (queued.isEmpty()) {
            return 0;
        }

        // Chấm song song, không tuần tự. Mỗi bài mất khoảng 5 giây chờ mạng, nên
        // chạy lần lượt thì cả batch chỉ đạt ~0,2 bài/giây trong khi nhà cung cấp
        // đáp ứng được vài bài/giây. Số luồng bị chặn bởi tổng trần đồng thời của
        // các provider (xem LlmProviderPool) — vượt lên nữa chỉ nhận 429.
        List<CompletableFuture<Boolean>> futures = new ArrayList<>(queued.size());
        for (EvaluationJob job : queued) {
            String jobId = job.getId();
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    return worker.processOne(jobId);
                } catch (Exception ex) {
                    // Transaction của processOne đã rollback nên không ghi được gì
                    // từ trong đó — phải ghi nhận ở transaction độc lập
                    failureRecorder.recordFailure(jobId, ex.getMessage(), MAX_RETRY);
                    return false;
                }
            }, executor));
        }

        int processed = 0;
        for (CompletableFuture<Boolean> future : futures) {
            try {
                if (Boolean.TRUE.equals(future.join())) {
                    processed++;
                }
            } catch (Exception ex) {
                log.error("Lỗi ngoài dự kiến khi chờ job chấm: {}", ex.getMessage());
            }
        }
        return processed;
    }

    /**
     * Chấm ngay các job vừa được tạo, không chờ lượt quét kế tiếp.
     *
     * <p>{@code AFTER_COMMIT} là bắt buộc: job phải nằm trong DB trước khi worker
     * đọc, vì {@code processOne} mở transaction riêng và sẽ không thấy dữ liệu
     * chưa commit của transaction nộp bài.
     *
     * <p>Không chờ kết quả: học viên đã nhận phản hồi nộp bài xong từ trước, việc
     * chấm chạy nền. Job nào lọt (JVM tắt giữa lúc chấm, mọi provider đang bận)
     * vẫn được scheduler nhặt lại — đây là đường nhanh, không phải đường duy nhất.
     */
    @org.springframework.transaction.event.TransactionalEventListener(
            phase = org.springframework.transaction.event.TransactionPhase.AFTER_COMMIT)
    public void onJobsQueued(vn.weconex.aptis.evaluation.event.EvaluationJobsQueuedEvent event) {
        for (String jobId : event.jobIds()) {
            try {
                executor.execute(() -> {
                    try {
                        worker.processOne(jobId);
                    } catch (Exception ex) {
                        // Ghi nhận để scheduler retry; không ném ra khỏi luồng nền
                        // vì không ai bắt được ở đây.
                        log.warn("Chấm ngay job {} không thành công ({}); scheduler sẽ thử lại",
                                jobId, ex.getMessage());
                        try {
                            failureRecorder.recordFailure(jobId, ex.getMessage(), MAX_RETRY);
                        } catch (Exception ignored) {
                            // Ghi nhận thất bại cũng lỗi thì để scheduler tự khôi phục
                        }
                    }
                });
            } catch (java.util.concurrent.RejectedExecutionException ex) {
                // Pool đầy hoặc đang tắt: scheduler vẫn còn đó, job không mất.
                log.debug("Không xếp được job {} vào luồng chấm ngay; chờ scheduler", jobId);
            }
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
