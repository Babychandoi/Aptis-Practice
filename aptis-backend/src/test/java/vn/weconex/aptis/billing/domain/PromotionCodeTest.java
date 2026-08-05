package vn.weconex.aptis.billing.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tính tiền giảm — logic dính trực tiếp tới số tiền khách trả nên phải có test.
 */
class PromotionCodeTest {

    @Test
    void computesFixedAmountDiscount() {
        PromotionCode code = code(PromotionCode.DiscountType.FIXED_AMOUNT, 50_000, null);

        assertThat(code.computeDiscount(499_000)).isEqualTo(50_000);
    }

    @Test
    void computesPercentageDiscount() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 20, null);

        assertThat(code.computeDiscount(199_000)).isEqualTo(39_800);
    }

    @Test
    void capsPercentageDiscountAtMaxAmount() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 20, 100_000L);

        // 20% của 1.390.000 = 278.000 nhưng trần là 100.000
        assertThat(code.computeDiscount(1_390_000)).isEqualTo(100_000);
    }

    /** Giảm không được vượt giá gốc — nếu không tổng đơn sẽ âm. */
    @Test
    void neverDiscountsMoreThanSubtotal() {
        PromotionCode code = code(PromotionCode.DiscountType.FIXED_AMOUNT, 500_000, null);

        assertThat(code.computeDiscount(199_000)).isEqualTo(199_000);
    }

    @Test
    void roundsPercentageDown() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 33, null);

        // 33% của 100 = 33; của 1000 = 330 — làm tròn xuống, không lên
        assertThat(code.computeDiscount(1000)).isEqualTo(330);
        assertThat(code.computeDiscount(10)).isEqualTo(3);
    }

    @Test
    void isNotRedeemableWhenDraft() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 10, null);
        code.setStatus(PromotionCode.PromotionStatus.DRAFT);

        assertThat(code.isRedeemableAt(Instant.now())).isFalse();
    }

    @Test
    void isNotRedeemableBeforeStart() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 10, null);
        code.setStartsAt(Instant.now().plus(1, ChronoUnit.DAYS));

        assertThat(code.isRedeemableAt(Instant.now())).isFalse();
    }

    @Test
    void isNotRedeemableAfterEnd() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 10, null);
        code.setEndsAt(Instant.now().minus(1, ChronoUnit.HOURS));

        assertThat(code.isRedeemableAt(Instant.now())).isFalse();
    }

    /** Mã dùng hết lượt tự chuyển ENDED để không phải kiểm tra hai chỗ. */
    @Test
    void marksEndedWhenTotalUsesExhausted() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 10, null);
        code.setMaxTotalUses(2);

        code.recordRedemption();
        assertThat(code.isExhausted()).isFalse();
        assertThat(code.getStatus()).isEqualTo(PromotionCode.PromotionStatus.ACTIVE);

        code.recordRedemption();
        assertThat(code.isExhausted()).isTrue();
        assertThat(code.getStatus()).isEqualTo(PromotionCode.PromotionStatus.ENDED);
    }

    @Test
    void unlimitedCodeNeverExhausts() {
        PromotionCode code = code(PromotionCode.DiscountType.PERCENTAGE, 10, null);

        for (int i = 0; i < 100; i++) {
            code.recordRedemption();
        }
        assertThat(code.isExhausted()).isFalse();
    }

    private static PromotionCode code(
            PromotionCode.DiscountType type, long value, Long maxDiscount) {

        PromotionCode code = new PromotionCode();
        code.setCode("TEST");
        code.setDiscountType(type);
        code.setDiscountValue(value);
        code.setMaxDiscountAmount(maxDiscount);
        code.setStatus(PromotionCode.PromotionStatus.ACTIVE);
        return code;
    }
}
