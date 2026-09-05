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
 * Đề thi thử đủ 4 phần được gắn vào bài viết bảng tin.
 *
 * <p>Khác {@link NewsPostQuestionSet} (gắn từng bộ đề lẻ, bấm vào chỉ làm một
 * phần): bài hướng dẫn cả bốn phần Writing cần mở một lượt đi hết Part 1 đến
 * Part 4, không phải bốn lượt rời.
 */
@Entity
@Table(name = "news_post_blueprints")
@IdClass(NewsPostBlueprint.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class NewsPostBlueprint {

    @Id
    @Column(name = "post_id", columnDefinition = "CHAR(36)", nullable = false)
    private String postId;

    @Id
    @Column(name = "blueprint_id", columnDefinition = "CHAR(36)", nullable = false)
    private String blueprintId;

    /** Nhãn hiện cho học viên; null thì lấy tên đề thi thử. */
    @Column(name = "label", length = 160)
    private String label;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public NewsPostBlueprint(String postId, String blueprintId, String label, int displayOrder) {
        this.postId = postId;
        this.blueprintId = blueprintId;
        this.label = label;
        this.displayOrder = displayOrder;
    }

    /** Khoá kép; equals/hashCode bắt buộc để JPA nhận diện bản ghi. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Key implements java.io.Serializable {

        private String postId;
        private String blueprintId;

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return java.util.Objects.equals(postId, key.postId)
                    && java.util.Objects.equals(blueprintId, key.blueprintId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(postId, blueprintId);
        }
    }
}
