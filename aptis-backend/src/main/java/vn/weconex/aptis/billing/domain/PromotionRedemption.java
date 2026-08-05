package vn.weconex.aptis.billing.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Lần sử dụng mã giảm giá. Dùng để đếm số lần mỗi người dùng đã dùng một mã.
 *
 * <p>UNIQUE (order_id, promotion_code_id) ở DB chặn ghi trùng khi webhook hoặc
 * request bị lặp.
 */
@Entity
@Table(name = "promotion_redemptions")
@Getter
@Setter
@NoArgsConstructor
public class PromotionRedemption {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "promotion_code_id", columnDefinition = "CHAR(36)", nullable = false)
    private String promotionCodeId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
    private String orderId;

    @Column(name = "discount_amount", nullable = false)
    private long discountAmount;

    @Column(name = "redeemed_at", nullable = false)
    private Instant redeemedAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static PromotionRedemption of(
            String promotionCodeId, String userId, String orderId, long discountAmount) {

        PromotionRedemption redemption = new PromotionRedemption();
        redemption.promotionCodeId = promotionCodeId;
        redemption.userId = userId;
        redemption.orderId = orderId;
        redemption.discountAmount = discountAmount;
        return redemption;
    }
}
