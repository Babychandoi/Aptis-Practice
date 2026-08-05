package vn.weconex.aptis.practice.domain;

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
import vn.weconex.aptis.common.util.Enums.AttemptItemStatus;

/**
 * Bộ câu hỏi đã được chọn vào một lượt làm bài. Bảng không có
 * created_at/updated_at nên không kế thừa BaseEntity.
 */
@Entity
@Table(name = "attempt_question_sets")
@Getter
@Setter
@NoArgsConstructor
public class AttemptQuestionSet {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptId;

    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    /** Revision tại thời điểm snapshot — admin sửa đề sau đó không ảnh hưởng. */
    @Column(name = "question_revision", nullable = false)
    private int questionRevision;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "mongo_snapshot_key", length = 255, nullable = false)
    private String mongoSnapshotKey;

    @Column(name = "max_score", precision = 8, scale = 2, nullable = false)
    private BigDecimal maxScore = BigDecimal.ONE;

    @Column(name = "awarded_score", precision = 8, scale = 2)
    private BigDecimal awardedScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private AttemptItemStatus status = AttemptItemStatus.NOT_STARTED;

    @Column(name = "audio_play_count", nullable = false)
    private int audioPlayCount;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "answered_at")
    private Instant answeredAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static AttemptQuestionSet of(
            String attemptId,
            String questionSetId,
            int revision,
            int displayOrder,
            BigDecimal maxScore) {

        AttemptQuestionSet aqs = new AttemptQuestionSet();
        aqs.id = UUID.randomUUID().toString();
        aqs.attemptId = attemptId;
        aqs.questionSetId = questionSetId;
        aqs.questionRevision = revision;
        aqs.displayOrder = displayOrder;
        aqs.maxScore = maxScore;
        // Khóa trỏ tới phần tử trong attempt_documents.questionSets[]
        aqs.mongoSnapshotKey = aqs.id;
        return aqs;
    }

    public void markAnswered() {
        this.status = AttemptItemStatus.ANSWERED;
        this.answeredAt = Instant.now();
        if (startedAt == null) {
            this.startedAt = this.answeredAt;
        }
    }

    public void applyScore(BigDecimal awarded) {
        this.awardedScore = awarded;
        this.status = AttemptItemStatus.SCORED;
    }

    /**
     * @return false nếu đã dùng hết số lần phát cho phép
     */
    public boolean tryConsumeAudioPlay(Integer maxPlays) {
        if (maxPlays != null && audioPlayCount >= maxPlays) {
            return false;
        }
        audioPlayCount++;
        return true;
    }
}
