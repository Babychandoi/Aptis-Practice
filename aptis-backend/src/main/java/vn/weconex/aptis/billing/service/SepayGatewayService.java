package vn.weconex.aptis.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.repository.BankTransferRequestRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;
import vn.weconex.aptis.platform.audit.AuditService;

/** Dedicated live path; never passes SePay IPN through the generic webhook parser. */
@Service
@RequiredArgsConstructor
public class SepayGatewayService {
    public static final String PROVIDER="sepay_gateway";
    private final SepayGatewayClient client;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final OrderRepository orders;
    private final PaymentTransactionRepository payments;
    private final BankTransferRequestRepository transfers;
    private final SubscriptionActivationService activation;
    private final AuditService audit;
    @Value("${aptis.seo.public-origin:https://aptispractices.io.vn}") private String origin;
    public record Method(String mode) {}
    public record Status(boolean enabled,boolean configured,String environment,String merchantId,String ipnUrl) {}
    public record Checkout(String invoice,String checkoutUrl,Map<String,String> fields) {}
    public Status status() { return new Status(client.enabled(),client.configured(),client.environment(),client.merchant(),origin+SepayGatewayClient.IPN_PATH); }
    @Transactional(readOnly=true)
    public Method method(String userId,String orderId) {
        Order order=owned(userId,orderId,false);
        boolean reserved=jdbc.queryForObject("SELECT COUNT(*) FROM sepay_gateway_orders WHERE order_id=?",Integer.class,orderId)>0;
        // Legacy QR stays valid; do not offer a second payment route for the same order.
        boolean legacy=transfers.findByOrderId(orderId).isPresent();
        return new Method(reserved||client.enabled()&&!legacy&&order.getTotalAmount()>=1000?"SEPAY_GATEWAY":"BANK_TRANSFER");
    }
    @Transactional
    public Checkout create(String userId,String orderId) {
        Order order=owned(userId,orderId,true);
        if(order.isPaid()) throw new ApiException(ErrorCode.ORDER_ALREADY_PAID,"Đơn đã được thanh toán");
        if(!order.isPayable()||order.getExpiresAt()==null||!order.getExpiresAt().isAfter(Instant.now()))
            throw new ApiException(ErrorCode.ORDER_NOT_PAYABLE,"Đơn đã hết hạn hoặc không thể thanh toán");
        if(transfers.findByOrderId(orderId).isPresent()) throw new ApiException(ErrorCode.CONFLICT,"Đơn đã có QR chuyển khoản cũ. Giữ nguyên luồng thanh toán để tránh chuyển tiền hai lần.");
        if(!"VND".equals(order.getCurrency())||order.getTotalAmount()<1000) throw bad("SePay yêu cầu đơn VND từ 1.000đ");
        var bindings=jdbc.queryForList("SELECT invoice,merchant_fingerprint FROM sepay_gateway_orders WHERE order_id=?",orderId);
        String invoice;
        if(bindings.isEmpty()) {
            client.requireReady();
            invoice="APTISPG"+UUID.randomUUID().toString().replace("-", "").toUpperCase(java.util.Locale.ROOT);
            PaymentTransaction payment=new PaymentTransaction();
            payment.setOrderId(orderId);payment.setProvider(PROVIDER);payment.setAmount(order.getTotalAmount());payment.setCurrency("VND");
            payment.setStatus(PaymentStatus.PENDING);payment.setProviderOrderId(invoice);payment.setPaymentUrl(SepayGatewayClient.CHECKOUT_URL);
            payment.setIdempotencyKey("sepay-gateway-order:"+orderId);payments.saveAndFlush(payment);
            jdbc.update("INSERT INTO sepay_gateway_orders(invoice,order_id,payment_id,merchant_fingerprint,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP())",
                    invoice,orderId,payment.getId(),client.merchantFingerprint());
            order.setStatus(OrderStatus.AWAITING_PAYMENT);
        } else {
            // Allow an already-issued invoice to be reopened while new Gateway checkouts are disabled.
            client.requireConfigured();
            var binding=bindings.get(0);invoice=(String)binding.get("invoice");
            if(!client.merchantFingerprint().equals(binding.get("merchant_fingerprint"))) throw bad("Merchant đã thay đổi; liên hệ hỗ trợ để đối soát đơn cũ");
        }
        var fields=new LinkedHashMap<String,String>();
        fields.put("merchant",client.merchant());fields.put("operation","PURCHASE");fields.put("payment_method","BANK_TRANSFER");
        fields.put("order_invoice_number",invoice);fields.put("order_amount",String.valueOf(order.getTotalAmount()));fields.put("currency","VND");
        fields.put("order_description","Aptis Practice "+order.getOrderCode());
        String redirect=origin+"/checkout/"+orderId;
        fields.put("success_url",redirect+"?sepay=success");fields.put("error_url",redirect+"?sepay=error");fields.put("cancel_url",redirect+"?sepay=cancel");
        fields.put("signature",SepayCheckoutSignature.sign(fields,client.secret()));
        return new Checkout(invoice,SepayGatewayClient.CHECKOUT_URL,fields);
    }
    @Transactional(timeout=25)
    public void receive(byte[] raw,String secret) {
        client.authenticate(secret);
        if(raw.length>32768) throw bad("IPN quá lớn");
        JsonNode data;
        try { data=json.readTree(raw); } catch(Exception ex) { throw bad("IPN không phải JSON hợp lệ"); }
        if(data==null||!data.isObject()) throw bad("IPN phải là JSON object");
        String kind=data.path("notification_type").asText();
        if(!List.of("ORDER_PAID","TRANSACTION_VOID").contains(kind)) return;
        var payloadOrder=data.path("order");var transaction=data.path("transaction");
        String invoice=payloadOrder.path("order_invoice_number").asText();
        if(!invoice.matches("APTISPG[A-F0-9]{32}")) throw bad("IPN không phải đơn SePay production của Aptis");
        String txId=transaction.path("transaction_id").asText();
        if(!txId.matches("[A-Za-z0-9_-]{1,100}")) throw bad("Mã giao dịch IPN không hợp lệ");
        long amount=money(payloadOrder.path("order_amount"));
        String currency=payloadOrder.path("order_currency").asText();
        String event=kind+":"+txId;
        String checksum=SepayGatewayClient.hash(kind+"|"+invoice+"|"+txId+"|"+amount+"|"+currency+"|"+payloadOrder.path("order_id").asText()
                +"|"+transaction.path("transaction_amount").asText()+"|"+transaction.path("transaction_currency").asText()
                +"|"+transaction.path("transaction_status").asText()+"|"+transaction.path("transaction_type").asText()+"|"+transaction.path("transaction_date").asText());
        var previous=jdbc.queryForList("SELECT status,immutable_checksum FROM sepay_gateway_events WHERE event_key=?",event);
        if(!previous.isEmpty()) {
            if(!checksum.equals(previous.get(0).get("immutable_checksum"))) throw new ApiException(ErrorCode.CONFLICT,"IPN trùng ID nhưng dữ liệu đã thay đổi");
            if(List.of("APPLIED","IGNORED").contains(previous.get(0).get("status"))) return;
        }
        var bindings=jdbc.queryForList("SELECT order_id,payment_id,merchant_fingerprint FROM sepay_gateway_orders WHERE invoice=?",invoice);
        if(bindings.isEmpty()) { record(event,invoice,txId,checksum,amount);finish(event,"REVIEW","UNKNOWN_INVOICE");return; }
        var binding=bindings.get(0);
        if(!client.merchantFingerprint().equals(binding.get("merchant_fingerprint"))) throw bad("IPN không thuộc merchant của đơn này");
        if("TRANSACTION_VOID".equals(kind)) {record(event,invoice,txId,checksum,amount);finish(event,"REVIEW","VOID_REQUIRES_ADMIN_REVIEW");return;}
        if(!"CAPTURED".equals(payloadOrder.path("order_status").asText())||!"APPROVED".equals(transaction.path("transaction_status").asText())
                ||!"PAYMENT".equals(transaction.path("transaction_type").asText())||!"BANK_TRANSFER".equals(transaction.path("payment_method").asText())
                ||!"VND".equals(currency)||!"VND".equals(transaction.path("transaction_currency").asText())||money(transaction.path("transaction_amount"))!=amount)
            throw bad("IPN không phải thanh toán chuyển khoản thành công hợp lệ");
        // Validate live API before locks/activation. API outage causes rollback and non-200, permitting provider retry.
        var remote=client.retrieve(invoice);
        if(!invoice.equals(remote.path("order_invoice_number").asText())||!"CAPTURED".equals(remote.path("order_status").asText())
                ||!"VND".equals(remote.path("order_currency").asText())||money(remote.path("order_amount"))!=amount
                ||!payloadOrder.path("order_id").asText().equals(remote.path("order_id").asText())||remote.path("order_id").asText().isBlank())
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,"API SePay chưa xác nhận đúng đơn đã thanh toán; cần thử lại IPN");
        Instant paidAt=paymentTime(transaction.path("transaction_date").asText());
        String orderId=(String)binding.get("order_id");
        // Same lock ordering as manual/bank confirmation. Existing request, if any, is locked first.
        transfers.findByOrderIdForUpdate(orderId);
        Order order=orders.findByIdForUpdate(orderId).orElseThrow();
        record(event,invoice,txId,checksum,amount);
        var receipt=jdbc.queryForMap("SELECT status,immutable_checksum FROM sepay_gateway_events WHERE event_key=? FOR UPDATE",event);
        if(!checksum.equals(receipt.get("immutable_checksum"))) throw new ApiException(ErrorCode.CONFLICT,"IPN trùng ID nhưng dữ liệu đã thay đổi");
        if("APPLIED".equals(receipt.get("status"))) return;
        if(amount!=order.getTotalAmount()||!currency.equals(order.getCurrency())) {finish(event,"REVIEW","AMOUNT_MISMATCH");return;}
        if(order.isPaid()) {finish(event,"REVIEW","ORDER_ALREADY_PAID");return;}
        if(!List.of(OrderStatus.PENDING,OrderStatus.AWAITING_PAYMENT,OrderStatus.EXPIRED).contains(order.getStatus())) {finish(event,"REVIEW","ORDER_NOT_PAYABLE");return;}
        if(paidAt.isBefore(order.getCreatedAt().minusSeconds(5))||paidAt.isAfter(Instant.now().plusSeconds(300))
                ||order.getExpiresAt()==null||paidAt.isAfter(order.getExpiresAt())) {finish(event,"REVIEW","PAYMENT_OUTSIDE_ORDER_WINDOW");return;}
        var used=jdbc.queryForList("SELECT invoice FROM sepay_gateway_orders WHERE provider_transaction_id=?",txId);
        if(!used.isEmpty()&&!invoice.equals(used.get(0).get("invoice"))) {finish(event,"REVIEW","TRANSACTION_ALREADY_USED");return;}
        // Unique DB constraint protects the same provider transaction even across concurrent different orders.
        jdbc.update("UPDATE sepay_gateway_orders SET provider_transaction_id=? WHERE invoice=?",txId,invoice);
        PaymentTransaction payment=payments.findById((String)binding.get("payment_id")).orElseThrow();
        if(!orderId.equals(payment.getOrderId())||!PROVIDER.equals(payment.getProvider())) throw bad("Giao dịch không thuộc đơn");
        payment.markSuccess(txId);payment.setCompletedAt(paidAt);payment.setProviderOrderId(remote.path("order_id").asText());
        order.markPaid();order.setPaidAt(paidAt);
        activation.activateForPaidOrder(order);
        audit.record(null,"SEPAY_GATEWAY_PAYMENT_CONFIRMED","ORDER",orderId,null,Map.of("invoice",invoice,"transactionId",txId,"amount",amount));
        finish(event,"APPLIED",null);
    }
    private Order owned(String userId,String orderId,boolean lock) {
        Order order=(lock?orders.findByIdForUpdate(orderId):orders.findById(orderId)).orElseThrow(()->ApiException.notFound("Order",orderId));
        if(!order.getUserId().equals(userId)) throw ApiException.forbidden("Đơn hàng không thuộc người dùng");
        return order;
    }
    private void record(String event,String invoice,String txId,String checksum,long amount) {
        jdbc.update("INSERT INTO sepay_gateway_events(event_key,invoice,transaction_id,immutable_checksum,amount,status,received_at) VALUES(?,?,?,?,?,'RECEIVED',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE event_key=event_key",event,invoice,txId,checksum,amount);
    }
    private void finish(String event,String status,String reason) {
        jdbc.update("UPDATE sepay_gateway_events SET status=?,reason=?,processed_at=UTC_TIMESTAMP() WHERE event_key=?",status,reason,event);
    }
    private long money(JsonNode field) {
        try {long amount=new BigDecimal(field.asText()).longValueExact();if(amount<=0) throw new IllegalArgumentException();return amount;}
        catch(Exception ex) {throw bad("Số tiền IPN không hợp lệ");}
    }
    private Instant paymentTime(String value) {
        try {return LocalDateTime.parse(value,DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss").withResolverStyle(java.time.format.ResolverStyle.STRICT)).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();}
        catch(Exception ex) {throw bad("Thời điểm thanh toán IPN không hợp lệ");}
    }
    private ApiException bad(String message) {return new ApiException(ErrorCode.VALIDATION_FAILED,message);}
}
