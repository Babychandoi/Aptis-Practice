package vn.weconex.aptis.entitlement.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;

public interface UserEntitlementRepository extends JpaRepository<UserEntitlement, String> {

    /**
     * Điều kiện hiệu lực theo PHẦN IV §32.
     */
    @Query("""
            SELECT e FROM UserEntitlement e
            WHERE e.userId = :userId
              AND e.entitlementCode = :code
              AND e.revokedAt IS NULL
              AND e.startsAt <= :at
              AND (e.endsAt IS NULL OR e.endsAt > :at)
            ORDER BY CASE WHEN e.endsAt IS NULL THEN 1 ELSE 0 END DESC, e.endsAt DESC
            """)
    List<UserEntitlement> findActive(
            @Param("userId") String userId,
            @Param("code") String code,
            @Param("at") Instant at);

    @Query("""
            SELECT e FROM UserEntitlement e
            WHERE e.userId = :userId
              AND e.revokedAt IS NULL
              AND e.startsAt <= :at
              AND (e.endsAt IS NULL OR e.endsAt > :at)
            """)
    List<UserEntitlement> findAllActive(@Param("userId") String userId, @Param("at") Instant at);

    @Query("""
            SELECT e FROM UserEntitlement e
            WHERE e.sourceType = :sourceType
              AND e.sourceId = :sourceId
              AND e.entitlementCode = :code
              AND e.revokedAt IS NULL
            """)
    Optional<UserEntitlement> findBySource(
            @Param("sourceType") EntitlementSourceType sourceType,
            @Param("sourceId") String sourceId,
            @Param("code") String code);

    List<UserEntitlement> findBySourceId(String sourceId);

    /**
     * Thu hồi entitlement khi subscription hết hạn hoặc bị revoke (PHẦN IV §35).
     */
    @Modifying
    @Query("""
            UPDATE UserEntitlement e
            SET e.revokedAt = :now
            WHERE e.sourceId = :sourceId AND e.revokedAt IS NULL
            """)
    int revokeBySourceId(@Param("sourceId") String sourceId, @Param("now") Instant now);
}
