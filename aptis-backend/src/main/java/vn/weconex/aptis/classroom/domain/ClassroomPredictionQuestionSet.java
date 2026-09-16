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
 * Đề gắn đích danh vào một mục dự đoán của lớp.
 *
 * <p>Dự đoán lọc đề theo chủ đề là đủ cho hệ thống, nhưng giáo viên còn muốn
 * chỉ rõ vài đề — kể cả đề do chính họ soạn, vốn không thuộc chủ đề nào.
 *
 * <p>Bảng nối khoá kép nên tách file riêng: {@code @IdClass} không dùng được
 * với entity lồng trong class bọc.
 */
@Entity(name = "ClassroomPredictionQuestionSet")
@Table(name = "classroom_prediction_question_sets")
@IdClass(ClassroomPredictionQuestionSet.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class ClassroomPredictionQuestionSet {

    @Id
    @Column(name = "prediction_id", columnDefinition = "CHAR(36)", nullable = false)
    private String predictionId;

    @Id
    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private String predictionId;
        private String questionSetId;
    }
}
