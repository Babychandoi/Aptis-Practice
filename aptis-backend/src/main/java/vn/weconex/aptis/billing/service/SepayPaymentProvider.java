package vn.weconex.aptis.billing.service;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/** SePay bank notifications are handled by SepayWebhookService, never by the generic callback parser. */
@Component
public class SepayPaymentProvider implements PaymentProvider {
    @Override public String providerCode() { return "sepay"; }
    @Override public InitiateResult initiate(Order order,String returnUrl) {
        throw new ApiException(ErrorCode.CONFLICT,"Thanh toán SePay bằng QR ở trang chuyển khoản của đơn hàng");
    }
    @Override public boolean verifySignature(String rawBody, Map<String,String> headers) { return false; }
    @Override public Optional<CallbackData> parseCallback(String rawBody) { return Optional.empty(); }
    @Override public RefundResult refund(String transactionId,long amount,String reason) {
        throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,"SePay không cung cấp hoàn tiền qua webhook ngân hàng; cần đối soát hoàn chuyển khoản với ngân hàng");
    }
}
