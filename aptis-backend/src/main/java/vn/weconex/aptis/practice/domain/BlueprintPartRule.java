package vn.weconex.aptis.practice.domain;

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
import vn.weconex.aptis.common.util.Enums.SelectionStrategy;

/**
 * Quy tắc chọn câu hỏi cho một Part trong blueprint (PHẦN I §14.2).
 */
@Entity
@Table(name = "blueprint_part_rules")
@Getter
@Setter
@NoArgsConstructor
public class BlueprintPartRule {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "blueprint_id", columnDefinition = "CHAR(36)", nullable = false)
    private String blueprintId;

    @Column(name = "part_id", columnDefinition = "CHAR(36)", nullable = false)
    private String partId;

    @Column(name = "question_set_count", nullable = false)
    private int questionSetCount;

    @Column(name = "difficulty_min")
    private Byte difficultyMin;

    @Column(name = "difficulty_max")
    private Byte difficultyMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_strategy", length = 16, nullable = false)
    private SelectionStrategy selectionStrategy = SelectionStrategy.RANDOM;

    @Column(name = "allow_free_content", nullable = false)
    private boolean allowFreeContent = true;

    @Column(name = "allow_premium_content", nullable = false)
    private boolean allowPremiumContent = true;

    @Column(name = "config_json", columnDefinition = "JSON")
    private String configJson;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public boolean isFixedSelection() {
        return selectionStrategy == SelectionStrategy.FIXED;
    }

    public Integer difficultyMinAsInt() {
        return difficultyMin == null ? null : difficultyMin.intValue();
    }

    public Integer difficultyMaxAsInt() {
        return difficultyMax == null ? null : difficultyMax.intValue();
    }
}
