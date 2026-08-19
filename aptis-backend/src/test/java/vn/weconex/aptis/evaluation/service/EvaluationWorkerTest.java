package vn.weconex.aptis.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import vn.weconex.aptis.common.util.Enums.JobStatus;
import vn.weconex.aptis.evaluation.mongo.RubricDefinitionRepository;
import vn.weconex.aptis.evaluation.mongo.RubricDefinition;
import vn.weconex.aptis.evaluation.repository.EvaluationDocumentRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;
import vn.weconex.aptis.evaluation.repository.EvaluationSummaryRepository;
import vn.weconex.aptis.practice.mongo.AttemptDocumentRepository;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.common.util.Enums.EvaluationType;
import vn.weconex.aptis.practice.repository.AttemptQuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptScoreAggregator;

class EvaluationWorkerTest {

    @Test
    void secondReplicaStopsWhenAtomicClaimWasAlreadyTaken() {
        EvaluationJobRepository jobs = mock(EvaluationJobRepository.class);
        TransactionTemplate transactions = mock(TransactionTemplate.class);
        when(transactions.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
        when(jobs.claim(
                eq("job-1"), eq(JobStatus.QUEUED), eq(JobStatus.PROCESSING), any(Instant.class)))
                .thenReturn(0);

        EvaluationWorker worker = new EvaluationWorker(
                jobs,
                mock(EvaluationDocumentRepository.class),
                mock(EvaluationSummaryRepository.class),
                mock(RubricDefinitionRepository.class),
                mock(AttemptDocumentRepository.class),
                mock(AttemptQuestionSetRepository.class),
                mock(TestAttemptRepository.class),
                mock(AttemptScoreAggregator.class),
                mock(TranscriptionService.class),
                List.of(),
                transactions);

        assertThat(worker.processOne("job-1")).isFalse();
        verify(jobs, never()).findById("job-1");
    }

    @Test
    void finalProviderFailureUsesConfiguredFallbackEngine() {
        EvaluationEngine primary = mock(EvaluationEngine.class);
        EvaluationEngine fallback = mock(EvaluationEngine.class);
        when(primary.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(fallback.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(primary.engineName()).thenReturn("llm-AI-PRO");
        when(fallback.engineName()).thenReturn("heuristic-v1");
        when(primary.evaluate(any())).thenThrow(new EvaluationProviderException("bad JSON"));
        when(fallback.evaluate(any())).thenReturn(evaluationResult());

        EvaluationWorker worker = worker(List.of(primary, fallback));
        EvaluationJob job = writingJob(EvaluationDispatcher.MAX_RETRY - 1);

        Object outcome = ReflectionTestUtils.invokeMethod(
                worker, "evaluateWithFallback", job, writingEntry());

        assertThat(outcome).isNotNull();
        verify(primary).evaluate(any());
        verify(fallback).evaluate(any());
    }

    @Test
    void providerFailureBeforeFinalAttemptIsRetriedWithoutFallback() {
        EvaluationEngine primary = mock(EvaluationEngine.class);
        EvaluationEngine fallback = mock(EvaluationEngine.class);
        when(primary.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(fallback.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(primary.evaluate(any())).thenThrow(new EvaluationProviderException("timeout"));

        EvaluationWorker worker = worker(List.of(primary, fallback));
        EvaluationJob job = writingJob(0);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                worker, "evaluateWithFallback", job, writingEntry()))
                .isInstanceOf(EvaluationProviderException.class);
        verify(fallback, never()).evaluate(any());
    }

    /**
     * Sai schema là lỗi tất định: gọi lại cùng input ra cùng kết quả. Phải
     * fallback ngay từ lần đầu thay vì đốt hết lượt retry.
     */
    @Test
    void nonRetryableSchemaFailureFallsBackImmediately() {
        EvaluationEngine primary = mock(EvaluationEngine.class);
        EvaluationEngine fallback = mock(EvaluationEngine.class);
        when(primary.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(fallback.supports(EvaluationType.WRITING_AI)).thenReturn(true);
        when(primary.engineName()).thenReturn("llm-AI-PRO");
        when(fallback.engineName()).thenReturn("heuristic-v1");
        when(primary.evaluate(any())).thenThrow(new EvaluationProviderException(
                "LLM trả về thiếu mảng criteria", null, false));
        when(fallback.evaluate(any())).thenReturn(evaluationResult());

        EvaluationWorker worker = worker(List.of(primary, fallback));
        // retryCount = 0: còn xa lần cuối, nhưng lỗi tất định nên không chờ.
        EvaluationJob job = writingJob(0);

        Object outcome = ReflectionTestUtils.invokeMethod(
                worker, "evaluateWithFallback", job, writingEntry());

        assertThat(outcome).isNotNull();
        verify(fallback).evaluate(any());
    }

    @Test
    void successfulRetryClearsTransientProviderErrorButKeepsRetryCount() {
        EvaluationJob job = writingJob(2);
        job.setErrorMessage("Kết quả chấm từ provider không hợp lệ");

        job.markCompleted("evaluation-document-1");

        assertThat(job.getStatus()).isEqualTo(JobStatus.COMPLETED);
        assertThat(job.getErrorMessage()).isNull();
        assertThat(job.getRetryCount()).isEqualTo(2);
    }

    private static EvaluationWorker worker(List<EvaluationEngine> engines) {
        RubricDefinitionRepository rubrics = mock(RubricDefinitionRepository.class);
        when(rubrics.findByCode("TEST_RUBRIC")).thenReturn(java.util.Optional.of(rubric()));
        return new EvaluationWorker(
                mock(EvaluationJobRepository.class),
                mock(EvaluationDocumentRepository.class),
                mock(EvaluationSummaryRepository.class),
                rubrics,
                mock(AttemptDocumentRepository.class),
                mock(AttemptQuestionSetRepository.class),
                mock(TestAttemptRepository.class),
                mock(AttemptScoreAggregator.class),
                mock(TranscriptionService.class),
                engines,
                mock(TransactionTemplate.class));
    }

    private static EvaluationJob writingJob(int retryCount) {
        EvaluationJob job = EvaluationJob.queue(
                "attempt-1", "attempt-set-1", "set-1", "user-1", EvaluationType.WRITING_AI);
        job.setId("job-fallback");
        job.setRetryCount(retryCount);
        return job;
    }

    private static AttemptDocument.QuestionSetEntry writingEntry() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item-1");
        item.setResponseType("LONG_TEXT");
        item.setRubricCode("TEST_RUBRIC");
        item.setConstraints(new java.util.LinkedHashMap<>());
        QuestionSetDocument document = new QuestionSetDocument();
        document.setItems(List.of(item));

        AttemptDocument.ItemResponse answer = new AttemptDocument.ItemResponse();
        answer.setItemId("item-1");
        answer.setResponseType("LONG_TEXT");
        answer.setTextValue("A complete answer.");
        AttemptDocument.QuestionSetEntry entry = new AttemptDocument.QuestionSetEntry();
        entry.setSnapshot(document);
        entry.getResponse().setItemResponses(List.of(answer));
        return entry;
    }

    private static RubricDefinition rubric() {
        RubricDefinition.Criterion criterion = new RubricDefinition.Criterion();
        criterion.setCode("GRAMMAR");
        criterion.setName("Grammar");
        criterion.setWeight(1);
        criterion.setMaxScore(3);
        RubricDefinition rubric = new RubricDefinition();
        rubric.setCode("TEST_RUBRIC");
        rubric.setVersion(1);
        rubric.setMaxScore(3);
        rubric.setStatus("ACTIVE");
        rubric.setCriteria(List.of(criterion));
        return rubric;
    }

    private static EvaluationEngine.EvaluationResult evaluationResult() {
        return new EvaluationEngine.EvaluationResult(
                List.of(new EvaluationEngine.CriterionScore(
                        "GRAMMAR", "Grammar", 2, 3, "Fallback")),
                2, 3, "B2",
                new EvaluationEngine.Feedback(
                        "Fallback", List.of(), List.of(), List.of(), null));
    }
}
