package vn.weconex.aptis.billing.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Timestamps;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;
import vn.weconex.aptis.common.util.Enums.SubscriptionStatus;

/**
 * Gói dịch vụ, đơn hàng, giao dịch thanh toán.
 * Tiền lưu bằng BIGINT đơn vị đồng — không dùng double.
 */
public final class BillingEntities {

    private BillingEntities() {
    }

    @Entity(name = "SubscriptionPlan")
    @Table(name = "subscription_plans")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SubscriptionPlan extends BaseEntity {

        public enum BillingType {
            ONE_TIME,
            RECURRING
        }

        public enum PlanStatus {
            DRAFT,
            ACTIVE,
            INACTIVE,
            ARCHIVED
        }

        @Column(name = "code", length = 100, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        @Enumerated(EnumType.STRING)
        @Column(name = "billing_type", length = 16, nullable = false)
        private BillingType billingType = BillingType.ONE_TIME;

        /** NULL = trọn đời. */
        @Column(name = "duration_days")
        private Integer durationDays;

        @Column(name = "price_amount", nullable = false)
        private long priceAmount;

        @Column(name = "currency", length = 10, nullable = false)
        private String currency = "VND";

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PlanStatus status = PlanStatus.DRAFT;

        @Column(name = "display_order", nullable = false)
        private int displayOrder;

        public boolean isPurchasable() {
            return status == PlanStatus.ACTIVE;
        }

        public boolean isLifetime() {
            return durationDays == null;
        }
    }

    @Entity(name = "PlanFeature")
    @Table(name = "plan_features")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class PlanFeature {

        @Id
        @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
        private String id;

        @Column(name = "plan_id", columnDefinition = "CHAR(36)", nullable = false)
        private String planId;

        @Column(name = "feature_code", length = 100, nullable = false)
        private String featureCode;

        @Column(name = "feature_value", length = 500)
        private String featureValue;

        @Column(name = "display_name", length = 255)
        private String displayName;

        @Column(name = "display_order", nullable = false)
        private int displayOrder;

        @PrePersist
        void assignId() {
            if (id == null) {
                id = UUID.randomUUID().toString();
            }
        }
    }

    @Entity(name = "UserSubscription")
    @Table(name = "user_subscriptions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class UserSubscription extends BaseEntity {

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Column(name = "plan_id", columnDefinition = "CHAR(36)", nullable = false)
        private String planId;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private SubscriptionStatus status = SubscriptionStatus.PENDING;

        @Column(name = "starts_at")
        private Instant startsAt;

        /** NULL = trọn đời. */
        @Column(name = "ends_at")
        private Instant endsAt;

        @Column(name = "auto_renew", nullable = false)
        private boolean autoRenew;

        @Column(name = "source_order_id", columnDefinition = "CHAR(36)")
        private String sourceOrderId;

        @Column(name = "activated_at")
        private Instant activatedAt;

        @Column(name = "cancelled_at")
        private Instant cancelledAt;

        @Column(name = "revoked_at")
        private Instant revokedAt;

        @Column(name = "revoke_reason", length = 500)
        private String revokeReason;

        public boolean isActiveAt(Instant at) {
            return status == SubscriptionStatus.ACTIVE
                    && startsAt != null
                    && !startsAt.isAfter(at)
                    && (endsAt == null || endsAt.isAfter(at));
        }

        public void activate(Instant startsAt, Instant endsAt) {
            this.status = SubscriptionStatus.ACTIVE;
            // Cắt xuống giây để quyền có hiệu lực ngay (xem Timestamps)
            this.startsAt = Timestamps.floorToSecond(startsAt);
            this.endsAt = endsAt;
            this.activatedAt = Instant.now();
        }

        public void expire() {
            this.status = SubscriptionStatus.EXPIRED;
        }
    }

    // Tên entity là PurchaseOrder: "Order" là từ khóa trong JPQL
    @Entity(name = "PurchaseOrder")
    @Table(name = "orders")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Order extends BaseEntity {

        @Column(name = "order_code", length = 50, nullable = false)
        private String orderCode;

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 24, nullable = false)
        private OrderStatus status = OrderStatus.PENDING;

        @Column(name = "subtotal_amount", nullable = false)
        private long subtotalAmount;

        @Column(name = "discount_amount", nullable = false)
        private long discountAmount;

        @Column(name = "total_amount", nullable = false)
        private long totalAmount;

        @Column(name = "currency", length = 10, nullable = false)
        private String currency = "VND";

        @Column(name = "promotion_code_id", columnDefinition = "CHAR(36)")
        private String promotionCodeId;

        @Column(name = "idempotency_key", length = 255, nullable = false)
        private String idempotencyKey;

        @Column(name = "expires_at")
        private Instant expiresAt;

        @Column(name = "paid_at")
        private Instant paidAt;

        @Column(name = "cancelled_at")
        private Instant cancelledAt;

        public boolean isPaid() {
            return status == OrderStatus.PAID;
        }

        public boolean isPayable() {
            return (status == OrderStatus.PENDING || status == OrderStatus.AWAITING_PAYMENT)
                    && (expiresAt == null || expiresAt.isAfter(Instant.now()));
        }

        public void markPaid() {
            this.status = OrderStatus.PAID;
            this.paidAt = Instant.now();
        }
    }

