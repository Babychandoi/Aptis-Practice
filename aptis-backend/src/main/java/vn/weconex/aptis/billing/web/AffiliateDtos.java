package vn.weconex.aptis.billing.web;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** DTO cho chương trình giới thiệu. */
public final class AffiliateDtos {

    private AffiliateDtos() {
    }

    /**
     * Trang giới thiệu của người dùng.
     *
     * <p>{@code code} rỗng nghĩa là chưa đủ điều kiện — giao diện hiện lời mời
     * mua gói thay vì ô sao chép mã.
     */
    public record MyAffiliateResponse(
            String code,
            boolean eligible,
            int commissionPercent,
            int discountPercent,
            long minPayoutAmount,
            long totalEarned,
            long totalPaid,
            long pendingAmount,
            long availableAmount,
            long lockedAmount,
            long referralCount,
            boolean hasOpenPayout) {
    }

    /** Một người đã được giới thiệu. */
    public record ReferralResponse(
            String id,
            String referredName,
            String referredEmail,
            Instant joinedAt,
            long totalCommission) {
    }

    public record CommissionResponse(
            String id,
            String orderCode,
            String referredEmail,
            long baseAmount,
            long amount,
            int commissionPercent,
            String status,
            Instant availableAt,
            Instant createdAt) {
    }

    public record PayoutResponse(
            String id,
            long amount,
            String status,
            String bankName,
            String bankAccountNumber,
            String bankAccountName,
            String note,
            String adminNote,
            Instant createdAt,
            Instant reviewedAt,
            Instant paidAt) {
    }

    public record CreatePayoutRequest(
            @NotBlank @Size(max = 255) String bankName,
            @NotBlank @Size(max = 64) String bankAccountNumber,
            @NotBlank @Size(max = 255) String bankAccountName,
            @Size(max = 500) String note) {
    }

    /** Xem trước mã giới thiệu trước khi đặt đơn. */
    public record CheckAffiliateResponse(
            boolean valid,
            String code,
            long discountAmount,
            String message) {
    }

    // ----- Phía admin -----

    /** Một dòng trong danh sách duyệt rút tiền. */
    public record AdminPayoutResponse(
            String id,
            String userId,
            String userName,
            String userEmail,
            long amount,
            String status,
            String bankName,
            String bankAccountNumber,
            String bankAccountName,
            String note,
            String adminNote,
            int commissionCount,
            Instant createdAt,
            Instant reviewedAt,
            Instant paidAt) {
    }

    public record ReviewPayoutRequest(@Size(max = 500) String adminNote) {
    }

    /** Bảng theo dõi affiliate toàn hệ thống. */
    public record AdminAffiliateRowResponse(
            String userId,
            String userName,
            String userEmail,
            String code,
            long referralCount,
            long paidOrderCount,
            long totalEarned,
            long totalPaid,
            long availableAmount,
            String status) {
    }

    public record AdminAffiliateOverviewResponse(
            long totalAffiliates,
            long totalReferrals,
            long totalCommission,
            long totalPaid,
            long pendingPayoutCount,
            long pendingPayoutAmount,
            List<AdminAffiliateRowResponse> topAffiliates) {
    }

    public record AffiliateSettingsResponse(
            int commissionPercent,
            int discountPercent,
            boolean recurring,
            boolean commissionOnGross,
            long minPayoutAmount,
            int holdDays,
            boolean enabled) {
    }

    public record UpdateAffiliateSettingsRequest(
            int commissionPercent,
            int discountPercent,
            boolean recurring,
            boolean commissionOnGross,
            long minPayoutAmount,
            int holdDays,
            boolean enabled) {
    }
}
