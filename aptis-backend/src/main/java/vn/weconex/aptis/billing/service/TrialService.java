package vn.weconex.aptis.billing.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.TrialCampaign;
import vn.weconex.aptis.billing.domain.UserTrial;
import vn.weconex.aptis.billing.repository.TrialCampaignRepository;
import vn.weconex.aptis.billing.repository.UserTrialRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.platform.realtime.EntitlementChangePublisher;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;

/**
 * Dùng thử Premium (PHẦN I §11).
 *
 * <p>Quyền cấp qua {@code user_entitlements} với source_type = TRIAL, giống hệt
 * đường mua — nhờ vậy {@code ContentAccessService} không cần biết học viên đang
 * dùng thử hay đã trả tiền.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrialService {

    /** Dùng thử mở đúng quyền xem nội dung, không mở chấm AI không giới hạn. */
    private static final List<String> TRIAL_ENTITLEMENTS = List.of(
            UserEntitlement.PREMIUM_CONTENT_ACCESS,
            UserEntitlement.FULL_MOCK_TEST);

    private final TrialCampaignRepository campaignRepository;
    private final UserTrialRepository trialRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final EntitlementService entitlementService;
    private final EntitlementChangePublisher entitlementChangePublisher;

    /**
     * Bắt đầu dùng thử.
     *
     * <p>Chặn khi: chiến dịch không mở, đã dùng hết lượt, hoặc học viên đang có
     * Premium (dùng thử lúc đó vô nghĩa và sẽ làm rối thời hạn).
     */
    @Transactional
    public UserTrial startTrial(String userId, String campaignCode) {
        TrialCampaign campaign = campaignRepository.findByCode(campaignCode)
                .orElseThrow(() -> ApiException.notFound("TrialCampaign", campaignCode));

        if (!campaign.isOpenAt(Instant.now())) {
            throw new ApiException(
                    ErrorCode.PLAN_NOT_AVAILABLE,
                    "Chiến dịch dùng thử không còn hiệu lực",
                    Map.of("code", campaignCode, "status", campaign.getStatus()));
        }

        long used = trialRepository.countByUserIdAndCampaignId(userId, campaign.getId());
        if (used >= campaign.getMaxUsesPerUser()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Bạn đã dùng hết số lượt dùng thử của chiến dịch này",
                    Map.of("code", campaignCode, "maxUsesPerUser", campaign.getMaxUsesPerUser()));
        }

        if (entitlementService.hasPremiumAccess(userId)) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Bạn đang có quyền Premium nên không cần dùng thử");
        }

        UserTrial trial = trialRepository.save(
                UserTrial.start(userId, campaign.getId(), campaign.getDurationDays()));

        for (String code : TRIAL_ENTITLEMENTS) {
            entitlementRepository.save(UserEntitlement.grant(
                    userId,
                    code,
                    EntitlementSourceType.TRIAL,
                    trial.getId(),
                    trial.getStartsAt(),
                    trial.getEndsAt()));
        }

        entitlementChangePublisher.publishAfterCommit(userId, "TRIAL_STARTED");

        log.info("User {} bắt đầu dùng thử {} tới {}",
                userId, campaign.getCode(), trial.getEndsAt());
        return trial;
    }

    @Transactional(readOnly = true)
    public List<UserTrial> myTrials(String userId) {
        return trialRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<TrialCampaign> openCampaigns() {
        return campaignRepository.findByStatus(TrialCampaign.CampaignStatus.ACTIVE).stream()
                .filter(campaign -> campaign.isOpenAt(Instant.now()))
                .toList();
    }

    /**
     * Job định kỳ: chuyển lượt dùng thử hết hạn sang EXPIRED và thu hồi quyền.
     */
    @Transactional
    public int expireOverdueTrials() {
        Instant now = Instant.now();
        List<UserTrial> expired =
                trialRepository.findExpired(UserTrial.TrialStatus.ACTIVE, now);

        for (UserTrial trial : expired) {
            trial.expire();
            entitlementRepository.revokeBySourceId(trial.getId(), now);
            entitlementChangePublisher.publishAfterCommit(trial.getUserId(), "TRIAL_EXPIRED");
            log.info("Lượt dùng thử {} của user {} đã hết hạn",
                    trial.getId(), trial.getUserId());
        }
        return expired.size();
    }
}
