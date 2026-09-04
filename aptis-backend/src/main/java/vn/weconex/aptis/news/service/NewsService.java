package vn.weconex.aptis.news.service;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.news.domain.NewsComment;
import vn.weconex.aptis.news.domain.NewsPost;
import vn.weconex.aptis.news.repository.NewsCommentRepository;
import vn.weconex.aptis.news.repository.NewsPostRepository;
import vn.weconex.aptis.news.web.NewsDtos;

/**
 * Bảng tin: bài viết của admin và bình luận của học viên.
 *
 * <p>Bài viết đọc tự do, bình luận cần Premium (quyết định nghiệp vụ): bài hướng
 * dẫn làm bài là thứ kéo người đã hết hạn quay lại, khoá phần đọc là tự chặn
 * đường bán hàng; còn hỏi đáp trực tiếp là phần trả phí.
 */
@Service
@RequiredArgsConstructor
public class NewsService {

    /** Cửa sổ chống bấm gửi hai lần khi mạng chậm. */
    private static final Duration DUPLICATE_WINDOW = Duration.ofMinutes(2);

    private final NewsPostRepository postRepository;
    private final NewsCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final QuestionSetRepository questionSetRepository;
    private final EntitlementService entitlementService;

    // -----------------------------------------------------------------
    // Đọc — dành cho học viên
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<NewsDtos.PostSummary> feed(Pageable pageable) {
        return postRepository.findPublishedFeed(pageable).map(post -> new NewsDtos.PostSummary(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                excerptOf(post),
                post.getCoverAssetId(),
                post.isPinned(),
                hasPractice(post),
                commentRepository.countVisible(post.getId()),
                post.getViewCount(),
                post.getPublishedAt()));
    }

    /**
     * Chi tiết bài theo slug. {@code viewerId} null = khách chưa đăng nhập.
     *
     * <p>Đếm lượt xem bằng câu UPDATE riêng thay vì sửa entity: nhiều người đọc
     * cùng lúc thì đọc-sửa-ghi sẽ ghi đè lượt của nhau.
     */
    @Transactional
    public NewsDtos.PostDetail detail(String slug, String viewerId) {
        return detail(slug, viewerId, false);
    }

    /** @param staff true = có quyền kiểm duyệt, luôn bình luận được. */
    @Transactional
    public NewsDtos.PostDetail detail(String slug, String viewerId, boolean staff) {
        NewsPost post = postRepository.findBySlug(slug)
                .filter(NewsPost::isPublished)
                .orElseThrow(() -> ApiException.notFound("NewsPost", slug));

        postRepository.incrementViewCount(post.getId());

        long practiceSets = 0;
        if (hasPractice(post)) {
            practiceSets = questionSetRepository.countForNewsPractice(
                    post.getPartId(), post.getTopicId(), ContentStatus.PUBLISHED);
        }

        boolean canComment = post.isCommentsEnabled()
                && viewerId != null
                && (staff || entitlementService.hasPremiumAccess(viewerId));

        return new NewsDtos.PostDetail(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                excerptOf(post),
                post.getBody(),
                post.getCoverAssetId(),
                post.isPinned(),
                post.getPartId(),
                null,
                post.getTopicId(),
                null,
                practiceSets,
                post.isCommentsEnabled(),
                post.isCommentsModerated(),
                canComment,
                commentRepository.countVisible(post.getId()),
                post.getViewCount() + 1,
                post.getPublishedAt(),
                post.getUpdatedAt());
    }

