package vn.weconex.aptis.billing.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.PromotionRedemption;

public interface PromotionRedemptionRepository extends JpaRepository<PromotionRedemption, String> {

    long countByPromotionCodeIdAndUserId(String promotionCodeId, String userId);

    Optional<PromotionRedemption> findByOrderIdAndPromotionCodeId(
            String orderId, String promotionCodeId);
}
