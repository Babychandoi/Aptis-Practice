package vn.weconex.aptis.billing.web;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.domain.Refund;
import vn.weconex.aptis.common.util.Enums.OrderStatus;

public final class AdminBillingDtos {

    private AdminBillingDtos() {
    }

    // ---------- Gói dịch vụ ----------

    public record CreatePlanRequest(
            @NotBlank @Size(max = 100) String code,
            @NotBlank @Size(max = 255) String name,
            String description,
            /** null = gói trọn đời */
            @Positive Integer durationDays,
            @PositiveOrZero long priceAmount,
            @Size(max = 10) String currency,
            @Min(0) Integer displayOrder) {
    }

    public record UpdatePlanRequest(
            @Size(max = 255) String name,
            String description,
            @PositiveOrZero Long priceAmount,
            SubscriptionPlan.PlanStatus status,
            @Min(0) Integer displayOrder) {
    }

    public record AdminPlanResponse(
            String id,
            String code,
            String name,
            String description,
            String billingType,
            Integer durationDays,
            long priceAmount,
            String currency,
            String status,
            int displayOrder,
            Instant createdAt,
            Instant updatedAt) {

        public static AdminPlanResponse from(SubscriptionPlan plan) {
            return new AdminPlanResponse(
                    plan.getId(),
                    plan.getCode(),
                    plan.getName(),
                    plan.getDescription(),
                    plan.getBillingType().name(),
                    plan.getDurationDays(),
                    plan.getPriceAmount(),
                    plan.getCurrency(),
                    plan.getStatus().name(),
                    plan.getDisplayOrder(),
                    plan.getCreatedAt(),
                    plan.getUpdatedAt());
        }
    }

    // ---------- Đơn hàng ----------

    public record AdminOrderResponse(
            String id,
            String orderCode,
            String userId,
            String userEmail,
            OrderStatus status,
            long subtotalAmount,
            long discountAmount,
            long totalAmount,
            String currency,
            Instant paidAt,
            Instant createdAt,
            long refundedAmount) {
    }

    // ---------- Hoàn tiền ----------

    public record CreateRefundRequest(
            /** null = hoàn toàn bộ phần còn lại */
            @Positive Long amount,
            @Size(max = 1000) String reason) {
    }

    public record RefundResponse(
            String id,
            String orderId,
            long amount,
            String status,
            String reason,
            String providerRefundId,
            Instant requestedAt,
            Instant completedAt) {

        public static RefundResponse from(Refund refund) {
            return new RefundResponse(
                    refund.getId(),
                    refund.getOrderId(),
                    refund.getAmount(),
                    refund.getStatus().name(),
                    refund.getReason(),
                    refund.getProviderRefundId(),
                    refund.getRequestedAt(),
                    refund.getCompletedAt());
        }
    }

    public record RejectRefundRequest(@Size(max = 1000) String reason) {
    }

    // ---------- Entitlement (tặng / thu hồi tay) ----------

    public record GrantEntitlementRequest(
            @NotBlank @Size(max = 100) String entitlementCode,
            /** null = vĩnh viễn */
            @Positive Integer durationDays,
            @Size(max = 500) String reason) {
    }

    public record AdminEntitlementResponse(
            String id,
            String userId,
            String entitlementCode,
            String sourceType,
            String sourceId,
            Instant startsAt,
            Instant endsAt,
            Instant revokedAt) {
    }

    // ---------- Chiến dịch dùng thử ----------

    public record CreateTrialCampaignRequest(
            @NotBlank @Size(max = 100) String code,
            @NotBlank @Size(max = 255) String name,
            @Positive int durationDays,
            @Min(1) Integer maxUsesPerUser,
            Instant startsAt,
            Instant endsAt) {
    }

    public record TrialCampaignResponse(
            String id,
            String code,
            String name,
            int durationDays,
            int maxUsesPerUser,
            String status,
            Instant startsAt,
            Instant endsAt) {
    }

    public record StartTrialRequest(@NotBlank String campaignCode) {
    }

    public record UserTrialResponse(
            String id,
            String campaignId,
            String status,
            Instant startsAt,
            Instant endsAt) {
    }

    // ---------- Subscription ----------

    public record AdminSubscriptionResponse(
            String id,
            String userId,
            String planId,
            String status,
            Instant startsAt,
            Instant endsAt,
            String sourceOrderId,
            Instant revokedAt,
            String revokeReason) {
    }

    public record RevokeSubscriptionRequest(@NotNull @Size(max = 500) String reason) {
    }

    public record AdminListResponse<T>(List<T> items, long total) {
    }
}
