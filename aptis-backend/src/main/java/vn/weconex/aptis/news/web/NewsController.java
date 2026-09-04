package vn.weconex.aptis.news.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import vn.weconex.aptis.common.security.AuthPrincipal;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.news.service.NewsService;

/**
 * Bảng tin cho học viên.
 *
 * <p>Đọc bài không cần đăng nhập — xem SecurityConfig. Điều đó vừa để người đã
 * hết hạn còn lý do quay lại, vừa cho Google đọc được nội dung: hiện toàn site
 * nằm sau đăng nhập nên gần như không có gì để lập chỉ mục.
 *
 * <p>Bình luận thì cần Premium, chặn trong {@link NewsService#addComment}.
 */
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;
    private final CurrentUser currentUser;

    @GetMapping
    public PageResponse<NewsDtos.PostSummary> feed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return PageResponse.of(newsService.feed(NewsService.pageOf(page, size)));
    }

    @GetMapping("/{slug}")
    public NewsDtos.PostDetail detail(@PathVariable String slug) {
        return newsService.detail(
                slug,
                currentUser.find().map(AuthPrincipal::userId).orElse(null),
                canModerate());
    }

    @GetMapping("/{postId}/comments")
    public PageResponse<NewsDtos.CommentResponse> comments(
            @PathVariable String postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(newsService.comments(
                postId, currentUser.find().map(AuthPrincipal::userId).orElse(null), NewsService.pageOf(page, size)));
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public NewsDtos.CommentResponse addComment(
            @PathVariable String postId,
            @Valid @RequestBody NewsDtos.SaveCommentRequest request) {

        return newsService.addComment(
                currentUser.requireUserId(), postId, request, canModerate());
    }

    /**
     * Người trả lời học viên là nhân sự, không phải khách hàng — không bắt họ
     * mua gói mới bình luận được.
     */
    private boolean canModerate() {
        return currentUser.find()
                .map(principal -> principal.hasPermission("news:moderate"))
                .orElse(false);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOwnComment(@PathVariable String commentId) {
        newsService.deleteOwnComment(currentUser.requireUserId(), commentId);
    }
}
