package vn.weconex.aptis.practice.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
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
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptService;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PracticeController {

    private final AttemptService attemptService;
    private final TestAttemptRepository attemptRepository;
    private final CurrentUser currentUser;

    // ---------- Tạo lượt ----------

    @PostMapping("/practice/part-attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public PracticeDtos.AttemptResponse createPartAttempt(
            @Valid @RequestBody PracticeDtos.CreatePartAttemptRequest request) {

        String userId = currentUser.requireUserId();
        TestAttempt attempt = attemptService.createPartAttempt(userId, request);
        return attemptService.getAttempt(userId, attempt.getId());
    }

    @PostMapping("/practice/custom-attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public PracticeDtos.AttemptResponse createCustomAttempt(
            @Valid @RequestBody PracticeDtos.CreateCustomAttemptRequest request) {

        String userId = currentUser.requireUserId();
        TestAttempt attempt = attemptService.createCustomAttempt(userId, request);
        return attemptService.getAttempt(userId, attempt.getId());
    }

    // ---------- Làm bài ----------

    @GetMapping("/attempts/{attemptId}")
    public PracticeDtos.AttemptResponse getAttempt(@PathVariable String attemptId) {
        return attemptService.getAttempt(currentUser.requireUserId(), attemptId);
    }

    @PostMapping("/attempts/{attemptId}/start")
    public PracticeDtos.AttemptResponse start(@PathVariable String attemptId) {
        String userId = currentUser.requireUserId();
        attemptService.start(userId, attemptId);
        return attemptService.getAttempt(userId, attemptId);
    }

    /**
     * Autosave — client gọi nhiều lần, ghi đè câu trả lời cũ của cùng item.
     */
    @PutMapping("/attempts/{attemptId}/responses/{questionSetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveResponses(
            @PathVariable String attemptId,
            @PathVariable String questionSetId,
            @Valid @RequestBody PracticeDtos.SaveResponsesRequest request) {

        attemptService.saveResponses(
                currentUser.requireUserId(), attemptId, questionSetId, request);
    }

    /**
     * Nộp riêng một bộ câu hỏi để xem điểm và đáp án của đúng đề đó, không phải
     * nộp cả lượt. Lượt vẫn tiếp tục làm được các bộ còn lại.
     */
    @PostMapping("/attempts/{attemptId}/responses/{questionSetId}/score")
    public PracticeDtos.QuestionSetScoreResponse scoreQuestionSet(
            @PathVariable String attemptId,
            @PathVariable String questionSetId) {

        return attemptService.scoreQuestionSet(
                currentUser.requireUserId(), attemptId, questionSetId);
    }

    /**
     * Bắt đầu một kỹ năng — đồng hồ của kỹ năng chạy từ lúc này.
     */
    @PostMapping("/attempts/{attemptId}/components/{componentId}/begin")
    public PracticeDtos.AttemptResponse beginComponent(
            @PathVariable String attemptId,
            @PathVariable String componentId) {

        String userId = currentUser.requireUserId();
        attemptService.beginComponent(userId, attemptId, componentId);
        return attemptService.getAttempt(userId, attemptId);
    }

    /**
     * Nộp một kỹ năng trong bài thi đủ 5 kỹ năng.
     *
     * <p>Kỹ năng vừa nộp khóa lại (không sửa, không xem lại) và kỹ năng kế tiếp
     * bắt đầu chạy đồng hồ riêng. Nộp kỹ năng cuối thì nộp luôn cả lượt — đó mới
     * là lúc có điểm và đáp án.
     */
    @PostMapping("/attempts/{attemptId}/components/{componentId}/submit")
    public PracticeDtos.AttemptResponse submitComponent(
            @PathVariable String attemptId,
            @PathVariable String componentId) {

        String userId = currentUser.requireUserId();
        attemptService.submitComponent(userId, attemptId, componentId);
        return attemptService.getAttempt(userId, attemptId);
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public PracticeDtos.AttemptResponse submit(@PathVariable String attemptId) {
        String userId = currentUser.requireUserId();
        attemptService.submit(userId, attemptId);
        return attemptService.getAttempt(userId, attemptId);
    }

    /**
     * Kết quả chấm AI cho Speaking/Writing. Chỉ trả sau khi đã nộp bài; danh
     * sách rỗng nghĩa là chưa chấm xong.
     */
    @GetMapping("/attempts/{attemptId}/evaluations")
    public List<PracticeDtos.EvaluationResultResponse> evaluations(@PathVariable String attemptId) {
        return attemptService.evaluationResults(currentUser.requireUserId(), attemptId);
    }

    // ---------- Lịch sử ----------

    @GetMapping("/attempts")
    public PageResponse<AttemptSummary> listAttempts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<TestAttempt> attempts = attemptRepository.findByUserIdOrderByCreatedAtDesc(
                currentUser.requireUserId(), PageRequest.of(page, Math.min(size, 100)));

        return PageResponse.of(attempts, AttemptSummary::from);
    }

    /**
     * Bản gọn cho danh sách lịch sử — không kèm nội dung câu hỏi.
     */
    public record AttemptSummary(
            String id,
            String mode,
            String status,
            String componentId,
            String partId,
            java.time.Instant createdAt,
            java.time.Instant completedAt,
            Double percentageScore,
            int totalItems,
            int correctItems) {

        static AttemptSummary from(TestAttempt attempt) {
            return new AttemptSummary(
                    attempt.getId(),
                    attempt.getMode().name(),
                    attempt.getStatus().name(),
                    attempt.getComponentId(),
                    attempt.getPartId(),
                    attempt.getCreatedAt(),
                    attempt.getCompletedAt(),
                    attempt.getPercentageScore() == null
                            ? null : attempt.getPercentageScore().doubleValue(),
                    attempt.getTotalItems(),
                    attempt.getCorrectItems());
        }
    }
}
