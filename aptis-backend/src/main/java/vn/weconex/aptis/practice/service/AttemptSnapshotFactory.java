package vn.weconex.aptis.practice.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

/**
 * Tạo snapshot đề vào {@code attempt_documents}.
 *
 * <p>Snapshot copy nguyên nội dung ở revision hiện tại, GIỮ answer key để chấm.
 * Bản trả cho client được lược riêng bởi
 * {@link vn.weconex.aptis.content.service.QuestionSetSanitizer}.
 */
@Component
@RequiredArgsConstructor
public class AttemptSnapshotFactory {

    private final QuestionSetDocumentRepository documentRepository;

    /**
     * @param questionSets thứ tự trong list quyết định displayOrder
     * @return cặp (AttemptDocument, danh sách AttemptQuestionSet) chưa persist
     */
    public Snapshot build(TestAttempt attempt, List<QuestionSet> questionSets, Integer durationSeconds) {
        List<String> ids = questionSets.stream().map(QuestionSet::getId).toList();
        Map<String, QuestionSetDocument> documents = documentRepository.findByQuestionSetIdIn(ids).stream()
                .collect(Collectors.toMap(
                        QuestionSetDocument::getQuestionSetId,
                        Function.identity(),
                        // Giữ document có revision cao nhất nếu Mongo còn bản cũ
                        (a, b) -> a.getRevision() >= b.getRevision() ? a : b));

        AttemptDocument attemptDocument = new AttemptDocument();
        attemptDocument.setId(attempt.getId());
        attemptDocument.setAttemptId(attempt.getId());
        attemptDocument.setUserId(attempt.getUserId());
        attemptDocument.setMode(attempt.getMode().name());
        attemptDocument.setStatus(attempt.getStatus().name());
        attemptDocument.setCreatedAt(Instant.now());
        attemptDocument.setUpdatedAt(Instant.now());

        AttemptDocument.ConfigSnapshot config = new AttemptDocument.ConfigSnapshot();
        config.setDurationSeconds(durationSeconds);
        config.setAccessLevel(attempt.getAccessLevelUsed().name());
        config.setShowAnswerDuringTest(false);
        config.setAllowReview(true);
        // Seed cố định theo attemptId để thứ tự trộn không đổi giữa các request
        config.setShuffleSeed((long) attempt.getId().hashCode());
        attemptDocument.setConfigSnapshot(config);

        List<AttemptQuestionSet> rows = new ArrayList<>(questionSets.size());
        List<AttemptDocument.QuestionSetEntry> entries = new ArrayList<>(questionSets.size());

        int order = 1;
        for (QuestionSet questionSet : questionSets) {
            QuestionSetDocument document = documents.get(questionSet.getId());
            if (document == null) {
                // MySQL nói PUBLISHED nhưng Mongo thiếu nội dung: lỗi đồng bộ,
                // không được để học viên gặp đề rỗng
                throw new ApiException(
                        ErrorCode.QUESTION_SET_CONTENT_MISSING,
                        "Thiếu nội dung MongoDB cho question set " + questionSet.getId(),
                        Map.of("questionSetId", questionSet.getId()));
            }

            BigDecimal maxScore = resolveMaxScore(questionSet, document);

            AttemptQuestionSet row = AttemptQuestionSet.of(
                    attempt.getId(),
                    questionSet.getId(),
                    document.getRevision(),
                    order,
                    maxScore);
            rows.add(row);

            AttemptDocument.QuestionSetEntry entry = new AttemptDocument.QuestionSetEntry();
            entry.setAttemptQuestionSetId(row.getId());
            entry.setQuestionSetId(questionSet.getId());
            entry.setRevision(document.getRevision());
            entry.setDisplayOrder(order);
            entry.setSnapshot(document);
            entries.add(entry);

            order++;
        }

        attemptDocument.setQuestionSets(entries);

        int totalItems = entries.stream()
                .mapToInt(e -> e.getSnapshot().getItems().size())
                .sum();

        return new Snapshot(attemptDocument, rows, totalItems);
    }

    /**
     * Điểm tối đa lấy từ nội dung Mongo (tổng maxScore của các item) vì đó là
     * bản đang được chấm; metadata MySQL chỉ dùng khi Mongo không khai báo.
     */
    private BigDecimal resolveMaxScore(QuestionSet questionSet, QuestionSetDocument document) {
        double fromItems = document.getItems().stream()
                .mapToDouble(QuestionSetDocument.Item::getMaxScore)
                .sum();

        return fromItems > 0
                ? BigDecimal.valueOf(fromItems)
                : questionSet.getMaxScore();
    }

    public record Snapshot(
            AttemptDocument document,
            List<AttemptQuestionSet> questionSetRows,
            int totalItems) {
    }
}
