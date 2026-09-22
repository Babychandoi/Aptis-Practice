package vn.weconex.aptis.billing.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.OrderItem;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.domain.BillingEntities.UserSubscription;
import vn.weconex.aptis.billing.repository.OrderItemRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.repository.UserSubscriptionRepository;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.config.AptisProperties.Entitlement.RenewalPolicy;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.common.util.Enums.SubscriptionStatus;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;
import vn.weconex.aptis.platform.outbox.OutboxService;
import vn.weconex.aptis.platform.realtime.EntitlementChangePublisher;

/**
 * Kích hoạt Premium sau khi thanh toán thành công (PHẦN IV §34).
 *
 * <p>Toàn bộ chạy trong một transaction MySQL: cập nhật order, tạo subscription,
 * tạo entitlement, ghi outbox event. Order đã được khóa bởi caller.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionActivationService {

    private static final String AI_LOUNGE_PLAN_PREFIX = "AI_LOUNGE_";

    /** Các quyền được mở khi mua Premium. */
    private static final List<String> PREMIUM_ENTITLEMENTS = List.of(
            UserEntitlement.PREMIUM_CONTENT_ACCESS,
            UserEntitlement.FULL_MOCK_TEST,
            UserEntitlement.AI_WRITING_FEEDBACK,
            UserEntitlement.AI_SPEAKING_FEEDBACK,
            UserEntitlement.DETAILED_ANALYTICS,
            UserEntitlement.DOWNLOAD_REPORT);

    private final SubscriptionPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final PromotionService promotionService;
    private final AffiliateService affiliateService;
    private final OutboxService outboxService;
    private final EntitlementChangePublisher entitlementChangePublisher;
    private final AptisProperties properties;

    /**
     * Idempotent: nếu order đã có subscription thì trả về bản cũ, không tạo mới.
     * Webhook gửi lại nhiều lần vẫn chỉ kích hoạt một lần.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public UserSubscription activateForPaidOrder(Order order) {
        var existing = subscriptionRepository.findBySourceOrderId(order.getId());
        if (existing.isPresent()) {
            log.info("Order {} đã có subscription {}, bỏ qua kích hoạt lặp",
                    order.getId(), existing.get().getId());
            return existing.get();
        }

        OrderItem item = orderItemRepository.findByOrderId(order.getId()).stream()
                .filter(i -> i.getItemType() == OrderItem.ItemType.SUBSCRIPTION_PLAN)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Order " + order.getId() + " không có item gói dịch vụ"));

        SubscriptionPlan plan = planRepository.findById(item.getItemId())
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", item.getItemId()));

        Instant now = Instant.now();
        RenewalPolicy policy = properties.entitlement().renewalPolicy();

        List<UserSubscription> activeSubscriptions = subscriptionRepository.findActiveByPlanCodePrefix(
                order.getUserId(), productPrefix(plan.getCode()), SubscriptionStatus.ACTIVE, now);

        UserSubscription subscription;
        if (!activeSubscriptions.isEmpty() && policy == RenewalPolicy.EXTEND_CURRENT) {
            subscription = extendExisting(activeSubscriptions.get(0), plan, order);
        } else {
            Instant startsAt = activeSubscriptions.isEmpty()
                    ? now
                    // QUEUE_NEXT: gói mới nối tiếp sau gói hiện tại
                    : nvl(activeSubscriptions.get(0).getEndsAt(), now);
            subscription = createNew(order, plan, startsAt);
        }

        syncEntitlements(order.getUserId(), subscription);

        // Chỉ "đốt" lượt dùng mã khi đơn đã thanh toán, không phải lúc tạo đơn
        if (order.getPromotionCodeId() != null && order.getDiscountAmount() > 0) {
            promotionService.recordRedemption(
                    order.getPromotionCodeId(),
                    order.getUserId(),
                    order.getId(),
                    order.getDiscountAmount());
        }

        // Hoa hồng chốt ở đây chứ không ở lúc tạo đơn: mọi đường thanh toán đều
        // đi qua hàm này, và hàm đã idempotent theo sourceOrderId.
        affiliateService.onOrderPaid(order);

        // Cấp mã cho chính người vừa mua, ngay lúc này chứ không đợi họ mở
        // trang giới thiệu: mua xong là đi khoe được ngay.
        affiliateService.grantAccount(order.getUserId());

        outboxService.publish(
                "USER_SUBSCRIPTION",
                subscription.getId(),
                "SUBSCRIPTION_ACTIVATED",
                java.util.Map.of(
                        "userId", order.getUserId(),
                        "subscriptionId", subscription.getId(),
                        "planCode", plan.getCode(),
                        "orderId", order.getId(),
                        "endsAt", subscription.getEndsAt() == null
                                ? "" : subscription.getEndsAt().toString()));

        // Đẩy xuống trình duyệt để giao diện mở khóa ngay, không phải F5.
        // Phát sau commit — xem javadoc của publisher.
        entitlementChangePublisher.publishAfterCommit(order.getUserId(), "PAYMENT_CONFIRMED");

        return subscription;
    }

    /**
     * Cộng dồn thời hạn vào gói đang chạy. Gói trọn đời thì không đổi ends_at.
     */
    private UserSubscription extendExisting(
            UserSubscription current, SubscriptionPlan plan, Order order) {

        if (current.getEndsAt() == null) {
            log.info("Subscription {} là trọn đời, không cần gia hạn", current.getId());
            return current;
        }
        if (plan.isLifetime()) {
            current.setEndsAt(null);
        } else {
            current.setEndsAt(current.getEndsAt().plus(plan.getDurationDays(), ChronoUnit.DAYS));
        }
        current.setSourceOrderId(order.getId());
        return subscriptionRepository.save(current);
    }

    private UserSubscription createNew(Order order, SubscriptionPlan plan, Instant startsAt) {
        UserSubscription subscription = new UserSubscription();
        subscription.setUserId(order.getUserId());
        subscription.setPlanId(plan.getId());
        subscription.setSourceOrderId(order.getId());
        subscription.activate(
                startsAt,
                plan.isLifetime() ? null : startsAt.plus(plan.getDurationDays(), ChronoUnit.DAYS));

        return subscriptionRepository.save(subscription);
    }

    /**
     * Entitlement luôn khớp thời hạn subscription. Nếu quyền đã tồn tại từ lần
     * mua trước thì gia hạn thay vì tạo bản ghi trùng.
     */
    private void syncEntitlements(String userId, UserSubscription subscription) {
        for (String code : entitlementCodesFor(subscription)) {
            var existing = entitlementRepository.findBySource(
                    EntitlementSourceType.SUBSCRIPTION, subscription.getId(), code);

            if (existing.isPresent()) {
                UserEntitlement entitlement = existing.get();
                if (subscription.getEndsAt() == null) {
                    entitlement.setEndsAt(null); // chuyển thành trọn đời
                } else {
                    entitlement.extendTo(subscription.getEndsAt());
                }
                continue;
            }

            entitlementRepository.save(UserEntitlement.grant(
                    userId,
                    code,
                    EntitlementSourceType.SUBSCRIPTION,
                    subscription.getId(),
                    subscription.getStartsAt(),
                    subscription.getEndsAt()));
        }
    }

    private List<String> entitlementCodesFor(UserSubscription subscription) {
        SubscriptionPlan plan = planRepository.findById(subscription.getPlanId())
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", subscription.getPlanId()));
        return plan.getCode().startsWith(AI_LOUNGE_PLAN_PREFIX)
                ? List.of(UserEntitlement.AI_CONVERSATION_ACCESS)
                : PREMIUM_ENTITLEMENTS;
    }

    private static String productPrefix(String planCode) {
        return planCode.startsWith(AI_LOUNGE_PLAN_PREFIX) ? AI_LOUNGE_PLAN_PREFIX : "PREMIUM_";
    }

    /**
     * Job định kỳ: chuyển subscription hết hạn sang EXPIRED và thu hồi
     * entitlement. Không xóa dữ liệu học tập (PHẦN IV §35).
     */
    @Transactional
    public int expireOverdueSubscriptions() {
        Instant now = Instant.now();
        List<UserSubscription> expired =
                subscriptionRepository.findExpired(SubscriptionStatus.ACTIVE, now);

        for (UserSubscription subscription : expired) {
            subscription.expire();
            entitlementRepository.revokeBySourceId(subscription.getId(), now);
            entitlementChangePublisher.publishAfterCommit(
                    subscription.getUserId(), "SUBSCRIPTION_EXPIRED");
            log.info("Subscription {} của user {} đã hết hạn",
                    subscription.getId(), subscription.getUserId());
        }
        return expired.size();
    }

    private static Instant nvl(Instant value, Instant fallback) {
        return value == null ? fallback : value;
    }
}
