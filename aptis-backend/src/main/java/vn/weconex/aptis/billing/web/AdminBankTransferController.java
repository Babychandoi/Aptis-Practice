package vn.weconex.aptis.billing.web;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.domain.BankAccount;
import vn.weconex.aptis.billing.domain.BankTransferRequest;
import vn.weconex.aptis.billing.repository.BankAccountRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.service.BankTransferService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;

/**
 * Đối soát chuyển khoản — phía quản trị.
 *
 * <p>Xác nhận ở đây là thao tác mở quyền Premium, nên yêu cầu quyền
 * {@code order:read} cộng {@code plan:write}: người chỉ xem đơn không được tự ý
 * kích hoạt gói cho tài khoản khác.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminBankTransferController {

    private final BankTransferService transferService;
    private final BankAccountRepository bankAccountRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    // ---------- Yêu cầu chuyển khoản ----------

    @GetMapping("/bank-transfers")
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public PageResponse<BankTransferDtos.AdminTransferResponse> search(
            @RequestParam(required = false) BankTransferRequest.TransferStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(
                transferService.search(status, PageRequest.of(page, Math.min(size, 100))),
                this::toResponse);
    }

    /** Tra theo mã đọc được trên sao kê ngân hàng. */
    @GetMapping("/bank-transfers/by-code/{transferCode}")
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public BankTransferDtos.AdminTransferResponse byCode(@PathVariable String transferCode) {
        return toResponse(transferService.findByCode(transferCode));
    }

    /**
     * Xác nhận đã nhận tiền — kích hoạt Premium ngay theo gói trong đơn.
     */
    @PostMapping("/bank-transfers/{transferId}/confirm")
    @PreAuthorize("hasAuthority('plan:write')")
    public BankTransferDtos.AdminTransferResponse confirm(
            @PathVariable String transferId,
            @Valid @RequestBody(required = false)
            BankTransferDtos.ConfirmTransferRequest body) {

        BankTransferRequest request = transferService.confirmReceived(
                currentUser.requireUserId(),
                transferId,
                body == null ? null : body.receivedAmount(),
                body == null ? null : body.note());

        return toResponse(request);
    }

    @PostMapping("/bank-transfers/{transferId}/reject")
    @PreAuthorize("hasAuthority('plan:write')")
    public BankTransferDtos.AdminTransferResponse reject(
            @PathVariable String transferId,
            @Valid @RequestBody(required = false)
            BankTransferDtos.RejectTransferRequest body) {

        return toResponse(transferService.reject(
                currentUser.requireUserId(), transferId, body == null ? null : body.reason()));
    }

    // ---------- Tài khoản ngân hàng ----------

    @GetMapping("/bank-accounts")
    @PreAuthorize("hasAuthority('plan:write')")
    public List<BankTransferDtos.BankAccountResponse> accounts() {
        return bankAccountRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(BankTransferDtos.BankAccountResponse::from)
                .toList();
    }

    @PostMapping("/bank-accounts")
    @PreAuthorize("hasAuthority('plan:write')")
    @Transactional
    public BankTransferDtos.BankAccountResponse create(
            @Valid @RequestBody BankTransferDtos.SaveBankAccountRequest request) {

        BankAccount account = new BankAccount();
        apply(account, request);
        account.setCreatedBy(currentUser.requireUserId());
        return BankTransferDtos.BankAccountResponse.from(bankAccountRepository.save(account));
    }

    @PatchMapping("/bank-accounts/{accountId}")
    @PreAuthorize("hasAuthority('plan:write')")
    @Transactional
    public BankTransferDtos.BankAccountResponse update(
            @PathVariable String accountId,
            @Valid @RequestBody BankTransferDtos.SaveBankAccountRequest request) {

        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("BankAccount", accountId));

        apply(account, request);
        return BankTransferDtos.BankAccountResponse.from(account);
    }

    // -----------------------------------------------------------------

    private static void apply(
            BankAccount account, BankTransferDtos.SaveBankAccountRequest request) {

        account.setBankCode(request.bankCode().strip().toUpperCase(java.util.Locale.ROOT));
        account.setBankName(request.bankName().strip());
        account.setAccountNumber(request.accountNumber().strip());
        account.setAccountHolder(request.accountHolder().strip());
        account.setQrAssetId(request.qrAssetId());
        account.setTransferNote(request.transferNote());
        if (request.active() != null) {
            account.setActive(request.active());
        }
        if (request.displayOrder() != null) {
            account.setDisplayOrder(request.displayOrder());
        }
    }

    private BankTransferDtos.AdminTransferResponse toResponse(BankTransferRequest request) {
        var order = orderRepository.findById(request.getOrderId()).orElse(null);
        String email = order == null
                ? null
                : userRepository.findById(order.getUserId())
                        .map(user -> user.getEmail())
                        .orElse(null);

        return new BankTransferDtos.AdminTransferResponse(
                request.getId(),
                request.getOrderId(),
                order == null ? null : order.getOrderCode(),
                email,
                request.getTransferCode(),
                request.getAmount(),
                request.getCurrency(),
                request.getStatus().name(),
                request.getClaimNote(),
                request.getAdminNote(),
                request.getConfirmedAmount(),
                request.getClaimedAt(),
                request.getConfirmedAt(),
                request.getExpiresAt(),
                request.getCreatedAt());
    }
}
