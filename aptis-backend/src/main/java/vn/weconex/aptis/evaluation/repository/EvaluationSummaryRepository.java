package vn.weconex.aptis.evaluation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.evaluation.domain.EvaluationSummary;

public interface EvaluationSummaryRepository extends JpaRepository<EvaluationSummary, String> {

    List<EvaluationSummary> findByAttemptId(String attemptId);

    Optional<EvaluationSummary> findByAttemptIdAndQuestionSetIdAndIsFinalTrue(
            String attemptId, String questionSetId);

    /**
     * Một job chỉ có một bản tổng hợp của AI. Dùng để cập nhật thay vì thêm dòng
     * mới khi job được chấm lại.
     */
    Optional<EvaluationSummary> findByEvaluationJobId(String evaluationJobId);

    /**
     * Bản chấm của một giáo viên cụ thể — giáo viên khác chấm cùng bài tạo bản
     * riêng, để so sánh được.
     */
    Optional<EvaluationSummary> findByEvaluationJobIdAndEvaluatorUserId(
            String evaluationJobId, String evaluatorUserId);

    Page<EvaluationSummary> findByEvaluatorTypeAndIsFinalTrueOrderByCreatedAtDesc(
            EvaluationSummary.EvaluatorType evaluatorType, Pageable pageable);

    /**
     * Hạ cờ is_final của mọi bản chấm cho một bài, trước khi đặt bản mới thành
     * final. Giữ lại bản cũ để đối soát AI chấm lệch bao nhiêu so với giáo viên.
     *
     * <p>flush + clear: bulk update đi thẳng DB, không đồng bộ persistence
     * context — thiếu nó thì entity đã nạp giữ trạng thái cũ.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE EvaluationSummary s
            SET s.isFinal = false
            WHERE s.attemptId = :attemptId
              AND s.questionSetId = :questionSetId
              AND s.isFinal = true
            """)
    int demoteFinalFor(
            @Param("attemptId") String attemptId,
            @Param("questionSetId") String questionSetId);
}
