package vn.weconex.aptis.practice.scoring;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test chấm tự động — không cần Docker hay Spring context.
 */
class ScoringServiceTest {

    private ScoringService scoringService;

    @BeforeEach
    void setUp() {
        scoringService = new ScoringService(List.of(
                new Validators.SingleChoiceValidator(),
                new Validators.MultipleChoiceValidator(),
                new Validators.MatchingValidator(),
                new Validators.SentenceOrderingValidator(),
                new Validators.TextExactValidator()));
    }

    @Test
    void scoresSingleChoiceCorrectAnswer() {
        var entry = entryWith(
                singleChoiceItem("item_1", "B"),
                singleChoiceResponse("item_1", "B"));

        var score = scoringService.scoreEntry(entry);

        assertThat(score).isPresent();
        assertThat(score.get().getRawScore()).isEqualTo(1.0);
        assertThat(score.get().getIsCorrect()).isTrue();
    }

    @Test
    void scoresSingleChoiceWrongAnswer() {
        var entry = entryWith(
                singleChoiceItem("item_1", "B"),
                singleChoiceResponse("item_1", "A"));

        var score = scoringService.scoreEntry(entry);

        assertThat(score.orElseThrow().getRawScore()).isZero();
    }

    @Test
    void givesZeroWhenNoResponse() {
        var entry = entryWith(singleChoiceItem("item_1", "B"), null);

        var score = scoringService.scoreEntry(entry);

        assertThat(score.orElseThrow().getRawScore()).isZero();
    }

    @Test
    void multipleChoiceRequiresExactSetWithoutPartialCredit() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("MULTIPLE_CHOICE");
        item.setMaxScore(2);
        var key = new QuestionSetDocument.AnswerKey();
        key.setType("MULTIPLE_CHOICE");
        key.setSelectedOptionIds(List.of("A", "C"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("MULTIPLE_CHOICE");
        response.setSelectedOptionIds(List.of("A"));

        // partialCredit = false: thiếu một đáp án là 0 điểm
        var score = scoringService.scoreEntry(entryWith(item, response, false));
        assertThat(score.orElseThrow().getRawScore()).isZero();
    }

    @Test
    void multipleChoiceAwardsPartialCreditWhenEnabled() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("MULTIPLE_CHOICE");
        item.setMaxScore(2);
        var key = new QuestionSetDocument.AnswerKey();
        key.setSelectedOptionIds(List.of("A", "C"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("MULTIPLE_CHOICE");
        response.setSelectedOptionIds(List.of("A"));

        // 1 đúng / 0 sai trên 2 đáp án => 50% của 2 điểm
        var score = scoringService.scoreEntry(entryWith(item, response, true));
        assertThat(score.orElseThrow().getRawScore()).isEqualTo(1.0);
    }

    @Test
    void multipleChoicePenalisesWrongPicks() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("MULTIPLE_CHOICE");
        item.setMaxScore(2);
        var key = new QuestionSetDocument.AnswerKey();
        key.setSelectedOptionIds(List.of("A", "C"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("MULTIPLE_CHOICE");
        // 1 đúng, 1 sai => (1-1)/2 = 0
        response.setSelectedOptionIds(List.of("A", "B"));

        var score = scoringService.scoreEntry(entryWith(item, response, true));
        assertThat(score.orElseThrow().getRawScore()).isZero();
    }

    @Test
    void matchingAwardsPartialCreditPerPair() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("MATCHING");
        item.setMaxScore(4);
        var key = new QuestionSetDocument.AnswerKey();
        key.setMatches(Map.of("p1", "hA", "p2", "hB", "p3", "hC", "p4", "hD"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("MATCHING");
        response.setMatches(Map.of("p1", "hA", "p2", "hB", "p3", "hX", "p4", "hD"));

        // 3/4 cặp đúng => 3 điểm
        var score = scoringService.scoreEntry(entryWith(item, response, true));
        assertThat(score.orElseThrow().getRawScore()).isEqualTo(3.0);
    }

    @Test
    void orderingRequiresFullSequence() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("SENTENCE_ORDERING");
        item.setMaxScore(3);
        var key = new QuestionSetDocument.AnswerKey();
        key.setOrderedOptionIds(List.of("s2", "s1", "s3"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("SENTENCE_ORDERING");
        response.setOrderedOptionIds(List.of("s2", "s1", "s3"));

        var score = scoringService.scoreEntry(entryWith(item, response, false));
        assertThat(score.orElseThrow().getRawScore()).isEqualTo(3.0);
    }

    @Test
    void shortTextIgnoresCaseAndExtraWhitespaceByDefault() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("SHORT_TEXT");
        item.setMaxScore(1);
        var key = new QuestionSetDocument.AnswerKey();
        key.setAcceptedValues(List.of("New York"));
        item.setAnswerKey(key);

        var response = new AttemptDocument.ItemResponse();
        response.setItemId("item_1");
        response.setResponseType("SHORT_TEXT");
        response.setTextValue("  new   york ");

        var score = scoringService.scoreEntry(entryWith(item, response, false));
        assertThat(score.orElseThrow().getRawScore()).isEqualTo(1.0);
    }

    /**
     * Writing/Speaking không có validator nên không chấm tự động;
     * maxScore vẫn được cộng để tổng điểm đúng.
     */
    @Test
    void longTextRequiresManualEvaluation() {
        var item = new QuestionSetDocument.Item();
        item.setId("item_1");
        item.setResponseType("LONG_TEXT");
        item.setMaxScore(25);

        var entry = entryWith(item, null, false);

        assertThat(scoringService.scoreEntry(entry)).isEmpty();
        assertThat(scoringService.requiresManualEvaluation(entry.getSnapshot())).isTrue();
    }

    // -----------------------------------------------------------------

    private static QuestionSetDocument.Item singleChoiceItem(String itemId, String correctId) {
        var item = new QuestionSetDocument.Item();
        item.setId(itemId);
        item.setResponseType("SINGLE_CHOICE");
        item.setMaxScore(1);

        var key = new QuestionSetDocument.AnswerKey();
        key.setType("SINGLE_CHOICE");
        key.setSelectedOptionId(correctId);
        item.setAnswerKey(key);
        return item;
    }

    private static AttemptDocument.ItemResponse singleChoiceResponse(String itemId, String picked) {
        var response = new AttemptDocument.ItemResponse();
        response.setItemId(itemId);
        response.setResponseType("SINGLE_CHOICE");
        response.setSelectedOptionId(picked);
        return response;
    }

    private static AttemptDocument.QuestionSetEntry entryWith(
            QuestionSetDocument.Item item, AttemptDocument.ItemResponse response) {
        return entryWith(item, response, false);
    }

    private static AttemptDocument.QuestionSetEntry entryWith(
            QuestionSetDocument.Item item,
            AttemptDocument.ItemResponse response,
            boolean partialCredit) {

        var snapshot = new QuestionSetDocument();
        snapshot.setItems(List.of(item));
        var scoring = new QuestionSetDocument.Scoring();
        scoring.setPartialCredit(partialCredit);
        snapshot.setScoring(scoring);

        var entry = new AttemptDocument.QuestionSetEntry();
        entry.setSnapshot(snapshot);
        if (response != null) {
            entry.getResponse().upsert(response);
        }
        return entry;
    }
}
