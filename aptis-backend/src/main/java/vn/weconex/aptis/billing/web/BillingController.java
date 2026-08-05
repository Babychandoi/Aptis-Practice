package vn.weconex.aptis.billing.web;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.OrderItem;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.billing.repository.PlanFeatureRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.repository.UserSubscriptionRepository;
import vn.weconex.aptis.billing.service.OrderService;
import vn.weconex.aptis.billing.service.PaymentService;
import vn.weconex.aptis.billing.service.PromotionService;
import vn.weconex.aptis.billing.service.RefundService;
import vn.weconex.aptis.billing.service.TrialService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.entitlement.service.EntitlementService;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class BillingController {

    private final SubscriptionPlanRepository planRepository;
    private final PlanFeatureRepository planFeatureRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final OrderService orderService;
    private final PaymentService paymentService;
    private final RefundService refundService;
    private final PromotionService promotionService;
    private final TrialService trialService;
    private final EntitlementService entitlementService;
    private final CurrentUser currentUser;

    // ---------- Gói dịch vụ (public) ----------

    @GetMapping("/plans")
    @Transactional(readOnly = true)
    public List<BillingDtos.PlanResponse> plans() {
        List<SubscriptionPlan> plans = planRepository.findByStatusOrderByDisplayOrder(
                SubscriptionPlan.PlanStatus.ACTIVE);

        if (plans.isEmpty()) {
            return List.of();
        }

        var featuresByPlan = planFeatureRepository
                .findByPlanIdInOrderByDisplayOrder(plans.stream().map(SubscriptionPlan::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        vn.weconex.aptis.billing.domain.BillingEntities.PlanFeature::getPlanId));

        return plans.stream()
                .map(plan -> new BillingDtos.PlanResponse(
                        plan.getId(),
                        plan.getCode(),
                        plan.getName(),
                        plan.getDescription(),
                        plan.getBillingType().name(),
                        plan.getDurationDays(),
                        plan.getPriceAmount(),
                        plan.getCurrency(),
                        featuresByPlan.getOrDefault(plan.getId(), List.of()).stream()
                                .map(f -> new BillingDtos.PlanFeatureResponse(
                                        f.getFeatureCode(), f.getFeatureValue(), f.getDisplayName()))
                                .toList()))
                .toList();
    }

    // ---------- Subscription & entitlement ----------

    @GetMapping("/subscriptions/current")
    @Transactional(readOnly = true)
    public List<BillingDtos.SubscriptionResponse> currentSubscriptions() {
        String userId = currentUser.requireUserId();

        var subscriptions = subscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (subscriptions.isEmpty()) {
            return List.of();
        }

        Map<String, SubscriptionPlan> plans = planRepository
                .findAllById(subscriptions.stream()
                        .map(vn.weconex.aptis.billing.domain.BillingEntities.UserSubscription::getPlanId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, Function.identity()));

        return subscriptions.stream()
                .map(s -> {
                    SubscriptionPlan plan = plans.get(s.getPlanId());
                    return new BillingDtos.SubscriptionResponse(
                            s.getId(),
                            plan == null ? null : plan.getCode(),
                            plan == null ? null : plan.getName(),
                            s.getStatus().name(),
                            s.getStartsAt(),
                            s.getEndsAt(),
                            s.getEndsAt() == null);
                })
                .toList();
    }

    @GetMapping("/entitlements")
    public List<BillingDtos.EntitlementResponse> entitlements() {
        return entitlementService.activeEntitlements(currentUser.requireUserId()).stream()
                .map(e -> new BillingDtos.EntitlementResponse(
                        e.getEntitlementCode(),
                        e.getSourceType().name(),
                        e.getStartsAt(),
                        e.getEndsAt()))
                .sorted(Comparator.comparing(BillingDtos.EntitlementResponse::code))
                .toList();
    }

    // ---------- Dùng thử ----------

    /** Chiến dịch dùng thử đang mở — hiển thị trên trang gói Premium. */
    @GetMapping("/trials/campaigns")
    public List<AdminBillingDtos.TrialCampaignResponse> openTrialCampaigns() {
        return trialService.openCampaigns().stream()
                .map(campaign -> new AdminBillingDtos.TrialCampaignResponse(
                        campaign.getId(),
                        campaign.getCode(),
                        campaign.getName(),
                        campaign.getDurationDays(),
                        campaign.getMaxUsesPerUser(),
                        campaign.getStatus().name(),
                        campaign.getStartsAt(),
                        campaign.getEndsAt()))
                .toList();
    }

    @PostMapping("/trials")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminBillingDtos.UserTrialResponse startTrial(
            @Valid @RequestBody AdminBillingDtos.StartTrialRequest request) {

        var trial = trialService.startTrial(
                currentUser.requireUserId(), request.campaignCode());

        return new AdminBillingDtos.UserTrialResponse(
                trial.getId(), trial.getCampaignId(), trial.getStatus().name(),
                trial.getStartsAt(), trial.getEndsAt());
    }

    @GetMapping("/trials")
    public List<AdminBillingDtos.UserTrialResponse> myTrials() {
        return trialService.myTrials(currentUser.requireUserId()).stream()
                .map(trial -> new AdminBillingDtos.UserTrialResponse(
                        trial.getId(), trial.getCampaignId(), trial.getStatus().name(),
                        trial.getStartsAt(), trial.getEndsAt()))
                .toList();
    }

    // ---------- Mã giảm giá ----------

    /**
     * Xem trước tiền giảm. Trả 200 kèm {@code valid=false} thay vì lỗi HTTP để
     * form nhập mã hiển thị được thông báo mà không coi đó là sự cố.
     */
    // Không mở transaction: bắt ApiException trong transaction sẽ khiến Spring
    // ném UnexpectedRollbackException lúc commit (transaction đã rollback-only)
    @PostMapping("/promotions/check")
    public BillingDtos.CheckPromotionResponse checkPromotion(
            @Valid @RequestBody BillingDtos.CheckPromotionRequest request) {

        SubscriptionPlan plan = planRepository.findById(request.planId())
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", request.planId()));

        long subtotal = plan.getPriceAmount();
        try {
            var applied = promotionService.preview(
                    currentUser.requireUserId(), request.promotionCode(), subtotal);

            return new BillingDtos.CheckPromotionResponse(
                    true,
                    applied.code().getCode(),
                    subtotal,
                    applied.discountAmount(),
                    subtotal - applied.discountAmount(),
                    plan.getCurrency(),
                    null,
                    null);

        } catch (ApiException ex) {
            return new BillingDtos.CheckPromotionResponse(
                    false, request.promotionCode(), subtotal, 0, subtotal,
                    plan.getCurrency(), ex.code().name(), ex.getMessage());
        }
    }

    // ---------- Đơn hàng ----------

    /**
     * {@code Idempotency-Key} bắt buộc để gọi lại không tạo đơn trùng.
     */
    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public BillingDtos.OrderResponse createOrder(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody BillingDtos.CreateOrderRequest request) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ApiException(
                    vn.weconex.aptis.common.exception.ErrorCode.VALIDATION_FAILED,
                    "Thiếu header Idempotency-Key");
        }

        Order order = orderService.createOrder(
                currentUser.requireUserId(), idempotencyKey, request);
        return toOrderResponse(order, orderService.itemsOf(order.getId()));
    }

    @GetMapping("/orders/{orderId}")
    @Transactional(readOnly = true)
    public BillingDtos.OrderResponse order(@PathVariable String orderId) {
        Order order = orderService.requireOwnedOrder(currentUser.requireUserId(), orderId);
        return toOrderResponse(order, orderService.itemsOf(orderId));
    }

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public PageResponse<BillingDtos.OrderResponse> orders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var orders = orderRepository.findByUserIdOrderByCreatedAtDesc(
                currentUser.requireUserId(), PageRequest.of(page, Math.min(size, 100)));

        return PageResponse.of(orders, order -> toOrderResponse(order, List.of()));
    }

    // ---------- Thanh toán ----------

    @PostMapping("/orders/{orderId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public BillingDtos.PaymentResponse createPayment(
            @PathVariable String orderId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody BillingDtos.CreatePaymentRequest request) {

        String key = idempotencyKey == null || idempotencyKey.isBlank()
                ? orderId + ":" + request.provider()
                : idempotencyKey;

        PaymentTransaction transaction = paymentService.initiate(
                currentUser.requireUserId(), orderId, request.provider(), key, request.returnUrl());

        return toPaymentResponse(transaction);
    }

    @GetMapping("/payments/{paymentId}")
    @Transactional(readOnly = true)
    public BillingDtos.PaymentResponse payment(@PathVariable String paymentId) {
        PaymentTransaction transaction = paymentRepository.findById(paymentId)
                .orElseThrow(() -> ApiException.notFound("PaymentTransaction", paymentId));

        // Chỉ chủ đơn được xem giao dịch
        orderService.requireOwnedOrder(currentUser.requireUserId(), transaction.getOrderId());
        return toPaymentResponse(transaction);
    }

    /**
     * Webhook không dùng JWT — xác thực bằng chữ ký của provider.
     * Nhận raw body để tính chữ ký trên đúng byte gốc.
     */
    @PostMapping("/payments/webhooks/{provider}")
    public Map<String, Object> webhook(
            @PathVariable String provider,
            @RequestBody String rawBody,
            HttpServletRequest httpRequest) {

        Map<String, String> headers = java.util.Collections.list(httpRequest.getHeaderNames()).stream()
                .collect(Collectors.toMap(
                        name -> name.toLowerCase(java.util.Locale.ROOT),
                        httpRequest::getHeader,
                        (a, b) -> a));

        boolean processed = paymentService.handleWebhook(provider, rawBody, headers);
        return Map.of("received", true, "processed", processed);
    }

    /**
     * Webhook kết quả hoàn tiền. Tách khỏi webhook thanh toán vì payload khác
     * hẳn và xử lý khác hẳn — gộp một endpoint rồi phân nhánh theo eventType sẽ
     * khiến hai luồng nghiệp vụ dính vào nhau.
     *
     * <p>Đặt {@code refund-callbacks} sau {@code {provider}} chứ không phải một
     * path riêng, để dùng lại đúng luật permitAll của webhook thanh toán.
     */
    @PostMapping("/payments/webhooks/{provider}/refund-callbacks")
    public Map<String, Object> refundWebhook(
            @PathVariable String provider,
            @RequestBody String rawBody,
            HttpServletRequest httpRequest) {

        Map<String, String> headers = java.util.Collections.list(httpRequest.getHeaderNames()).stream()
                .collect(Collectors.toMap(
                        name -> name.toLowerCase(java.util.Locale.ROOT),
                        httpRequest::getHeader,
                        (a, b) -> a));

        boolean processed = refundService.handleRefundWebhook(provider, rawBody, headers);
        return Map.of("received", true, "processed", processed);
    }

    // -----------------------------------------------------------------

    private static BillingDtos.OrderResponse toOrderResponse(Order order, List<OrderItem> items) {
        return new BillingDtos.OrderResponse(
                order.getId(),
                order.getOrderCode(),
                order.getStatus().name(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getExpiresAt(),
                order.getPaidAt(),
                items.stream()
                        .map(i -> new BillingDtos.OrderItemResponse(
                                i.getItemName(), i.getQuantity(), i.getUnitPrice(), i.getTotalAmount()))
                        .toList());
    }

    private static BillingDtos.PaymentResponse toPaymentResponse(PaymentTransaction transaction) {
        return new BillingDtos.PaymentResponse(
                transaction.getId(),
                transaction.getOrderId(),
                transaction.getProvider(),
                transaction.getStatus().name(),
                transaction.getAmount(),
                transaction.getCurrency(),
                transaction.getPaymentUrl(),
                transaction.getInitiatedAt(),
                transaction.getCompletedAt());
    }
}
