package vn.weconex.aptis.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.weconex.aptis.billing.domain.BankTransferRequest;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.repository.BankAccountRepository;
import vn.weconex.aptis.billing.repository.BankTransferRequestRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;
import vn.weconex.aptis.common.websocket.AdminEventPublisher;
import vn.weconex.aptis.platform.audit.AuditService;

@Service
@Slf4j
@RequiredArgsConstructor
public class SepayWebhookService {
    private static final Pattern CODE = Pattern.compile("(?<![A-Z0-9])(?:AP[1-9][0-9]{7}|[1-9][0-9]{7})(?![A-Z0-9])");
    private final SepaySettingsService settings;
    private final SepayWebhookAuth authentication;
    private final ObjectMapper json;
    private final JdbcTemplate jdbc;
    private final BankTransferRequestRepository transfers;
    private final BankAccountRepository banks;
    private final OrderRepository orders;
    private final PaymentTransactionRepository payments;
    private final SubscriptionActivationService activation;
    private final AuditService audit;
    private final AdminEventPublisher adminEvents;

    @Transactional(timeout = 20)
    public void receive(byte[] raw, Map<String,String> headers) {
        var cfg = settings.settings();
        if (cfg.secretCiphertext() == null) throw unavailable();
        authentication.verify(cfg, settings.secret(cfg), raw, headers);
        if (raw.length > 32768) throw bad("Payload SePay quá lớn");
        JsonNode data;
        try { data = json.readTree(raw); }
        catch (Exception ex) { throw bad("Payload SePay không phải JSON hợp lệ"); }
        if (data == null || !data.isObject() || !data.path("id").isIntegralNumber()
                || !data.path("id").canConvertToLong() || data.path("id").longValue() < 0) throw bad("ID giao dịch SePay không hợp lệ");
        long id = data.path("id").longValue();
        // Dashboard 'Gửi thử' uses id=0. It must never activate a real order.
        if (id == 0) return;
        if (!cfg.enabled()) throw unavailable();
        String direction = requiredText(data, "transferType", 10);
        String gateway = requiredText(data, "gateway", 100);
        String account = requiredText(data, "accountNumber", 100);
        JsonNode memo = data.path("content");
        if (!memo.isTextual() || memo.textValue().length() > 2000) throw bad("Trường SePay không hợp lệ: content");
        String content = memo.textValue();
        if (!data.path("transferAmount").isIntegralNumber() || !data.path("transferAmount").canConvertToLong()
                || data.path("transferAmount").longValue() <= 0) throw bad("Số tiền giao dịch SePay không hợp lệ");
        long amount = data.path("transferAmount").longValue();
        Instant transactionAt;
        try { transactionAt = LocalDateTime.parse(requiredText(data,"transactionDate", 30),
                DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss").withResolverStyle(java.time.format.ResolverStyle.STRICT))
                .atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant(); }
        catch (Exception ex) { throw bad("Thời gian giao dịch SePay không hợp lệ"); }
        String reference = data.path("referenceCode").asText("").strip();
        if (reference.length() > 100) throw bad("Mã tham chiếu SePay quá dài");
        String referenceKey = reference.isBlank() ? null : hash(
                bankIdentity(gateway) + "|" + account + "|" + reference.toUpperCase(Locale.ROOT));
        String checksum = hash(raw);
        jdbc.update("""
                INSERT INTO sepay_transactions(event_id,reference_key,reference_code,payload_checksum,payload_json,
                    amount,status,transaction_at,received_at)
                VALUES(?,?,?,?,?,?,'RECEIVED',?,UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE event_id=event_id
                """, id, referenceKey, reference, checksum, new String(raw,StandardCharsets.UTF_8), amount,
                java.sql.Timestamp.from(transactionAt));
        List<Map<String,Object>> saved = jdbc.queryForList("SELECT event_id,payload_checksum,status FROM sepay_transactions WHERE event_id=? FOR UPDATE", id);
        // Same bank reference, different event ID: the original receipt owns it.
        if (saved.isEmpty()) return;
        if (!checksum.equals(saved.get(0).get("payload_checksum"))) throw new ApiException(ErrorCode.CONFLICT, "ID SePay trùng nhưng nội dung đã thay đổi");
        String previous = (String)saved.get(0).get("status");
        if ("APPLIED".equals(previous) || "IGNORED".equals(previous)) return;
        if (reference.toUpperCase(Locale.ROOT).startsWith("SB") || data.path("subAccount").asText("").startsWith("SBSEPAY")) {
            finish(id,"IGNORED","SANDBOX_TRANSACTION",null,null); return;
        }
        if (!"in".equals(direction)) { finish(id,"IGNORED","NOT_INCOMING",null,null); return; }
        var receiver = cfg.bankAccountId() == null ? null : banks.findById(cfg.bankAccountId()).orElse(null);
        if (receiver == null || !receiver.isActive() || !receiver.getAccountNumber().strip().equals(account)
                || !bankIdentity(receiver.getBankCode()).equals(bankIdentity(gateway))) {
            finish(id,"REVIEW","BANK_ACCOUNT_MISMATCH",null,null); return;
        }
        String code = extractCode(content, data.path("code").asText(""));
        if (code == null) { finish(id,"REVIEW","MISSING_OR_AMBIGUOUS_CODE",null,null); return; }
        List<String> matches = jdbc.query("SELECT transfer_request_id FROM bank_transfer_codes WHERE transfer_code=?",
                (row, index)->row.getString(1), code);
        if (matches.isEmpty()) { finish(id,"REVIEW","UNKNOWN_TRANSFER_CODE",code,null); return; }
        BankTransferRequest request = transfers.findByIdForUpdate(matches.get(0)).orElseThrow();
        var order = orders.findByIdForUpdate(request.getOrderId()).orElseThrow();
        if (!request.getBankAccountId().equals(receiver.getId())) {
            finish(id,"REVIEW","ORDER_BANK_MISMATCH",code,order.getId()); return;
        }
        if (amount != order.getTotalAmount() || amount != request.getAmount() || !"VND".equals(order.getCurrency())) {
            finish(id,"REVIEW","AMOUNT_MISMATCH",code,order.getId()); return;
        }
        if (order.isPaid() || request.getStatus() == BankTransferRequest.TransferStatus.CONFIRMED) {
            finish(id,"REVIEW","ORDER_ALREADY_PAID",code,order.getId()); return;
        }
        if (request.getStatus() == BankTransferRequest.TransferStatus.REJECTED
                || !List.of(OrderStatus.PENDING,OrderStatus.AWAITING_PAYMENT,OrderStatus.EXPIRED).contains(order.getStatus())) {
            finish(id,"REVIEW","ORDER_NOT_PAYABLE",code,order.getId()); return;
        }
        Instant issuedAt = jdbc.queryForObject("SELECT issued_at FROM bank_transfer_codes WHERE transfer_code=?",
                (row, index) -> row.getTimestamp(1, java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))).toInstant(), code);
        // SePay/bank timestamps can be rounded down to the start of the minute. Keep a
        // one-minute allowance before QR issuance so a valid same-minute transfer is not
        // rejected, while still rejecting older transfers and enforcing exact code/amount.
        if (transactionAt.isBefore(issuedAt.minusSeconds(60)) || transactionAt.isAfter(Instant.now().plusSeconds(300))
                || (order.getExpiresAt()!=null && transactionAt.isAfter(order.getExpiresAt()))) {
            finish(id,"REVIEW","TRANSACTION_OUTSIDE_ORDER_WINDOW",code,order.getId()); return;
        }
        PaymentTransaction payment = new PaymentTransaction();
        payment.setOrderId(order.getId()); payment.setProvider("sepay"); payment.setProviderTransactionId(String.valueOf(id));
        payment.setStatus(PaymentStatus.SUCCESS); payment.setAmount(amount); payment.setCurrency("VND");
        payment.setIdempotencyKey("sepay-" + id); payment.setCompletedAt(transactionAt);
        payment.setRawResponseJson(new String(raw,StandardCharsets.UTF_8)); payments.save(payment);
        order.markPaid(); order.setPaidAt(transactionAt);
        request.confirm(null, amount, "Tự xác nhận SePay; giao dịch " + id + (reference.isBlank()?"":"; tham chiếu " + reference));
        activation.activateForPaidOrder(order);
        audit.record(null,"SEPAY_PAYMENT_CONFIRMED","ORDER",order.getId(),null,
                Map.of("eventId",id,"amount",amount,"transferCode",code));
        finish(id,"APPLIED",null,code,order.getId());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { adminEvents.publishBankTransferConfirmed(request.getId(),code,order.getOrderCode(),amount); }
                catch (Exception ex) { log.warn("Không gửi được thông báo SePay cho admin; giao dịch {} đã commit",id); }
            }
        });
    }

    public static String extractCode(String content, String detected) {
        var matcher = CODE.matcher(content.toUpperCase(Locale.ROOT));
        List<String> codes = new ArrayList<>();
        while (matcher.find()) if (!codes.contains(matcher.group())) codes.add(matcher.group());
        if (codes.size() != 1) return null;
        String candidate = codes.get(0), providerCode = detected == null ? "" : detected.strip().toUpperCase(Locale.ROOT);
        return providerCode.isEmpty() || candidate.equals(providerCode) ? candidate : null;
    }
    private void finish(long id,String status,String reason,String code,String orderId) {
        jdbc.update("UPDATE sepay_transactions SET status=?,reason=?,transfer_code=?,order_id=?,processed_at=UTC_TIMESTAMP() WHERE event_id=?",
                status,reason,code,orderId,id);
    }
    private static String bankIdentity(String bank) {
        String bin = VietQrGenerator.binOf(bank);
        return bin != null ? bin : bank.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }
    private String requiredText(JsonNode node,String name,int max) {
        JsonNode field=node.path(name);
        if (!field.isTextual() || field.textValue().isBlank() || field.textValue().length()>max) throw bad("Trường SePay không hợp lệ: " + name);
        return field.textValue().strip();
    }
    private static String hash(String value) { return hash(value.getBytes(StandardCharsets.UTF_8)); }
    private static String hash(byte[] value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value)); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
    private ApiException bad(String message) { return new ApiException(ErrorCode.VALIDATION_FAILED,message); }
    private ApiException unavailable() { return new ApiException(ErrorCode.SERVICE_UNAVAILABLE,"Chưa bật nhận thanh toán SePay"); }
}
