package vn.weconex.aptis.billing.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.PromotionCode;

public interface PromotionCodeRepository extends JpaRepository<PromotionCode, String> {

    Optional<PromotionCode> findByCode(String code);

    /**
     * Khóa bản ghi khi tăng total_used_count để hai đơn đồng thời không vượt
     * quá max_total_uses.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PromotionCode p WHERE p.code = :code")
    Optional<PromotionCode> findByCodeForUpdate(@Param("code") String code);
}
