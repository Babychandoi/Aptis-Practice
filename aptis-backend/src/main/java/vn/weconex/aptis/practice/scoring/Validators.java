package vn.weconex.aptis.practice.scoring;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

/**
 * Các validator chấm tự động (PHẦN IV §39).
 *
 * <p>Quy tắc chung: không có câu trả lời hoặc không có answer key thì 0 điểm,
 * không ném lỗi — học viên bỏ trống là hợp lệ.
 */
public final class Validators {

    private Validators() {
    }

    @Component
    public static class SingleChoiceValidator implements ResponseValidator {

        @Override
        public String validatorKey() {
            return "SINGLE_CHOICE";
        }

        @Override
        public ItemResult score(
                QuestionSetDocument.Item item,
                AttemptDocument.ItemResponse response,
                QuestionSetDocument.Scoring scoring) {

            double max = item.getMaxScore();
            if (response == null || item.getAnswerKey() == null) {
                return ItemResult.zero(max);
            }

            String expected = item.getAnswerKey().getSelectedOptionId();
            String actual = response.getSelectedOptionId();
            return expected != null && expected.equals(actual)
                    ? ItemResult.full(max)
                    : ItemResult.zero(max);
        }
    }

    /**
     * Chọn nhiều đáp án. Khi {@code partialCredit} bật, điểm tính theo
     * (số chọn đúng - số chọn sai) / số đáp án đúng, không âm.
     */
    @Component
    public static class MultipleChoiceValidator implements ResponseValidator {

        @Override
        public String validatorKey() {
            return "MULTIPLE_CHOICE";
        }

        @Override
        public ItemResult score(
                QuestionSetDocument.Item item,
                AttemptDocument.ItemResponse response,
                QuestionSetDocument.Scoring scoring) {

            double max = item.getMaxScore();
            if (response == null || item.getAnswerKey() == null) {
                return ItemResult.zero(max);
            }

            Set<String> expected = new LinkedHashSet<>(item.getAnswerKey().getSelectedOptionIds());
            Set<String> actual = new LinkedHashSet<>(response.getSelectedOptionIds());

            if (expected.isEmpty()) {
                return ItemResult.zero(max);
            }
            if (expected.equals(actual)) {
                return ItemResult.full(max);
            }
            if (!scoring.isPartialCredit()) {
                return ItemResult.zero(max);
            }

            long hits = actual.stream().filter(expected::contains).count();
            long misses = actual.size() - hits;
            double ratio = Math.max(0.0, (double) (hits - misses) / expected.size());
            return ItemResult.partial(round(ratio * max), max);
        }
    }

    /**
     * Nối cặp. Điểm từng phần theo số cặp nối đúng — Aptis Reading Part 3/4 và
     * Listening Part 2 đều tính theo cặp.
     */
    @Component
    public static class MatchingValidator implements ResponseValidator {

        @Override
        public String validatorKey() {
            return "MATCHING";
        }

        @Override
        public ItemResult score(
                QuestionSetDocument.Item item,
                AttemptDocument.ItemResponse response,
                QuestionSetDocument.Scoring scoring) {

            double max = item.getMaxScore();
            if (response == null || item.getAnswerKey() == null) {
                return ItemResult.zero(max);
            }

            Map<String, String> expected = item.getAnswerKey().getMatches();
            Map<String, String> actual = response.getMatches();

            if (expected.isEmpty()) {
                return ItemResult.zero(max);
            }

            long correct = expected.entrySet().stream()
                    .filter(e -> e.getValue().equals(actual.get(e.getKey())))
                    .count();

            if (correct == expected.size()) {
                return ItemResult.full(max);
            }
            if (!scoring.isPartialCredit()) {
                return ItemResult.zero(max);
            }
            Object configuredPoints = item.getConstraints().get("pointsPerCorrect");
            if (configuredPoints instanceof Number number && number.doubleValue() > 0) {
                double earned = Math.min(correct * number.doubleValue(), max);
                return ItemResult.partial(round(earned), max);
            }
            return ItemResult.partial(round((double) correct / expected.size() * max), max);
        }
    }

    /**
     * Sắp xếp câu. Aptis Reading Part 2 cố định câu đầu, nên answer key đã bao
     * gồm câu đó và câu trả lời phải khớp toàn bộ thứ tự.
     */
    @Component
    public static class SentenceOrderingValidator implements ResponseValidator {

        @Override
        public String validatorKey() {
            return "SENTENCE_ORDERING";
        }

        @Override
        public ItemResult score(
                QuestionSetDocument.Item item,
                AttemptDocument.ItemResponse response,
                QuestionSetDocument.Scoring scoring) {

            double max = item.getMaxScore();
            if (response == null || item.getAnswerKey() == null) {
                return ItemResult.zero(max);
            }

            List<String> expected = item.getAnswerKey().getOrderedOptionIds();
            List<String> actual = response.getOrderedOptionIds();

            if (expected.isEmpty()) {
                return ItemResult.zero(max);
            }
            Object fixedValue = item.getConstraints().get("fixedFirstOptionId");
            String fixedFirstOptionId = fixedValue instanceof String value ? value : null;
            List<String> scoredExpected = fixedFirstOptionId == null
                    ? expected
                    : expected.stream().filter(id -> !id.equals(fixedFirstOptionId)).toList();
            List<String> scoredActual = fixedFirstOptionId == null
                    ? actual
                    : actual.stream().filter(id -> !id.equals(fixedFirstOptionId)).toList();

            if (scoredExpected.equals(scoredActual)) {
                return ItemResult.full(max);
            }
            if (!scoring.isPartialCredit()) {
                return ItemResult.zero(max);
            }

            // Điểm từng phần: số vị trí đặt đúng
            int correctPositions = 0;
            for (int i = 0; i < scoredExpected.size() && i < scoredActual.size(); i++) {
                if (scoredExpected.get(i).equals(scoredActual.get(i))) {
                    correctPositions++;
                }
            }
            Object configuredPoints = item.getConstraints().get("pointsPerCorrect");
            if (configuredPoints instanceof Number number && number.doubleValue() > 0) {
                return ItemResult.partial(round(Math.min(correctPositions * number.doubleValue(), max)), max);
            }
            return ItemResult.partial(round((double) correctPositions / scoredExpected.size() * max), max);
        }
    }

    /**
     * Trả lời ngắn khớp chuỗi. So sánh sau khi chuẩn hóa khoảng trắng;
     * phân biệt hoa/thường theo cờ trong answer key.
     */
    @Component
    public static class TextExactValidator implements ResponseValidator {

        @Override
        public String validatorKey() {
            return "TEXT_EXACT";
        }

        @Override
        public ItemResult score(
                QuestionSetDocument.Item item,
                AttemptDocument.ItemResponse response,
                QuestionSetDocument.Scoring scoring) {

            double max = item.getMaxScore();
            if (response == null || item.getAnswerKey() == null) {
                return ItemResult.zero(max);
            }

            String actual = normalize(response.getTextValue());
            if (actual.isEmpty()) {
                return ItemResult.zero(max);
            }

            boolean caseSensitive = item.getAnswerKey().isCaseSensitive();
            boolean match = item.getAnswerKey().getAcceptedValues().stream()
                    .map(Validators::normalize)
                    .anyMatch(expected -> caseSensitive
                            ? expected.equals(actual)
                            : expected.equalsIgnoreCase(actual));

            return match ? ItemResult.full(max) : ItemResult.zero(max);
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.strip().replaceAll("\\s+", " ");
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
