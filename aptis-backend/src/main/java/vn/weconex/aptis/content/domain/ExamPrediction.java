package vn.weconex.aptis.content.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một chủ đề được dự đoán ra thi trong ngày.
 *
 * <p>Không suy ra từ {@code question_sets.hotness}: hotness là mức "hay ra thi"
 * chung do biên tập đặt một lần cho cả bộ, còn dự đoán là tin theo NGÀY và đổi
 * liên tục theo phản hồi người vừa đi thi.
 *
 * <p>{@code topicId} + {@code partId} là cặp dùng để lọc đề khi học viên bấm
 * vào; {@code partId} null thì lọc theo cả kỹ năng.
 */
@Entity
@Table(name = "exam_predictions")
@Getter
@Setter
@NoArgsConstructor
public class ExamPrediction {

    /** HOT = khả năng ra cao, BACKUP = đề dự phòng. */
    public enum Priority {
        HOT,
        BACKUP
    }

    public enum PredictionStatus {
        DRAFT,
        PUBLISHED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "predict_date", nullable = false)
    private LocalDate predictDate;

    @Column(name = "topic_id", columnDefinition = "CHAR(36)", nullable = false)
    private String topicId;

    /** NULL = dự đoán cho cả kỹ năng, không riêng part nào. */
    @Column(name = "part_id", columnDefinition = "CHAR(36)")
    private String partId;

    @Column(name = "component_id", columnDefinition = "CHAR(36)", nullable = false)
    private String componentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 16, nullable = false)
    private Priority priority = Priority.HOT;

    /** Bỏ trống thì client hiển thị tên chủ đề. */
    @Column(name = "label")
    private String label;

    /**
     * Nhóm hiển thị tự do: "Part 5", "Q16-17", "Part 2+3". Đề thi thật đôi khi
     * gộp nhiều part vào một cụm câu nên không suy ra được từ partId.
     */
    @Column(name = "section_label", length = 64)
    private String sectionLabel;

    @Column(name = "source")
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private PredictionStatus status = PredictionStatus.PUBLISHED;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
