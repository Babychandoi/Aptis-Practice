package vn.weconex.aptis.content.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.TaskType;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Kiểm tra trước khi publish (PHẦN X §60). Đây là hàng rào cuối trước khi nội
 * dung tới học viên, nên từng điều kiện cần một test.
 */
class PublishValidatorTest {

    private AssetRepository assetRepository;
    private PublishValidator validator;

    @BeforeEach
    void setUp() {
        assetRepository = mock(AssetRepository.class);
        when(assetRepository.findById(anyString())).thenReturn(Optional.empty());
        validator = new PublishValidator(assetRepository);
    }

    @Test
    void acceptsValidQuestionSet() {
        assertThat(validator.validate(questionSet(1), documentWith(singleChoiceItem()))).isEmpty();
    }

    @Test
    void rejectsMissingInstructions() {
        QuestionSetDocument document = documentWith(singleChoiceItem());
        document.setInstructions("  ");

        assertThat(validator.validate(questionSet(1), document))
                .anyMatch(e -> e.contains("hướng dẫn"));
    }

    @Test
    void rejectsEmptyItems() {
        QuestionSetDocument document = documentWith();

        assertThat(validator.validate(questionSet(0), document))
                .anyMatch(e -> e.contains("không có câu nào"));
    }

    @Test
    void rejectsDuplicateItemId() {
        QuestionSetDocument.Item first = singleChoiceItem();
        QuestionSetDocument.Item second = singleChoiceItem();
        second.setSequenceNo(2);

        assertThat(validator.validate(questionSet(2), documentWith(first, second)))
                .anyMatch(e -> e.contains("id trùng"));
    }

    @Test
    void rejectsDuplicateOptionId() {
        QuestionSetDocument.Item item = singleChoiceItem();
        item.getOptions().get(1).setId("A");

        assertThat(validator.validate(questionSet(1), documentWith(item)))
                .anyMatch(e -> e.contains("option id trùng"));
    }

    /** Lỗi hay gặp nhất khi sửa nội dung: xóa option nhưng quên sửa đáp án. */
    @Test
    void rejectsAnswerKeyPointingToMissingOption() {
        QuestionSetDocument.Item item = singleChoiceItem();
        item.getAnswerKey().setSelectedOptionId("Z");

        assertThat(validator.validate(questionSet(1), documentWith(item)))
                .anyMatch(e -> e.contains("option không tồn tại"));
    }

    @Test
    void rejectsMissingAnswerKeyForAutoScoredType() {
        QuestionSetDocument.Item item = singleChoiceItem();
        item.setAnswerKey(null);

        assertThat(validator.validate(questionSet(1), documentWith(item)))
                .anyMatch(e -> e.contains("phải có answerKey"));
    }

    @Test
    void rejectsLongTextWithoutRubric() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("LONG_TEXT");
        item.setMaxScore(25);

        QuestionSet questionSet = questionSet(1);
        questionSet.setMaxScore(BigDecimal.valueOf(25));

