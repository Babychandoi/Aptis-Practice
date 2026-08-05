package vn.weconex.aptis.billing.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.BillingEntities.UserSubscription;
import vn.weconex.aptis.common.util.Enums.SubscriptionStatus;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, String> {

    /**
     * Subscription đang hiệu lực, dùng khi áp chính sách gia hạn (§34).
     * Sắp xếp ends_at NULL (trọn đời) lên đầu.
     */
    @Query("""
            SELECT s FROM UserSubscription s
            WHERE s.userId = :userId
              AND s.status = :status
              AND s.startsAt <= :at
              AND (s.endsAt IS NULL OR s.endsAt > :at)
            ORDER BY CASE WHEN s.endsAt IS NULL THEN 1 ELSE 0 END DESC, s.endsAt DESC
            """)
    List<UserSubscription> findActive(
            @Param("userId") String userId,
            @Param("status") SubscriptionStatus status,
            @Param("at") Instant at);

    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<UserSubscription> findBySourceOrderId(String orderId);

    /**
     * Job hết hạn Premium (§35).
     */
    @Query("""
            SELECT s FROM UserSubscription s
            WHERE s.status = :status
              AND s.endsAt IS NOT NULL
              AND s.endsAt <= :now
            """)
    List<UserSubscription> findExpired(
            @Param("status") SubscriptionStatus status, @Param("now") Instant now);
}
