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

/**
 * Yêu cầu hoàn tiền (PHẦN I §12.5).
 *
 * <p>Hoàn tiền là thao tác hai bước: hệ thống ghi nhận yêu cầu, rồi gọi API của
 * cổng thanh toán. Trạng thái SUCCESS chỉ đặt khi cổng xác nhận — không tự đánh
 * dấu thành công rồi hy vọng.
 */
@Entity
@Table(name = "refunds")
@Getter
@Setter
@NoArgsConstructor
public class Refund {

    public enum RefundStatus {
        REQUESTED,
        PROCESSING,
        SUCCESS,
        FAILED,
        REJECTED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
    private String orderId;

    @Column(name = "payment_transaction_id", columnDefinition = "CHAR(36)", nullable = false)
    private String paymentTransactionId;

    @Column(name = "amount", nullable = false)
    private long amount;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private RefundStatus status = RefundStatus.REQUESTED;

    @Column(name = "provider_refund_id", length = 255)
    private String providerRefundId;

    @Column(name = "requested_by", columnDefinition = "CHAR(36)")
    private String requestedBy;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static Refund request(
            String orderId, String paymentTransactionId, long amount,
            String reason, String requestedBy) {

        Refund refund = new Refund();
        refund.orderId = orderId;
        refund.paymentTransactionId = paymentTransactionId;
        refund.amount = amount;
        refund.reason = reason;
        refund.requestedBy = requestedBy;
        return refund;
    }

    public void markProcessing() {
        this.status = RefundStatus.PROCESSING;
    }

    public void markSuccess(String providerRefundId) {
        this.status = RefundStatus.SUCCESS;
        this.providerRefundId = providerRefundId;
        this.completedAt = Instant.now();
    }

    public void markFailed() {
        this.status = RefundStatus.FAILED;
        this.completedAt = Instant.now();
    }

    public void reject(String reason) {
        this.status = RefundStatus.REJECTED;
        this.reason = reason;
        this.completedAt = Instant.now();
    }

    public boolean isFinal() {
        return status == RefundStatus.SUCCESS
                || status == RefundStatus.FAILED
                || status == RefundStatus.REJECTED;
    }
}
