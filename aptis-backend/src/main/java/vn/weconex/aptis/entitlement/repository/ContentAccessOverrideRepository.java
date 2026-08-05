package vn.weconex.aptis.entitlement.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.ResourceType;
import vn.weconex.aptis.entitlement.domain.ContentAccessOverride;

public interface ContentAccessOverrideRepository extends JpaRepository<ContentAccessOverride, String> {

    /**
     * Override cho riêng user đứng trước override toàn hệ thống (user_id NULL).
     */
    @Query("""
            SELECT o FROM ContentAccessOverride o
            WHERE o.resourceType = :resourceType
              AND o.resourceId IN :resourceIds
              AND (o.userId IS NULL OR o.userId = :userId)
              AND (o.startsAt IS NULL OR o.startsAt <= :at)
              AND (o.endsAt IS NULL OR o.endsAt > :at)
            ORDER BY CASE WHEN o.userId IS NULL THEN 1 ELSE 0 END ASC
            """)
    List<ContentAccessOverride> findActiveFor(
            @Param("resourceType") ResourceType resourceType,
            @Param("resourceIds") List<String> resourceIds,
            @Param("userId") String userId,
            @Param("at") Instant at);
}
