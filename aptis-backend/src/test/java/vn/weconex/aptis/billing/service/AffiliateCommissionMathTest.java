package vn.weconex.aptis.billing.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Phép tính tiền của chương trình giới thiệu.
 *
 * <p>Tách riêng phần số học vì đây là chỗ sai thì mất tiền thật: sai một phép
 * làm tròn nhân với vài trăm đơn là lệch hẳn sổ sách.
 */
class AffiliateCommissionMathTest {

    /** Bản sao phép tính trong {@link AffiliateService}: làm tròn xuống. */
    private static long percentOf(long amount, int percent) {
        return amount * percent / 100;
    }

    @Test
    @DisplayName("Hoa hồng 20% và giảm giá 10% trên gói 500k")
    void commissionAndDiscountOnTypicalPlan() {
        long price = 500_000L;

        long discount = percentOf(price, 10);
        long commission = percentOf(price, 20);

        assertThat(discount).isEqualTo(50_000L);
        assertThat(commission).isEqualTo(100_000L);
        // Tính trên giá gốc nên chủ shop thực thu 350k, không phải 360k —
        // con số này là lựa chọn kinh doanh, ghi lại để không ai sửa nhầm.
        assertThat(price - discount - commission).isEqualTo(350_000L);
    }

    @Test
    @DisplayName("Làm tròn xuống, không bao giờ chi vượt số tính được")
    void roundsDown() {
        // 333.333đ x 20% = 66.666,6 -> 66.666
        assertThat(percentOf(333_333L, 20)).isEqualTo(66_666L);
        // 99đ x 20% = 19,8 -> 19
        assertThat(percentOf(99L, 20)).isEqualTo(19L);
    }

    @Test
    @DisplayName("Đơn quá nhỏ thì hoa hồng bằng 0, không âm")
    void tinyOrderGivesNothing() {
        assertThat(percentOf(4L, 20)).isZero();
        assertThat(percentOf(0L, 20)).isZero();
    }

    @Test
    @DisplayName("Cộng cả mã khuyến mãi và mã giới thiệu không làm đơn âm")
    void combinedDiscountNeverExceedsSubtotal() {
        long subtotal = 100_000L;
        long promotion = 95_000L;
        long referral = percentOf(subtotal, 10);

        // Giống công thức trong OrderService.
        long discount = Math.min(subtotal, promotion + referral);

        assertThat(discount).isEqualTo(subtotal);
        assertThat(subtotal - discount).isZero();
    }
}
