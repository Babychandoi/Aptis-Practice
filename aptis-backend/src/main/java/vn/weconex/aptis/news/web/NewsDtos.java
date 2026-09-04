package vn.weconex.aptis.news.web;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class NewsDtos {

    private NewsDtos() {
    }

    // ---------- Bài viết ----------

    /** Một dòng trong danh sách bảng tin. */
    public record PostSummary(
            String id,
            String slug,
            String title,
            String excerpt,
            String coverUrl,
            boolean pinned,
            /** Có đề gắn kèm để bấm vào luyện ngay không. */
            boolean hasPractice,
            long commentCount,
            int viewCount,
            Instant publishedAt) {
    }

    public record PostDetail(
            String id,
            String slug,
            String title,
            String excerpt,
            String body,
            String coverUrl,
            boolean pinned,
            String partId,
            String partLabel,
            String topicId,
            String topicName,
            /** Số bộ đề khớp part/topic — 0 thì client ẩn nút luyện tập. */
            long practiceSetCount,
            boolean commentsEnabled,
            /** Bình luận ở bài này phải chờ duyệt? Client báo trước cho học viên. */
            boolean commentsModerated,
            /** false = phải mua gói mới bình luận được. */
            boolean canComment,
            long commentCount,
            int viewCount,
            Instant publishedAt,
            Instant updatedAt) {
    }

    public record SavePostRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 500) String excerpt,
            @NotBlank String body,
            @Size(max = 36) String coverAssetId,
            @Size(max = 36) String partId,
            @Size(max = 36) String topicId,
            Boolean pinned,
            Boolean commentsEnabled,
            Boolean commentsModerated,
            /** PUBLISHED để đăng luôn, bỏ trống thì giữ nguyên trạng thái hiện tại. */
            String status) {
    }

    /** Dòng trong trang quản trị — có cả bản nháp và số bình luận chờ duyệt. */
    public record AdminPostRow(
            String id,
            String slug,
            String title,
            String status,
            boolean pinned,
            boolean commentsEnabled,
            boolean commentsModerated,
            long commentCount,
            long pendingCommentCount,
            int viewCount,
            Instant publishedAt,
            Instant updatedAt) {
    }

    // ---------- Bình luận ----------

    public record CommentResponse(
            String id,
            String authorName,
            /** true = bình luận của chính người đang xem. */
            boolean mine,
            /** true = tác giả là quản trị viên, client gắn nhãn. */
            boolean fromAdmin,
            String body,
            /** VISIBLE | PENDING | HIDDEN */
            String status,
            /**
             * Chú thích hiện dưới bình luận bị ẩn hoặc chờ duyệt, chỉ người viết
             * đọc được. Null với bình luận bình thường.
             */
            String statusNote,
            Instant createdAt,
            List<CommentResponse> replies) {
    }

    public record SaveCommentRequest(
            @NotBlank @Size(max = 2000) String body,
            /** Trả lời cho bình luận gốc nào; bỏ trống là bình luận mới. */
            @Size(max = 36) String parentId) {
    }

    public record HideCommentRequest(
            @Size(max = 300) String reason) {
    }

    /** Dòng trong hàng đợi kiểm duyệt. */
    public record AdminCommentRow(
            String id,
            String postId,
            String postTitle,
            String authorName,
            String authorEmail,
            String body,
            String status,
            String hiddenReason,
            Instant createdAt) {
    }
}
