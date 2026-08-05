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
 * Lưu raw webhook để đối soát và bảo đảm idempotency (PHẦN IV §33).
 *
 * <p>UNIQUE (provider, provider_event_id) chặn xử lý lại. Khi provider không
 * gửi event id, dùng checksum payload làm khóa thay thế.
 */
@Entity
@Table(name = "payment_webhook_events")
@Getter
@Setter
@NoArgsConstructor
public class PaymentWebhookEvent {

    public enum ProcessingStatus {
        RECEIVED,
        PROCESSING,
        PROCESSED,
        FAILED,
        IGNORED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "provider", length = 50, nullable = false)
    private String provider;

    @Column(name = "provider_event_id", length = 255)
    private String providerEventId;

    @Column(name = "payload_checksum", length = 128)
    private String payloadChecksum;

    @Column(name = "signature_valid", nullable = false)
    private boolean signatureValid;

    @Column(name = "event_type", length = 100)
    private String eventType;

    @Column(name = "payload_json", columnDefinition = "JSON", nullable = false)
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", length = 16, nullable = false)
    private ProcessingStatus processingStatus = ProcessingStatus.RECEIVED;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();

    @Column(name = "processed_at")
    private Instant processedAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public void markProcessed() {
        this.processingStatus = ProcessingStatus.PROCESSED;
        this.processedAt = Instant.now();
    }

    public void markIgnored(String reason) {
        this.processingStatus = ProcessingStatus.IGNORED;
        this.errorMessage = reason;
        this.processedAt = Instant.now();
    }

    public void markFailed(String reason) {
        this.processingStatus = ProcessingStatus.FAILED;
        this.errorMessage = reason;
        this.retryCount++;
    }
}
