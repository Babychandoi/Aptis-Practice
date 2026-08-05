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
import vn.weconex.aptis.common.util.Timestamps;

/**
 * Một lượt dùng thử Premium của học viên.
 *
 * <p>Quyền thực tế vẫn nằm ở user_entitlements với source_type = TRIAL — bảng
 * này chỉ ghi nhận ai đã dùng chiến dịch nào, để chặn dùng lại.
 */
@Entity
@Table(name = "user_trials")
@Getter
@Setter
@NoArgsConstructor
public class UserTrial extends BaseEntity {

    public enum TrialStatus {
        ACTIVE,
        EXPIRED,
        CANCELLED
    }

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "campaign_id", columnDefinition = "CHAR(36)", nullable = false)
    private String campaignId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private TrialStatus status = TrialStatus.ACTIVE;

    public static UserTrial start(String userId, String campaignId, int durationDays) {
        // Cắt xuống giây để quyền dùng thử có hiệu lực ngay (xem Timestamps)
        Instant now = Timestamps.nowFloored();

        UserTrial trial = new UserTrial();
        trial.userId = userId;
        trial.campaignId = campaignId;
        trial.startsAt = now;
        trial.endsAt = now.plus(durationDays, java.time.temporal.ChronoUnit.DAYS);
        return trial;
    }

    public void expire() {
        this.status = TrialStatus.EXPIRED;
    }
}
