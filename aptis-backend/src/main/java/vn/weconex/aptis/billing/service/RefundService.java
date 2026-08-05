package vn.weconex.aptis.billing.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.domain.PaymentWebhookEvent;
import vn.weconex.aptis.billing.domain.Refund;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.billing.repository.PaymentWebhookEventRepository;
import vn.weconex.aptis.billing.repository.RefundRepository;
import vn.weconex.aptis.billing.repository.UserSubscriptionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;
import vn.weconex.aptis.common.util.Enums.SubscriptionStatus;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;
import vn.weconex.aptis.platform.audit.AuditService;
import vn.weconex.aptis.platform.outbox.OutboxService;
import vn.weconex.aptis.platform.realtime.EntitlementChangePublisher;

/**
 * Hoàn tiền (PHẦN I §12.5).
 *
 * <p>Quy tắc: hoàn tiền thu hồi quyền Premium tương ứng. Không thu hồi thì học
 * viên vừa được trả tiền vừa còn quyền.
 *
 * <p>Hoàn một phần KHÔNG thu hồi quyền — coi như giảm giá sau bán, quyền vẫn
 * chạy tới hết hạn. Chỉ hoàn toàn bộ mới thu hồi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final PaymentWebhookEventRepository webhookRepository;
    private final PaymentProviderRegistry providerRegistry;
    private final AuditService auditService;
    private final OutboxService outboxService;
    private final EntitlementChangePublisher entitlementChangePublisher;

    /**
     * Tạo yêu cầu hoàn tiền và gọi cổng thanh toán ngay.
     *
     * @param amount số tiền hoàn; null = hoàn toàn bộ phần còn lại
     */
    @Transactional
    public Refund requestRefund(String actorId, String orderId, Long amount, String reason) {
        // Khóa order: hai yêu cầu hoàn đồng thời không được vượt tổng đã trả
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (order.getStatus() != OrderStatus.PAID
                && order.getStatus() != OrderStatus.PARTIALLY_REFUNDED) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Chỉ hoàn tiền được đơn đã thanh toán",
                    Map.of("status", order.getStatus()));
        }

        long alreadyRefunded =
                refundRepository.sumRefundedAmount(orderId, Refund.RefundStatus.SUCCESS);
        long remaining = order.getTotalAmount() - alreadyRefunded;

        if (remaining <= 0) {
            throw new ApiException(
                    ErrorCode.CONFLICT, "Đơn hàng đã được hoàn tiền toàn bộ");
        }

        long refundAmount = amount == null ? remaining : amount;
        if (refundAmount <= 0 || refundAmount > remaining) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Số tiền hoàn không hợp lệ",
                    Map.of("requested", refundAmount, "remaining", remaining));
        }

        PaymentTransaction payment = paymentRepository
                .findByOrderIdOrderByCreatedAtDesc(orderId).stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.SUCCESS)
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.CONFLICT, "Không tìm thấy giao dịch thành công để hoàn"));

        Refund refund = refundRepository.save(Refund.request(
                orderId, payment.getId(), refundAmount, reason, actorId));

        executeWithProvider(refund, payment, order, refundAmount, remaining);

        auditService.record(actorId, "REFUND_REQUEST", "ORDER", orderId,
                Map.of("status", order.getStatus().name()),
                Map.of("refundId", refund.getId(),
                        "amount", refundAmount,
                        "refundStatus", refund.getStatus().name()));

        return refund;
    }

    private void executeWithProvider(
            Refund refund,
            PaymentTransaction payment,
            Order order,
            long refundAmount,
            long remaining) {

        PaymentProvider provider = providerRegistry.require(payment.getProvider());
        refund.markProcessing();

        try {
            PaymentProvider.RefundResult result = provider.refund(
                    payment.getProviderTransactionId(), refundAmount, refund.getReason());

            if (result.pending()) {
                // Cổng xử lý bất đồng bộ: giữ PROCESSING, chờ webhook xác nhận
                refund.setProviderRefundId(result.providerRefundId());
                log.info("Refund {} đang chờ cổng xác nhận", refund.getId());
                return;
            }

            refund.markSuccess(result.providerRefundId());
            applyRefundEffects(order, refundAmount, remaining);

        } catch (Exception ex) {
            // Không ném lại: yêu cầu đã ghi nhận với trạng thái FAILED để người
            // xử lý thấy và quyết định thử lại. Ném ra sẽ rollback cả bản ghi.
            refund.markFailed();
            log.error("Hoàn tiền {} thất bại: {}", refund.getId(), ex.getMessage());
        }
    }

    /**
     * Cập nhật trạng thái đơn và thu hồi quyền khi hoàn toàn bộ.
     */
    private void applyRefundEffects(Order order, long refundAmount, long remaining) {
        boolean fullRefund = refundAmount >= remaining;

        order.setStatus(fullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED);

        if (!fullRefund) {
            log.info("Đơn {} hoàn một phần, giữ nguyên quyền Premium", order.getOrderCode());
            return;
        }

        // Hoàn toàn bộ: thu hồi subscription và entitlement sinh từ đơn này
        subscriptionRepository.findBySourceOrderId(order.getId()).ifPresent(subscription -> {
            subscription.setStatus(SubscriptionStatus.REVOKED);
            subscription.setRevokedAt(java.time.Instant.now());
            subscription.setRevokeReason("Hoàn tiền đơn " + order.getOrderCode());

            int revoked = entitlementRepository.revokeBySourceId(
                    subscription.getId(), java.time.Instant.now());

            entitlementChangePublisher.publishAfterCommit(order.getUserId(), "REFUNDED");
            log.info("Đã thu hồi subscription {} và {} entitlement do hoàn tiền",
                    subscription.getId(), revoked);
        });

        outboxService.publish(
                "ORDER", order.getId(), "ORDER_REFUNDED",
                Map.of("userId", order.getUserId(),
                        "orderCode", order.getOrderCode(),
                        "amount", refundAmount));
    }

    /**
     * Nhận kết quả hoàn tiền cổng báo về (PHẦN IV §33).
     *
     * <p>Cổng thật xử lý hoàn tiền bất đồng bộ: {@link #requestRefund} chỉ gửi
     * yêu cầu và giữ refund ở PROCESSING, quyền Premium chỉ bị thu hồi khi cổng
     * xác nhận qua webhook này. Thu hồi sớm sẽ khóa nhầm học viên nếu cổng từ
     * chối hoàn.
     *
     * @return true nếu đã xử lý (kể cả trùng lặp), false nếu bỏ qua
     */
    @Transactional
    public boolean handleRefundWebhook(
            String providerCode, String rawBody, Map<String, String> headers) {

        PaymentProvider provider = providerRegistry.require(providerCode);

        boolean signatureValid = provider.verifySignature(rawBody, headers);
        String checksum = sha256(rawBody);

        Optional<PaymentProvider.RefundCallbackData> parsed = signatureValid
                ? provider.parseRefundCallback(rawBody)
                : Optional.empty();

        String eventId = parsed.map(PaymentProvider.RefundCallbackData::eventId).orElse(null);

        boolean duplicate = eventId != null
                ? webhookRepository.existsByProviderAndProviderEventId(providerCode, eventId)
                : webhookRepository.existsByProviderAndPayloadChecksum(providerCode, checksum);

        if (duplicate) {
            log.info("Webhook hoàn tiền {} đã xử lý trước đó, bỏ qua",
                    eventId != null ? eventId : checksum);
            return true;
        }

        PaymentWebhookEvent event = new PaymentWebhookEvent();
        event.setProvider(providerCode);
        event.setProviderEventId(eventId);
        event.setPayloadChecksum(checksum);
        event.setSignatureValid(signatureValid);
        event.setPayloadJson(rawBody);
        event.setEventType(parsed.map(PaymentProvider.RefundCallbackData::eventType)
                .orElse("refund.unknown"));
        webhookRepository.save(event);

        if (!signatureValid) {
            event.markFailed("Chữ ký webhook không hợp lệ");
            log.warn("Webhook hoàn tiền {} có chữ ký không hợp lệ", providerCode);
            throw new ApiException(
                    ErrorCode.WEBHOOK_SIGNATURE_INVALID, "Chữ ký webhook không hợp lệ");
        }

        if (parsed.isEmpty()) {
            event.markIgnored("Không đọc được payload");
            return false;
        }

        try {
            applyRefundCallback(event, parsed.get());
            return true;
        } catch (ApiException ex) {
            event.markIgnored(ex.getMessage());
            log.warn("Webhook hoàn tiền {} bị bỏ qua: {}", event.getId(), ex.getMessage());
            return false;
        }
    }

    private void applyRefundCallback(
            PaymentWebhookEvent event, PaymentProvider.RefundCallbackData data) {

        if (data.providerRefundId() == null || data.providerRefundId().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Webhook thiếu mã hoàn tiền");
        }

        List<Refund> matches = refundRepository.findAllByProviderRefundId(data.providerRefundId());
        if (matches.isEmpty()) {
            throw ApiException.notFound("Refund", data.providerRefundId());
        }
        if (matches.size() > 1) {
            // Không đoán: xác nhận nhầm bản ghi sẽ thu hồi quyền của lần hoàn khác
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã hoàn tiền của cổng trùng trên nhiều yêu cầu, cần xử lý tay",
                    Map.of("providerRefundId", data.providerRefundId(),
                            "count", matches.size()));
        }
        String refundId = matches.get(0).getId();

        // Khóa để hai webhook song song không cùng thu hồi quyền
        Refund refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> ApiException.notFound("Refund", refundId));

        if (refund.isFinal()) {
            event.markProcessed();
            log.info("Refund {} đã ở trạng thái cuối ({}), webhook không đổi gì",
                    refund.getId(), refund.getStatus());
            return;
        }

        if (!data.successful()) {
            refund.markFailed();
            event.markProcessed();
            log.warn("Cổng từ chối hoàn tiền {}: {}", refund.getId(), data.errorMessage());
            return;
        }

        // Đối chiếu số tiền: cổng hoàn khác số đã yêu cầu thì không tự áp dụng
        if (data.amount() > 0 && data.amount() != refund.getAmount()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Số tiền hoàn không khớp",
                    Map.of("expected", refund.getAmount(), "received", data.amount()));
        }

        Order order = orderRepository.findByIdForUpdate(refund.getOrderId())
                .orElseThrow(() -> ApiException.notFound("Order", refund.getOrderId()));

        // Tính lại phần còn lại tại thời điểm webhook về, KHÔNG dùng giá trị lúc
        // gửi yêu cầu: giữa hai mốc đó có thể đã có lần hoàn khác thành công.
        long alreadyRefunded = refundRepository.sumRefundedAmount(
                order.getId(), Refund.RefundStatus.SUCCESS);
        long remaining = order.getTotalAmount() - alreadyRefunded;

        refund.markSuccess(data.providerRefundId());
        applyRefundEffects(order, refund.getAmount(), remaining);

        event.markProcessed();
        log.info("Đã áp dụng hoàn tiền {} cho đơn {}", refund.getId(), order.getOrderCode());
    }

    private static String sha256(String value) {
        try {
            byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Không tính được SHA-256", ex);
        }
    }

    @Transactional(readOnly = true)
    public List<Refund> refundsOf(String orderId) {
        return refundRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public Page<Refund> search(Refund.RefundStatus status, Pageable pageable) {
        return status == null
                ? refundRepository.findAllByOrderByRequestedAtDesc(pageable)
                : refundRepository.findByStatusOrderByRequestedAtDesc(status, pageable);
    }

    /**
     * Từ chối yêu cầu hoàn tiền (khi xét thấy không hợp lệ).
     */
    @Transactional
    public Refund reject(String actorId, String refundId, String reason) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> ApiException.notFound("Refund", refundId));

        if (refund.isFinal()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Yêu cầu hoàn tiền đã ở trạng thái cuối",
                    Map.of("status", refund.getStatus()));
        }

        refund.reject(reason);
        auditService.record(actorId, "REFUND_REJECT", "REFUND", refundId,
                null, Map.of("reason", reason == null ? "" : reason));
        return refund;
    }
}
