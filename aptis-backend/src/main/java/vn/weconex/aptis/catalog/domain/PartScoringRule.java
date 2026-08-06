package vn.weconex.aptis.catalog.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.common.util.BaseEntity;

@Entity
@Table(name = "part_scoring_rules")
@Getter
@Setter
@NoArgsConstructor
public class PartScoringRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false, columnDefinition = "CHAR(36)")
    private Part part;

    @Column(name = "max_score", precision = 8, scale = 2, nullable = false)
    private BigDecimal maxScore;

    @Column(name = "points_per_correct", precision = 8, scale = 2)
    private BigDecimal pointsPerCorrect;

    @Column(name = "perfect_bonus", precision = 8, scale = 2, nullable = false)
    private BigDecimal perfectBonus = BigDecimal.ZERO;

    @Column(name = "included_in_overall", nullable = false)
    private boolean includedInOverall;
}
