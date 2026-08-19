package vn.weconex.aptis.practice.scoring;

import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocument;

/**
 * Chấm một item. Mỗi implementation ứng với một {@code validator_key} trong
 * bảng task_types.
 *
 * <p>Dạng bài cần AI hoặc giáo viên (LONG_TEXT, AUDIO_RECORDING) không có
 * validator — chúng đi qua evaluation_jobs.
 */
public interface ResponseValidator {

    /** Trùng với task_types.validator_key. */
    String validatorKey();

    ItemResult score(
            QuestionSetDocument.Item item,
            AttemptDocument.ItemResponse response,
            QuestionSetDocument.Scoring scoring);

    /**
     * Kết quả chấm một item.
     *
     * <p>{@code correctUnits}/{@code totalUnits} tồn tại vì một item không luôn
     * là một câu hỏi. Item MATCHING của Reading Part 3 chứa 14 cặp ghép; nếu chỉ
     * có cờ {@code correct} thì học viên ghép đúng 2/14 bị đếm là "0 câu đúng"
     * trong khi vẫn được 4 điểm — bảng điểm tự mâu thuẫn với chính nó.
     *
     * @param correct      đúng trọn item (dùng cho câu đơn và để tương thích cũ)
     * @param correctUnits số đơn vị đúng bên trong item
     * @param totalUnits   tổng số đơn vị của item; 1 với câu đơn
     */
    record ItemResult(
            double rawScore,
            double maxScore,
            boolean correct,
            int correctUnits,
            int totalUnits) {

        public static ItemResult zero(double maxScore) {
            return new ItemResult(0, maxScore, false, 0, 1);
        }

        public static ItemResult full(double maxScore) {
            return new ItemResult(maxScore, maxScore, true, 1, 1);
        }

        public static ItemResult partial(double earned, double maxScore) {
            boolean all = earned >= maxScore;
            return new ItemResult(earned, maxScore, all, all ? 1 : 0, 1);
        }

        /** Item nhiều đơn vị (MATCHING, ORDERING): nói rõ đúng bao nhiêu trên bao nhiêu. */
        public static ItemResult units(double earned, double maxScore, int correctUnits, int totalUnits) {
            int total = Math.max(1, totalUnits);
            int done = Math.max(0, Math.min(correctUnits, total));
            return new ItemResult(earned, maxScore, done == total, done, total);
        }
    }
}
