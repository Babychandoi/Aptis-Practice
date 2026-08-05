package vn.weconex.aptis.content.service;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Answer key không được rời backend trước khi học viên nộp bài (PHẦN VII §51).
 * Đây là hàng rào bảo mật quan trọng nhất của luồng làm bài nên phải có test.
 */
class QuestionSetSanitizerTest {

    private final QuestionSetSanitizer sanitizer = new QuestionSetSanitizer();

    @Test
    void stripsAnswerKeyAndExplanationWhileTakingTest() {
        QuestionSetDocument document = documentWithAnswers();

        QuestionSetDocument result = sanitizer.sanitize(document, false, 42L);

        assertThat(result.getItems()).isNotEmpty();
        assertThat(result.getItems()).allSatisfy(item -> {
            assertThat(item.getAnswerKey()).isNull();
            assertThat(item.getExplanation()).isNull();
        });
    }

    @Test
    void keepsQuestionContentWhileStrippingAnswers() {
        QuestionSetDocument result = sanitizer.sanitize(documentWithAnswers(), false, 42L);

        QuestionSetDocument.Item item = result.getItems().get(0);
        assertThat(item.getId()).isEqualTo("item_1");
        assertThat(item.getPrompt().getValue()).isEqualTo("She ___ to work.");
        assertThat(item.getOptions()).hasSize(3);
        assertThat(item.getMaxScore()).isEqualTo(1);
    }

    @Test
    void revealsAnswerKeyAfterSubmission() {
        QuestionSetDocument result = sanitizer.sanitize(documentWithAnswers(), true, 42L);

        QuestionSetDocument.Item item = result.getItems().get(0);
        assertThat(item.getAnswerKey()).isNotNull();
        assertThat(item.getAnswerKey().getSelectedOptionId()).isEqualTo("B");
        assertThat(item.getExplanation()).isNotNull();
    }

    /**
     * Bản gốc phải nguyên vẹn: snapshot trong attempt_documents còn được dùng
     * để chấm, nếu sanitizer sửa tại chỗ thì đáp án sẽ mất.
     */
    @Test
    void doesNotMutateSourceDocument() {
        QuestionSetDocument document = documentWithAnswers();

        sanitizer.sanitize(document, false, 42L);

        assertThat(document.getItems().get(0).getAnswerKey()).isNotNull();
        assertThat(document.getItems().get(0).getExplanation()).isNotNull();
    }

    @Test
    void keepsOptionOrderWhenShuffleDisabled() {
        QuestionSetDocument document = documentWithAnswers();
        document.getSettings().setShuffleOptions(false);

        QuestionSetDocument result = sanitizer.sanitize(document, false, 42L);

        assertThat(result.getItems().get(0).getOptions())
                .extracting(QuestionSetDocument.Option::getId)
                .containsExactly("A", "B", "C");
    }

    /**
     * Cùng seed phải cho cùng thứ tự để client tải lại trang không thấy đáp án
     * nhảy chỗ.
     */
    @Test
    void shufflesDeterministicallyForSameSeed() {
        QuestionSetDocument document = documentWithAnswers();
        document.getSettings().setShuffleOptions(true);

        var first = sanitizer.sanitize(document, false, 7L).getItems().get(0).getOptions();
        var second = sanitizer.sanitize(document, false, 7L).getItems().get(0).getOptions();

        assertThat(first).extracting(QuestionSetDocument.Option::getId)
                .isEqualTo(second.stream().map(QuestionSetDocument.Option::getId).toList());
    }

    /**
     * Nội dung thiếu item id không được làm vỡ request (từng gây
     * NullPointerException khi trộn phương án).
     */
    @Test
    void toleratesMissingItemId() {
        QuestionSetDocument document = documentWithAnswers();
        document.getSettings().setShuffleOptions(true);
        document.getItems().get(0).setId(null);

        QuestionSetDocument result = sanitizer.sanitize(document, false, 7L);

        assertThat(result.getItems()).hasSize(1);
    }

    // -----------------------------------------------------------------

    private static QuestionSetDocument documentWithAnswers() {
        QuestionSetDocument document = new QuestionSetDocument();
        document.setQuestionSetId("qs-1");
        document.setRevision(1);

        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setSequenceNo(1);
        item.setResponseType("SINGLE_CHOICE");
        item.setMaxScore(1);

        QuestionSetDocument.RichContent prompt = new QuestionSetDocument.RichContent();
        prompt.setFormat("PLAIN_TEXT");
        prompt.setValue("She ___ to work.");
        item.setPrompt(prompt);

        item.setOptions(new java.util.ArrayList<>(List.of(
                option("A", "go"), option("B", "goes"), option("C", "going"))));

        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType("SINGLE_CHOICE");
        key.setSelectedOptionId("B");
        key.setMatches(Map.of());
        item.setAnswerKey(key);

        QuestionSetDocument.RichContent explanation = new QuestionSetDocument.RichContent();
        explanation.setFormat("PLAIN_TEXT");
        explanation.setValue("Chủ ngữ số 3 số ít dùng goes.");
        item.setExplanation(explanation);

        document.setItems(new java.util.ArrayList<>(List.of(item)));
        return document;
    }

    private static QuestionSetDocument.Option option(String id, String content) {
        QuestionSetDocument.Option option = new QuestionSetDocument.Option();
        option.setId(id);
        option.setCode(id);
        option.setContent(content);
        return option;
    }
}
