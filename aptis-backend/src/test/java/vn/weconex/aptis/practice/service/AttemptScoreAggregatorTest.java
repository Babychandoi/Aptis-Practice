package vn.weconex.aptis.practice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.PartScoringRule;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.PartScoringRuleRepository;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.AttemptComponentScore;
import vn.weconex.aptis.practice.domain.AttemptPartScore;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.repository.AttemptComponentScoreRepository;
import vn.weconex.aptis.practice.repository.AttemptPartScoreRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;

class AttemptScoreAggregatorTest {

    @Test
    void perfectReadingPartThreeReceivesConfiguredBonus() {
        PartScoringRule rule = rule("16", "2");

        BigDecimal[] result = AttemptScoreAggregator.normalize(
                new BigDecimal("14"), new BigDecimal("14"), rule);

        assertThat(result[0]).isEqualByComparingTo("16");
        assertThat(result[1]).isEqualByComparingTo("16");
    }

    @Test
    void perfectBonusIsNotAwardedForPartialResult() {
        PartScoringRule rule = rule("16", "2");

        BigDecimal[] result = AttemptScoreAggregator.normalize(
                new BigDecimal("12"), new BigDecimal("14"), rule);

        assertThat(result[0]).isEqualByComparingTo("12");
        assertThat(result[1]).isEqualByComparingTo("16");
    }

    @Test
    void sourcePointsAreScaledOntoPersistedPartMaximum() {
        PartScoringRule rule = rule("26", "0");

        BigDecimal[] result = AttemptScoreAggregator.normalize(
                new BigDecimal("10"), new BigDecimal("13"), rule);

        assertThat(result[0]).isEqualByComparingTo("20");
        assertThat(result[1]).isEqualByComparingTo("26");
    }

    @Test
    void aggregateUsesAttemptSnapshotInsteadOfChangedDatabaseRule() {
        QuestionSetRepository questionSets = mock(QuestionSetRepository.class);
        PartRepository parts = mock(PartRepository.class);
        AttemptPartScoreRepository partScores = mock(AttemptPartScoreRepository.class);
        AttemptComponentScoreRepository componentScores = mock(AttemptComponentScoreRepository.class);
        PartScoringRuleRepository currentRules = mock(PartScoringRuleRepository.class);
        TestAttemptRepository attempts = mock(TestAttemptRepository.class);
        AttemptScoreAggregator aggregator = new AttemptScoreAggregator(
                questionSets, parts, partScores, componentScores, currentRules, attempts);

        Component component = new Component();
        component.setId("reading");
        Part part = new Part();
        part.setId("reading-part-3");
        part.setComponent(component);
        QuestionSet questionSet = new QuestionSet();
        questionSet.setId("set-1");
        questionSet.setPart(part);

        AttemptDocument.Score score = new AttemptDocument.Score();
        score.setRawScore(14);
        score.setMaxScore(14);
        AttemptDocument.QuestionSetEntry entry = new AttemptDocument.QuestionSetEntry();
        entry.setQuestionSetId("set-1");
        entry.setScore(score);

        AttemptDocument.PartScoringRuleSnapshot frozenRule =
                new AttemptDocument.PartScoringRuleSnapshot();
        frozenRule.setPartId("reading-part-3");
        frozenRule.setMaxScore("16");
        frozenRule.setPerfectBonus("2");
        frozenRule.setIncludedInOverall(true);
        AttemptDocument.ConfigSnapshot config = new AttemptDocument.ConfigSnapshot();
        config.setScoringRuleSnapshotVersion(1);
        config.setPartScoringRules(new LinkedHashMap<>(
                java.util.Map.of("reading-part-3", frozenRule)));
        AttemptDocument document = new AttemptDocument();
        document.setQuestionSets(List.of(entry));
        document.setConfigSnapshot(config);

        TestAttempt attempt = new TestAttempt();
        attempt.setId("attempt-1");
        attempt.setMode(PracticeMode.MOCK_TEST);
        attempt.setComponentId("reading");

        when(questionSets.findAllById(List.of("set-1"))).thenReturn(List.of(questionSet));
        when(parts.findAllById(List.of("reading-part-3"))).thenReturn(List.of(part));
        when(partScores.findByAttemptId("attempt-1")).thenReturn(List.of());
        when(componentScores.findByAttemptId("attempt-1")).thenReturn(List.of());
        when(attempts.findById("attempt-1")).thenReturn(Optional.of(attempt));

        aggregator.aggregate("attempt-1", document);

        assertThat(attempt.getRawScore()).isEqualByComparingTo("16");
        assertThat(attempt.getMaxScore()).isEqualByComparingTo("16");
        verify(currentRules, never()).findByPartIdIn(org.mockito.ArgumentMatchers.anyList());
        verify(partScores).saveAll(org.mockito.ArgumentMatchers.<List<AttemptPartScore>>any());
        verify(componentScores).saveAll(
                org.mockito.ArgumentMatchers.<List<AttemptComponentScore>>any());
    }

    private static PartScoringRule rule(String max, String bonus) {
        PartScoringRule rule = new PartScoringRule();
        rule.setMaxScore(new BigDecimal(max));
        rule.setPerfectBonus(new BigDecimal(bonus));
        return rule;
    }
}
