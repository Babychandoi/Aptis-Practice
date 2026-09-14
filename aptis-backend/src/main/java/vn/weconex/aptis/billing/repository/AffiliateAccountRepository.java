package vn.weconex.aptis.billing.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;

/** Mã giới thiệu của từng người dùng. */
public interface AffiliateAccountRepository extends JpaRepository<AffiliateAccount, String> {

    Optional<AffiliateAccount> findByUserId(String userId);

    Optional<AffiliateAccount> findByCode(String code);

    /**
     * Khóa dòng khi cộng dồn tiền: hai đơn được xác nhận cùng lúc mà đọc rồi
     * ghi không khóa thì một trong hai khoản hoa hồng biến mất.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM AffiliateAccount a WHERE a.userId = :userId")
    Optional<AffiliateAccount> findByUserIdForUpdate(@Param("userId") String userId);

    boolean existsByCode(String code);
}
