package vn.weconex.aptis.billing.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateReferral;

/** Quan hệ "ai giới thiệu ai". */
public interface AffiliateReferralRepository extends JpaRepository<AffiliateReferral, String> {

    Optional<AffiliateReferral> findByReferredUserId(String referredUserId);

    Page<AffiliateReferral> findByAffiliateUserIdOrderByCreatedAtDesc(
            String affiliateUserId, Pageable pageable);

    long countByAffiliateUserId(String affiliateUserId);
}
