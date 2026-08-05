package vn.weconex.aptis.billing.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.domain.BillingEntities.UserSubscription;
import vn.weconex.aptis.billing.domain.TrialCampaign;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.repository.TrialCampaignRepository;
import vn.weconex.aptis.billing.repository.UserSubscriptionRepository;
import vn.weconex.aptis.billing.web.AdminBillingDtos;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.common.util.Enums.SubscriptionStatus;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;
import vn.weconex.aptis.platform.audit.AuditService;
import vn.weconex.aptis.platform.realtime.EntitlementChangePublisher;

/**
 * Quản trị gói dịch vụ, entitlement và chiến dịch dùng thử.
 *
 * <p>Mọi thao tác ghi audit log: đây là những việc ảnh hưởng trực tiếp tới tiền
 * và quyền của học viên, cần biết ai làm lúc nào.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBillingService {

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final TrialCampaignRepository campaignRepository;
    private final AuditService auditService;
    private final EntitlementChangePublisher entitlementChangePublisher;

    // -----------------------------------------------------------------
    // Gói dịch vụ
    // -----------------------------------------------------------------

    /**
     * Gói mới luôn ở DRAFT — chưa bán được cho tới khi ai đó chủ động ACTIVE.
     */
    @Transactional
    public SubscriptionPlan createPlan(String actorId, AdminBillingDtos.CreatePlanRequest request) {
        if (planRepository.findByCode(request.code()).isPresent()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã gói đã tồn tại: " + request.code(),
                    Map.of("code", request.code()));
        }

        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setCode(request.code());
        plan.setName(request.name());
        plan.setDescription(request.description());
        plan.setDurationDays(request.durationDays());
        plan.setPriceAmount(request.priceAmount());
        plan.setCurrency(request.currency() == null ? "VND" : request.currency());
        plan.setStatus(SubscriptionPlan.PlanStatus.DRAFT);
        plan.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());

        SubscriptionPlan saved = planRepository.save(plan);
        auditService.record(actorId, "PLAN_CREATE", "SUBSCRIPTION_PLAN", saved.getId(),
                null, Map.of("code", saved.getCode(), "price", saved.getPriceAmount()));

        return saved;
    }

    /**
     * Không cho đổi {@code durationDays}: đơn đã bán tính thời hạn theo giá trị
     * lúc mua, đổi sau sẽ làm lệch subscription đang chạy. Cần thời hạn khác thì
     * tạo gói mới.
     */
    @Transactional
    public SubscriptionPlan updatePlan(
            String actorId, String planId, AdminBillingDtos.UpdatePlanRequest request) {

        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", planId));

        Map<String, Object> before = Map.of(
                "name", plan.getName(),
                "price", plan.getPriceAmount(),
                "status", plan.getStatus().name());

        if (request.name() != null) {
            plan.setName(request.name());
        }
        if (request.description() != null) {
            plan.setDescription(request.description());
        }
        if (request.priceAmount() != null) {
            plan.setPriceAmount(request.priceAmount());
        }
        if (request.status() != null) {
            plan.setStatus(request.status());
        }
        if (request.displayOrder() != null) {
            plan.setDisplayOrder(request.displayOrder());
        }

        auditService.record(actorId, "PLAN_UPDATE", "SUBSCRIPTION_PLAN", planId,
                before, Map.of(
                        "name", plan.getName(),
                        "price", plan.getPriceAmount(),
                        "status", plan.getStatus().name()));

        return plan;
    }

    // -----------------------------------------------------------------
    // Entitlement thủ công
    // -----------------------------------------------------------------

    /**
     * Tặng quyền không qua thanh toán — dùng cho chăm sóc khách hàng, đền bù sự
     * cố, tài khoản demo.
     */
    @Transactional
    public UserEntitlement grantEntitlement(
            String actorId, String userId, AdminBillingDtos.GrantEntitlementRequest request) {

        Instant now = Instant.now();
        Instant endsAt = request.durationDays() == null
                ? null
                : now.plus(request.durationDays(), ChronoUnit.DAYS);

        UserEntitlement entitlement = entitlementRepository.save(UserEntitlement.grant(
                userId,
                request.entitlementCode(),
                EntitlementSourceType.ADMIN_GRANT,
                null,
                now,
                endsAt));

        entitlementChangePublisher.publishAfterCommit(userId, "ADMIN_GRANT");

        auditService.record(actorId, "ENTITLEMENT_GRANT", "USER", userId,
                null, Map.of(
                        "entitlementCode", request.entitlementCode(),
                        "endsAt", endsAt == null ? "vĩnh viễn" : endsAt.toString(),
                        "reason", request.reason() == null ? "" : request.reason()));

        log.info("Admin {} tặng quyền {} cho user {}",
                actorId, request.entitlementCode(), userId);
        return entitlement;
    }

    @Transactional
    public void revokeEntitlement(String actorId, String entitlementId, String reason) {
        UserEntitlement entitlement = entitlementRepository.findById(entitlementId)
                .orElseThrow(() -> ApiException.notFound("UserEntitlement", entitlementId));

        if (entitlement.getRevokedAt() != null) {
            throw new ApiException(ErrorCode.CONFLICT, "Quyền đã bị thu hồi trước đó");
        }

        entitlement.revoke();
        entitlementChangePublisher.publishAfterCommit(entitlement.getUserId(), "ADMIN_REVOKE");

        auditService.record(actorId, "ENTITLEMENT_REVOKE", "USER", entitlement.getUserId(),
                Map.of("entitlementCode", entitlement.getEntitlementCode()),
                Map.of("reason", reason == null ? "" : reason));

        log.info("Admin {} thu hồi quyền {} của user {}",
                actorId, entitlement.getEntitlementCode(), entitlement.getUserId());
    }

    /**
     * Thu hồi cả subscription và mọi entitlement sinh từ nó.
     */
    @Transactional
    public UserSubscription revokeSubscription(
            String actorId, String subscriptionId, String reason) {

        UserSubscription subscription = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> ApiException.notFound("UserSubscription", subscriptionId));

        if (subscription.getStatus() == SubscriptionStatus.REVOKED) {
            throw new ApiException(ErrorCode.CONFLICT, "Subscription đã bị thu hồi");
        }

        Instant now = Instant.now();
        subscription.setStatus(SubscriptionStatus.REVOKED);
        subscription.setRevokedAt(now);
        subscription.setRevokeReason(reason);

        int revoked = entitlementRepository.revokeBySourceId(subscriptionId, now);
        entitlementChangePublisher.publishAfterCommit(
                subscription.getUserId(), "SUBSCRIPTION_REVOKED");

        auditService.record(actorId, "SUBSCRIPTION_REVOKE", "USER_SUBSCRIPTION", subscriptionId,
                Map.of("userId", subscription.getUserId()),
                Map.of("reason", reason, "revokedEntitlements", revoked));

        log.info("Admin {} thu hồi subscription {} ({} entitlement)",
                actorId, subscriptionId, revoked);
        return subscription;
    }

    // -----------------------------------------------------------------
    // Chiến dịch dùng thử
    // -----------------------------------------------------------------

    @Transactional
    public TrialCampaign createCampaign(
            String actorId, AdminBillingDtos.CreateTrialCampaignRequest request) {

        if (campaignRepository.findByCode(request.code()).isPresent()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã chiến dịch đã tồn tại: " + request.code());
        }

        TrialCampaign campaign = new TrialCampaign();
        campaign.setCode(request.code());
        campaign.setName(request.name());
        campaign.setDurationDays(request.durationDays());
        campaign.setMaxUsesPerUser(
                request.maxUsesPerUser() == null ? 1 : request.maxUsesPerUser());
        campaign.setStartsAt(request.startsAt());
        campaign.setEndsAt(request.endsAt());
        campaign.setStatus(TrialCampaign.CampaignStatus.DRAFT);

        TrialCampaign saved = campaignRepository.save(campaign);
        auditService.record(actorId, "TRIAL_CAMPAIGN_CREATE", "TRIAL_CAMPAIGN", saved.getId(),
                null, Map.of("code", saved.getCode(), "durationDays", saved.getDurationDays()));

        return saved;
    }

    @Transactional
    public TrialCampaign setCampaignStatus(
            String actorId, String campaignId, TrialCampaign.CampaignStatus status) {

        TrialCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> ApiException.notFound("TrialCampaign", campaignId));

        TrialCampaign.CampaignStatus before = campaign.getStatus();
        campaign.setStatus(status);

        auditService.record(actorId, "TRIAL_CAMPAIGN_STATUS", "TRIAL_CAMPAIGN", campaignId,
                Map.of("status", before.name()), Map.of("status", status.name()));

        return campaign;
    }
}
