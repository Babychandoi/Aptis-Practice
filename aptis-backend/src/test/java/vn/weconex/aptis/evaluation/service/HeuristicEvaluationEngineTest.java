package vn.weconex.aptis.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.common.util.Enums.EvaluationType;

class HeuristicEvaluationEngineTest {

    @Test
    void speakingFallbackUsesLocalAudioMetricsForAudioCriteria() {
        HeuristicEvaluationEngine engine = new HeuristicEvaluationEngine();
        EvaluationEngine.EvaluationRequest request = new EvaluationEngine.EvaluationRequest(
                EvaluationType.SPEAKING_AI,
                null,
                "This is a sufficiently long spoken response with several connected ideas.",
                "asset-1",
                30_000L,
                Map.of(
                        "pronunciationClarityEstimate", 0.8,
                        "fluencyEstimate", 0.6,
                        "wordsPerMinute", 125,
                        "longPauseCount", 2),
                new EvaluationEngine.RubricSpec(
                        "SPEAKING", 1, 6,
                        List.of(
                                new EvaluationEngine.CriterionSpec(
                                        "PRONUNCIATION", "Pronunciation", 1, 3),
                                new EvaluationEngine.CriterionSpec(
                                        "FLUENCY", "Fluency", 1, 3))),
                "Speak about your experience.",
                Map.of());

        EvaluationEngine.EvaluationResult result = engine.evaluate(request);

        assertThat(result.criteria().get(0).score()).isEqualTo(2.4);
        assertThat(result.criteria().get(0).feedback()).contains("audio local");
        assertThat(result.criteria().get(1).score()).isEqualTo(1.8);
        assertThat(result.criteria().get(1).feedback()).contains("125 từ/phút", "2 khoảng dừng");
    }
}
