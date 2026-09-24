package vn.weconex.aptis.practice.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Làm tròn điểm về bội số 0.5.
 *
 * <p>Điểm lẻ không do AI chấm lẻ — prompt bắt chấm số nguyên. Nó sinh ra ở phép
 * quy đổi từ thang rubric sang thang của bộ đề trong đề thi.
 */
class AttemptQuestionSetScoreRoundingTest {

    private static AttemptQuestionSet boDe(String maxScore) {
        return AttemptQuestionSet.of("attempt-1", "qs-1", 1, 0, new BigDecimal(maxScore));
    }

    @ParameterizedTest(name = "{0} trên thang {1} thành {2}")
    @CsvSource({
            // Speaking Part 1: rubric 5 điểm chia cho 3 câu nên bộ đề chỉ 1.66.
            "0.00, 1.66, 0.00",
            "0.33, 1.66, 0.50",
            "0.66, 1.66, 0.50",
            "1.00, 1.66, 1.00",
            "1.33, 1.66, 1.50",
            // Writing Part 1: rubric 5 chia cho 5 câu.
            "0.20, 1.00, 0.00",
            "0.40, 1.00, 0.50",
            "0.60, 1.00, 0.50",
            "0.80, 1.00, 1.00",
            // Speaking Part 2 sau khi về đúng thang 10.
            "8.20, 10.00, 8.00",
            "8.30, 10.00, 8.50",
    })
    void lamTronVeBoiSoNuaDiem(String awarded, String max, String mongDoi) {
        AttemptQuestionSet row = boDe(max);

        row.applyScore(new BigDecimal(awarded));

        assertThat(row.getAwardedScore()).isEqualByComparingTo(mongDoi);
    }

    @Test
    void chamTuyetDoiPhaiRaDungTranDuTranLe() {
        // Trần 1.66 mà ép về 1.5 thì học viên đạt 5/5 vẫn nhìn như mất điểm.
        AttemptQuestionSet row = boDe("1.66");

        row.applyScore(new BigDecimal("1.66"));

        assertThat(row.getAwardedScore()).isEqualByComparingTo("1.66");
    }

    @Test
    void khongLamTronLenVuotTran() {
        AttemptQuestionSet row = boDe("1.45");

        row.applyScore(new BigDecimal("1.40"));

        assertThat(row.getAwardedScore()).isLessThanOrEqualTo(new BigDecimal("1.45"));
    }

    @Test
    void danhDauDaChamSauKhiGhiDiem() {
        AttemptQuestionSet row = boDe("10.00");

        row.applyScore(new BigDecimal("7.30"));

        assertThat(row.getStatus()).isEqualTo(vn.weconex.aptis.common.util.Enums.AttemptItemStatus.SCORED);
        assertThat(row.getAwardedScore()).isEqualByComparingTo("7.50");
    }

    @Test
    void diemNullKhongLamHongTrangThai() {
        AttemptQuestionSet row = boDe("10.00");

        row.applyScore(null);

        assertThat(row.getAwardedScore()).isNull();
        assertThat(row.getStatus()).isEqualTo(vn.weconex.aptis.common.util.Enums.AttemptItemStatus.SCORED);
    }
}
