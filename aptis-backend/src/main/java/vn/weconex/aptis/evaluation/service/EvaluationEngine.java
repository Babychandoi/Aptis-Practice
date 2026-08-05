package vn.weconex.aptis.evaluation.service;

import java.util.List;

import vn.weconex.aptis.common.util.Enums.EvaluationType;

/**
 * Bộ chấm Speaking/Writing.
 *
 * <p>Tách interface để thay được implementation: bản heuristic dùng cho dev,
 * bản gọi LLM dùng cho production, bản giáo viên chấm tay dùng khi cần review.
 */
public interface EvaluationEngine {

    boolean supports(EvaluationType type);

    /** Tên hiển thị trong evaluation_documents.evaluator để đối soát. */
    String engineName();

    EvaluationResult evaluate(EvaluationRequest request);

    /**
     * @param transcript  văn bản Speaking sau khi chuyển giọng nói thành chữ;
     *                    null với Writing
     * @param rubric      tiêu chí chấm; engine phải trả điểm theo đúng các
     *                    criteria trong rubric
     */
    record EvaluationRequest(
            EvaluationType type,
            String textResponse,
            String transcript,
            String recordingAssetId,
            Long durationMs,
            RubricSpec rubric,
            String promptText,
            java.util.Map<String, Object> constraints) {
    }

    record RubricSpec(String code, int version, double maxScore, List<CriterionSpec> criteria) {
    }

    record CriterionSpec(String code, String name, double weight, double maxScore) {
    }

    record EvaluationResult(
            List<CriterionScore> criteria,
            double totalScore,
            double maxScore,
            String cefrLevel,
            Feedback feedback) {
    }

    record CriterionScore(String code, String name, double score, double maxScore, String feedback) {
    }

    record Feedback(
            String summary,
            List<String> strengths,
            List<String> weaknesses,
            List<String> suggestions,
            String correctedVersion) {
    }
}
