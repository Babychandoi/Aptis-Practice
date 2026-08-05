package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.domain.PaymentWebhookEvent;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.billing.repository.PaymentWebhookEventRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;

/**
 * Khởi tạo thanh toán và xử lý webhook.
 *
 * <p>Quy tắc bắt buộc (PHẦN IV §33):
 * <ul>
 *   <li>Không nâng cấp Premium dựa vào URL redirect.</li>
 *   <li>Xác minh chữ ký webhook trước khi xử lý.</li>
 *   <li>Idempotent theo (provider, event_id) hoặc checksum payload.</li>
 *   <li>Đối chiếu amount và currency với order.</li>
 *   <li>Order đã PAID không được thanh toán lại.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookRepository;
    private final SubscriptionActivationService activationService;
    private final PaymentProviderRegistry providerRegistry;

    // -----------------------------------------------------------------
    // Khởi tạo thanh toán
    // -----------------------------------------------------------------

    @Transactional
    public PaymentTransaction initiate(
            String userId, String orderId, String providerCode, String idempotencyKey, String returnUrl) {

        var existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get();
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.forbidden("Đơn hàng không thuộc người dùng");
        }
        if (order.isPaid()) {
            throw new ApiException(ErrorCode.ORDER_ALREADY_PAID, "Đơn hàng đã được thanh toán");
        }
        if (!order.isPayable()) {
            throw new ApiException(
                    ErrorCode.ORDER_NOT_PAYABLE,
                    "Đơn hàng không ở trạng thái thanh toán được",
                    Map.of("status", order.getStatus()));
        }

        PaymentProvider provider = requireProvider(providerCode);

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setId(UUID.randomUUID().toString());
        transaction.setOrderId(order.getId());
        transaction.setProvider(providerCode);
        transaction.setAmount(order.getTotalAmount());
        transaction.setCurrency(order.getCurrency());
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setStatus(PaymentStatus.INITIATED);

        try {
            PaymentProvider.InitiateResult result = provider.initiate(order, returnUrl);
            transaction.setPaymentUrl(result.paymentUrl());
            transaction.setProviderOrderId(result.providerOrderId());
            transaction.setRawRequestJson(result.rawRequest());
            transaction.setRawResponseJson(result.rawResponse());
            transaction.setStatus(PaymentStatus.PENDING);

            order.setStatus(OrderStatus.AWAITING_PAYMENT);

        } catch (Exception ex) {
            log.error("Provider {} lỗi khi khởi tạo thanh toán cho order {}",
                    providerCode, order.getId(), ex);
            transaction.markFailed("PROVIDER_ERROR", ex.getMessage());
            paymentRepository.save(transaction);
            throw new ApiException(
                    ErrorCode.PAYMENT_PROVIDER_ERROR, "Không khởi tạo được thanh toán");
        }

        return paymentRepository.save(transaction);
    }

    // -----------------------------------------------------------------
    // Webhook
    // -----------------------------------------------------------------

    /**
     * Luôn lưu raw payload trước khi xử lý để còn dấu vết đối soát, kể cả khi
     * chữ ký sai.
     *
     * @return true nếu event được xử lý (hoặc đã xử lý trước đó)
     */
    @Transactional
    public boolean handleWebhook(String providerCode, String rawBody, Map<String, String> headers) {
        PaymentProvider provider = requireProvider(providerCode);

        boolean signatureValid = provider.verifySignature(rawBody, headers);
        String checksum = sha256(rawBody);

        Optional<PaymentProvider.CallbackData> parsed = signatureValid
                ? provider.parseCallback(rawBody)
                : Optional.empty();

        String eventId = parsed.map(PaymentProvider.CallbackData::eventId).orElse(null);

        // Chặn xử lý lặp: theo event id nếu có, nếu không thì theo checksum payload
        boolean duplicate = eventId != null
                ? webhookRepository.existsByProviderAndProviderEventId(providerCode, eventId)
                : webhookRepository.existsByProviderAndPayloadChecksum(providerCode, checksum);

        if (duplicate) {
            log.info("Webhook {} đã xử lý trước đó, bỏ qua", eventId != null ? eventId : checksum);
            return true;
        }

        PaymentWebhookEvent event = new PaymentWebhookEvent();
        event.setProvider(providerCode);
        event.setProviderEventId(eventId);
        event.setPayloadChecksum(checksum);
        event.setSignatureValid(signatureValid);
        event.setPayloadJson(rawBody);
        event.setEventType(parsed.map(PaymentProvider.CallbackData::eventType).orElse(null));
        webhookRepository.save(event);

        if (!signatureValid) {
            event.markFailed("Chữ ký webhook không hợp lệ");
            log.warn("Webhook {} có chữ ký không hợp lệ", providerCode);
            throw new ApiException(
                    ErrorCode.WEBHOOK_SIGNATURE_INVALID, "Chữ ký webhook không hợp lệ");
        }

        if (parsed.isEmpty()) {
            event.markIgnored("Không đọc được payload");
            return false;
        }

        try {
            processCallback(event, parsed.get());
            return true;
        } catch (ApiException ex) {
            // Lỗi nghiệp vụ (sai số tiền, order lạ): ghi nhận, không retry vô ích
            event.markIgnored(ex.getMessage());
            log.warn("Webhook {} bị bỏ qua: {}", event.getId(), ex.getMessage());
            return false;
        }
    }

    private void processCallback(PaymentWebhookEvent event, PaymentProvider.CallbackData data) {
        String orderId = orderRepository.findByOrderCode(data.orderCode())
                .map(Order::getId)
                .orElseThrow(() -> ApiException.notFound("Order", data.orderCode()));

        // Khóa order trước khi kích hoạt để hai webhook song song không cùng tạo
        // subscription (PHẦN IV §34 bước 1)
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (order.isPaid()) {
            event.markProcessed();
            log.info("Order {} đã PAID, webhook không tạo thêm subscription", order.getOrderCode());
            return;
        }

        if (!data.successful()) {
            markPaymentFailed(order, data);
            event.markProcessed();
            return;
        }

        // Số tiền và currency phải khớp order — không tin dữ liệu client
        if (data.amount() != order.getTotalAmount()) {
            throw new ApiException(
                    ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "Số tiền không khớp đơn hàng",
                    Map.of("expected", order.getTotalAmount(), "received", data.amount()));
        }
        if (!order.getCurrency().equalsIgnoreCase(data.currency())) {
            throw new ApiException(
                    ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "Đơn vị tiền tệ không khớp",
                    Map.of("expected", order.getCurrency(), "received", data.currency()));
        }

        PaymentTransaction transaction = resolveTransaction(order, event.getProvider(), data);
        transaction.markSuccess(data.providerTransactionId());

        order.markPaid();
        activationService.activateForPaidOrder(order);

        event.markProcessed();
        log.info("Đã kích hoạt Premium cho order {}", order.getOrderCode());
    }

    private void markPaymentFailed(Order order, PaymentProvider.CallbackData data) {
        paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .findFirst()
                .ifPresent(tx -> tx.markFailed(data.errorCode(), data.errorMessage()));

        log.info("Thanh toán order {} thất bại: {}", order.getOrderCode(), data.errorCode());
    }

    /**
     * Tìm giao dịch tương ứng; nếu không có (webhook đến trước khi ghi được
     * transaction) thì tạo bản ghi mới để không mất dấu.
     */
    private PaymentTransaction resolveTransaction(
            Order order, String providerCode, PaymentProvider.CallbackData data) {

        if (data.providerTransactionId() != null) {
            var byProviderTx = paymentRepository.findByProviderAndProviderTransactionId(
                    providerCode, data.providerTransactionId());
            if (byProviderTx.isPresent()) {
                return byProviderTx.get();
            }
        }

        return paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .filter(tx -> tx.getStatus() != PaymentStatus.FAILED)
                .findFirst()
                .orElseGet(() -> {
                    PaymentTransaction transaction = new PaymentTransaction();
                    transaction.setOrderId(order.getId());
                    transaction.setProvider(providerCode);
                    transaction.setAmount(data.amount());
                    transaction.setCurrency(data.currency());
                    // Không có transaction khởi tạo: dùng provider tx id làm khóa idempotency
                    transaction.setIdempotencyKey(
                            providerCode + ":" + data.providerTransactionId());
                    return paymentRepository.save(transaction);
                });
    }

    private PaymentProvider requireProvider(String providerCode) {
        return providerRegistry.require(providerCode);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 không khả dụng", ex);
        }
    }
}
