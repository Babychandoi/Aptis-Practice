package vn.weconex.aptis.news.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.news.service.AdminNewsService;

/**
 * Quản trị bảng tin.
 *
 * <p>Tách hai quyền: {@code news:write} để soạn bài, {@code news:moderate} để
 * kiểm duyệt bình luận — giao việc trả lời học viên cho trợ giảng mà không mở
 * quyền sửa nội dung bài.
 */
@RestController
@RequestMapping("/api/v1/admin/news")
@RequiredArgsConstructor
public class AdminNewsController {

    private final AdminNewsService service;
    private final CurrentUser currentUser;

    // ---------- Bài viết ----------

    @GetMapping("/posts")
    @PreAuthorize("hasAuthority('news:write')")
    public PageResponse<NewsDtos.AdminPostRow> posts(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(service.posts(status, page, size));
    }

    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('news:write')")
    public NewsDtos.PostDetail post(@PathVariable String id) {
        return service.post(id);
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAuthority('news:write')")
    @ResponseStatus(HttpStatus.CREATED)
    public NewsDtos.AdminPostRow create(@Valid @RequestBody NewsDtos.SavePostRequest request) {
        return service.create(currentUser.requireUserId(), request);
    }

    @PutMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('news:write')")
    public NewsDtos.AdminPostRow update(
            @PathVariable String id,
            @Valid @RequestBody NewsDtos.SavePostRequest request) {
        return service.update(currentUser.requireUserId(), id, request);
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('news:write')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(currentUser.requireUserId(), id);
    }

    // ---------- Kiểm duyệt bình luận ----------

    @GetMapping("/comments")
    @PreAuthorize("hasAuthority('news:moderate')")
    public PageResponse<NewsDtos.AdminCommentRow> comments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(service.comments(status, page, size));
    }

    /** Số bình luận chờ duyệt — hiện chấm đỏ trên menu quản trị. */
    @GetMapping("/comments/pending-count")
    @PreAuthorize("hasAuthority('news:moderate')")
    public long pendingCount() {
        return service.pendingCount();
    }

    @PostMapping("/comments/{id}/approve")
    @PreAuthorize("hasAuthority('news:moderate')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void approve(@PathVariable String id) {
        service.approve(currentUser.requireUserId(), id);
    }

    @PostMapping("/comments/{id}/hide")
    @PreAuthorize("hasAuthority('news:moderate')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hide(
            @PathVariable String id,
            @Valid @RequestBody(required = false) NewsDtos.HideCommentRequest request) {
        service.hide(currentUser.requireUserId(), id, request == null ? null : request.reason());
    }

    /** Xoá hẳn, dùng cho spam: người viết cũng không còn thấy. */
    @DeleteMapping("/comments/{id}")
    @PreAuthorize("hasAuthority('news:moderate')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purge(@PathVariable String id) {
        service.purge(currentUser.requireUserId(), id);
    }
}
