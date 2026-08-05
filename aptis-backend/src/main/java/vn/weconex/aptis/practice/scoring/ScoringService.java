package vn.weconex.aptis.practice.scoring;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

/**
 * Chấm các dạng bài tự động được. Speaking/Writing không đi qua đây —
 * chúng tạo evaluation_jobs và được worker chấm bằng AI hoặc giáo viên.
 */
@Slf4j
@Service
public class ScoringService {

    private final Map<String, ResponseValidator> validators;

    public ScoringService(List<ResponseValidator> validators) {
        this.validators = validators.stream()
                .collect(Collectors.toMap(ResponseValidator::validatorKey, Function.identity()));
        log.info("Đã nạp {} validator: {}", this.validators.size(), this.validators.keySet());
    }

    /**
     * Chấm một bộ câu hỏi trong lượt làm bài, ghi kết quả vào entry.
     *
     * @return {@code Optional.empty()} nếu dạng bài không chấm tự động được
     */
    public Optional<AttemptDocument.Score> scoreEntry(AttemptDocument.QuestionSetEntry entry) {
        QuestionSetDocument snapshot = entry.getSnapshot();
        if (snapshot == null || snapshot.getItems().isEmpty()) {
            return Optional.empty();
        }

        List<AttemptDocument.ItemScore> itemScores = new ArrayList<>();
        double totalRaw = 0;
        double totalMax = 0;
        boolean anyScored = false;

        for (QuestionSetDocument.Item item : snapshot.getItems()) {
            ResponseValidator validator = resolveValidator(item);
            if (validator == null) {
                // Dạng cần AI/giáo viên: cộng maxScore để tổng điểm vẫn đúng,
                // điểm thực do evaluation job ghi sau
                totalMax += item.getMaxScore();
                continue;
            }

            AttemptDocument.ItemResponse response =
                    entry.getResponse().findItemResponse(item.getId());

            ResponseValidator.ItemResult result =
                    validator.score(item, response, snapshot.getScoring());

            AttemptDocument.ItemScore itemScore = new AttemptDocument.ItemScore();
            itemScore.setItemId(item.getId());
            itemScore.setRawScore(result.rawScore());
            itemScore.setMaxScore(result.maxScore());
            itemScore.setCorrect(result.correct());
            itemScores.add(itemScore);

            totalRaw += result.rawScore();
            totalMax += result.maxScore();
            anyScored = true;
        }

        if (!anyScored) {
            return Optional.empty();
        }

        AttemptDocument.Score score = new AttemptDocument.Score();
        score.setRawScore(round(totalRaw));
        score.setMaxScore(round(totalMax));
        score.setItemScores(itemScores);
        score.setScoredAt(Instant.now());
        score.setScoredBy("AUTO");
        score.setIsCorrect(totalMax > 0 && totalRaw >= totalMax);

        entry.setScore(score);
        return Optional.of(score);
    }

    /**
     * Validator được chọn theo responseType của item, không theo task type của
     * cả bộ — một bộ có thể trộn nhiều dạng item.
     */
    private ResponseValidator resolveValidator(QuestionSetDocument.Item item) {
        String responseType = item.getResponseType();
        if (responseType == null) {
            return null;
        }

        return switch (responseType) {
            case "SINGLE_CHOICE", "GAP_FILL_CHOICE" -> validators.get("SINGLE_CHOICE");
            case "MULTIPLE_CHOICE" -> validators.get("MULTIPLE_CHOICE");
            case "MATCHING" -> validators.get("MATCHING");
            case "ORDERING", "SENTENCE_ORDERING" -> validators.get("SENTENCE_ORDERING");
            case "SHORT_TEXT", "TEXT_EXACT" -> validators.get("TEXT_EXACT");
            // LONG_TEXT, AUDIO_RECORDING: chấm bằng AI/giáo viên
            default -> null;
        };
    }

    public boolean requiresManualEvaluation(QuestionSetDocument snapshot) {
        return snapshot.getItems().stream()
                .anyMatch(item -> resolveValidator(item) == null);
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
