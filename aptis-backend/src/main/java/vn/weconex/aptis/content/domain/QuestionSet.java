package vn.weconex.aptis.content.domain;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.TaskType;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.common.util.Enums.ContentStatus;

/**
 * Metadata bộ câu hỏi. Nội dung chi tiết (items, options, answerKey) nằm ở
 * MongoDB collection {@code question_set_documents} với cùng id.
 *
 * <p>MySQL là nguồn quyết định nội dung có xuất hiện cho học viên hay không
 * (PHẦN VIII §54).
 */
@Entity
@Table(name = "question_sets")
@Getter
@Setter
@NoArgsConstructor
public class QuestionSet extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false, columnDefinition = "CHAR(36)")
    private Part part;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_type_id", nullable = false, columnDefinition = "CHAR(36)")
    private TaskType taskType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", columnDefinition = "CHAR(36)")
    private Topic topic;

    @Column(name = "code", length = 100, nullable = false)
    private String code;

    @Column(name = "title", length = 255)
    private String title;

    /** 1-5, càng cao càng khó. */
    @Column(name = "difficulty")
    private Byte difficulty;

    /** 1-5, mức độ phổ biến của chủ đề trong các kỳ thi gần đây. */
    @Column(name = "hotness")
    private Byte hotness;

    @Enumerated(EnumType.STRING)
    @Column(name = "cefr_min", length = 4)
    private CefrLevel cefrMin;

    @Enumerated(EnumType.STRING)
    @Column(name = "cefr_max", length = 4)
    private CefrLevel cefrMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", length = 10, nullable = false)
    private AccessLevel accessLevel = AccessLevel.PREMIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private ContentStatus status = ContentStatus.DRAFT;

    @Column(name = "current_revision", nullable = false)
    private int currentRevision = 1;

    @Column(name = "content_checksum", length = 128)
    private String contentChecksum;

    @Column(name = "item_count", nullable = false)
    private int itemCount;

    @Column(name = "estimated_seconds")
    private Integer estimatedSeconds;

    @Column(name = "max_score", precision = 8, scale = 2, nullable = false)
    private BigDecimal maxScore = BigDecimal.ONE;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    @Column(name = "updated_by", columnDefinition = "CHAR(36)")
    private String updatedBy;

    public boolean isPublished() {
        return status == ContentStatus.PUBLISHED;
    }

    public boolean isFree() {
        return accessLevel == AccessLevel.FREE;
    }

    /**
     * Chuyển trạng thái theo vòng đời ở PHẦN X §59.
     */
    public boolean canTransitionTo(ContentStatus target) {
        return switch (status) {
            case DRAFT -> target == ContentStatus.IN_REVIEW || target == ContentStatus.ARCHIVED;
            case IN_REVIEW -> target == ContentStatus.DRAFT
                    || target == ContentStatus.PUBLISHED
                    || target == ContentStatus.ARCHIVED;
            case PUBLISHED -> target == ContentStatus.SUSPENDED || target == ContentStatus.ARCHIVED;
            case SUSPENDED -> target == ContentStatus.PUBLISHED || target == ContentStatus.ARCHIVED;
            case ARCHIVED -> false;
        };
    }

    public void publish(int revision, String checksum) {
        this.status = ContentStatus.PUBLISHED;
        this.currentRevision = revision;
        this.contentChecksum = checksum;
        this.publishedAt = Instant.now();
    }
}
