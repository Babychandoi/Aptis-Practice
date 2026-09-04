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
 * Bình luận của học viên dưới một bài bảng tin.
 *
 * <p>Một cấp trả lời: {@code parentId} null là bình luận gốc, khác null là trả
 * lời cho bình luận gốc đó. Không cho trả lời của trả lời — luồng lồng sâu rất
 * khó đọc trên điện thoại, mà phần lớn học viên vào bằng điện thoại.
 */
@Entity
@Table(name = "news_comments")
@Getter
@Setter
@NoArgsConstructor
public class NewsComment {

    public enum CommentStatus {
        VISIBLE,
        /** Chờ admin duyệt, chỉ người viết thấy. */
        PENDING,
        /** Admin ẩn. Người viết vẫn thấy bản mờ kèm chú thích. */
        HIDDEN,
        /** Người viết tự xoá. */
        DELETED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "post_id", columnDefinition = "CHAR(36)", nullable = false)
    private String postId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "parent_id", columnDefinition = "CHAR(36)")
    private String parentId;

    @Column(name = "body", length = 2000, nullable = false)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private CommentStatus status = CommentStatus.VISIBLE;

    /** Lý do ẩn, hiện cho chính người viết đọc để họ biết vì sao. */
    @Column(name = "hidden_reason", length = 300)
    private String hiddenReason;

    @Column(name = "hidden_by", columnDefinition = "CHAR(36)")
    private String hiddenBy;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "reply_count", nullable = false)
    private int replyCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    /** Mọi người đọc được? */
    public boolean isPubliclyVisible() {
        return status == CommentStatus.VISIBLE;
    }

    public void hide(String actorId, String reason) {
        status = CommentStatus.HIDDEN;
        hiddenBy = actorId;
        hiddenReason = reason;
        hiddenAt = Instant.now();
    }

    public void approve() {
        status = CommentStatus.VISIBLE;
        hiddenBy = null;
        hiddenReason = null;
        hiddenAt = null;
    }
}
