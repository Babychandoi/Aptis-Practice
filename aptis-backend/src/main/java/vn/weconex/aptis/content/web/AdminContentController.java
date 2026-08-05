package vn.weconex.aptis.content.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.service.AdminContentService;

/**
 * API quản trị ngân hàng câu hỏi.
 *
 * <p>Phân quyền theo permission chứ không theo role, để cấu hình được linh hoạt:
 * biên tập viên soạn (`question_set:write`), reviewer duyệt
 * (`question_set:publish`). SecurityConfig đã chặn toàn bộ `/api/v1/admin/**`
 * cho người dùng không thuộc nhóm staff.
 */
@RestController
@RequestMapping("/api/v1/admin/question-sets")
@RequiredArgsConstructor
public class AdminContentController {

    private final AdminContentService adminContentService;
    private final CurrentUser currentUser;

    // ---------- Soạn ----------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse create(
            @Valid @RequestBody AdminContentDtos.CreateQuestionSetRequest request) {

        QuestionSet created = adminContentService.create(currentUser.requireUserId(), request);
        return toResponse(created, adminContentService.loadContent(created));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse update(
            @PathVariable String id,
            @Valid @RequestBody AdminContentDtos.UpdateQuestionSetRequest request) {

        QuestionSet updated = adminContentService.update(currentUser.requireUserId(), id, request);
        return toResponse(updated, adminContentService.loadContent(updated));
    }

    // ---------- Duyệt ----------

    @PostMapping("/{id}/submit-review")
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse submitForReview(
            @PathVariable String id,
            @RequestBody(required = false) AdminContentDtos.TransitionRequest request) {

        QuestionSet result = adminContentService.submitForReview(
                currentUser.requireUserId(), id, note(request));
        return toResponse(result, null);
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasAuthority('question_set:review')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse requestChanges(
            @PathVariable String id,
            @RequestBody(required = false) AdminContentDtos.TransitionRequest request) {

        QuestionSet result = adminContentService.requestChanges(
                currentUser.requireUserId(), id, note(request));
        return toResponse(result, null);
    }

    /**
     * Trả 200 kèm danh sách lỗi nếu validate không qua — client hiển thị được
     * hết lỗi thay vì chỉ lỗi đầu tiên. Publish thành công thì {@code errors} rỗng.
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('question_set:publish')")
    public AdminContentDtos.PublishResultResponse publish(
            @PathVariable String id,
            @RequestBody(required = false) AdminContentDtos.TransitionRequest request) {

        return adminContentService.publish(currentUser.requireUserId(), id, note(request));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('question_set:publish')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse suspend(
            @PathVariable String id,
            @RequestBody(required = false) AdminContentDtos.TransitionRequest request) {

        QuestionSet result = adminContentService.suspend(
                currentUser.requireUserId(), id, note(request));
        return toResponse(result, null);
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('question_set:archive')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse archive(
            @PathVariable String id,
            @RequestBody(required = false) AdminContentDtos.TransitionRequest request) {

        QuestionSet result = adminContentService.archive(
                currentUser.requireUserId(), id, note(request));
        return toResponse(result, null);
    }

    // ---------- Đọc ----------

    @GetMapping
    @PreAuthorize("hasAuthority('question_set:read')")
    @Transactional(readOnly = true)
    public PageResponse<AdminContentDtos.AdminQuestionSetResponse> search(
            @RequestParam(required = false) String partId,
            @RequestParam(required = false) ContentStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<QuestionSet> result = adminContentService.search(
                partId, status, q,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "updatedAt")));

        // Danh sách không kèm nội dung để payload nhỏ
        return PageResponse.of(result, qs -> toResponse(qs, null));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('question_set:read')")
    @Transactional(readOnly = true)
    public AdminContentDtos.AdminQuestionSetResponse detail(@PathVariable String id) {
        QuestionSet questionSet = adminContentService.require(id);
        return toResponse(questionSet, adminContentService.loadContent(questionSet));
    }

    @GetMapping("/{id}/revisions")
    @PreAuthorize("hasAuthority('question_set:read')")
    public List<AdminContentDtos.RevisionSummaryResponse> revisions(@PathVariable String id) {
        return adminContentService.revisions(id);
    }

    /**
     * {@code revealAnswers=false} (mặc định) trả đúng bản học viên thấy — dùng
     * để tự kiểm tra không lộ đáp án.
     */
    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAuthority('question_set:read')")
    public AdminContentDtos.PreviewResponse preview(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean revealAnswers) {

        return adminContentService.preview(id, revealAnswers);
    }

    // -----------------------------------------------------------------

    private static String note(AdminContentDtos.TransitionRequest request) {
        return request == null ? null : request.note();
    }

    private static AdminContentDtos.AdminQuestionSetResponse toResponse(
            QuestionSet questionSet, AdminContentDtos.ContentPayload content) {

        return new AdminContentDtos.AdminQuestionSetResponse(
                questionSet.getId(),
                questionSet.getCode(),
                questionSet.getTitle(),
                questionSet.getPart().getId(),
                questionSet.getPart().getName(),
                questionSet.getPart().getComponent().getCode(),
                questionSet.getTaskType().getCode(),
                questionSet.getTopic() == null ? null : questionSet.getTopic().getId(),
                questionSet.getTopic() == null ? null : questionSet.getTopic().getName(),
                questionSet.getDifficulty(),
                questionSet.getHotness(),
                questionSet.getCefrMin(),
                questionSet.getCefrMax(),
                questionSet.getAccessLevel(),
                questionSet.getStatus(),
                questionSet.getCurrentRevision(),
                questionSet.getContentChecksum(),
                questionSet.getItemCount(),
                questionSet.getEstimatedSeconds(),
                questionSet.getMaxScore().doubleValue(),
                questionSet.getPublishedAt(),
                questionSet.getCreatedBy(),
                questionSet.getUpdatedBy(),
                questionSet.getCreatedAt(),
                questionSet.getUpdatedAt(),
                content);
    }
}
