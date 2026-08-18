package vn.weconex.aptis.practice.service;

import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.util.Enums.EvaluationType;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.evaluation.domain.EvaluationJob;
import vn.weconex.aptis.evaluation.repository.EvaluationJobRepository;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

/**
 * Tạo job chấm cho các bộ câu hỏi cần AI hoặc giáo viên (PHẦN IV §40-41).
 *
 * <p>Đặt ở package practice vì được gọi từ luồng nộp bài; phần xử lý job nằm ở
 * package evaluation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EvaluationQueue {

    private final EvaluationJobRepository jobRepository;

    /**
     * Tạo một job cho mỗi bộ câu hỏi có item cần chấm tay.
     *
     * <p>Idempotent theo (attemptQuestionSetId, type): nộp lại hay chấm lại
     * không tạo job trùng.
     */
    @Transactional
    public int enqueueForAttempt(
            TestAttempt attempt,
            AttemptDocument document,
            Map<String, AttemptQuestionSet> rows) {

        int created = 0;

        for (AttemptDocument.QuestionSetEntry entry : document.getQuestionSets()) {
            EvaluationType type = resolveType(entry);
            if (type == null) {
                continue;
            }

            AttemptQuestionSet row = rows.get(entry.getAttemptQuestionSetId());
            if (row == null) {
                continue;
            }

            // Không tạo job khi học viên bỏ trống — không có gì để chấm
            if (!hasSubmittedContent(entry)) {
                log.debug("Bỏ qua job chấm cho {}: học viên không trả lời",
                        entry.getAttemptQuestionSetId());
                continue;
            }

            EvaluationJob job = EvaluationJob.queue(
                    attempt.getId(),
                    row.getId(),
                    entry.getQuestionSetId(),
                    attempt.getUserId(),
                    type);

            if (jobRepository.findByIdempotencyKey(job.getIdempotencyKey()).isPresent()) {
                continue;
            }

            jobRepository.save(job);
            created++;
        }

        if (created > 0) {
            log.info("Đã tạo {} job chấm cho attempt {}", created, attempt.getId());
        }
        return created;
    }

    /**
     * Loại chấm suy ra từ responseType của item: ghi âm → Speaking,
     * bài viết dài → Writing.
     */
    private static EvaluationType resolveType(AttemptDocument.QuestionSetEntry entry) {
        if (entry.getSnapshot() == null) {
            return null;
        }
        for (QuestionSetDocument.Item item : entry.getSnapshot().getItems()) {
            String responseType = item.getResponseType();
            if ("AUDIO_RECORDING".equals(responseType)) {
                return EvaluationType.SPEAKING_AI;
            }
            if ("LONG_TEXT".equals(responseType)) {
                return EvaluationType.WRITING_AI;
            }
        }
        return null;
    }

    static boolean hasSubmittedContent(AttemptDocument.QuestionSetEntry entry) {
        return entry.getResponse().getItemResponses().stream().anyMatch(response ->
                (response.getTextValue() != null && !response.getTextValue().isBlank())
                        || response.getRecordingAssetId() != null);
    }
}