    @Entity(name = "OrderItem")
    @Table(name = "order_items")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class OrderItem {

        public enum ItemType {
            SUBSCRIPTION_PLAN
        }

        @Id
        @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
        private String id;

        @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
        private String orderId;

        @Enumerated(EnumType.STRING)
        @Column(name = "item_type", length = 32, nullable = false)
        private ItemType itemType = ItemType.SUBSCRIPTION_PLAN;

        @Column(name = "item_id", columnDefinition = "CHAR(36)", nullable = false)
        private String itemId;

        @Column(name = "item_name", length = 255, nullable = false)
        private String itemName;

        @Column(name = "quantity", nullable = false)
        private int quantity = 1;

        @Column(name = "unit_price", nullable = false)
        private long unitPrice;

        @Column(name = "discount_amount", nullable = false)
        private long discountAmount;

        @Column(name = "total_amount", nullable = false)
        private long totalAmount;

        @PrePersist
        void assignId() {
            if (id == null) {
                id = UUID.randomUUID().toString();
            }
        }
    }

    @Entity(name = "PaymentTransaction")
    @Table(name = "payment_transactions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class PaymentTransaction extends BaseEntity {

        @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
        private String orderId;

        @Column(name = "provider", length = 50, nullable = false)
        private String provider;

        @Column(name = "provider_transaction_id", length = 255)
        private String providerTransactionId;

        @Column(name = "provider_order_id", length = 255)
        private String providerOrderId;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PaymentStatus status = PaymentStatus.INITIATED;

        @Column(name = "amount", nullable = false)
        private long amount;

        @Column(name = "currency", length = 10, nullable = false)
        private String currency = "VND";

        @Column(name = "idempotency_key", length = 255, nullable = false)
        private String idempotencyKey;

        @Column(name = "payment_url", columnDefinition = "TEXT")
        private String paymentUrl;

        @Column(name = "initiated_at", nullable = false)
        private Instant initiatedAt = Instant.now();

        @Column(name = "completed_at")
        private Instant completedAt;

        @Column(name = "failed_at")
        private Instant failedAt;

        @Column(name = "error_code", length = 100)
        private String errorCode;

        @Column(name = "error_message", length = 1000)
        private String errorMessage;

        @Column(name = "raw_request_json", columnDefinition = "JSON")
        private String rawRequestJson;

        @Column(name = "raw_response_json", columnDefinition = "JSON")
        private String rawResponseJson;

        public void markSuccess(String providerTransactionId) {
            this.status = PaymentStatus.SUCCESS;
            this.providerTransactionId = providerTransactionId;
            this.completedAt = Instant.now();
        }

        public void markFailed(String code, String message) {
            this.status = PaymentStatus.FAILED;
            this.errorCode = code;
            this.errorMessage = message;
            this.failedAt = Instant.now();
        }
    }
}
