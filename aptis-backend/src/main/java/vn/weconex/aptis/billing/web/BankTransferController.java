package vn.weconex.aptis.billing.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.billing.domain.BankAccount;
import vn.weconex.aptis.billing.domain.BankTransferRequest;
import vn.weconex.aptis.billing.repository.BankAccountRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.service.BankTransferService;
import vn.weconex.aptis.billing.service.VietQrGenerator;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;

/**
 * Thanh toán chuyển khoản thủ công — phía học viên.
 *
 * <p>Không có bước nào ở đây mở quyền Premium: học viên chỉ nhận thông tin
 * chuyển tiền và tự báo đã chuyển. Quyền chỉ mở khi quản trị xác nhận.
 */
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class BankTransferController {

    private final BankTransferService transferService;
    private final BankAccountRepository bankAccountRepository;
    private final OrderRepository orderRepository;
    private final VietQrGenerator qrGenerator;
    private final CurrentUser currentUser;

    /** Lấy thông tin chuyển khoản; gọi lại trả đúng mã cũ, không sinh mã mới. */
    @PostMapping("/{orderId}/bank-transfer")
    @Transactional
    public BankTransferDtos.TransferInstructionResponse createOrGet(
            @PathVariable String orderId) {

        BankTransferRequest request =
                transferService.requestTransfer(currentUser.requireUserId(), orderId);
        return toInstruction(request);
    }

    @GetMapping("/{orderId}/bank-transfer")
    @Transactional(readOnly = true)
    public BankTransferDtos.TransferInstructionResponse get(@PathVariable String orderId) {
        return toInstruction(transferService.ofOrder(currentUser.requireUserId(), orderId));
    }

    /**
     * Học viên báo đã chuyển tiền. Chỉ chuyển trạng thái sang CLAIMED và báo
     * quản trị — không mở quyền.
     */
    @PostMapping("/{orderId}/bank-transfer/claim")
    @Transactional
    public BankTransferDtos.TransferInstructionResponse claim(
            @PathVariable String orderId,
            @Valid @RequestBody(required = false) BankTransferDtos.ClaimTransferRequest body) {

        BankTransferRequest request = transferService.claimTransferred(
                currentUser.requireUserId(), orderId, body == null ? null : body.note());
        return toInstruction(request);
    }

    /** Tạo mã QR 10 phút mới sau khi mã trước đã hết hạn. */
    @PostMapping("/{orderId}/bank-transfer/refresh")
    @Transactional
    public BankTransferDtos.TransferInstructionResponse refresh(@PathVariable String orderId) {
        return toInstruction(transferService.refreshQr(
                currentUser.requireUserId(), orderId));
    }

    // -----------------------------------------------------------------

    private BankTransferDtos.TransferInstructionResponse toInstruction(
            BankTransferRequest request) {

        BankAccount account = bankAccountRepository.findById(request.getBankAccountId())
                .orElseThrow(() -> ApiException.notFound(
                        "BankAccount", request.getBankAccountId()));

        String orderCode = orderRepository.findById(request.getOrderId())
                .map(order -> order.getOrderCode())
                .orElse(null);

        // QR kèm sẵn số tiền và mã nội dung để học viên không phải gõ tay
        String qrContent = qrGenerator.generate(
                account.getBankCode(),
                account.getAccountNumber(),
                request.getAmount(),
                request.getTransferCode());

        return BankTransferDtos.TransferInstructionResponse.of(
                request, account, orderCode, qrContent);
    }
}
