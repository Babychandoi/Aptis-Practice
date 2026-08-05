package vn.weconex.aptis.billing.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.PaymentWebhookEvent;

public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent, String> {

    boolean existsByProviderAndProviderEventId(String provider, String providerEventId);

    boolean existsByProviderAndPayloadChecksum(String provider, String payloadChecksum);

    /**
     * Event cần retry — worker xử lý lại (PHẦN VIII §53).
     */
    List<PaymentWebhookEvent> findByProcessingStatusAndReceivedAtBefore(
            PaymentWebhookEvent.ProcessingStatus status, Instant before);
}
