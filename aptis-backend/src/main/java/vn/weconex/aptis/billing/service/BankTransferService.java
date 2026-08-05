package vn.weconex.aptis.billing.service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BankAccount;
import vn.weconex.aptis.billing.domain.BankTransferRequest;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.PaymentTransaction;
import vn.weconex.aptis.billing.repository.BankAccountRepository;
import vn.weconex.aptis.billing.repository.BankTransferRequestRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.PaymentTransactionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.common.util.Enums.PaymentStatus;
import vn.weconex.aptis.platform.audit.AuditService;
import vn.weconex.aptis.platform.notification.NotificationSender;
import vn.weconex.aptis.platform.outbox.OutboxService;

/**
 * Thanh toán bằng chuyển khoản thủ công.
 *
 * <p>Hệ thống không đọc được sao kê ngân hàng nên không tự biết tiền đã về.
 * Luồng: sinh mã nội dung → học viên chuyển và tự báo → quản trị đối soát rồi
 * xác nhận → kích hoạt Premium qua đúng luồng thanh toán thường.
 *
 * <p>Trạng thái CLAIMED chỉ là lời khai của học viên, KHÔNG phải bằng chứng.
 * Chỉ CONFIRMED do quản trị đặt mới mở quyền.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BankTransferService {

    private static final String PROVIDER_CODE = "bank_transfer";

    /** Mã nội dung chuyển khoản: 8 chữ số, không bắt đầu bằng 0 cho dễ đọc. */
    private static final int CODE_MIN = 10_000_000;
    private static final int CODE_BOUND = 90_000_000;

    /** Số lần thử sinh mã trước khi bỏ cuộc. */
    private static final int MAX_CODE_ATTEMPTS = 20;

    private final BankAccountRepository bankAccountRepository;
    private final BankTransferRequestRepository transferRepository;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final SubscriptionActivationService activationService;
    private final NotificationSender notificationSender;
    private final AuditService auditService;
    private final OutboxService outboxService;

    /** Dùng SecureRandom: mã đoán được thì người khác chiếm được đơn chờ. */
    private final SecureRandom random = new SecureRandom();

    // -----------------------------------------------------------------
    // Học viên
    // -----------------------------------------------------------------

    /**
     * Lấy thông tin chuyển khoản cho đơn. Gọi lại trả về đúng bản ghi cũ —
     * sinh mã mới mỗi lần gọi thì học viên chuyển theo mã cũ sẽ không khớp.
     */
    @Transactional
    public BankTransferRequest requestTransfer(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("Order", orderId);
        }

        var existing = transferRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            return existing.get();
        }

        if (order.getStatus() != OrderStatus.PENDING
                && order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Đơn hàng không ở trạng thái chờ thanh toán",
                    Map.of("status", order.getStatus()));
        }

        BankAccount account = bankAccountRepository
                .findFirstByActiveTrueOrderByDisplayOrderAsc()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.CONFLICT,
                        "Chưa cấu hình tài khoản ngân hàng nhận tiền"));

        BankTransferRequest request = BankTransferRequest.create(
                orderId,
                account.getId(),
                generateUniqueCode(),
                order.getTotalAmount(),
                order.getCurrency(),
                // Mã chết theo hạn đơn: quá hạn thì đơn tự hủy, giữ mã sống
                // sẽ khiến học viên chuyển tiền vào đơn không còn hiệu lực.
                order.getExpiresAt());

        transferRepository.save(request);
        order.setStatus(OrderStatus.AWAITING_PAYMENT);

        log.info("Tạo yêu cầu chuyển khoản {} cho đơn {}",
                request.getTransferCode(), order.getOrderCode());
        return request;
    }

    /**
     * Học viên báo đã chuyển tiền. Chỉ đánh dấu để quản trị biết đơn nào cần
     * đối soát — không mở quyền gì.
     */
    @Transactional
    public BankTransferRequest claimTransferred(String userId, String orderId, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("Order", orderId);
        }

        BankTransferRequest request = transferRepository.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", orderId));

        if (request.getStatus() != BankTransferRequest.TransferStatus.PENDING) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Yêu cầu chuyển khoản không còn ở trạng thái chờ",
                    Map.of("status", request.getStatus()));
        }

        if (request.isQrExpired()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã QR đã hết hạn, vui lòng tạo mã mới trước khi chuyển khoản");
        }

        request.markClaimed(note);

        // Báo quản trị đối soát. Gửi qua outbox để lỗi SMTP không làm hỏng
        // thao tác của học viên.
        outboxService.publish(
                "BANK_TRANSFER", request.getId(), "BANK_TRANSFER_CLAIMED",
                Map.of("transferCode", request.getTransferCode(),
                        "orderCode", order.getOrderCode(),
                        "amount", request.getAmount(),
                        "userId", userId));

        log.info("Học viên báo đã chuyển khoản, mã {}", request.getTransferCode());
        return request;
    }

    /**
     * Sinh nội dung chuyển khoản mới sau khi QR 10 phút đã hết hạn.
     * Không đổi đơn hàng, số tiền hay tài khoản nhận.
     */
    @Transactional
    public BankTransferRequest refreshQr(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("Order", orderId);
        }
        if (!order.isPayable()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Đơn hàng không còn thanh toán được",
                    Map.of("status", order.getStatus()));
        }

        BankTransferRequest request = transferRepository.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", orderId));

        if (request.getStatus() != BankTransferRequest.TransferStatus.PENDING) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Không thể tạo lại QR cho yêu cầu đã báo chuyển hoặc đã xử lý",
                    Map.of("status", request.getStatus()));
        }
        if (!request.isQrExpired()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã QR hiện tại vẫn còn hiệu lực");
        }

        request.refreshQr(generateUniqueCode());
        log.info("Tạo lại QR chuyển khoản cho đơn {}, mã mới {}",
                order.getOrderCode(), request.getTransferCode());
        return request;
    }

    @Transactional(readOnly = true)
    public BankTransferRequest ofOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.notFound("Order", orderId);
        }
        return transferRepository.findByOrderId(orderId)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", orderId));
    }

    // -----------------------------------------------------------------
    // Quản trị
    // -----------------------------------------------------------------

    /**
     * Xác nhận đã nhận tiền: tạo payment transaction rồi kích hoạt subscription
     * qua đúng luồng thanh toán thường, để lịch sử đơn, hoàn tiền và báo cáo
     * doanh thu hoạt động y hệt như thanh toán qua cổng.
     */
    @Transactional
    public BankTransferRequest confirmReceived(
            String actorId, String transferId, Long receivedAmount, String note) {

        // Khóa: hai quản trị bấm cùng lúc không được kích hoạt hai lần
        BankTransferRequest request = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", transferId));

        if (request.isFinal()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Yêu cầu đã ở trạng thái cuối",
                    Map.of("status", request.getStatus()));
        }

        Order order = orderRepository.findByIdForUpdate(request.getOrderId())
                .orElseThrow(() -> ApiException.notFound("Order", request.getOrderId()));

        if (order.isPaid()) {
            // Đơn đã thanh toán bằng đường khác — chỉ chốt bản ghi, không kích
            // hoạt thêm lần nữa.
            request.confirm(actorId, receivedAmount, note);
            log.warn("Đơn {} đã PAID trước đó, không kích hoạt lại", order.getOrderCode());
            return request;
        }

        long amount = receivedAmount == null ? request.getAmount() : receivedAmount;

        PaymentTransaction payment = new PaymentTransaction();
        payment.setOrderId(order.getId());
        payment.setProvider(PROVIDER_CODE);
        // Mã nội dung chính là thứ dùng đối soát, lưu làm mã giao dịch
        payment.setProviderTransactionId(request.getTransferCode());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setAmount(amount);
        payment.setCurrency(request.getCurrency());
        payment.setIdempotencyKey("bank-transfer-" + request.getId());
        payment.setCompletedAt(java.time.Instant.now());
        paymentRepository.save(payment);

        order.markPaid();
        request.confirm(actorId, receivedAmount, note);

        activationService.activateForPaidOrder(order);

        auditService.record(actorId, "BANK_TRANSFER_CONFIRM", "ORDER", order.getId(),
                Map.of("status", OrderStatus.AWAITING_PAYMENT.name()),
                Map.of("transferCode", request.getTransferCode(),
                        "amount", amount,
                        "orderCode", order.getOrderCode()));

        log.info("Xác nhận chuyển khoản {} cho đơn {}, đã kích hoạt Premium",
                request.getTransferCode(), order.getOrderCode());
        return request;
    }

    @Transactional
    public BankTransferRequest reject(String actorId, String transferId, String note) {
        BankTransferRequest request = transferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", transferId));

        if (request.isFinal()) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Yêu cầu đã ở trạng thái cuối",
                    Map.of("status", request.getStatus()));
        }

        request.reject(actorId, note);
        auditService.record(actorId, "BANK_TRANSFER_REJECT", "BANK_TRANSFER", transferId,
                null, Map.of("reason", note == null ? "" : note));
        return request;
    }

    @Transactional(readOnly = true)
    public Page<BankTransferRequest> search(
            BankTransferRequest.TransferStatus status, Pageable pageable) {

        return status == null
                ? transferRepository.findAllByOrderByCreatedAtDesc(pageable)
                : transferRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    /** Đối soát tay: tra đơn theo mã nội dung đọc được trên sao kê. */
    @Transactional(readOnly = true)
    public BankTransferRequest findByCode(String transferCode) {
        return transferRepository.findByTransferCode(transferCode)
                .orElseThrow(() -> ApiException.notFound("BankTransferRequest", transferCode));
    }

    /** Đóng các yêu cầu quá hạn để không treo trong danh sách chờ đối soát. */
    @Transactional
    public int expireOverdue() {
        List<BankTransferRequest> overdue = transferRepository.findOverdue(
                List.of(BankTransferRequest.TransferStatus.PENDING,
                        BankTransferRequest.TransferStatus.CLAIMED),
                java.time.Instant.now());

        overdue.forEach(BankTransferRequest::markExpired);
        return overdue.size();
    }

    // -----------------------------------------------------------------

    /**
     * Sinh mã 8 chữ số chưa từng dùng.
     *
     * <p>Cột transfer_code có UNIQUE nên trùng cũng không hỏng dữ liệu, nhưng
     * kiểm tra trước để không ném lỗi ra người dùng. Không gian 90 triệu mã nên
     * đụng độ cực hiếm; vẫn giới hạn số lần thử để không lặp vô hạn nếu bảng
     * đầy bất thường.
     */
    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = String.valueOf(CODE_MIN + random.nextInt(CODE_BOUND));
            if (!transferRepository.existsByTransferCode(code)) {
                return code;
            }
        }
        throw new ApiException(
                ErrorCode.INTERNAL_ERROR, "Không sinh được mã chuyển khoản, thử lại sau");
    }
}
