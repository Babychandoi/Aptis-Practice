package vn.weconex.aptis.evaluation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;

public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, String> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE EvaluationJob j
               SET j.status = :processing, j.startedAt = :startedAt
             WHERE j.id = :id AND j.status = :queued
            """)
    int claim(
            @Param("id") String id,
            @Param("queued") JobStatus queued,
            @Param("processing") JobStatus processing,
            @Param("startedAt") java.time.Instant startedAt);

    Optional<EvaluationJob> findByIdempotencyKey(String idempotencyKey);

    List<EvaluationJob> findByAttemptId(String attemptId);

    long countByAttemptIdAndStatusIn(String attemptId, List<JobStatus> statuses);

    /**
     * Số job của attempt còn chờ hoặc đang chấm, đọc bản đã commit mới nhất.
     *
     * <p>Phải là locking read (FOR SHARE). MySQL chạy REPEATABLE READ: một SELECT
     * thường dùng ảnh chụp lấy từ lần đọc đầu tiên của transaction, trước khi worker
     * chờ được khoá attempt. Hai job cùng attempt xong cùng lúc thì job sau vẫn thấy
     * job trước "đang chấm", không job nào chốt attempt và bài nằm mãi ở SCORING
     * (đã xảy ra 28/09).
     */
    @Query(value = "SELECT COUNT(*) FROM evaluation_jobs WHERE attempt_id = :attemptId"
            + " AND status IN (QUEUED, PROCESSING) FOR SHARE", nativeQuery = true)
    long countPendingCurrent(@Param("attemptId") String attemptId);

    @Query("""
            SELECT j FROM EvaluationJob j
            WHERE j.status = :status
            ORDER BY j.queuedAt ASC
            """)
    List<EvaluationJob> findQueued(@Param("status") JobStatus status, Pageable pageable);

    @Transactional
    @Modifying
    @Query("""
            UPDATE EvaluationJob j
               SET j.status = :queued, j.startedAt = NULL, j.retryCount = j.retryCount + 1
             WHERE j.status = :processing
               AND (j.startedAt IS NULL OR j.startedAt < :staleThreshold)
               AND j.retryCount < :maxRetry
            """)
    int requeueStaleJobs(
            @Param("queued") JobStatus queued,
            @Param("processing") JobStatus processing,
            @Param("staleThreshold") java.time.Instant staleThreshold,
            @Param("maxRetry") int maxRetry);
}
