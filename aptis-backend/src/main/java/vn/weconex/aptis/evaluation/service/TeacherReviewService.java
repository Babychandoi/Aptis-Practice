package vn.weconex.aptis.evaluation.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.evaluation.domain.EvaluationSummary;
import vn.weconex.aptis.evaluation.mongo.EvaluationDocument;
import vn.weconex.aptis.evaluation.repository.EvaluationDocumentRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationSummaryRepository;
import vn.weconex.aptis.evaluation.web.TeacherReviewDtos;
import vn.weconex.aptis.platform.audit.AuditService;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocumentRepository;
import vn.weconex.aptis.practice.repository.AttemptQuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptScoreAggregator;

/**
 * Giáo viên chấm lại, ghi đè điểm AI (PHẦN XI §65).
 *
 * <p>Điểm AI KHÔNG bị xóa: bản ghi cũ chuyển {@code is_final = false}, bản của
 * giáo viên thành {@code is_final = true}. Nhờ vậy đối soát được AI chấm lệch
 * bao nhiêu so với người, và học viên vẫn thấy đúng một điểm.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherReviewService {

    private final EvaluationJobRepository jobRepository;
    private final EvaluationSummaryRepository summaryRepository;
    private final EvaluationDocumentRepository documentRepository;
    private final AttemptDocumentRepository attemptDocumentRepository;
    private final AttemptQuestionSetRepository attemptQuestionSetRepository;
    private final TestAttemptRepository attemptRepository;
    private final AttemptScoreAggregator scoreAggregator;
    private final AuditService auditService;

    /**
     * Danh sách bài cần giáo viên xem: đã chấm AI xong, chưa ai review.
     */
    @Transactional(readOnly = true)
    public Page<EvaluationSummary> pendingReview(Pageable pageable) {
        return summaryRepository.findByEvaluatorTypeAndIsFinalTrueOrderByCreatedAtDesc(
                EvaluationSummary.EvaluatorType.AI, pageable);
    }

    @Transactional(readOnly = true)
    public TeacherReviewDtos.ReviewDetailResponse detail(String evaluationJobId) {
        EvaluationJob job = jobRepository.findById(evaluationJobId)
                .orElseThrow(() -> ApiException.notFound("EvaluationJob", evaluationJobId));

        EvaluationDocument document = documentRepository.findByEvaluationJobId(evaluationJobId)
                .orElseThrow(() -> ApiException.notFound("EvaluationDocument", evaluationJobId));

        return new TeacherReviewDtos.ReviewDetailResponse(
                job.getId(),
                job.getAttemptId(),
                job.getQuestionSetId(),
                job.getUserId(),
                job.getEvaluationType().name(),
                document.getInput().getTextResponse(),
                document.getInput().getTranscript(),
                document.getInput().getRecordingAssetId(),
                document.getEvaluator().getType(),
                document.getTotalScore(),
                document.getMaxScore(),
                document.getCefrLevel(),
                document.getCriteria().stream()
                        .map(c -> new TeacherReviewDtos.CriterionResponse(
                                c.getCode(), c.getName(), c.getScore(), c.getMaxScore(),
                                c.getFeedback()))
                        .toList());
    }

    /**
     * Ghi điểm của giáo viên. Điểm này thành điểm cuối, ghi đè điểm AI.
     *
     * <p>Idempotent: chấm lại lần nữa cập nhật bản ghi của chính giáo viên đó
     * thay vì thêm dòng mới.
     */
    @Transactional
    public TeacherReviewDtos.ReviewResultResponse submitReview(
            String teacherId, String evaluationJobId, TeacherReviewDtos.SubmitReviewRequest request) {

        EvaluationJob job = jobRepository.findById(evaluationJobId)
                .orElseThrow(() -> ApiException.notFound("EvaluationJob", evaluationJobId));

        if (job.getStatus() != JobStatus.COMPLETED) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Chỉ chấm lại được bài đã chấm xong",
                    Map.of("jobStatus", job.getStatus()));
        }

        double totalScore = request.criteria().stream()
                .mapToDouble(TeacherReviewDtos.CriterionScoreInput::score)
                .sum();
        double maxScore = request.criteria().stream()
                .mapToDouble(TeacherReviewDtos.CriterionScoreInput::maxScore)
                .sum();

        if (maxScore <= 0) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED, "Tổng điểm tối đa phải lớn hơn 0");
        }
        for (var criterion : request.criteria()) {
            if (criterion.score() < 0 || criterion.score() > criterion.maxScore()) {
                throw new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "Điểm tiêu chí %s phải trong khoảng 0..%.1f"
                                .formatted(criterion.code(), criterion.maxScore()));
            }
        }

        // Hạ cờ is_final của mọi bản chấm trước — giữ lại để đối soát
        summaryRepository.demoteFinalFor(job.getAttemptId(), job.getQuestionSetId());

        EvaluationSummary summary = summaryRepository
                .findByEvaluationJobIdAndEvaluatorUserId(evaluationJobId, teacherId)
                .orElseGet(() -> {
                    EvaluationSummary fresh = new EvaluationSummary();
                    fresh.setEvaluationJobId(evaluationJobId);
                    fresh.setAttemptId(job.getAttemptId());
                    fresh.setQuestionSetId(job.getQuestionSetId());
                    fresh.setEvaluatorType(EvaluationSummary.EvaluatorType.TEACHER);
                    fresh.setEvaluatorUserId(teacherId);
                    return fresh;
                });

        summary.setTotalScore(BigDecimal.valueOf(totalScore));
        summary.setMaxScore(BigDecimal.valueOf(maxScore));
        summary.setCefrLevel(request.cefrLevel());
        summary.setFinal(true);
        summaryRepository.save(summary);

        persistTeacherDocument(job, teacherId, request, totalScore, maxScore);
        applyScoreToAttempt(job, totalScore, maxScore);

        auditService.record(teacherId, "EVALUATION_TEACHER_REVIEW", "EVALUATION_JOB",
                evaluationJobId,
                Map.of("attemptId", job.getAttemptId()),
                Map.of("totalScore", totalScore,
                        "maxScore", maxScore,
                        "cefrLevel", request.cefrLevel() == null ? "" : request.cefrLevel().name()));

        log.info("Giáo viên {} đã chấm lại job {}: {}/{}",
                teacherId, evaluationJobId, totalScore, maxScore);

        return new TeacherReviewDtos.ReviewResultResponse(
                evaluationJobId, totalScore, maxScore, request.cefrLevel(), Instant.now());
    }

    // -----------------------------------------------------------------

    /**
     * Lưu bản chấm của giáo viên thành document riêng, không ghi đè bản AI —
     * cần cả hai để so sánh chất lượng chấm tự động.
     */
    private void persistTeacherDocument(
            EvaluationJob job,
            String teacherId,
            TeacherReviewDtos.SubmitReviewRequest request,
            double totalScore,
            double maxScore) {

        EvaluationDocument aiDocument = documentRepository
                .findByEvaluationJobId(job.getId())
                .orElse(null);

        // evaluationJobId có unique index nên bản giáo viên dùng khóa dẫn xuất.
        // Phải upsert: chấm lại lần nữa mà insert mới sẽ đụng unique index,
        // rollback cả transaction và điểm ở MySQL không được cập nhật.
        String teacherDocumentKey = job.getId() + ":teacher:" + teacherId;

        EvaluationDocument document = documentRepository
                .findByEvaluationJobId(teacherDocumentKey)
                .orElseGet(EvaluationDocument::new);

        if (document.getId() == null) {
            document.setId(UUID.randomUUID().toString());
        }
        document.setEvaluationJobId(teacherDocumentKey);
        document.setAttemptId(job.getAttemptId());
        document.setQuestionSetId(job.getQuestionSetId());
        document.setUserId(job.getUserId());

        EvaluationDocument.Evaluator evaluator = new EvaluationDocument.Evaluator();
        evaluator.setType("TEACHER");
        evaluator.setUserId(teacherId);
        document.setEvaluator(evaluator);

        // Giữ nguyên input để giáo viên và AI chấm trên cùng dữ liệu
        if (aiDocument != null) {
            document.setInput(aiDocument.getInput());
        }

        document.setCriteria(request.criteria().stream()
                .map(input -> {
                    EvaluationDocument.Criterion criterion = new EvaluationDocument.Criterion();
                    criterion.setCode(input.code());
                    criterion.setName(input.name());
                    criterion.setScore(input.score());
                    criterion.setMaxScore(input.maxScore());
                    criterion.setFeedback(input.feedback());
                    return criterion;
                })
                .toList());

        document.setTotalScore(totalScore);
        document.setMaxScore(maxScore);
        document.setCefrLevel(request.cefrLevel() == null ? null : request.cefrLevel().name());

        EvaluationDocument.Feedback feedback = new EvaluationDocument.Feedback();
        feedback.setSummary(request.summary());
        feedback.setStrengths(nullSafe(request.strengths()));
        feedback.setWeaknesses(nullSafe(request.weaknesses()));
        feedback.setSuggestions(nullSafe(request.suggestions()));
        feedback.setCorrectedVersion(request.correctedVersion());
        document.setFeedback(feedback);

        document.setStatus("COMPLETED");
        document.setCreatedAt(Instant.now());
        documentRepository.save(document);
    }

    /**
     * Quy điểm rubric của giáo viên về thang điểm bộ câu hỏi, rồi tính lại điểm
     * tổng của lượt làm bài.
     */
    private void applyScoreToAttempt(EvaluationJob job, double totalScore, double maxScore) {
        AttemptQuestionSet row = attemptQuestionSetRepository
                .findById(job.getAttemptQuestionSetId())
                .orElseThrow(() -> ApiException.notFound(
                        "AttemptQuestionSet", job.getAttemptQuestionSetId()));

        BigDecimal scaled = row.getMaxScore()
                .multiply(BigDecimal.valueOf(totalScore))
                .divide(BigDecimal.valueOf(maxScore), 2, RoundingMode.HALF_UP);

        row.applyScore(scaled);
        attemptQuestionSetRepository.save(row);

        AttemptDocument attemptDocument = attemptDocumentRepository
                .findByAttemptId(job.getAttemptId())
                .orElse(null);

        if (attemptDocument != null) {
            AttemptDocument.QuestionSetEntry entry =
                    attemptDocument.findEntry(job.getAttemptQuestionSetId());
            if (entry != null) {
                AttemptDocument.Score score = new AttemptDocument.Score();
                score.setRawScore(scaled.doubleValue());
                score.setMaxScore(row.getMaxScore().doubleValue());
                score.setScoredAt(Instant.now());
                score.setScoredBy("TEACHER");
                entry.setScore(score);
            }
            attemptDocument.setUpdatedAt(Instant.now());
            attemptDocumentRepository.save(attemptDocument);
        }

        recomputeAttemptTotal(job.getAttemptId(), attemptDocument);
    }

    private void recomputeAttemptTotal(String attemptId, AttemptDocument attemptDocument) {
        TestAttempt attempt = attemptRepository.findById(attemptId).orElse(null);
        if (attempt == null) {
            return;
        }

        BigDecimal total = attemptQuestionSetRepository
                .findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                .map(AttemptQuestionSet::getAwardedScore)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Chấm lại không đổi trạng thái nếu lượt đã COMPLETED, chỉ đổi điểm
        attempt.complete(total, attempt.getMaxScore());
        if (attempt.getStatus() != AttemptStatus.COMPLETED) {
            attempt.setStatus(AttemptStatus.COMPLETED);
        }
        attemptRepository.save(attempt);

        if (attemptDocument != null) {
            scoreAggregator.aggregate(attemptId, attemptDocument);
        }
    }

    private static List<String> nullSafe(List<String> values) {
        return values == null ? List.of() : values;
    }
}