    /**
     * Bình luận của một bài, kèm một cấp trả lời.
     *
     * <p>Ai thấy gì:
     * <ul>
     *   <li>VISIBLE — mọi người.</li>
     *   <li>PENDING/HIDDEN — CHỈ người viết, kèm chú thích lý do. Ẩn im lặng thì
     *       họ tưởng lỗi hệ thống và gửi lại nhiều lần.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public Page<NewsDtos.CommentResponse> comments(
            String postId, String viewerId, Pageable pageable) {

        Page<NewsComment> roots = commentRepository.findRoots(postId, pageable);
        if (roots.isEmpty()) {
            return Page.empty(pageable);
        }

        List<String> rootIds = roots.getContent().stream().map(NewsComment::getId).toList();
        List<NewsComment> replies = commentRepository.findReplies(rootIds);

        List<NewsComment> all = new ArrayList<>(roots.getContent());
        all.addAll(replies);
        Map<String, Author> authors = loadAuthors(all);

        Map<String, List<NewsDtos.CommentResponse>> byParent = new HashMap<>();
        for (NewsComment reply : replies) {
            NewsDtos.CommentResponse dto = toDto(reply, viewerId, authors, List.of());
            if (dto != null) {
                byParent.computeIfAbsent(reply.getParentId(), key -> new ArrayList<>()).add(dto);
            }
        }

        return roots.map(root -> toDto(
                root, viewerId, authors, byParent.getOrDefault(root.getId(), List.of())));
    }

    /**
     * {@code null} khi người xem không được thấy bình luận này — bình luận chờ
     * duyệt hoặc đã bị ẩn của người khác.
     */
    private NewsDtos.CommentResponse toDto(
            NewsComment comment,
            String viewerId,
            Map<String, Author> authors,
            List<NewsDtos.CommentResponse> replies) {

        boolean mine = comment.getUserId().equals(viewerId);
        if (!comment.isPubliclyVisible() && !mine) {
            return null;
        }

        Author author = authors.getOrDefault(comment.getUserId(), Author.unknown());
        String note = switch (comment.getStatus()) {
            case PENDING -> "Bình luận đang chờ quản trị viên duyệt, người khác chưa thấy.";
            case HIDDEN -> comment.getHiddenReason() == null || comment.getHiddenReason().isBlank()
                    ? "Bình luận đã bị quản trị viên ẩn."
                    : "Đã bị quản trị viên ẩn: " + comment.getHiddenReason();
            default -> null;
        };

        return new NewsDtos.CommentResponse(
                comment.getId(),
                author.name(),
                mine,
                author.admin(),
                comment.getBody(),
                comment.getStatus().name(),
                note,
                comment.getCreatedAt(),
                replies);
    }

    // -----------------------------------------------------------------
    // Viết bình luận — cần Premium
    // -----------------------------------------------------------------

    /**
     * @param staff true = người gửi có quyền kiểm duyệt, được miễn điều kiện
     *              Premium. Không miễn thì quản trị viên hết hạn dùng thử không
     *              trả lời được câu hỏi của học viên — đúng việc họ phải làm.
     */
    @Transactional
    public NewsDtos.CommentResponse addComment(
            String userId, String postId, NewsDtos.SaveCommentRequest request, boolean staff) {

        NewsPost post = postRepository.findById(postId)
                .filter(NewsPost::isPublished)
                .orElseThrow(() -> ApiException.notFound("NewsPost", postId));

        if (!post.isCommentsEnabled()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Bài viết này đã tắt bình luận");
        }
        if (!staff && !entitlementService.hasPremiumAccess(userId)) {
            throw ApiException.premiumRequired();
        }

        String body = request.body().trim();
        if (body.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Nội dung bình luận trống");
        }

        if (commentRepository.countDuplicates(
                userId, postId, body, Instant.now().minus(DUPLICATE_WINDOW)) > 0) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bạn vừa gửi bình luận này rồi");
        }

