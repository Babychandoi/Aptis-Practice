package vn.weconex.aptis.news.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.news.domain.NewsComment;
import vn.weconex.aptis.news.domain.NewsPost;
import vn.weconex.aptis.news.repository.NewsCommentRepository;
import vn.weconex.aptis.news.repository.NewsPostRepository;
import vn.weconex.aptis.news.web.NewsDtos;
import vn.weconex.aptis.platform.audit.AuditService;

/**
 * Quản trị bảng tin: soạn bài và kiểm duyệt bình luận.
 *
 * <p>Ẩn bình luận KHÔNG xoá khỏi DB: người viết vẫn thấy bản của mình ở dạng mờ
 * kèm lý do. Xoá hẳn thì họ tưởng lỗi và gửi lại, còn ẩn có giải thích thì họ
 * biết đã sai ở đâu.
 */
@Service
@RequiredArgsConstructor
public class AdminNewsService {

    private final NewsPostRepository postRepository;
    private final NewsCommentRepository commentRepository;
    private final NewsService newsService;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final AuditService auditService;

    // -----------------------------------------------------------------
    // Bài viết
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<NewsDtos.AdminPostRow> posts(String status, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<NewsPost> result = postRepository.findAll((root, query, cb) -> {
            if (status == null || status.isBlank()) {
                return cb.conjunction();
            }
            return cb.equal(root.get("status"), NewsPost.PostStatus.valueOf(status));
        }, pageable);

        return result.map(post -> new NewsDtos.AdminPostRow(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getStatus().name(),
                post.isPinned(),
                post.isCommentsEnabled(),
                post.isCommentsModerated(),
                commentRepository.countVisible(post.getId()),
                commentRepository.countPendingOfPost(post.getId()),
                post.getViewCount(),
                post.getPublishedAt(),
                post.getUpdatedAt()));
    }

    /** Bản đầy đủ để mở trong trình soạn, gồm cả bài nháp. */
    @Transactional(readOnly = true)
    public NewsDtos.PostDetail post(String id) {
        NewsPost post = require(id);
        return new NewsDtos.PostDetail(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getBody(),
                post.getCoverAssetId(),
                post.isPinned(),
                post.getPartId(),
                null,
                post.getTopicId(),
                null,
                0,
                post.isCommentsEnabled(),
                post.isCommentsModerated(),
                false,
                commentRepository.countVisible(post.getId()),
                post.getViewCount(),
                post.getPublishedAt(),
                post.getUpdatedAt());
    }

    @Transactional
    public NewsDtos.AdminPostRow create(String actorId, NewsDtos.SavePostRequest request) {
        NewsPost post = new NewsPost();
        post.setCreatedBy(actorId);
        apply(post, request);
        post.setSlug(newsService.uniqueSlug(request.title(), post.getId()));

        NewsPost saved = postRepository.save(post);
        auditService.record(actorId, "NEWS_POST_CREATE", "NEWS_POST", saved.getId(),
                Map.of(), Map.of("title", saved.getTitle(), "status", saved.getStatus().name()));
        return row(saved);
    }

    @Transactional
    public NewsDtos.AdminPostRow update(String actorId, String id, NewsDtos.SavePostRequest request) {
        NewsPost post = require(id);
        String beforeTitle = post.getTitle();
        String beforeStatus = post.getStatus().name();

        // Slug chỉ đổi khi bài CHƯA đăng: đổi slug của bài đã đăng là làm chết
        // mọi liên kết đã chia sẻ cho học viên.
        boolean wasPublished = post.getPublishedAt() != null;
        apply(post, request);
        if (!wasPublished) {
            post.setSlug(newsService.uniqueSlug(request.title(), post.getId()));
        }

        NewsPost saved = postRepository.save(post);
        auditService.record(actorId, "NEWS_POST_UPDATE", "NEWS_POST", saved.getId(),
                Map.of("title", beforeTitle, "status", beforeStatus),
                Map.of("title", saved.getTitle(), "status", saved.getStatus().name()));
        return row(saved);
    }

    @Transactional
    public void delete(String actorId, String id) {
        NewsPost post = require(id);
        auditService.record(actorId, "NEWS_POST_DELETE", "NEWS_POST", id,
                Map.of("title", post.getTitle()), Map.of());
        // Bình luận xoá theo nhờ ON DELETE CASCADE
        postRepository.delete(post);
    }

    private void apply(NewsPost post, NewsDtos.SavePostRequest request) {
        post.setTitle(request.title().trim());
        post.setBody(request.body());
        post.setExcerpt(blankToNull(request.excerpt()));
        post.setCoverAssetId(blankToNull(request.coverAssetId()));
        post.setPartId(blankToNull(request.partId()));
        post.setTopicId(blankToNull(request.topicId()));

        if (request.pinned() != null) {
            post.setPinned(request.pinned());
        }
        if (request.commentsEnabled() != null) {
            post.setCommentsEnabled(request.commentsEnabled());
        }
        if (request.commentsModerated() != null) {
            post.setCommentsModerated(request.commentsModerated());
        }

        if (request.status() != null && !request.status().isBlank()) {
            NewsPost.PostStatus target = NewsPost.PostStatus.valueOf(request.status());
            if (target == NewsPost.PostStatus.PUBLISHED) {
                post.publish();
            } else {
                post.setStatus(target);
            }
        }
    }

