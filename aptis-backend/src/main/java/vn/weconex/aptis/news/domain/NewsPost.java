package vn.weconex.aptis.news.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Bài viết trên bảng tin: cách làm bài, dự đoán đề, thông báo.
 *
 * <p>Chỉ người có quyền {@code news:write} đăng được; học viên chỉ đọc và bình
 * luận. Bài ĐỌC TỰ DO còn bình luận cần Premium — bài hữu ích là lý do người hết
 * hạn quay lại, nên khoá phần đọc là tự chặn đường bán hàng.
 */
@Entity
@Table(name = "news_posts")
@Getter
@Setter
@NoArgsConstructor
public class NewsPost {

    public enum PostStatus {
        DRAFT,
        PUBLISHED,
        ARCHIVED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    /** Dùng trong URL. Sinh từ tiêu đề, thêm hậu tố khi trùng. */
    @Column(name = "slug", length = 160, nullable = false)
    private String slug;

    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @Column(name = "excerpt", length = 500)
    private String excerpt;

    /** Markdown. Render phía client phải lọc HTML — xem SafeContent. */
    @Column(name = "body", columnDefinition = "MEDIUMTEXT", nullable = false)
    private String body;

    @Column(name = "cover_asset_id", columnDefinition = "CHAR(36)")
    private String coverAssetId;

    /** Gắn đề luyện; NULL = bài chỉ để đọc. */
    @Column(name = "part_id", columnDefinition = "CHAR(36)")
    private String partId;

    @Column(name = "topic_id", columnDefinition = "CHAR(36)")
    private String topicId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private PostStatus status = PostStatus.DRAFT;

    @Column(name = "pinned", nullable = false)
    private boolean pinned;

    @Column(name = "comments_enabled", nullable = false)
    private boolean commentsEnabled = true;

    /** true = bình luận chờ duyệt mới hiện. Đặt riêng từng bài. */
    @Column(name = "comments_moderated", nullable = false)
    private boolean commentsModerated;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public boolean isPublished() {
        return status == PostStatus.PUBLISHED;
    }

    /** Chuyển sang đã đăng, ghi mốc thời gian lần đầu đăng. */
    public void publish() {
        status = PostStatus.PUBLISHED;
        if (publishedAt == null) {
            publishedAt = Instant.now();
        }
    }
}
