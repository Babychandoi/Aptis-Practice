package vn.weconex.aptis.evaluation.domain;

import java.math.BigDecimal;
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
import vn.weconex.aptis.common.util.Enums.CefrLevel;

/**
 * Điểm tổng hợp của một lần chấm (PHẦN I §18.2).
 *
 * <p>is_final = true là điểm đang được dùng. Giáo viên chấm lại sẽ tạo bản ghi
 * mới với is_final = true và bản AI cũ chuyển thành false — giữ được cả hai để
 * đối soát.
 */
@Entity
@Table(name = "evaluation_summaries")
@Getter
@Setter
@NoArgsConstructor
public class EvaluationSummary {

    public enum EvaluatorType {
        AI,
        TEACHER,
        MODERATOR
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "evaluation_job_id", columnDefinition = "CHAR(36)", nullable = false)
    private String evaluationJobId;

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptId;

    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluator_type", length = 16, nullable = false)
    private EvaluatorType evaluatorType = EvaluatorType.AI;

    @Column(name = "evaluator_user_id", columnDefinition = "CHAR(36)")
    private String evaluatorUserId;

    @Column(name = "total_score", precision = 8, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "max_score", precision = 8, scale = 2)
    private BigDecimal maxScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "cefr_level", length = 4)
    private CefrLevel cefrLevel;

    @Column(name = "is_final", nullable = false)
    private boolean isFinal = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static EvaluationSummary of(
            String jobId,
            String attemptId,
            String questionSetId,
            BigDecimal totalScore,
            BigDecimal maxScore,
            String cefrLevel) {

        EvaluationSummary summary = new EvaluationSummary();
        summary.evaluationJobId = jobId;
        summary.attemptId = attemptId;
        summary.questionSetId = questionSetId;
        summary.totalScore = totalScore;
        summary.maxScore = maxScore;
        summary.cefrLevel = cefrLevel == null ? null : CefrLevel.valueOf(cefrLevel);
        return summary;
    }
}