    // -----------------------------------------------------------------
    // Kiểm duyệt bình luận
    // -----------------------------------------------------------------

    /**
     * Hàng đợi kiểm duyệt. {@code status} rỗng = lấy bình luận chờ duyệt, vì đó
     * là việc cần làm hằng ngày.
     */
    @Transactional(readOnly = true)
    public Page<NewsDtos.AdminCommentRow> comments(String status, int page, int size) {
        NewsComment.CommentStatus filter = status == null || status.isBlank()
                ? NewsComment.CommentStatus.PENDING
                : NewsComment.CommentStatus.valueOf(status);

        Page<NewsComment> result = commentRepository.findByStatusOrderByCreatedAtAsc(
                filter, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));

        List<String> userIds = result.getContent().stream()
                .map(NewsComment::getUserId).distinct().toList();
        Map<String, String> emails = userIds.isEmpty() ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(java.util.stream.Collectors.toMap(u -> u.getId(), u -> u.getEmail()));
        Map<String, String> names = userIds.isEmpty() ? Map.of()
                : profileRepository.findAllById(userIds).stream()
                        .filter(p -> p.getDisplayName() != null || p.getFullName() != null)
                        .collect(java.util.stream.Collectors.toMap(
                                p -> p.getUserId(),
                                p -> Optional.ofNullable(p.getDisplayName())
                                        .filter(v -> !v.isBlank())
                                        .orElse(p.getFullName())));

        List<String> postIds = result.getContent().stream()
                .map(NewsComment::getPostId).distinct().toList();
        Map<String, String> titles = postIds.isEmpty() ? Map.of()
                : postRepository.findAllById(postIds).stream()
                        .collect(java.util.stream.Collectors.toMap(p -> p.getId(), NewsPost::getTitle));

        return result.map(comment -> new NewsDtos.AdminCommentRow(
                comment.getId(),
                comment.getPostId(),
                titles.getOrDefault(comment.getPostId(), "(bài đã xoá)"),
                names.getOrDefault(comment.getUserId(), "Chưa đặt tên"),
                emails.getOrDefault(comment.getUserId(), "?"),
                comment.getBody(),
                comment.getStatus().name(),
                comment.getHiddenReason(),
                comment.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public long pendingCount() {
        return commentRepository.countByStatus(NewsComment.CommentStatus.PENDING);
    }

    @Transactional
    public void approve(String actorId, String commentId) {
        NewsComment comment = requireComment(commentId);
        comment.approve();
        commentRepository.save(comment);
        auditService.record(actorId, "NEWS_COMMENT_APPROVE", "NEWS_COMMENT", commentId,
                Map.of(), Map.of("status", "VISIBLE"));
    }

    /**
     * Ẩn bình luận với mọi người, TRỪ người viết.
     *
     * <p>Lý do được lưu và hiện lại cho chính họ đọc — ẩn im lặng thì họ tưởng
     * lỗi hệ thống và gửi lại nhiều lần.
     */
    @Transactional
    public void hide(String actorId, String commentId, String reason) {
        NewsComment comment = requireComment(commentId);
        String before = comment.getStatus().name();
        comment.hide(actorId, blankToNull(reason));
        commentRepository.save(comment);
        auditService.record(actorId, "NEWS_COMMENT_HIDE", "NEWS_COMMENT", commentId,
                Map.of("status", before),
                Map.of("status", "HIDDEN", "reason", reason == null ? "" : reason));
    }

    /** Xoá hẳn — chỉ dùng cho spam, người viết cũng không còn thấy. */
    @Transactional
    public void purge(String actorId, String commentId) {
        NewsComment comment = requireComment(commentId);
        auditService.record(actorId, "NEWS_COMMENT_PURGE", "NEWS_COMMENT", commentId,
                Map.of("body", comment.getBody(), "userId", comment.getUserId()), Map.of());
        if (comment.getParentId() != null) {
            commentRepository.addReplyCount(comment.getParentId(), -1);
        }
        commentRepository.delete(comment);
    }

    // -----------------------------------------------------------------

    private NewsPost require(String id) {
        return postRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("NewsPost", id));
    }

    private NewsComment requireComment(String id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("NewsComment", id));
    }

    private NewsDtos.AdminPostRow row(NewsPost post) {
        return new NewsDtos.AdminPostRow(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getStatus().name(),
                post.isPinned(),
                post.isCommentsEnabled(),
                post.isCommentsModerated(),
                commentRepository.countVisible(post.getId()),
                commentRepository.countPendingOfPost(post.getId()),
                post.getViewCount(),
                post.getPublishedAt(),
                post.getUpdatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
