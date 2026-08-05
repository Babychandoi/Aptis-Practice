package vn.weconex.aptis.practice.domain;

import java.math.BigDecimal;
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
 * Điểm theo học phần của một lượt làm bài. Thi thử Aptis báo điểm và CEFR cho
 * từng kỹ năng, nên cần bảng riêng thay vì chỉ tổng điểm.
 */
@Entity
@Table(name = "attempt_component_scores")
@Getter
@Setter
@NoArgsConstructor
public class AttemptComponentScore {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false)
    private String attemptId;

    @Column(name = "component_id", columnDefinition = "CHAR(36)", nullable = false)
    private String componentId;

    @Column(name = "raw_score", precision = 10, scale = 2)
    private BigDecimal rawScore;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "percentage_score", precision = 8, scale = 4)
    private BigDecimal percentageScore;

    @Column(name = "scaled_score", precision = 10, scale = 2)
    private BigDecimal scaledScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "cefr_level", length = 4)
    private CefrLevel cefrLevel;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static AttemptComponentScore of(String attemptId, String componentId) {
        AttemptComponentScore score = new AttemptComponentScore();
        score.attemptId = attemptId;
        score.componentId = componentId;
        score.rawScore = BigDecimal.ZERO;
        score.maxScore = BigDecimal.ZERO;
        return score;
    }

    public void add(BigDecimal raw, BigDecimal max) {
        this.rawScore = this.rawScore.add(raw);
        this.maxScore = this.maxScore.add(max);

        if (maxScore.signum() != 0) {
            this.percentageScore = rawScore.multiply(BigDecimal.valueOf(100))
                    .divide(maxScore, 4, java.math.RoundingMode.HALF_UP);
        }
    }
}
