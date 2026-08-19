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
                        "SPEAKING", 1, 20,
                        List.of(
                                new EvaluationEngine.CriterionSpec(
                                        "PRONUNCIATION", "Pronunciation", 1, 10),
                                new EvaluationEngine.CriterionSpec(
                                        "FLUENCY", "Fluency", 1, 10))),
                "Speak about your experience.",
                Map.of());

        EvaluationEngine.EvaluationResult result = engine.evaluate(request);

        // pronunciationClarityEstimate 0,8 x trần 10 = 8; fluencyEstimate 0,6 = 6.
        // Điểm khác nhau chứng tỏ engine đọc đúng từng số đo audio local chứ không
        // dùng một giá trị chung.
        assertThat(result.criteria().get(0).score()).isEqualTo(8.0);
        assertThat(result.criteria().get(0).feedback()).contains("audio local");
        assertThat(result.criteria().get(1).score()).isEqualTo(6.0);
        assertThat(result.criteria().get(1).feedback()).contains("125 từ/phút", "2 khoảng dừng");
    }

    /**
     * Engine dự phòng phải cho điểm nguyên như engine AI.
     *
     * <p>Trước đây quy tắc số nguyên chỉ nằm trong {@code LlmEvaluationEngine},
     * nên AI hỏng là học viên nhận điểm kiểu 2.22 — cùng một bảng điểm mà hai
     * engine hiện hai kiểu số.
     */
    @Test
    void fallbackScoresAreWholeNumbers() {
        HeuristicEvaluationEngine engine = new HeuristicEvaluationEngine();
        // Trần 7 là số nguyên tố nên mọi tỉ lệ không tròn đều sinh phần thập phân
        // nếu quy tắc làm tròn không được áp dụng.
        EvaluationEngine.EvaluationRequest request = new EvaluationEngine.EvaluationRequest(
                EvaluationType.WRITING_AI,
                "I enjoy learning English because it opens many doors, and therefore "
                        + "I practise every day with friends who share the same goal.",
                null,
                null,
                null,
                Map.of(),
                new EvaluationEngine.RubricSpec(
                        "WRITING", 1, 21,
                        List.of(
                                new EvaluationEngine.CriterionSpec("VOCABULARY", "Vocabulary", 1, 7),
                                new EvaluationEngine.CriterionSpec("GRAMMAR", "Grammar", 1, 7),
                                new EvaluationEngine.CriterionSpec("COHESION", "Cohesion", 1, 7))),
                "Write about learning English.",
                Map.of());

        EvaluationEngine.EvaluationResult result = engine.evaluate(request);

        for (EvaluationEngine.CriterionScore criterion : result.criteria()) {
            assertThat(criterion.score())
                    .as("tiêu chí %s phải là số nguyên", criterion.code())
                    .isEqualTo(Math.rint(criterion.score()));
            assertThat(criterion.score()).isBetween(0.0, 7.0);
        }
        assertThat(result.totalScore()).isEqualTo(Math.rint(result.totalScore()));
    }
}
