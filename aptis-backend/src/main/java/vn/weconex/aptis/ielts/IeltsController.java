package vn.weconex.aptis.ielts;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import vn.weconex.aptis.common.exception.ApiErrorResponse;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.ielts.IeltsModels.*;

@RestController @RequestMapping("/api/v1/ielts") @RequiredArgsConstructor
public class IeltsController {
    private final IeltsService service;
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> conflict(HttpServletRequest request) {
        return ResponseEntity.status(409).body(ApiErrorResponse.of(ErrorCode.CONFLICT,
            "Bài đã được lưu ở phiên khác. Tải lại trước khi tiếp tục.", null, request.getRequestURI()));
    }
    public record StartRequest(String examId) {}
    public record SaveRequest(Long version, Map<String, Response> responses) {}
    public record SubmitRequest(Skill skill) {}
    public record ReviewRequest(Map<String, Double> criteria, String feedback) {}
    @GetMapping("/exams") public Page<ExamSummary> exams(@RequestParam(defaultValue="ACADEMIC") Track track, @RequestParam(defaultValue="0") int page) { return service.catalog(track, page); }
    @GetMapping("/author/exams") public Page<Exam> authored(@RequestParam(defaultValue="0") int page) { return service.authored(page); }
    @PostMapping("/author/exams") public Exam create(@RequestBody Exam exam) { return service.saveExam(null, exam); }
    @PutMapping("/author/exams/{id}") public Exam edit(@PathVariable String id, @RequestBody Exam exam) { return service.saveExam(id, exam); }
    @PostMapping("/attempts") public AttemptView start(@RequestBody StartRequest body) { return service.start(body.examId()); }
    @GetMapping("/attempts") public Page<AttemptSummary> history(@RequestParam(defaultValue="0") int page) { return service.history(page); }
    @GetMapping("/attempts/{id}") public AttemptView get(@PathVariable String id) { return service.get(id); }
    @PutMapping("/attempts/{id}/responses") public AttemptView save(@PathVariable String id, @RequestBody SaveRequest body) { return service.saveResponses(id, body.version(), body.responses()); }
    @PostMapping("/attempts/{id}/submit-skill") public AttemptView submit(@PathVariable String id, @RequestBody SubmitRequest body) { return service.submitSkill(id, body.skill()); }
    @GetMapping("/attempts/{id}/media/{assetId}") public Map<String,String> media(@PathVariable String id, @PathVariable String assetId) { return service.media(id, assetId, false); }
    @GetMapping("/review/queue") public Page<AttemptSummary> queue(@RequestParam(defaultValue="0") int page) { return service.reviewQueue(page); }
    @GetMapping("/review/{id}") public AttemptView reviewDetail(@PathVariable String id) { return service.getForReview(id); }
    @PutMapping("/review/{id}/questions/{questionId}") public AttemptView review(@PathVariable String id, @PathVariable String questionId, @RequestBody ReviewRequest body) { return service.review(id, questionId, body.criteria(), body.feedback()); }
    @GetMapping("/review/{id}/media/{assetId}") public Map<String,String> reviewMedia(@PathVariable String id, @PathVariable String assetId) { return service.media(id, assetId, true); }
}
