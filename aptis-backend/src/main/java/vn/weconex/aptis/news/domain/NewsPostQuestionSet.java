package vn.weconex.aptis.news.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một bộ đề được gắn đích danh vào bài viết bảng tin.
 *
 * <p>Khác với {@code news_posts.part_id/topic_id} (lọc theo nhóm, ra đề bất kỳ
 * trong nhóm), bảng này chọn đúng bộ nào: bài dạy cách làm một đề cụ thể thì học
 * viên phải mở đúng đề đó.
 */
@Entity
@Table(name = "news_post_question_sets")
@IdClass(NewsPostQuestionSet.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class NewsPostQuestionSet {

    @Id
    @Column(name = "post_id", columnDefinition = "CHAR(36)", nullable = false)
    private String postId;

    @Id
    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public NewsPostQuestionSet(String postId, String questionSetId, int displayOrder) {
        this.postId = postId;
        this.questionSetId = questionSetId;
        this.displayOrder = displayOrder;
    }

    /** Khoá kép; equals/hashCode là bắt buộc để JPA nhận diện bản ghi. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Key implements java.io.Serializable {

        private String postId;
        private String questionSetId;

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return java.util.Objects.equals(postId, key.postId)
                    && java.util.Objects.equals(questionSetId, key.questionSetId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(postId, questionSetId);
        }
    }
}
