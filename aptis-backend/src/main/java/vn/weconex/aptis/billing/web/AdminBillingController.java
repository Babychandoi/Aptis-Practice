package vn.weconex.aptis.billing.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.Refund;
import vn.weconex.aptis.billing.domain.TrialCampaign;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.RefundRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.repository.UserSubscriptionRepository;
import vn.weconex.aptis.billing.service.AdminBillingService;
import vn.weconex.aptis.billing.service.RefundService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Quản trị gói dịch vụ, đơn hàng, hoàn tiền, entitlement, dùng thử (API §50).
 *
 * <p>Phân quyền theo permission: {@code plan:write} cho gói, {@code order:read}
 * cho đơn hàng, {@code refund:write} cho hoàn tiền,
 * {@code entitlement:grant} cho tặng/thu hồi quyền.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminBillingController {

    private final AdminBillingService adminBillingService;
    private final RefundService refundService;
    private final SubscriptionPlanRepository planRepository;
    private final OrderRepository orderRepository;
    private final RefundRepository refundRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    // ---------- Gói dịch vụ ----------

    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('plan:write')")
    public AdminBillingDtos.AdminPlanResponse createPlan(
            @Valid @RequestBody AdminBillingDtos.CreatePlanRequest request) {

        return AdminBillingDtos.AdminPlanResponse.from(
                adminBillingService.createPlan(currentUser.requireUserId(), request));
    }

    @PatchMapping("/plans/{planId}")
    @PreAuthorize("hasAuthority('plan:write')")
    public AdminBillingDtos.AdminPlanResponse updatePlan(
            @PathVariable String planId,
            @Valid @RequestBody AdminBillingDtos.UpdatePlanRequest request) {

        return AdminBillingDtos.AdminPlanResponse.from(
                adminBillingService.updatePlan(currentUser.requireUserId(), planId, request));
    }

    /** Khác API học viên: trả cả gói DRAFT và ARCHIVED. */
    @GetMapping("/plans")
    @PreAuthorize("hasAuthority('plan:write')")
    public List<AdminBillingDtos.AdminPlanResponse> plans() {
        return planRepository.findAll().stream()
                .sorted(java.util.Comparator.comparingInt(
                        vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan
                                ::getDisplayOrder))
                .map(AdminBillingDtos.AdminPlanResponse::from)
                .toList();
    }

    // ---------- Đơn hàng ----------

    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public PageResponse<AdminBillingDtos.AdminOrderResponse> orders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var orders = orderRepository.findAll(
                PageRequest.of(page, Math.min(size, 100),
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));

        return PageResponse.of(orders, this::toOrderResponse);
    }

    @GetMapping("/orders/{orderId}")
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public AdminBillingDtos.AdminOrderResponse order(@PathVariable String orderId) {
        return toOrderResponse(orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId)));
    }

    // ---------- Hoàn tiền ----------

    @PostMapping("/orders/{orderId}/refunds")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('refund:write')")
    public AdminBillingDtos.RefundResponse requestRefund(
            @PathVariable String orderId,
            @Valid @RequestBody AdminBillingDtos.CreateRefundRequest request) {

        return AdminBillingDtos.RefundResponse.from(refundService.requestRefund(
                currentUser.requireUserId(), orderId, request.amount(), request.reason()));
    }

    @GetMapping("/refunds")
    @PreAuthorize("hasAuthority('refund:write')")
    public PageResponse<AdminBillingDtos.RefundResponse> refunds(
            @RequestParam(required = false) Refund.RefundStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(
                refundService.search(status, PageRequest.of(page, Math.min(size, 100))),
                AdminBillingDtos.RefundResponse::from);
    }

    @PostMapping("/refunds/{refundId}/reject")
    @PreAuthorize("hasAuthority('refund:write')")
    public AdminBillingDtos.RefundResponse rejectRefund(
            @PathVariable String refundId,
            @RequestBody(required = false) AdminBillingDtos.RejectRefundRequest request) {

        return AdminBillingDtos.RefundResponse.from(refundService.reject(
                currentUser.requireUserId(), refundId,
                request == null ? null : request.reason()));
    }

    // ---------- Entitlement & subscription ----------

    @PostMapping("/users/{userId}/entitlements")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('entitlement:grant')")
    public AdminBillingDtos.AdminEntitlementResponse grantEntitlement(
            @PathVariable String userId,
            @Valid @RequestBody AdminBillingDtos.GrantEntitlementRequest request) {

        var entitlement = adminBillingService.grantEntitlement(
                currentUser.requireUserId(), userId, request);

        return new AdminBillingDtos.AdminEntitlementResponse(
                entitlement.getId(),
                entitlement.getUserId(),
                entitlement.getEntitlementCode(),
                entitlement.getSourceType().name(),
                entitlement.getSourceId(),
                entitlement.getStartsAt(),
                entitlement.getEndsAt(),
                entitlement.getRevokedAt());
    }

    @GetMapping("/users/{userId}/entitlements")
    @PreAuthorize("hasAuthority('entitlement:grant')")
    public List<AdminBillingDtos.AdminEntitlementResponse> userEntitlements(
            @PathVariable String userId) {

        return entitlementRepository.findAllActive(userId, java.time.Instant.now()).stream()
                .map(e -> new AdminBillingDtos.AdminEntitlementResponse(
                        e.getId(), e.getUserId(), e.getEntitlementCode(),
                        e.getSourceType().name(), e.getSourceId(),
                        e.getStartsAt(), e.getEndsAt(), e.getRevokedAt()))
                .toList();
    }

    @DeleteMapping("/entitlements/{entitlementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('entitlement:grant')")
    public void revokeEntitlement(
            @PathVariable String entitlementId,
            @RequestParam(required = false) String reason) {

        adminBillingService.revokeEntitlement(
                currentUser.requireUserId(), entitlementId, reason);
    }

    @GetMapping("/users/{userId}/subscriptions")
    @PreAuthorize("hasAuthority('order:read')")
    public List<AdminBillingDtos.AdminSubscriptionResponse> userSubscriptions(
            @PathVariable String userId) {

        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(s -> new AdminBillingDtos.AdminSubscriptionResponse(
                        s.getId(), s.getUserId(), s.getPlanId(), s.getStatus().name(),
                        s.getStartsAt(), s.getEndsAt(), s.getSourceOrderId(),
                        s.getRevokedAt(), s.getRevokeReason()))
                .toList();
    }

    @PostMapping("/subscriptions/{subscriptionId}/revoke")
    @PreAuthorize("hasAuthority('entitlement:grant')")
    public AdminBillingDtos.AdminSubscriptionResponse revokeSubscription(
            @PathVariable String subscriptionId,
            @Valid @RequestBody AdminBillingDtos.RevokeSubscriptionRequest request) {

        var subscription = adminBillingService.revokeSubscription(
                currentUser.requireUserId(), subscriptionId, request.reason());

        return new AdminBillingDtos.AdminSubscriptionResponse(
                subscription.getId(), subscription.getUserId(), subscription.getPlanId(),
                subscription.getStatus().name(), subscription.getStartsAt(),
                subscription.getEndsAt(), subscription.getSourceOrderId(),
                subscription.getRevokedAt(), subscription.getRevokeReason());
    }

    // ---------- Chiến dịch dùng thử ----------

    @PostMapping("/trial-campaigns")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('plan:write')")
    public AdminBillingDtos.TrialCampaignResponse createCampaign(
            @Valid @RequestBody AdminBillingDtos.CreateTrialCampaignRequest request) {

        return toCampaignResponse(
                adminBillingService.createCampaign(currentUser.requireUserId(), request));
    }

    @PatchMapping("/trial-campaigns/{campaignId}/status")
    @PreAuthorize("hasAuthority('plan:write')")
    public AdminBillingDtos.TrialCampaignResponse setCampaignStatus(
            @PathVariable String campaignId,
            @RequestParam TrialCampaign.CampaignStatus status) {

        return toCampaignResponse(adminBillingService.setCampaignStatus(
                currentUser.requireUserId(), campaignId, status));
    }

    // -----------------------------------------------------------------

    private AdminBillingDtos.AdminOrderResponse toOrderResponse(Order order) {
        long refunded = refundRepository.sumRefundedAmount(
                order.getId(), Refund.RefundStatus.SUCCESS);

        String email = userRepository.findById(order.getUserId())
                .map(user -> user.getEmail())
                .orElse(null);

        return new AdminBillingDtos.AdminOrderResponse(
                order.getId(),
                order.getOrderCode(),
                order.getUserId(),
                email,
                order.getStatus(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getPaidAt(),
                order.getCreatedAt(),
                refunded);
    }

    private static AdminBillingDtos.TrialCampaignResponse toCampaignResponse(
            TrialCampaign campaign) {

        return new AdminBillingDtos.TrialCampaignResponse(
                campaign.getId(),
                campaign.getCode(),
                campaign.getName(),
                campaign.getDurationDays(),
                campaign.getMaxUsesPerUser(),
                campaign.getStatus().name(),
                campaign.getStartsAt(),
                campaign.getEndsAt());
    }
}
