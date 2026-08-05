package vn.weconex.aptis.evaluation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;

public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, String> {

    Optional<EvaluationJob> findByIdempotencyKey(String idempotencyKey);

    List<EvaluationJob> findByAttemptId(String attemptId);

    long countByAttemptIdAndStatusIn(String attemptId, List<JobStatus> statuses);

    @Query("""
            SELECT j FROM EvaluationJob j
            WHERE j.status = :status
            ORDER BY j.queuedAt ASC
            """)
    List<EvaluationJob> findQueued(@Param("status") JobStatus status, Pageable pageable);
}
