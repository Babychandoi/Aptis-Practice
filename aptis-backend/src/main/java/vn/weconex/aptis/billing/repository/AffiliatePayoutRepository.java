package vn.weconex.aptis.billing.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout.PayoutStatus;

/** Yêu cầu rút tiền hoa hồng. */
public interface AffiliatePayoutRepository extends JpaRepository<AffiliatePayout, String> {

    Page<AffiliatePayout> findByAffiliateUserIdOrderByCreatedAtDesc(
            String affiliateUserId, Pageable pageable);

    Page<AffiliatePayout> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AffiliatePayout> findByStatusOrderByCreatedAtDesc(PayoutStatus status, Pageable pageable);

    long countByStatus(PayoutStatus status);

    /** Chặn gửi yêu cầu mới khi còn một yêu cầu chưa xử lý xong. */
    boolean existsByAffiliateUserIdAndStatusIn(String affiliateUserId, List<PayoutStatus> statuses);
}
