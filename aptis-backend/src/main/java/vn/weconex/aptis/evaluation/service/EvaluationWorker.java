package vn.weconex.aptis.evaluation.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.common.util.Enums.EvaluationType;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.evaluation.mongo.EvaluationDocument;
import vn.weconex.aptis.evaluation.mongo.RubricDefinition;
import vn.weconex.aptis.evaluation.mongo.RubricDefinitionRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationDocumentRepository;
import vn.weconex.aptis.evaluation.domain.EvaluationSummary;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationSummaryRepository;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocumentRepository;
import vn.weconex.aptis.practice.repository.AttemptQuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptScoreAggregator;

/**
 * Xử lý job chấm Speaking/Writing (PHẦN IV §40-41).
 *
 * <p>Mỗi job được xử lý trong transaction riêng: một job lỗi không làm hỏng các
 * job khác trong cùng batch. Khi attempt hết job đang chờ, điểm tổng được chốt
 * và trạng thái chuyển SCORING → COMPLETED.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationWorker {

    private static final int MAX_RETRY = 3;

    private final EvaluationJobRepository jobRepository;
    private final EvaluationDocumentRepository evaluationDocumentRepository;
    private final EvaluationSummaryRepository summaryRepository;
    private final RubricDefinitionRepository rubricRepository;
    private final AttemptDocumentRepository attemptDocumentRepository;
    private final AttemptQuestionSetRepository attemptQuestionSetRepository;
    private final TestAttemptRepository attemptRepository;
    private final AttemptScoreAggregator scoreAggregator;
    private final TranscriptionService transcriptionService;
    private final List<EvaluationEngine> engines;

    /**
     * Xử lý một job.
     *
     * <p>Ném exception khi lỗi thay vì tự ghi nhận: transaction này sẽ rollback
     * nên mọi thay đổi bên trong đều mất. Caller ({@link EvaluationDispatcher})
     * ghi nhận thất bại qua transaction độc lập.
     */
    @Transactional
    public boolean processOne(String jobId) {

        EvaluationJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != JobStatus.QUEUED) {
            return false;
        }

        job.markProcessing();

        AttemptDocument attemptDocument = attemptDocumentRepository
                .findByAttemptId(job.getAttemptId())
                .orElseThrow(() -> new IllegalStateException(
                        "Thiếu snapshot cho attempt " + job.getAttemptId()));

        AttemptDocument.QuestionSetEntry entry =
                attemptDocument.findEntry(job.getAttemptQuestionSetId());
        if (entry == null) {
            throw new IllegalStateException(
                    "Snapshot thiếu entry " + job.getAttemptQuestionSetId());
        }

        EvaluationEngine engine = resolveEngine(job.getEvaluationType());
        EvaluationEngine.EvaluationResult result = evaluate(job, entry, engine);

        EvaluationDocument document = persistEvaluationDocument(job, entry, engine, result);
        applyScoreToAttempt(job, entry, attemptDocument, result, document);

        job.markCompleted(document.getId());
        log.info("Đã chấm job {} ({}): {}/{}",
                jobId, job.getEvaluationType(), result.totalScore(), result.maxScore());
        return true;
    }

    // -----------------------------------------------------------------

    private EvaluationEngine resolveEngine(EvaluationType type) {
        return engines.stream()
                .filter(engine -> engine.supports(type))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Không có engine chấm cho " + type
                                + ". Bật aptis.evaluation.heuristic.enabled hoặc "
                                + "cấu hình engine thật."));
    }

    private EvaluationEngine.EvaluationResult evaluate(
            EvaluationJob job,
            AttemptDocument.QuestionSetEntry entry,
            EvaluationEngine engine) {

        QuestionSetDocument.Item item = firstEvaluableItem(entry, job.getEvaluationType());
        AttemptDocument.ItemResponse response = entry.getResponse().findItemResponse(item.getId());

        String transcript = null;
        Long durationMs = null;
        if (job.getEvaluationType() == EvaluationType.SPEAKING_AI && response != null) {
            // Chuyển giọng nói thành văn bản trước khi chấm (§40 bước 6)
            TranscriptionService.Transcript t =
                    transcriptionService.transcribe(response.getRecordingAssetId());
            transcript = t.text();
            durationMs = t.durationMs();

            // Lưu transcript vào snapshot để giáo viên xem lại được
            response.setTranscript(transcript);
        }

        EvaluationEngine.RubricSpec rubric = loadRubric(item);

        return engine.evaluate(new EvaluationEngine.EvaluationRequest(
                job.getEvaluationType(),
                response == null ? null : response.getTextValue(),
                transcript,
                response == null ? null : response.getRecordingAssetId(),
                durationMs,
                rubric,
                item.getPrompt() == null ? null : item.getPrompt().getValue(),
                item.getConstraints()));
    }

    private static QuestionSetDocument.Item firstEvaluableItem(
            AttemptDocument.QuestionSetEntry entry, EvaluationType type) {

        String responseType = type == EvaluationType.SPEAKING_AI
                || type == EvaluationType.SPEAKING_TEACHER
                ? "AUDIO_RECORDING"
                : "LONG_TEXT";

        return entry.getSnapshot().getItems().stream()
                .filter(item -> responseType.equals(item.getResponseType()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy câu dạng " + responseType + " để chấm"));
    }

    /**
     * Rubric lấy theo rubricCode của item. Không có rubric thì không chấm được —
     * PublishValidator đã chặn publish nội dung thiếu rubricCode, nên tới đây
     * mà thiếu là lỗi dữ liệu.
     */
    private EvaluationEngine.RubricSpec loadRubric(QuestionSetDocument.Item item) {
        String code = item.getRubricCode();
        if (code == null || code.isBlank()) {
            throw new IllegalStateException("Câu " + item.getId() + " thiếu rubricCode");
        }

        RubricDefinition rubric = rubricRepository.findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy rubric " + code));

        if (!rubric.isActive()) {
            throw new IllegalStateException("Rubric " + code + " không ở trạng thái ACTIVE");
        }
        if (rubric.getCriteria().isEmpty()) {
            throw new IllegalStateException("Rubric " + code + " không có tiêu chí nào");
        }

        return new EvaluationEngine.RubricSpec(
                rubric.getCode(),
                rubric.getVersion(),
                rubric.getMaxScore(),
                rubric.getCriteria().stream()
                        .map(c -> new EvaluationEngine.CriterionSpec(
                                c.getCode(), c.getName(), c.getWeight(), c.getMaxScore()))
                        .toList());
    }

    private EvaluationDocument persistEvaluationDocument(
            EvaluationJob job,
            AttemptDocument.QuestionSetEntry entry,
            EvaluationEngine engine,
            EvaluationEngine.EvaluationResult result) {

        // Dùng lại document cũ nếu có: Mongo không rollback theo transaction MySQL,
        // nên job retry sau khi ghi Mongo thành công sẽ đụng unique index
        // evaluationJobId. Upsert thay vì insert để retry là idempotent.
        EvaluationDocument document = evaluationDocumentRepository
                .findByEvaluationJobId(job.getId())
                .orElseGet(EvaluationDocument::new);

        if (document.getId() == null) {
            document.setId(UUID.randomUUID().toString());
        }
        document.setEvaluationJobId(job.getId());
        document.setAttemptId(job.getAttemptId());
        document.setQuestionSetId(job.getQuestionSetId());
        document.setUserId(job.getUserId());

        EvaluationDocument.Evaluator evaluator = new EvaluationDocument.Evaluator();
        evaluator.setType("AI");
        evaluator.setProvider("internal");
        evaluator.setModel(engine.engineName());
        evaluator.setPromptVersion("v1");
        document.setEvaluator(evaluator);

        AttemptDocument.ItemResponse response = entry.getResponse().getItemResponses().stream()
                .findFirst()
                .orElse(null);

        EvaluationDocument.Input input = new EvaluationDocument.Input();
        if (response != null) {
            input.setTextResponse(response.getTextValue());
            input.setRecordingAssetId(response.getRecordingAssetId());
            input.setTranscript(response.getTranscript());
            String forCount = response.getTextValue() != null
                    ? response.getTextValue()
                    : response.getTranscript();
            input.setWordCount(forCount == null || forCount.isBlank()
                    ? 0
                    : forCount.strip().split("\\s+").length);
        }
        document.setInput(input);

        document.setCriteria(result.criteria().stream()
                .map(c -> {
                    EvaluationDocument.Criterion criterion = new EvaluationDocument.Criterion();
                    criterion.setCode(c.code());
                    criterion.setName(c.name());
                    criterion.setScore(c.score());
                    criterion.setMaxScore(c.maxScore());
                    criterion.setFeedback(c.feedback());
                    return criterion;
                })
                .toList());

        document.setTotalScore(result.totalScore());
        document.setMaxScore(result.maxScore());
        document.setCefrLevel(result.cefrLevel());

        EvaluationDocument.Feedback feedback = new EvaluationDocument.Feedback();
        feedback.setSummary(result.feedback().summary());
        feedback.setStrengths(result.feedback().strengths());
        feedback.setWeaknesses(result.feedback().weaknesses());
        feedback.setSuggestions(result.feedback().suggestions());
        feedback.setCorrectedVersion(result.feedback().correctedVersion());
        document.setFeedback(feedback);

        document.setStatus("COMPLETED");
        document.setCreatedAt(Instant.now());

        return evaluationDocumentRepository.save(document);
    }

    /**
     * Ghi điểm vào attempt và chốt trạng thái nếu không còn job nào đang chờ.
     */
    private void applyScoreToAttempt(
            EvaluationJob job,
            AttemptDocument.QuestionSetEntry entry,
            AttemptDocument attemptDocument,
            EvaluationEngine.EvaluationResult result,
            EvaluationDocument evaluationDocument) {

        // Quy điểm rubric về thang điểm của bộ câu hỏi trong đề
        AttemptQuestionSet row = attemptQuestionSetRepository
                .findById(job.getAttemptQuestionSetId())
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy attempt_question_set " + job.getAttemptQuestionSetId()));

        BigDecimal scaled = result.maxScore() > 0
                ? row.getMaxScore()
                        .multiply(BigDecimal.valueOf(result.totalScore()))
                        .divide(BigDecimal.valueOf(result.maxScore()), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        row.applyScore(scaled);
        attemptQuestionSetRepository.save(row);

        AttemptDocument.Score score = new AttemptDocument.Score();
        score.setRawScore(scaled.doubleValue());
        score.setMaxScore(row.getMaxScore().doubleValue());
        score.setScoredAt(Instant.now());
        score.setScoredBy("AI");
        entry.setScore(score);

        attemptDocument.setUpdatedAt(Instant.now());

        // Cập nhật bản tổng hợp cũ nếu job được chấm lại, thay vì thêm dòng mới
        EvaluationSummary summary = summaryRepository.findByEvaluationJobId(job.getId())
                .orElseGet(() -> EvaluationSummary.of(
                        job.getId(),
                        job.getAttemptId(),
                        job.getQuestionSetId(),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        null));

        summary.setTotalScore(BigDecimal.valueOf(result.totalScore()));
        summary.setMaxScore(BigDecimal.valueOf(result.maxScore()));
        summary.setCefrLevel(result.cefrLevel() == null
                ? null
                : vn.weconex.aptis.common.util.Enums.CefrLevel.valueOf(result.cefrLevel()));
        summaryRepository.save(summary);

        finalizeAttemptIfDone(job.getAttemptId(), attemptDocument);
    }

    /**
     * Chốt attempt khi mọi job đã xong. Job của attempt khác không ảnh hưởng.
     */
    private void finalizeAttemptIfDone(String attemptId, AttemptDocument attemptDocument) {
        long pending = jobRepository.countByAttemptIdAndStatusIn(
                attemptId, List.of(JobStatus.QUEUED, JobStatus.PROCESSING));

        // Job hiện tại vẫn còn PROCESSING trong transaction này
        if (pending > 1) {
            attemptDocumentRepository.save(attemptDocument);
            return;
        }

        TestAttempt attempt = attemptRepository.findById(attemptId).orElse(null);
        if (attempt == null) {
            return;
        }

        BigDecimal totalRaw = attemptQuestionSetRepository
                .findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                .map(AttemptQuestionSet::getAwardedScore)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (attempt.getStatus() == AttemptStatus.SCORING) {
            attempt.complete(totalRaw, attempt.getMaxScore());
            attemptDocument.setStatus(AttemptStatus.COMPLETED.name());
            attemptRepository.save(attempt);
            log.info("Attempt {} đã chấm xong: {}/{}",
                    attemptId, totalRaw, attempt.getMaxScore());
        }

        attemptDocumentRepository.save(attemptDocument);
        scoreAggregator.aggregate(attemptId, attemptDocument);
    }

    @Transactional(readOnly = true)
    public Optional<EvaluationDocument> findResult(String attemptId, String questionSetId) {
        return evaluationDocumentRepository.findByAttemptId(attemptId).stream()
                .filter(d -> questionSetId.equals(d.getQuestionSetId()))
                .findFirst();
    }
}
