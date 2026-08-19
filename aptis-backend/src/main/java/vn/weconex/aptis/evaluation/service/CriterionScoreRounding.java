package vn.weconex.aptis.evaluation.service;

/**
 * Quy tắc làm tròn điểm tiêu chí, dùng chung cho mọi engine chấm.
 *
 * <p>Vì sao tách ra: quy tắc "điểm không có phần thập phân" là quyết định
 * nghiệp vụ, không phải chi tiết của một engine. Trước đây nó chỉ nằm trong
 * {@code LlmEvaluationEngine}, nên khi AI hỏng và hệ thống rơi về
 * {@code HeuristicEvaluationEngine} thì học viên nhận điểm lẻ kiểu 2.22 hay
 * 1.47 — cùng một bảng điểm mà hai engine hiện hai kiểu số khác nhau.
 *
 * <p>Làm tròn ở từng tiêu chí rồi cộng lại, không làm tròn ở tổng: tổng của các
 * số nguyên vốn đã là số nguyên, còn làm tròn tổng thì từng dòng tiêu chí vẫn
 * lẻ và cộng tay không khớp với tổng hiện ra.
 */
final class CriterionScoreRounding {

    private CriterionScoreRounding() {
    }

    /**
     * Kẹp điểm vào [0, maxScore] rồi làm tròn về số nguyên gần nhất.
     *
     * <p>Trần được làm tròn xuống ({@code floor}): rubric có thể đặt trần lẻ, và
     * cho điểm vượt trần đã cấu hình là sai kể cả khi làm tròn lên gần hơn.
     *
     * @param score    điểm thô, có thể lẻ hoặc ngoài khoảng
     * @param maxScore trần của tiêu chí
     * @return số nguyên trong [0, floor(maxScore)]
     */
    static double toWholeScore(double score, double maxScore) {
        if (Double.isNaN(score) || score < 0) {
            return 0;
        }
        if (score > maxScore) {
            return Math.floor(maxScore);
        }
        return Math.round(score);
    }
}