        // Chỉ cho trả lời bình luận GỐC. Trả lời của trả lời tạo luồng lồng sâu,
        // gần như không đọc được trên điện thoại — mà phần lớn học viên dùng
        // điện thoại. Nhận parentId của một trả lời thì quy về gốc của nó.
        String parentId = null;
        if (request.parentId() != null && !request.parentId().isBlank()) {
            NewsComment parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> ApiException.notFound("NewsComment", request.parentId()));
            if (!parent.getPostId().equals(postId)) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED,
                        "Bình luận gốc không thuộc bài viết này");
            }
            parentId = parent.getParentId() != null ? parent.getParentId() : parent.getId();
        }

        NewsComment comment = new NewsComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setParentId(parentId);
        comment.setBody(body);
        comment.setStatus(post.isCommentsModerated()
                ? NewsComment.CommentStatus.PENDING
                : NewsComment.CommentStatus.VISIBLE);

        NewsComment saved = commentRepository.save(comment);
        if (parentId != null) {
            commentRepository.addReplyCount(parentId, 1);
        }

        return toDto(saved, userId, loadAuthors(List.of(saved)), List.of());
    }

    /** Người viết tự xoá bình luận của mình. */
    @Transactional
    public void deleteOwnComment(String userId, String commentId) {
        NewsComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("NewsComment", commentId));

        if (!comment.getUserId().equals(userId)) {
            throw ApiException.forbidden("Chỉ xoá được bình luận của mình");
        }

        comment.setStatus(NewsComment.CommentStatus.DELETED);
        commentRepository.save(comment);
        if (comment.getParentId() != null) {
            commentRepository.addReplyCount(comment.getParentId(), -1);
        }
    }

    // -----------------------------------------------------------------
    // Tên tác giả
    // -----------------------------------------------------------------

    private record Author(String name, boolean admin) {
        static Author unknown() {
            return new Author("Học viên", false);
        }
    }

    /** Một truy vấn cho cả trang thay vì một truy vấn mỗi bình luận. */
    private Map<String, Author> loadAuthors(List<NewsComment> comments) {
        List<String> ids = comments.stream().map(NewsComment::getUserId).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }

        Map<String, Author> result = new LinkedHashMap<>();
        for (var user : userRepository.findAllByIdInWithRoles(ids)) {
            boolean admin = user.getRoles().stream()
                    .map(Role::getCode)
                    .anyMatch(code -> Role.ADMIN.equals(code) || Role.SUPER_ADMIN.equals(code));
            result.put(user.getId(), new Author(maskEmail(user.getEmail()), admin));
        }

        // Tên hiển thị ưu tiên hơn email đã che
        profileRepository.findAllById(ids).forEach(profile -> {
            String name = Optional.ofNullable(profile.getDisplayName())
                    .filter(value -> !value.isBlank())
                    .orElse(profile.getFullName());
            if (name != null && !name.isBlank()) {
                Author current = result.get(profile.getUserId());
                result.put(profile.getUserId(),
                        new Author(name.trim(), current != null && current.admin()));
            }
        });

        return result;
    }

    /**
     * Che email khi học viên chưa đặt tên hiển thị.
     *
     * <p>Bình luận là nơi công khai, khách chưa đăng nhập cũng đọc được — hiện
     * đủ email là phát tán địa chỉ của học viên.
     */
    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "Học viên";
        }
        String name = email.substring(0, email.indexOf('@'));
        if (name.length() <= 2) {
            return name.charAt(0) + "***";
        }
        return name.substring(0, 2) + "***" + name.charAt(name.length() - 1);
    }

    // -----------------------------------------------------------------
    // Dùng chung
    // -----------------------------------------------------------------

    private static String excerptOf(NewsPost post) {
        if (post.getExcerpt() != null && !post.getExcerpt().isBlank()) {
            return post.getExcerpt();
        }
        // Cắt từ body và bỏ ký hiệu Markdown, nếu không đoạn tóm tắt lẫn dấu # và *
        String plain = post.getBody()
                .replaceAll("(?m)^#{1,6}\\s*", "")
                .replaceAll("[*_`>\\[\\]()]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return plain.length() <= 200 ? plain : plain.substring(0, 197) + "…";
    }

    private static boolean hasPractice(NewsPost post) {
        return post.getPartId() != null || post.getTopicId() != null;
    }

    /**
     * Slug từ tiêu đề, thêm hậu tố số khi trùng.
     *
     * <p>Bỏ dấu tiếng Việt bằng NFD rồi xoá dấu tổ hợp. Chữ đ không phải nguyên
     * âm mang dấu nên NFD không tách được, phải thay riêng.
     */
    String uniqueSlug(String title, String currentId) {
        String base = Normalizer.normalize(title == null ? "" : title, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) {
            base = "bai-viet";
        }
        if (base.length() > 140) {
            base = base.substring(0, 140).replaceAll("-$", "");
        }

        String candidate = base;
        int suffix = 2;
        while (true) {
            Optional<NewsPost> existing = postRepository.findBySlug(candidate);
            if (existing.isEmpty() || existing.get().getId().equals(currentId)) {
                return candidate;
            }
            candidate = base + "-" + suffix++;
        }
    }

    public static Pageable pageOf(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
    }
}
