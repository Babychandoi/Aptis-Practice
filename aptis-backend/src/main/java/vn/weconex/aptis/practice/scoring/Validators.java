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
            int total = expected.size();
            if (expected.equals(actual)) {
                return ItemResult.units(max, max, total, total);
            }

            long hits = actual.stream().filter(expected::contains).count();
            if (!scoring.isPartialCredit()) {
                return ItemResult.units(0, max, (int) hits, total);
            }

            long misses = actual.size() - hits;
            // Trừ điểm cho lựa chọn sai để không thể chọn hết mà vẫn ăn điểm.
            double ratio = Math.max(0.0, (double) (hits - misses) / total);
            return ItemResult.units(round(ratio * max), max, (int) hits, total);
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

            // Báo cáo theo số cặp ghép, không phải một cờ đúng/sai: item này là 14
            // câu hỏi gộp lại, nên ghép đúng 2/14 phải hiện "2 câu đúng" thay vì 0.
            int total = expected.size();
            int done = (int) correct;

            if (done == total) {
                return ItemResult.units(max, max, total, total);
            }
            if (!scoring.isPartialCredit()) {
                // Không cho điểm lẻ, nhưng vẫn ghi nhận số cặp đúng để bảng điểm
                // không nói "0 câu đúng" khi học viên thực sự ghép đúng vài cặp.
                return ItemResult.units(0, max, done, total);
            }
            Object configuredPoints = item.getConstraints().get("pointsPerCorrect");
            if (configuredPoints instanceof Number number && number.doubleValue() > 0) {
                double earned = Math.min(correct * number.doubleValue(), max);
                return ItemResult.units(round(earned), max, done, total);
            }
            return ItemResult.units(round((double) correct / total * max), max, done, total);
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
            int totalPositions = scoredExpected.size();
            Object configuredPoints = item.getConstraints().get("pointsPerCorrect");
            if (configuredPoints instanceof Number number && number.doubleValue() > 0) {
                return ItemResult.units(
                        round(Math.min(correctPositions * number.doubleValue(), max)),
                        max, correctPositions, totalPositions);
            }
            return ItemResult.units(
                    round((double) correctPositions / totalPositions * max),
                    max, correctPositions, totalPositions);
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
