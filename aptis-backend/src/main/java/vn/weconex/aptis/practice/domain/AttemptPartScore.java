package vn.weconex.aptis.practice.domain;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Điểm theo Part của một lượt làm bài — dùng cho báo cáo thi thử (§38.10).
 */
@Entity
@Table(name = "attempt_part_scores")
@Getter
@Setter
@NoArgsConstructor
public class AttemptPartScore {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptId;

    @Column(name = "part_id", columnDefinition = "CHAR(36)", nullable = false)
    private String partId;

    @Column(name = "raw_score", precision = 10, scale = 2)
    private BigDecimal rawScore;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "percentage_score", precision = 8, scale = 4)
    private BigDecimal percentageScore;

    @Column(name = "total_items", nullable = false)
    private int totalItems;

    @Column(name = "correct_items", nullable = false)
    private int correctItems;

    @Column(name = "incorrect_items", nullable = false)
    private int incorrectItems;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static AttemptPartScore of(String attemptId, String partId) {
        AttemptPartScore score = new AttemptPartScore();
        score.attemptId = attemptId;
        score.partId = partId;
        score.rawScore = BigDecimal.ZERO;
        score.maxScore = BigDecimal.ZERO;
        return score;
    }

    public void add(BigDecimal raw, BigDecimal max, int correct, int incorrect) {
        this.rawScore = this.rawScore.add(raw);
        this.maxScore = this.maxScore.add(max);
        this.correctItems += correct;
        this.incorrectItems += incorrect;
        this.totalItems += correct + incorrect;
        recomputePercentage();
    }

    public void replaceScore(BigDecimal raw, BigDecimal max) {
        this.rawScore = raw;
        this.maxScore = max;
        recomputePercentage();
    }

    private void recomputePercentage() {
        if (maxScore.signum() == 0) {
            this.percentageScore = null;
            return;
        }
        this.percentageScore = rawScore.multiply(BigDecimal.valueOf(100))
                .divide(maxScore, 4, java.math.RoundingMode.HALF_UP);
    }
}
