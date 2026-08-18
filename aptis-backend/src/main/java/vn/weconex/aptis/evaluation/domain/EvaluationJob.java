package vn.weconex.aptis.evaluation.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.Enums.EvaluationType;
import vn.weconex.aptis.common.util.Enums.JobStatus;

/**
 * Job chấm Speaking/Writing. Kết quả chi tiết nằm ở MongoDB
 * ({@code evaluation_documents}); bảng này giữ trạng thái và điểm tổng hợp.
 */
@Entity
@Table(name = "evaluation_jobs")
@Getter
@Setter
@NoArgsConstructor
public class EvaluationJob {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptId;

    @Column(name = "attempt_question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptQuestionSetId;

    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_type", length = 24, nullable = false)
    private EvaluationType evaluationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private JobStatus status = JobStatus.QUEUED;

    @Column(name = "mongo_evaluation_document_id", length = 100)
    private String mongoEvaluationDocumentId;

    /** Chặn tạo trùng job cho cùng một bài đã nộp. */
    @Column(name = "idempotency_key", length = 255, nullable = false)
    private String idempotencyKey;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "queued_at", nullable = false)
    private Instant queuedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static EvaluationJob queue(
            String attemptId,
            String attemptQuestionSetId,
            String questionSetId,
            String userId,
            EvaluationType type) {

        EvaluationJob job = new EvaluationJob();
        job.attemptId = attemptId;
        job.attemptQuestionSetId = attemptQuestionSetId;
        job.questionSetId = questionSetId;
        job.userId = userId;
        job.evaluationType = type;
        // Một bộ câu hỏi trong một attempt chỉ có một job cho mỗi loại chấm
        job.idempotencyKey = attemptQuestionSetId + ":" + type.name();
        return job;
    }

    public void markProcessing() {
        this.status = JobStatus.PROCESSING;
        this.startedAt = Instant.now();
    }

    public void markCompleted(String documentId) {
        this.status = JobStatus.COMPLETED;
        this.mongoEvaluationDocumentId = documentId;
        this.completedAt = Instant.now();
        // Lỗi từ các lần retry trước chỉ là tạm thời. Khi lần sau chấm thành
        // công, giữ lại retryCount để quan sát độ ổn định provider nhưng không
        // được để thông báo lỗi cũ khiến admin hiểu nhầm job đã thất bại.
        this.errorMessage = null;
    }

    public void markFailed(String error, int maxRetry) {
        this.retryCount++;
        this.errorMessage = error;
        this.status = retryCount >= maxRetry ? JobStatus.FAILED : JobStatus.QUEUED;
    }
}
