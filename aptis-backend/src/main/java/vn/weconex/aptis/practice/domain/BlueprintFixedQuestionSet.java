package vn.weconex.aptis.practice.domain;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Bộ câu hỏi được chỉ định cố định cho một rule (selection_strategy = FIXED).
 * Dùng khi cần đề giống nhau cho mọi học viên.
 */
@Entity
@Table(name = "blueprint_fixed_question_sets")
@Getter
@Setter
@NoArgsConstructor
public class BlueprintFixedQuestionSet {

    @EmbeddedId
    private Key key;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {

        @Column(name = "blueprint_rule_id", columnDefinition = "CHAR(36)", nullable = false)
        private String blueprintRuleId;

        @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
        private String questionSetId;

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key that)) {
                return false;
            }
            return Objects.equals(blueprintRuleId, that.blueprintRuleId)
                    && Objects.equals(questionSetId, that.questionSetId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(blueprintRuleId, questionSetId);
        }
    }
}
