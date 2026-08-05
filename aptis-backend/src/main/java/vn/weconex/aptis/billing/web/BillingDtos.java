package vn.weconex.aptis.billing.web;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;

public final class BillingDtos {

    private BillingDtos() {
    }

    public record PlanResponse(
            String id,
            String code,
            String name,
            String description,
            String billingType,
            Integer durationDays,
            long priceAmount,
            String currency,
            List<PlanFeatureResponse> features) {
    }

    public record PlanFeatureResponse(String code, String value, String displayName) {
    }

    /** Giá không nằm trong request — backend lấy từ subscription_plans. */
    public record CreateOrderRequest(@NotBlank String planId, String promotionCode) {
    }

    public record CheckPromotionRequest(
            @NotBlank String planId, @NotBlank String promotionCode) {
    }

    /**
     * Xem trước tiền giảm trước khi tạo đơn. Không ghi nhận lượt dùng mã.
     * {@code valid=false} thì {@code errorCode} cho biết lý do.
     */
    public record CheckPromotionResponse(
            boolean valid,
            String code,
            long subtotalAmount,
            long discountAmount,
            long totalAmount,
            String currency,
            String errorCode,
            String errorMessage) {
    }

    public record OrderResponse(
            String id,
            String orderCode,
            String status,
            long subtotalAmount,
            long discountAmount,
            long totalAmount,
            String currency,
            Instant expiresAt,
            Instant paidAt,
            List<OrderItemResponse> items) {
    }

    public record OrderItemResponse(String itemName, int quantity, long unitPrice, long totalAmount) {
    }

    public record CreatePaymentRequest(
            @NotBlank String provider,
            /** URL frontend để provider redirect về sau khi thanh toán. */
            String returnUrl) {
    }

    /**
     * Client chuyển hướng người dùng tới {@code paymentUrl}. Premium KHÔNG được
     * kích hoạt khi người dùng quay lại từ URL này — chỉ webhook mới kích hoạt.
     */
    public record PaymentResponse(
            String id,
            String orderId,
            String provider,
            String status,
            long amount,
            String currency,
            String paymentUrl,
            Instant initiatedAt,
            Instant completedAt) {
    }

    public record SubscriptionResponse(
            String id,
            String planCode,
            String planName,
            String status,
            Instant startsAt,
            Instant endsAt,
            boolean lifetime) {
    }

    public record EntitlementResponse(
            String code,
            String sourceType,
            Instant startsAt,
            Instant endsAt) {
    }
}
