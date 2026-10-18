package vn.weconex.aptis.billing.service;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

@Component
public class SepayGatewayPaymentProvider implements PaymentProvider {
    @Override public String providerCode() {return SepayGatewayService.PROVIDER;}
    @Override public InitiateResult initiate(Order order,String returnUrl) {
        throw new ApiException(ErrorCode.CONFLICT,"SePay yêu cầu form POST có chữ ký; sử dụng trang thanh toán của đơn hàng");
    }
    @Override public boolean verifySignature(String raw,Map<String,String> headers) {return false;}
    @Override public Optional<CallbackData> parseCallback(String raw) {return Optional.empty();}
    @Override public RefundResult refund(String transactionId,long amount,String reason) {
        throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,"Chưa hỗ trợ hoàn tiền tự động qua SePay Gateway. Cần đối soát và hoàn chuyển khoản thủ công; không tự xác nhận đã hoàn tiền.");
    }
}
