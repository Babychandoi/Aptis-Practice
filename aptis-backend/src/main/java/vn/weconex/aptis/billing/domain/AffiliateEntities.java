package vn.weconex.aptis.billing.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Chương trình giới thiệu hai chiều.
 *
 * <p>Gom các entity nhỏ vào một file vì chúng chỉ có nghĩa khi đi cùng nhau,
 * giống cách {@code BillingEntities} đang làm.
 */
public final class AffiliateEntities {

    private AffiliateEntities() {
    }

    /**
     * Cấu hình tỉ lệ hoa hồng — một dòng duy nhất, id = 1.
     *
     * <p>Để trong DB chứ không trong application.yml: đây là con số thương mại,
     * đổi được ngay từ trang admin mà không phải deploy lại.
     */
    @Entity(name = "AffiliateSettings")
    @Table(name = "affiliate_settings")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AffiliateSettings {

        @Id
        @Column(name = "id")
        private Byte id = 1;

        @Column(name = "commission_percent", nullable = false)
        private int commissionPercent = 10;

        @Column(name = "discount_percent", nullable = false)
        private int discountPercent = 5;

        /** true: ăn hoa hồng mọi đơn về sau. false: chỉ đơn đầu tiên. */
        @Column(name = "recurring", nullable = false)
        private boolean recurring = true;

        /** true: tính trên giá gốc. false: tính trên số tiền thực thu. */
        @Column(name = "commission_on_gross", nullable = false)
        private boolean commissionOnGross = true;

        @Column(name = "min_payout_amount", nullable = false)
        private long minPayoutAmount = 100_000L;

        /** Số ngày giữ hoa hồng trước khi cho rút; 0 = rút được ngay. */
        @Column(name = "hold_days", nullable = false)
        private int holdDays;

        @Column(name = "enabled", nullable = false)
        private boolean enabled = true;

        @Column(name = "updated_at", nullable = false)
        private Instant updatedAt = Instant.now();
    }

    /** Mã giới thiệu của một người dùng. */
    @Entity(name = "AffiliateAccount")
    @Table(name = "affiliate_accounts")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AffiliateAccount extends BaseEntity {

        public enum AccountStatus {
            ACTIVE,
            SUSPENDED
        }

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Column(name = "code", length = 32, nullable = false)
        private String code;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private AccountStatus status = AccountStatus.ACTIVE;

        /**
         * Hoa hồng riêng của người này, {@code null} = theo tỉ lệ chung.
         *
         * <p>Dùng Integer chứ không phải int: 0% là một thoả thuận hợp lệ (chỉ
         * cho giảm giá, không trả hoa hồng), nên phải phân biệt được với
         * "chưa cấu hình riêng".
         */
        @Column(name = "commission_percent")
        private Integer commissionPercent;

        /** Giảm giá riêng cho người nhập mã này, {@code null} = theo tỉ lệ chung. */
        @Column(name = "discount_percent")
        private Integer discountPercent;

        /** Lý do đặt mức riêng, để người sau biết vì sao. */
        @Column(name = "rate_note", length = 255)
        private String rateNote;

        /** Hoa hồng thực tế áp cho người này. */
        public int effectiveCommissionPercent(int mucChung) {
            return commissionPercent != null ? commissionPercent : mucChung;
        }

        /** Giảm giá thực tế cho người nhập mã của người này. */
        public int effectiveDiscountPercent(int mucChung) {
            return discountPercent != null ? discountPercent : mucChung;
        }

        /** Cộng dồn để trang cá nhân không phải SUM cả bảng hoa hồng. */
        @Column(name = "total_earned", nullable = false)
        private long totalEarned;

        @Column(name = "total_paid", nullable = false)
        private long totalPaid;
    }

    /**
     * Quan hệ "ai giới thiệu ai".
     *
     * <p>Ghi ngay lúc đặt đơn có mã và giữ vĩnh viễn, vì hoa hồng còn tính cho
     * các đơn gia hạn về sau của người được giới thiệu.
     */
    @Entity(name = "AffiliateReferral")
    @Table(name = "affiliate_referrals")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AffiliateReferral extends BaseEntity {

        @Column(name = "affiliate_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String affiliateUserId;

        @Column(name = "referred_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String referredUserId;

        @Column(name = "first_order_id", columnDefinition = "CHAR(36)")
        private String firstOrderId;
    }

    /** Hoa hồng của một đơn. */
    @Entity(name = "AffiliateCommission")
    @Table(name = "affiliate_commissions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AffiliateCommission extends BaseEntity {

        public enum CommissionStatus {
            /** Đơn đã PAID nhưng còn trong thời gian giữ. */
            PENDING,
            /** Rút được. */
            AVAILABLE,
            /** Đã nằm trong một yêu cầu rút đang chờ duyệt. */
            LOCKED,
            PAID,
            /** Đơn bị hoàn hoặc hủy sau khi đã ghi nhận hoa hồng. */
            CANCELLED
        }

        @Column(name = "affiliate_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String affiliateUserId;

        @Column(name = "referred_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String referredUserId;

        @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
        private String orderId;

        /** Chụp lại lúc phát sinh: đổi cấu hình sau không đổi tiền đã ghi nhận. */
        @Column(name = "commission_percent", nullable = false)
        private int commissionPercent;

        /**
         * Mức giảm đã áp cho người mua ở đơn này.
         *
         * <p>Null với các hoa hồng ghi trước V46 — hồi đó chưa lưu lại con số
         * này nên không thể suy ngược ra được.
         */
        @Column(name = "discount_percent")
        private Integer discountPercent;

        @Column(name = "base_amount", nullable = false)
        private long baseAmount;

        @Column(name = "amount", nullable = false)
        private long amount;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private CommissionStatus status = CommissionStatus.PENDING;

        @Column(name = "payout_id", columnDefinition = "CHAR(36)")
        private String payoutId;

        @Column(name = "available_at")
        private Instant availableAt;
    }

    /** Yêu cầu rút tiền, admin duyệt rồi chuyển khoản thủ công. */
    @Entity(name = "AffiliatePayout")
    @Table(name = "affiliate_payouts")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AffiliatePayout extends BaseEntity {

        public enum PayoutStatus {
            REQUESTED,
            APPROVED,
            REJECTED,
            PAID
        }

        @Column(name = "affiliate_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String affiliateUserId;

        @Column(name = "amount", nullable = false)
        private long amount;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PayoutStatus status = PayoutStatus.REQUESTED;

        @Column(name = "bank_name", length = 255, nullable = false)
        private String bankName;

        @Column(name = "bank_account_number", length = 64, nullable = false)
        private String bankAccountNumber;

        @Column(name = "bank_account_name", length = 255, nullable = false)
        private String bankAccountName;

        @Column(name = "note", length = 500)
        private String note;

        @Column(name = "admin_note", length = 500)
        private String adminNote;

        @Column(name = "reviewed_by", columnDefinition = "CHAR(36)")
        private String reviewedBy;

        @Column(name = "reviewed_at")
        private Instant reviewedAt;

        @Column(name = "paid_at")
        private Instant paidAt;
    }
}
