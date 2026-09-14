package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission;

/** Hoa hồng phát sinh theo từng đơn. */
public interface AffiliateCommissionRepository extends JpaRepository<AffiliateCommission, String> {

    Optional<AffiliateCommission> findByOrderId(String orderId);

    Page<AffiliateCommission> findByAffiliateUserIdOrderByCreatedAtDesc(
            String affiliateUserId, Pageable pageable);

    List<AffiliateCommission> findByPayoutId(String payoutId);

    /**
     * Tổng tiền theo trạng thái, dùng cho thẻ số liệu ở trang cá nhân.
     *
     * <p>Trả Object[]{status, sum} chứ không tạo projection: chỉ dùng một chỗ,
     * thêm interface để đọc hai cột là thừa.
     */
    @Query("""
            SELECT c.status, COALESCE(SUM(c.amount), 0)
            FROM AffiliateCommission c
            WHERE c.affiliateUserId = :userId
            GROUP BY c.status
            """)
    List<Object[]> sumByStatus(@Param("userId") String userId);

    /** Khoản rút được; khóa lại để hai yêu cầu rút không cùng lấy một khoản. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM AffiliateCommission c
            WHERE c.affiliateUserId = :userId AND c.status = 'AVAILABLE'
            ORDER BY c.createdAt
            """)
    List<AffiliateCommission> findAvailableForUpdate(@Param("userId") String userId);

    /** Khoản PENDING đã hết thời gian giữ — job định kỳ mở cho rút. */
    @Query("""
            SELECT c FROM AffiliateCommission c
            WHERE c.status = 'PENDING'
              AND c.availableAt IS NOT NULL
              AND c.availableAt <= CURRENT_TIMESTAMP
            """)
    List<AffiliateCommission> findDueForRelease();
}
