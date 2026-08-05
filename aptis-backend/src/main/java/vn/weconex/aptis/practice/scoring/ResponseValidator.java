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

    record ItemResult(double rawScore, double maxScore, boolean correct) {

        public static ItemResult zero(double maxScore) {
            return new ItemResult(0, maxScore, false);
        }

        public static ItemResult full(double maxScore) {
            return new ItemResult(maxScore, maxScore, true);
        }

        public static ItemResult partial(double earned, double maxScore) {
            return new ItemResult(earned, maxScore, earned >= maxScore);
        }
    }
}
