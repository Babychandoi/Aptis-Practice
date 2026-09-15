package vn.weconex.aptis.classroom.domain;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Đề được gán vào một bài giao.
 *
 * <p>Bảng nối khoá kép nên tách file riêng: {@code @IdClass} không dùng được
 * với entity lồng trong class bọc.
 */
@Entity(name = "AssignmentQuestionSet")
@Table(name = "assignment_question_sets")
@IdClass(AssignmentQuestionSet.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class AssignmentQuestionSet {

    @Id
    @Column(name = "assignment_id", columnDefinition = "CHAR(36)")
    private String assignmentId;

    @Id
    @Column(name = "question_set_id", columnDefinition = "CHAR(36)")
    private String questionSetId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    public AssignmentQuestionSet(String assignmentId, String questionSetId, int displayOrder) {
        this.assignmentId = assignmentId;
        this.questionSetId = questionSetId;
        this.displayOrder = displayOrder;
    }

    /** Khoá kép. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {

        private String assignmentId;
        private String questionSetId;
    }
}
