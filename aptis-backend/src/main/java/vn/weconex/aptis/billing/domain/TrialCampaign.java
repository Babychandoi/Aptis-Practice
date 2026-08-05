package vn.weconex.aptis.billing.domain;

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

/**
 * Chiến dịch dùng thử Premium (PHẦN I §11).
 */
@Entity
@Table(name = "trial_campaigns")
@Getter
@Setter
@NoArgsConstructor
public class TrialCampaign extends BaseEntity {

    public enum CampaignStatus {
        DRAFT,
        ACTIVE,
        INACTIVE,
        ENDED
    }

    @Column(name = "code", length = 100, nullable = false)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "max_uses_per_user", nullable = false)
    private int maxUsesPerUser = 1;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private CampaignStatus status = CampaignStatus.DRAFT;

    public boolean isOpenAt(Instant at) {
        return status == CampaignStatus.ACTIVE
                && (startsAt == null || !startsAt.isAfter(at))
                && (endsAt == null || endsAt.isAfter(at));
    }
}