        assertThat(validator.validate(questionSet, documentWith(item)))
                .anyMatch(e -> e.contains("rubricCode"));
    }

    @Test
    void acceptsLongTextWithRubric() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("LONG_TEXT");
        item.setMaxScore(25);
        item.setRubricCode("APTIS_WRITING_PART_4_V1");

        QuestionSet questionSet = questionSet(1);
        questionSet.setMaxScore(BigDecimal.valueOf(25));

        assertThat(validator.validate(questionSet, documentWith(item))).isEmpty();
    }

    /** maxScore lệch làm phần trăm điểm hiển thị cho học viên sai. */
    @Test
    void rejectsMaxScoreMismatch() {
        QuestionSet questionSet = questionSet(1);
        questionSet.setMaxScore(BigDecimal.valueOf(5));

        assertThat(validator.validate(questionSet, documentWith(singleChoiceItem())))
                .anyMatch(e -> e.contains("không khớp tổng điểm"));
    }

    @Test
    void rejectsAssetNotReady() {
        Asset asset = new Asset();
        asset.setId("asset-1");
        asset.setAssetType(AssetType.AUDIO);
        asset.setStatus(AssetStatus.UPLOADING);
        when(assetRepository.findById("asset-1")).thenReturn(Optional.of(asset));

        QuestionSetDocument document = documentWith(singleChoiceItem());
        QuestionSetDocument.AssetRef ref = new QuestionSetDocument.AssetRef();
        ref.setAssetId("asset-1");
        ref.setRole("MAIN_AUDIO");
        document.setAssets(List.of(ref));

        assertThat(validator.validate(questionSet(1), document))
                .anyMatch(e -> e.contains("chưa READY"));
    }

    @Test
    void rejectsAudioWithoutDuration() {
        Asset asset = new Asset();
        asset.setId("asset-1");
        asset.setAssetType(AssetType.AUDIO);
        asset.setStatus(AssetStatus.READY);
        when(assetRepository.findById("asset-1")).thenReturn(Optional.of(asset));

        QuestionSetDocument document = documentWith(singleChoiceItem());
        QuestionSetDocument.AssetRef ref = new QuestionSetDocument.AssetRef();
        ref.setAssetId("asset-1");
        ref.setRole("MAIN_AUDIO");
        document.setAssets(List.of(ref));

        assertThat(validator.validate(questionSet(1), document))
                .anyMatch(e -> e.contains("thiếu thời lượng"));
    }

    /**
     * Heading matching: khóa bên trái là id của section, không phải leftItems.
     */
    @Test
    void acceptsMatchingKeyedBySectionIds() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("MATCHING");
        item.setMaxScore(2);
        item.setOptions(new java.util.ArrayList<>(List.of(
                option("h_a", "Heading A"), option("h_b", "Heading B"))));

        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType("MATCHING");
        key.setMatches(Map.of("para_1", "h_a", "para_2", "h_b"));
        item.setAnswerKey(key);

        QuestionSetDocument document = documentWith(item);
        document.setSections(List.of(section("para_1"), section("para_2")));

        QuestionSet questionSet = questionSet(1);
        questionSet.setMaxScore(BigDecimal.valueOf(2));

        assertThat(validator.validate(questionSet, document)).isEmpty();
    }

    @Test
    void rejectsOrderingWithIncompleteSequence() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("SENTENCE_ORDERING");
        item.setMaxScore(1);
        item.setOptions(new java.util.ArrayList<>(List.of(
                option("s1", "one"), option("s2", "two"), option("s3", "three"))));

        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType("ORDERING");
        // Thiếu s3
        key.setOrderedOptionIds(new java.util.ArrayList<>(List.of("s2", "s1")));
        item.setAnswerKey(key);

        assertThat(validator.validate(questionSet(1), documentWith(item)))
                .anyMatch(e -> e.contains("liệt kê đủ"));
    }

    /** Trả hết lỗi trong một lượt để biên tập viên sửa một lần. */
    @Test
    void reportsAllErrorsAtOnce() {
        QuestionSetDocument.Item item = singleChoiceItem();
        item.getOptions().get(1).setId("A");
        item.getAnswerKey().setSelectedOptionId("Z");

        QuestionSetDocument document = documentWith(item);
        document.setInstructions(null);

        assertThat(validator.validate(questionSet(1), document)).hasSizeGreaterThanOrEqualTo(3);
    }

    // -----------------------------------------------------------------

    private static QuestionSet questionSet(int itemCount) {
        Part part = new Part();
        part.setId("part-1");

        TaskType taskType = new TaskType();
        taskType.setId("tt-1");
        taskType.setCode("SINGLE_CHOICE");
        taskType.setActive(true);

        QuestionSet questionSet = new QuestionSet();
        questionSet.setId("qs-1");
        questionSet.setPart(part);
        questionSet.setTaskType(taskType);
        questionSet.setItemCount(itemCount);
        questionSet.setMaxScore(BigDecimal.valueOf(itemCount));
        return questionSet;
    }

    private static QuestionSetDocument documentWith(QuestionSetDocument.Item... items) {
        QuestionSetDocument document = new QuestionSetDocument();
        document.setQuestionSetId("qs-1");
        document.setRevision(1);
        document.setInstructions("Chọn đáp án đúng.");
        document.setItems(new java.util.ArrayList<>(List.of(items)));
        return document;
    }

    private static QuestionSetDocument.Item singleChoiceItem() {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("SINGLE_CHOICE");
        item.setMaxScore(1);
        item.setOptions(new java.util.ArrayList<>(List.of(
                option("A", "go"), option("B", "goes"))));

        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType("SINGLE_CHOICE");
        key.setSelectedOptionId("B");
        item.setAnswerKey(key);
        return item;
    }

    private static QuestionSetDocument.Option option(String id, String content) {
        QuestionSetDocument.Option option = new QuestionSetDocument.Option();
        option.setId(id);
        option.setCode(id);
        option.setContent(content);
        return option;
    }

    private static QuestionSetDocument.Section section(String id) {
        QuestionSetDocument.Section section = new QuestionSetDocument.Section();
        section.setId(id);
        section.setLabel(id);
        return section;
    }
}
