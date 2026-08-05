package vn.weconex.aptis.billing.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Mã giảm giá (PHẦN I §13).
 *
 * <p>Số tiền giảm luôn tính ở backend từ bản ghi này — client chỉ gửi mã.
 */
@Entity
@Table(name = "promotion_codes")
@Getter
@Setter
@NoArgsConstructor
public class PromotionCode extends BaseEntity {

    public enum DiscountType {
        FIXED_AMOUNT,
        PERCENTAGE
    }

    public enum PromotionStatus {
        DRAFT,
        ACTIVE,
        INACTIVE,
        ENDED
    }

    @Column(name = "code", length = 100, nullable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 16, nullable = false)
    private DiscountType discountType;

    /** FIXED_AMOUNT: số đồng. PERCENTAGE: giá trị 1-100. */
    @Column(name = "discount_value", nullable = false)
    private long discountValue;

    /** Chặn trên khi giảm theo phần trăm; NULL = không chặn. */
    @Column(name = "max_discount_amount")
    private Long maxDiscountAmount;

    @Column(name = "min_order_amount")
    private Long minOrderAmount;

    @Column(name = "max_total_uses")
    private Integer maxTotalUses;

    @Column(name = "max_uses_per_user")
    private Integer maxUsesPerUser;

    @Column(name = "total_used_count", nullable = false)
    private int totalUsedCount;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private PromotionStatus status = PromotionStatus.DRAFT;

    public boolean isRedeemableAt(Instant at) {
        return status == PromotionStatus.ACTIVE
                && (startsAt == null || !startsAt.isAfter(at))
                && (endsAt == null || endsAt.isAfter(at));
    }

    public boolean isExhausted() {
        return maxTotalUses != null && totalUsedCount >= maxTotalUses;
    }

    /**
     * @return số tiền giảm, không vượt quá giá gốc
     */
    public long computeDiscount(long subtotal) {
        long discount = switch (discountType) {
            case FIXED_AMOUNT -> discountValue;
            // Làm tròn xuống để không giảm nhiều hơn dự kiến
            case PERCENTAGE -> subtotal * discountValue / 100;
        };

        if (maxDiscountAmount != null) {
            discount = Math.min(discount, maxDiscountAmount);
        }
        return Math.min(discount, subtotal);
    }

    public void recordRedemption() {
        totalUsedCount++;
        if (isExhausted()) {
            status = PromotionStatus.ENDED;
        }
    }
}
