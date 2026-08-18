package vn.weconex.aptis.evaluation.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
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

    /**
     * Bản ghi dài hơn mốc này mà không ra chữ nào thì coi là lỗi STT, không phải
     * học viên im lặng. 3 giây: đủ để loại các bản ghi bấm nhầm rồi dừng ngay.
     */
    private static final long MIN_AUDIBLE_MS = 3_000;

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
    private final TransactionTemplate transactionTemplate;

    /**
     * Xử lý một job.
     *
     * <p>Ném exception khi lỗi thay vì tự ghi nhận: transaction này sẽ rollback
     * nên mọi thay đổi bên trong đều mất. Caller ({@link EvaluationDispatcher})
     * ghi nhận thất bại qua transaction độc lập.
     */
    public boolean processOne(String jobId) {
        boolean claimed = Boolean.TRUE.equals(transactionTemplate.execute(status ->
                jobRepository.claim(
                        jobId, JobStatus.QUEUED, JobStatus.PROCESSING, Instant.now()) == 1));
        if (!claimed) {
            return false;
        }

        EvaluationJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalStateException("Job vừa claim đã biến mất: " + jobId));

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

        EvaluationOutcome outcome = evaluateWithFallback(job, entry);
        EvaluationEngine engine = outcome.engine();
        EvaluationEngine.EvaluationResult result = outcome.result();

        Boolean completed = transactionTemplate.execute(status -> {
            EvaluationJob currentJob = jobRepository.findById(jobId).orElse(null);
            if (currentJob == null || currentJob.getStatus() != JobStatus.PROCESSING) {
                return false;
            }

            // Different jobs of the same attempt may be handled by different
            // worker replicas. Lock the attempt and reload Mongo before merging
            // this score so one completion cannot overwrite another.
            attemptRepository.findByIdForUpdate(currentJob.getAttemptId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy attempt " + currentJob.getAttemptId()));
            AttemptDocument latestDocument = attemptDocumentRepository
                    .findByAttemptId(currentJob.getAttemptId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Thiếu snapshot cho attempt " + currentJob.getAttemptId()));
            AttemptDocument.QuestionSetEntry latestEntry =
                    latestDocument.findEntry(currentJob.getAttemptQuestionSetId());
            if (latestEntry == null) {
                throw new IllegalStateException(
                        "Snapshot thiếu entry " + currentJob.getAttemptQuestionSetId());
            }
            copyAudioAnalysis(entry, latestEntry);

            EvaluationDocument document =
                    persistEvaluationDocument(currentJob, latestEntry, engine, result);
            applyScoreToAttempt(currentJob, latestEntry, latestDocument, result, document);
            currentJob.markCompleted(document.getId());
            return true;
        });
        if (!Boolean.TRUE.equals(completed)) {
            return false;
        }
        log.info("Đã chấm job {} ({}): {}/{}",
                jobId, job.getEvaluationType(), result.totalScore(), result.maxScore());
        return true;
    }

    private static void copyAudioAnalysis(
            AttemptDocument.QuestionSetEntry source,
            AttemptDocument.QuestionSetEntry target) {
        for (AttemptDocument.ItemResponse sourceResponse
                : source.getResponse().getItemResponses()) {
            if (sourceResponse.getTranscript() == null) {
                continue;
            }
            AttemptDocument.ItemResponse targetResponse =
                    target.getResponse().findItemResponse(sourceResponse.getItemId());
            if (targetResponse != null) {
                targetResponse.setTranscript(sourceResponse.getTranscript());
                targetResponse.setAcousticMetrics(sourceResponse.getAcousticMetrics());
                targetResponse.setAudioAnalysisSource(sourceResponse.getAudioAnalysisSource());
            }
        }
    }

    // -----------------------------------------------------------------

    private List<EvaluationEngine> resolveEngines(EvaluationType type) {
        List<EvaluationEngine> matching = engines.stream()
                .filter(engine -> engine.supports(type))
                .toList();
        if (matching.isEmpty()) {
            throw new IllegalStateException(
                        "Không có engine chấm cho " + type
                                + ". Bật aptis.evaluation.heuristic.enabled hoặc "
                                + "cấu hình engine thật.");
        }
        return matching;
    }

    private record EvaluationOutcome(
            EvaluationEngine engine,
            EvaluationEngine.EvaluationResult result) {
    }

    /**
     * Provider gets normal retries. On the final attempt only, malformed JSON or
     * an unavailable provider falls back to the next configured engine so the
     * learner still receives an explicitly labelled provisional score.
     */
    private EvaluationOutcome evaluateWithFallback(
            EvaluationJob job, AttemptDocument.QuestionSetEntry entry) {
        List<EvaluationEngine> matching = resolveEngines(job.getEvaluationType());
        EvaluationEngine primary = matching.get(0);
        try {
            return new EvaluationOutcome(primary, evaluate(job, entry, primary));
        } catch (EvaluationProviderException ex) {
            boolean finalAttempt = job.getRetryCount() >= EvaluationDispatcher.MAX_RETRY - 1;
            if (!finalAttempt || matching.size() < 2) {
                throw ex;
            }
            EvaluationEngine fallback = matching.get(1);
            log.error("Provider {} lỗi ở lần cuối; dùng fallback {} cho job {}: {}",
                    primary.engineName(), fallback.engineName(), job.getId(), ex.getMessage());
            return new EvaluationOutcome(fallback, evaluate(job, entry, fallback));
        }
    }

    private EvaluationEngine.EvaluationResult evaluate(
            EvaluationJob job,
            AttemptDocument.QuestionSetEntry entry,
            EvaluationEngine engine) {

        QuestionSetDocument.Item item = firstEvaluableItem(entry, job.getEvaluationType());
        AttemptDocument.ItemResponse response = entry.getResponse().findItemResponse(item.getId());

        // Writing Part 1/2/3 có nhiều ô trả lời trong cùng một bộ. Một job phải
        // chấm toàn bộ các ô theo đúng thứ tự, không chỉ item đầu tiên.
        if (job.getEvaluationType() == EvaluationType.WRITING_AI) {
            List<QuestionSetDocument.Item> writingItems = evaluableItems(entry, "LONG_TEXT");
            StringBuilder prompts = new StringBuilder();
            StringBuilder answers = new StringBuilder();
            int minWords = 0;
            int maxWords = 0;
            for (int index = 0; index < writingItems.size(); index++) {
                QuestionSetDocument.Item writingItem = writingItems.get(index);
                AttemptDocument.ItemResponse writingResponse =
                        entry.getResponse().findItemResponse(writingItem.getId());
                prompts.append("Question ").append(index + 1).append(": ")
                        .append(writingItem.getPrompt() == null
                                ? "" : writingItem.getPrompt().getValue())
                        .append('\n');
                answers.append("Answer ").append(index + 1).append(": ");
                if (writingResponse != null && writingResponse.getTextValue() != null) {
                    answers.append(writingResponse.getTextValue());
                }
                answers.append('\n');
                minWords += numberConstraint(writingItem, "minWords");
                maxWords += numberConstraint(writingItem, "maxWords");
            }
            Map<String, Object> constraints = new LinkedHashMap<>(item.getConstraints());
            constraints.put("minWords", minWords);
            constraints.put("maxWords", maxWords);
            constraints.put("itemCount", writingItems.size());
            return engine.evaluate(new EvaluationEngine.EvaluationRequest(
                    job.getEvaluationType(), answers.toString(), null, null, null,
                    Map.of(),
                    loadRubric(item), prompts.toString(), constraints));
        }

        String transcript = null;
        Long durationMs = null;
        Map<String, Object> acousticMetrics = Map.of();
        String audioAnalysisSource = null;
        if (job.getEvaluationType() == EvaluationType.SPEAKING_AI && response != null) {
            // Chuyển giọng nói thành văn bản trước khi chấm (§40 bước 6)
            TranscriptionService.Transcript t;
            if (response.getAudioAnalysisSource() != null && response.getTranscript() != null) {
                t = new TranscriptionService.Transcript(
                        response.getTranscript(), null, true,
                        response.getAcousticMetrics(), response.getAudioAnalysisSource());
            } else {
                t = transcriptionService.transcribe(response.getRecordingAssetId());
            }
            transcript = t.text();
            durationMs = t.durationMs();
            acousticMetrics = t.acousticMetrics();
            audioAnalysisSource = t.source();

            // Có bản ghi mà không nghe được chữ nào: phân biệt hai trường hợp.
            //
            // Học viên KHÔNG NÓI GÌ thì 0 điểm là đúng. Nhưng STT lỗi (endpoint
            // sập, hết hạn mức, file hỏng) cũng cho transcript rỗng — chấm 0 lúc
            // đó là oan. Ném lỗi để job vào retry; chỉ khi hết lượt thử mới
            // FAILED và giáo viên chấm tay, thay vì âm thầm cho 0.
            if (!t.available() && response.getRecordingAssetId() != null
                    && durationMs != null && durationMs > MIN_AUDIBLE_MS) {
                throw new IllegalStateException(
                        "Không lấy được transcript cho bản ghi dài " + durationMs
                                + " ms — kiểm tra dịch vụ STT trước khi chấm");
            }

            // Lưu transcript vào snapshot để giáo viên xem lại được
            response.setTranscript(transcript);
            response.setAcousticMetrics(acousticMetrics);
            response.setAudioAnalysisSource(audioAnalysisSource);
        }

        EvaluationEngine.RubricSpec rubric = loadRubric(item);

        return engine.evaluate(new EvaluationEngine.EvaluationRequest(
                job.getEvaluationType(),
                response == null ? null : response.getTextValue(),
                transcript,
                response == null ? null : response.getRecordingAssetId(),
                durationMs,
                acousticMetrics,
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

    private static List<QuestionSetDocument.Item> evaluableItems(
            AttemptDocument.QuestionSetEntry entry, String responseType) {
        return entry.getSnapshot().getItems().stream()
                .filter(item -> responseType.equals(item.getResponseType()))
                .toList();
    }

    private static int numberConstraint(QuestionSetDocument.Item item, String key) {
        Object value = item.getConstraints().get(key);
        return value instanceof Number number ? number.intValue() : 0;
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
            input.setAcousticMetrics(response.getAcousticMetrics());
            input.setAudioAnalysisSource(response.getAudioAnalysisSource());
            Object measuredDuration = response.getAcousticMetrics() == null
                    ? null : response.getAcousticMetrics().get("durationSeconds");
            if (measuredDuration instanceof Number number) {
                input.setDurationMs(Math.round(number.doubleValue() * 1000));
            }
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
