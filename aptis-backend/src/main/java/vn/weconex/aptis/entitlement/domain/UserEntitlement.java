package vn.weconex.aptis.entitlement.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Timestamps;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;

/**
 * Quyền thực tế của người dùng. Đây là nguồn duy nhất để kiểm tra truy cập
 * Premium — không dùng cột users.is_premium (PHẦN III §10.4).
 */
@Entity
@Table(name = "user_entitlements")
@Getter
@Setter
@NoArgsConstructor
public class UserEntitlement extends BaseEntity {

    public static final String PREMIUM_CONTENT_ACCESS = "PREMIUM_CONTENT_ACCESS";
    public static final String AI_WRITING_FEEDBACK = "AI_WRITING_FEEDBACK";
    public static final String AI_SPEAKING_FEEDBACK = "AI_SPEAKING_FEEDBACK";
    public static final String FULL_MOCK_TEST = "FULL_MOCK_TEST";
    public static final String DETAILED_ANALYTICS = "DETAILED_ANALYTICS";
    public static final String DOWNLOAD_REPORT = "DOWNLOAD_REPORT";

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "entitlement_code", length = 100, nullable = false)
    private String entitlementCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 20, nullable = false)
    private EntitlementSourceType sourceType;

    @Column(name = "source_id", columnDefinition = "CHAR(36)")
    private String sourceId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    /** NULL = vĩnh viễn */
    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public static UserEntitlement grant(
            String userId,
            String code,
            EntitlementSourceType sourceType,
            String sourceId,
            Instant startsAt,
            Instant endsAt) {

        UserEntitlement entitlement = new UserEntitlement();
        entitlement.userId = userId;
        entitlement.entitlementCode = code;
        entitlement.sourceType = sourceType;
        entitlement.sourceId = sourceId;
        // Cắt xuống giây: xem Timestamps.floorToSecond
        entitlement.startsAt = Timestamps.floorToSecond(startsAt);
        entitlement.endsAt = endsAt;
        return entitlement;
    }


    public boolean isActiveAt(Instant at) {
        return revokedAt == null
                && !startsAt.isAfter(at)
                && (endsAt == null || endsAt.isAfter(at));
    }

    public void revoke() {
        if (revokedAt == null) {
            revokedAt = Instant.now();
        }
    }

    public void extendTo(Instant newEndsAt) {
        if (endsAt != null && newEndsAt != null && newEndsAt.isAfter(endsAt)) {
            endsAt = newEndsAt;
        }
    }
}
