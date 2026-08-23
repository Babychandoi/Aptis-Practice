package vn.weconex.aptis.content.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một mục trong nhật ký cập nhật nội dung.
 *
 * <p>Mô tả do người biên tập viết, không sinh tự động từ published_at: một đợt
 * cập nhật gồm nhiều bộ câu hỏi và cần nói rõ ý ("Cập nhật đề mới Câu 16-17,
 * chủ đề: Using The Time Effectively").
 */
@Entity
@Table(name = "content_update_logs")
@Getter
@Setter
@NoArgsConstructor
public class ContentUpdateLog {

    public enum LogStatus {
        DRAFT,
        PUBLISHED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "label", length = 64, nullable = false)
    private String label;

    @Column(name = "description", length = 1000, nullable = false)
    private String description;

    /** NULL = cập nhật chung, không gắn đề nào để làm. */
    @Column(name = "part_id", columnDefinition = "CHAR(36)")
    private String partId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private LogStatus status = LogStatus.PUBLISHED;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
