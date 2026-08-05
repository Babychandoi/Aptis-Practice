package vn.weconex.aptis.platform.outbox;

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
import vn.weconex.aptis.common.util.Enums.OutboxStatus;

/**
 * Outbox pattern: event được ghi cùng transaction nghiệp vụ, worker phát sau.
 * Đây là cách thay thế distributed transaction MySQL &lt;-&gt; MongoDB (§2.4).
 */
@Entity
@Table(name = "outbox_events")
@Getter
@Setter
@NoArgsConstructor
public class OutboxEvent {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "aggregate_type", length = 100, nullable = false)
    private String aggregateType;

    @Column(name = "aggregate_id", columnDefinition = "CHAR(36)", nullable = false)
    private String aggregateId;

    @Column(name = "event_type", length = 100, nullable = false)
    private String eventType;

    @Column(name = "payload_json", columnDefinition = "JSON", nullable = false)
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private OutboxStatus status = OutboxStatus.PENDING;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    /** Thời điểm sớm nhất được xử lý; dùng cho backoff khi retry. */
    @Column(name = "available_at", nullable = false)
    private Instant availableAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public void markPublished() {
        this.status = OutboxStatus.PUBLISHED;
        this.publishedAt = Instant.now();
    }

    /**
     * Backoff luỹ tiến: 2^retry giây, chặn trên ở 5 phút.
     */
    public void markFailed(String error, int maxRetry) {
        this.retryCount++;
        this.lastError = error;

        if (retryCount >= maxRetry) {
            this.status = OutboxStatus.FAILED;
            return;
        }
        this.status = OutboxStatus.PENDING;
        long delaySeconds = Math.min((long) Math.pow(2, retryCount), 300);
        this.availableAt = Instant.now().plusSeconds(delaySeconds);
    }
}
