package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {

    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    Optional<PaymentTransaction> findByProviderAndProviderTransactionId(
            String provider, String providerTransactionId);

    List<PaymentTransaction> findByOrderIdOrderByCreatedAtDesc(String orderId);
}
