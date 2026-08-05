package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;

/**
 * Provider giả lập cho môi trường phát triển và test tích hợp.
 *
 * <p>Chữ ký dùng HMAC-SHA256 trên raw body với header {@code x-signature} —
 * cùng cơ chế mà VNPay/MoMo dùng, nên adapter thật chỉ cần đổi cách dựng chuỗi
 * ký và cách gọi API khởi tạo.
 *
 * <p>Bật/tắt bằng {@code aptis.payment.sandbox.enabled}. KHÔNG bật ở production.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "aptis.payment.sandbox.enabled", havingValue = "true")
public class SandboxPaymentProvider implements PaymentProvider {

    private final ObjectMapper objectMapper;
    private final String secret;
    private final String checkoutBaseUrl;
    private final boolean asyncRefund;

    public SandboxPaymentProvider(
            ObjectMapper objectMapper,
            @Value("${aptis.payment.sandbox.secret:sandbox-secret}") String secret,
            @Value("${aptis.payment.sandbox.checkout-url:http://localhost:5173/sandbox-checkout}")
            String checkoutBaseUrl,
            @Value("${aptis.payment.sandbox.async-refund:false}") boolean asyncRefund) {

        this.objectMapper = objectMapper;
        this.secret = secret;
        this.checkoutBaseUrl = checkoutBaseUrl;
        this.asyncRefund = asyncRefund;
        log.warn("SandboxPaymentProvider đang bật — chỉ dùng cho môi trường phát triển");
    }

    @Override
    public String providerCode() {
        return "sandbox";
    }

    @Override
    public InitiateResult initiate(Order order, String returnUrl) {
        String providerOrderId = "SBX-" + order.getOrderCode();
        String paymentUrl = "%s?orderCode=%s&amount=%d&returnUrl=%s".formatted(
                checkoutBaseUrl,
                order.getOrderCode(),
                order.getTotalAmount(),
                returnUrl == null ? "" : returnUrl);

        return new InitiateResult(
                paymentUrl,
                providerOrderId,
                toJson(Map.of("orderCode", order.getOrderCode(), "amount", order.getTotalAmount())),
                toJson(Map.of("providerOrderId", providerOrderId, "paymentUrl", paymentUrl)));
    }

    @Override
    public boolean verifySignature(String rawBody, Map<String, String> headers) {
        String provided = headers.get("x-signature");
        if (provided == null) {
            return false;
        }
        String expected = hmacSha256(rawBody);
        // So sánh hằng thời gian để không rò rỉ thông tin qua timing
        return MessageDigestEquals.constantTimeEquals(expected, provided);
    }

    /**
     * Sandbox mặc định hoàn tiền ngay. Bật {@code aptis.payment.sandbox.async-refund}
     * để giả lập cổng thật: trả pending rồi chờ webhook xác nhận.
     */
    @Override
    public RefundResult refund(String providerTransactionId, long amount, String reason) {
        if (providerTransactionId == null || providerTransactionId.isBlank()) {
            throw new IllegalArgumentException("Thiếu mã giao dịch gốc để hoàn tiền");
        }

        // Mỗi yêu cầu hoàn một mã riêng, giống cổng thật: một đơn có thể hoàn
        // nhiều lần, mã trùng thì webhook không biết đang xác nhận lần nào.
        String refundId = "SBX-RF-%s-%s".formatted(
                providerTransactionId, UUID.randomUUID().toString().substring(0, 8));

        log.info("Sandbox hoàn {} cho giao dịch {}: {}{}",
                amount, providerTransactionId, reason, asyncRefund ? " (chờ webhook)" : "");

        return new RefundResult(
                refundId,
                asyncRefund,
                toJson(Map.of(
                        "refundId", refundId,
                        "amount", amount,
                        "status", asyncRefund ? "PENDING" : "SUCCESS")));
    }

    @Override
    public Optional<RefundCallbackData> parseRefundCallback(String rawBody) {
        try {
            JsonNode node = objectMapper.readTree(rawBody);

            String status = node.path("status").asText("");
            return Optional.of(new RefundCallbackData(
                    node.path("eventId").asText(null),
                    node.path("eventType").asText("refund.updated"),
                    node.path("refundId").asText(null),
                    node.path("amount").asLong(0),
                    "SUCCESS".equalsIgnoreCase(status),
                    node.path("errorCode").asText(null),
                    node.path("errorMessage").asText(null)));

        } catch (Exception ex) {
            log.warn("Không parse được callback hoàn tiền sandbox: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<CallbackData> parseCallback(String rawBody) {
        try {
            JsonNode node = objectMapper.readTree(rawBody);

            String status = node.path("status").asText("");
            return Optional.of(new CallbackData(
                    node.path("eventId").asText(null),
                    node.path("eventType").asText("payment.updated"),
                    node.path("orderCode").asText(null),
                    node.path("transactionId").asText(null),
                    node.path("amount").asLong(0),
                    node.path("currency").asText("VND"),
                    "SUCCESS".equalsIgnoreCase(status),
                    node.path("errorCode").asText(null),
                    node.path("errorMessage").asText(null)));

        } catch (Exception ex) {
            log.warn("Không parse được callback sandbox: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String hmacSha256(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Không tính được HMAC", ex);
        }
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    static final class MessageDigestEquals {

        private MessageDigestEquals() {
        }

        static boolean constantTimeEquals(String a, String b) {
            return java.security.MessageDigest.isEqual(
                    a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
        }
    }
}
