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
import vn.weconex.aptis.catalog.domain.PartScoringRule;
import vn.weconex.aptis.catalog.repository.PartScoringRuleRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
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
    private final PartScoringRuleRepository scoringRuleRepository;
    private final vn.weconex.aptis.common.config.AptisProperties properties;

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

        // Gom các bộ một-câu của cùng một Part thành một đề đúng format đề thi.
        //
        // CHỈ gộp khi thi thử cả kỹ năng: lúc đó phải tái hiện đúng đề thật (ví
        // dụ Writing Part 1 là một form 5 câu). Khi luyện riêng một Part thì để
        // rải từng câu, học viên tự chọn câu muốn làm và giao diện phân trang —
        // gộp lại sẽ khoá họ vào đúng 5 câu ngẫu nhiên mỗi lượt.
        //
        // Làm ở đây thay vì ở caller vì thi thử truyền vào nhiều Part một lúc,
        // mỗi Part có số câu khác nhau. Sau bước này phần còn lại không cần biết
        // chuyện gộp.
        if (attempt.getMode() == PracticeMode.MOCK_TEST) {
            MergeResult mergeResult = mergeByPart(questionSets, documents);
            questionSets = mergeResult.questionSets();
            documents = mergeResult.documents();
        }

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
        snapshotScoringRules(config, questionSets);
        config.setScoringRuleSnapshotVersion(1);
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

        // Đếm theo số câu hỏi thật, không theo số item: item MATCHING của Reading
        // Part 3 gộp 14 cặp ghép vào một item, nên items.size() sẽ báo "1 câu"
        // trong khi học viên phải trả lời 14 lần.
        int totalItems = entries.stream()
                .mapToInt(e -> e.getSnapshot().getItems().stream()
                        .mapToInt(AttemptSnapshotFactory::answerableUnits)
                        .sum())
                .sum();

        return new Snapshot(attemptDocument, rows, totalItems);
    }

    private void snapshotScoringRules(
            AttemptDocument.ConfigSnapshot config, List<QuestionSet> questionSets) {
        List<String> partIds = questionSets.stream()
                .map(questionSet -> questionSet.getPart().getId())
                .distinct()
                .toList();
        if (partIds.isEmpty()) {
            return;
        }
        Map<String, AttemptDocument.PartScoringRuleSnapshot> snapshots =
                new java.util.LinkedHashMap<>();
        for (PartScoringRule rule : scoringRuleRepository.findByPartIdIn(partIds)) {
            AttemptDocument.PartScoringRuleSnapshot snapshot =
                    new AttemptDocument.PartScoringRuleSnapshot();
            String partId = rule.getPart().getId();
            snapshot.setRuleId(rule.getId());
            snapshot.setPartId(partId);
            snapshot.setMaxScore(decimal(rule.getMaxScore()));
            snapshot.setPointsPerCorrect(decimal(rule.getPointsPerCorrect()));
            snapshot.setPerfectBonus(decimal(rule.getPerfectBonus()));
            snapshot.setIncludedInOverall(rule.isIncludedInOverall());
            snapshot.setUpdatedAt(rule.getUpdatedAt());
            snapshots.put(partId, snapshot);
        }
        config.setPartScoringRules(snapshots);
    }

    private static String decimal(BigDecimal value) {
        return value == null ? null : value.toPlainString();
    }

    private record MergeResult(
            List<QuestionSet> questionSets,
            Map<String, QuestionSetDocument> documents) {
    }

    /**
     * Với mỗi Part được cấu hình gộp câu, gom các bộ của Part đó thành một đề.
     * Part không cấu hình thì giữ nguyên từng bộ.
     *
     * <p>Giữ đúng thứ tự Part ban đầu — thi thử phải theo cấu trúc đề thật.
     */
    private MergeResult mergeByPart(
            List<QuestionSet> questionSets,
            Map<String, QuestionSetDocument> documents) {

        // Gom theo partId nhưng vẫn nhớ thứ tự xuất hiện đầu tiên của mỗi Part
        Map<String, List<QuestionSet>> byPart = new java.util.LinkedHashMap<>();
        for (QuestionSet questionSet : questionSets) {
            byPart.computeIfAbsent(questionSet.getPart().getId(), key -> new ArrayList<>())
                    .add(questionSet);
        }

        boolean merged = false;
        List<QuestionSet> resultSets = new ArrayList<>();
        Map<String, QuestionSetDocument> resultDocuments = new java.util.HashMap<>(documents);

        for (Map.Entry<String, List<QuestionSet>> entry : byPart.entrySet()) {
            List<QuestionSet> partSets = entry.getValue();
            var mergeSize = properties.practice().mergeSizeOf(entry.getKey());

            if (mergeSize.isEmpty() || partSets.size() < 2) {
                resultSets.addAll(partSets);
                continue;
            }

            // Chia thành từng nhóm mergeSize câu = một đề. Luyện theo Part lấy
            // cả ngân hàng nên phải ra NHIỀU đề để học viên bấm "Bài tiếp" đi
            // hết, không phải gộp tất cả vào một đề khổng lồ.
            int itemsPerTest = mergeSize.get();
            for (int start = 0; start + itemsPerTest <= partSets.size(); start += itemsPerTest) {
                List<QuestionSet> chunk = partSets.subList(start, start + itemsPerTest);
                QuestionSet representative = chunk.get(0);
                resultDocuments.put(
                        representative.getId(),
                        mergeIntoOne(chunk, documents, itemsPerTest));
                resultSets.add(representative);
            }
            // Phần dư không đủ một đề thì bỏ, tránh tạo đề thiếu câu.
            merged = true;
        }

        return merged
                ? new MergeResult(resultSets, resultDocuments)
                : new MergeResult(questionSets, documents);
    }

    /**
     * Gom nhiều bộ một-câu thành một đề duy nhất.
     *
     * <p>Speaking Part 1 và Writing Part 1 gồm nhiều câu độc lập nhau. Biên tập
     * viên nhập từng câu rời cho nhanh, hệ thống ghép lại khi tạo lượt.
     *
     * <p>Bộ đầu tiên làm đại diện: giữ nguyên metadata (partId, taskTypeCode,
     * settings, scoring) rồi thay danh sách item bằng item của tất cả các bộ.
     *
     * <p>itemId được đặt tiền tố theo questionSetId vì các bộ thường dùng chung
     * id {@code item_1}; để trùng thì autosave của câu này sẽ ghi đè câu kia.
     */
    private QuestionSetDocument mergeIntoOne(
            List<QuestionSet> questionSets,
            Map<String, QuestionSetDocument> documents,
            int mergeSize) {

        QuestionSetDocument first = documents.get(questionSets.get(0).getId());
        if (first == null) {
            throw new ApiException(
                    ErrorCode.QUESTION_SET_CONTENT_MISSING,
                    "Thiếu nội dung MongoDB cho question set " + questionSets.get(0).getId(),
                    Map.of("questionSetId", questionSets.get(0).getId()));
        }

        QuestionSetDocument merged = new QuestionSetDocument();
        merged.setId(first.getId());
        merged.setQuestionSetId(first.getQuestionSetId());
        merged.setRevision(first.getRevision());
        merged.setSchemaVersion(first.getSchemaVersion());
        merged.setPartId(first.getPartId());
        merged.setTaskTypeCode(first.getTaskTypeCode());
        merged.setTitle(first.getTitle());
        merged.setInstructions(first.getInstructions());
        merged.setAccessLevel(first.getAccessLevel());
        merged.setStimulus(first.getStimulus());
        merged.setSections(first.getSections());
        merged.setSettings(first.getSettings());
        merged.setScoring(first.getScoring());
        merged.setCreatedAt(first.getCreatedAt());
        merged.setUpdatedAt(first.getUpdatedAt());

        List<QuestionSetDocument.Item> items = new ArrayList<>();
        List<QuestionSetDocument.AssetRef> assets = new ArrayList<>();

        int sequence = 1;
        for (QuestionSet questionSet : questionSets.stream().limit(mergeSize).toList()) {
            QuestionSetDocument source = documents.get(questionSet.getId());
            if (source == null) {
                throw new ApiException(
                        ErrorCode.QUESTION_SET_CONTENT_MISSING,
                        "Thiếu nội dung MongoDB cho question set " + questionSet.getId(),
                        Map.of("questionSetId", questionSet.getId()));
            }

            String prefix = questionSet.getId() + "::";
            for (QuestionSetDocument.Item item : source.getItems()) {
                String originalId = item.getId();
                item.setId(prefix + originalId);
                item.setSequenceNo(sequence++);
                items.add(item);

                // Asset gắn theo item cũng phải đổi theo id mới, nếu không
                // audio/ảnh của câu sẽ không tìm được chủ.
                for (QuestionSetDocument.AssetRef asset : source.getAssets()) {
                    if (("ITEM_AUDIO:" + originalId).equals(asset.getRole())) {
                        asset.setRole("ITEM_AUDIO:" + prefix + originalId);
                    } else if (("ITEM_IMAGE:" + originalId).equals(asset.getRole())) {
                        asset.setRole("ITEM_IMAGE:" + prefix + originalId);
                    }
                }
            }
            assets.addAll(source.getAssets());
        }

        merged.setItems(items);
        merged.setAssets(assets);
        return merged;
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

    /**
     * Số câu trả lời mà học viên phải điền cho một item.
     *
     * <p>Phần lớn dạng bài là 1. MATCHING và ORDERING gộp nhiều câu vào một item
     * nên phải đếm theo số cặp / số vị trí, nếu không bảng điểm hiện "1 câu" cho
     * bài 14 câu.
     */
    private static int answerableUnits(QuestionSetDocument.Item item) {
        String type = item.getResponseType();
        if (type == null) {
            return 1;
        }
        return switch (type) {
            case "MATCHING" -> {
                var key = item.getAnswerKey();
                int pairs = key == null || key.getMatches() == null ? 0 : key.getMatches().size();
                yield Math.max(1, pairs);
            }
            case "ORDERING", "SENTENCE_ORDERING" -> {
                var key = item.getAnswerKey();
                int slots = key == null || key.getOrderedOptionIds() == null
                        ? 0 : key.getOrderedOptionIds().size();
                yield Math.max(1, slots);
            }
            default -> 1;
        };
    }

    public record Snapshot(
            AttemptDocument document,
            List<AttemptQuestionSet> questionSetRows,
            int totalItems) {
    }
}
