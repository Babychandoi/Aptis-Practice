package vn.weconex.aptis.evaluation.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.evaluation.service.TeacherReviewService;

/**
 * Giáo viên xem và chấm lại bài Speaking/Writing (PHẦN XI §65).
 *
 * <p>Cần permission {@code evaluation:review} — role TEACHER, ADMIN, SUPER_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/evaluations")
@RequiredArgsConstructor
public class TeacherReviewController {

    private final TeacherReviewService reviewService;
    private final CurrentUser currentUser;

    /**
     * Bài đã chấm AI, chờ giáo viên xem lại.
     */
    @GetMapping("/pending-review")
    @PreAuthorize("hasAuthority('evaluation:review')")
    public PageResponse<TeacherReviewDtos.PendingReviewResponse> pendingReview(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(
                reviewService.pendingReview(PageRequest.of(page, Math.min(size, 100))),
                summary -> new TeacherReviewDtos.PendingReviewResponse(
                        summary.getEvaluationJobId(),
                        summary.getAttemptId(),
                        summary.getQuestionSetId(),
                        summary.getEvaluatorType().name(),
                        summary.getTotalScore() == null
                                ? null : summary.getTotalScore().doubleValue(),
                        summary.getMaxScore() == null
                                ? null : summary.getMaxScore().doubleValue(),
                        summary.getCefrLevel() == null ? null : summary.getCefrLevel().name(),
                        summary.getCreatedAt()));
    }

    /**
     * Chi tiết bài làm kèm điểm AI đã cho, để giáo viên đối chiếu.
     */
    @GetMapping("/{evaluationJobId}")
    @PreAuthorize("hasAuthority('evaluation:review')")
    public TeacherReviewDtos.ReviewDetailResponse detail(@PathVariable String evaluationJobId) {
        return reviewService.detail(evaluationJobId);
    }

    /**
     * Ghi điểm của giáo viên. Điểm này ghi đè điểm AI nhưng bản AI vẫn được giữ
     * để đối soát.
     */
    @PostMapping("/{evaluationJobId}/review")
    @PreAuthorize("hasAuthority('evaluation:review')")
    public TeacherReviewDtos.ReviewResultResponse submitReview(
            @PathVariable String evaluationJobId,
            @Valid @RequestBody TeacherReviewDtos.SubmitReviewRequest request) {

        return reviewService.submitReview(
                currentUser.requireUserId(), evaluationJobId, request);
    }
}
