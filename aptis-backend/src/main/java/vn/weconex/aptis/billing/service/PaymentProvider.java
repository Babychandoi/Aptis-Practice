package vn.weconex.aptis.billing.service;

import java.util.Optional;

import vn.weconex.aptis.billing.domain.BillingEntities.Order;

/**
 * Cổng thanh toán. Mỗi provider (VNPay, MoMo, ZaloPay...) có một implementation.
 *
 * <p>Bắt buộc: {@link #verifySignature} phải xác minh chữ ký thật, và
 * {@link #parseCallback} phải trả về số tiền và mã đơn lấy TỪ PAYLOAD của
 * provider, không lấy từ tham số client (PHẦN IV §33).
 */
public interface PaymentProvider {

    /** Trùng với path variable {provider} và cột payment_transactions.provider. */
    String providerCode();

    InitiateResult initiate(Order order, String returnUrl);

    boolean verifySignature(String rawBody, java.util.Map<String, String> headers);

    Optional<CallbackData> parseCallback(String rawBody);

    /**
     * Gọi API hoàn tiền của cổng.
     *
     * <p>Ném exception khi cổng từ chối hoặc lỗi mạng — caller đánh dấu refund
     * FAILED và người xử lý quyết định thử lại.
     *
     * @param providerTransactionId mã giao dịch gốc cần hoàn
     */
    RefundResult refund(String providerTransactionId, long amount, String reason);

    /**
     * Đọc callback hoàn tiền. Payload hoàn tiền khác payload thanh toán nên
     * không dùng chung {@link #parseCallback}.
     *
     * <p>Mặc định trả rỗng: cổng nào xử lý hoàn tiền đồng bộ thì không cần
     * webhook, và không nên buộc mọi provider phải hiện thực.
     */
    default Optional<RefundCallbackData> parseRefundCallback(String rawBody) {
        return Optional.empty();
    }

    record InitiateResult(String paymentUrl, String providerOrderId, String rawRequest, String rawResponse) {
    }

    /**
     * Kết quả hoàn tiền cổng báo về.
     *
     * @param providerRefundId mã hoàn tiền của cổng — dùng để khớp với bản ghi
     *     đang PROCESSING, vì lúc gửi yêu cầu ta đã lưu mã này
     * @param amount           số tiền cổng báo đã hoàn, để đối chiếu
     * @param successful       cổng xác nhận hoàn thành công
     */
    record RefundCallbackData(
            String eventId,
            String eventType,
            String providerRefundId,
            long amount,
            boolean successful,
            String errorCode,
            String errorMessage) {
    }

    /**
     * @param pending true khi cổng nhận yêu cầu nhưng xử lý bất đồng bộ — refund
     *     giữ ở PROCESSING chờ webhook, không đánh dấu SUCCESS sớm
     */
    record RefundResult(String providerRefundId, boolean pending, String rawResponse) {
    }

    /**
     * @param orderCode  mã đơn hàng của hệ thống, lấy từ payload provider
     * @param amount     số tiền provider báo đã nhận, đơn vị đồng
     * @param successful provider xác nhận thanh toán thành công
     */
    record CallbackData(
            String eventId,
            String eventType,
            String orderCode,
            String providerTransactionId,
            long amount,
            String currency,
            boolean successful,
            String errorCode,
            String errorMessage) {
    }
}
