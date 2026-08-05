package vn.weconex.aptis.entitlement.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.ResourceType;

/**
 * Ghi đè quyền truy cập theo chiến dịch (user_id NULL) hoặc theo từng học viên.
 * Bảng chỉ có created_at nên không kế thừa BaseEntity.
 */
@Entity
@Table(name = "content_access_overrides")
@Getter
@Setter
@NoArgsConstructor
public class ContentAccessOverride {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", length = 20, nullable = false)
    private ResourceType resourceType;

    @Column(name = "resource_id", columnDefinition = "CHAR(36)", nullable = false)
    private String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", length = 10, nullable = false)
    private AccessLevel accessLevel;

    /** NULL = áp dụng cho mọi học viên */
    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public boolean isActiveAt(Instant at) {
        return (startsAt == null || !startsAt.isAfter(at))
                && (endsAt == null || endsAt.isAfter(at));
    }
}
