package vn.weconex.aptis.billing.web;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.billing.domain.BankAccount;
import vn.weconex.aptis.billing.domain.BankTransferRequest;

public final class BankTransferDtos {

    private BankTransferDtos() {
    }

    // ---------- Học viên ----------

    /**
     * Thông tin để học viên chuyển tiền.
     *
     * @param qrContent chuỗi QR theo chuẩn VietQR đã kèm số tiền và mã nội dung;
     *     null khi không xác định được BIN ngân hàng — khi đó hiện QR tĩnh hoặc
     *     để học viên nhập tay
     * @param qrAssetId ảnh QR tĩnh do quản trị tải lên, dùng khi qrContent null
     */
    public record TransferInstructionResponse(
            String id,
            String orderId,
            String orderCode,
            String transferCode,
            long amount,
            String currency,
            String status,
            String bankCode,
            String bankName,
            String accountNumber,
            String accountHolder,
            String transferNote,
            String qrContent,
            String qrAssetId,
            Instant qrExpiresAt,
            Instant expiresAt,
            Instant claimedAt) {

        public static TransferInstructionResponse of(
                BankTransferRequest request,
                BankAccount account,
                String orderCode,
                String qrContent) {

            return new TransferInstructionResponse(
                    request.getId(),
                    request.getOrderId(),
                    orderCode,
                    request.getTransferCode(),
                    request.getAmount(),
                    request.getCurrency(),
                    request.getStatus().name(),
                    account.getBankCode(),
                    account.getBankName(),
                    account.getAccountNumber(),
                    account.getAccountHolder(),
                    account.getTransferNote(),
                    qrContent,
                    account.getQrAssetId(),
                    request.getQrExpiresAt(),
                    request.getExpiresAt(),
                    request.getClaimedAt());
        }
    }

    public record ClaimTransferRequest(@Size(max = 1000) String note) {
    }

    // ---------- Quản trị ----------

    public record AdminTransferResponse(
            String id,
            String orderId,
            String orderCode,
            String userEmail,
            String transferCode,
            long amount,
            String currency,
            String status,
            String claimNote,
            String adminNote,
            Long confirmedAmount,
            Instant claimedAt,
            Instant confirmedAt,
            Instant expiresAt,
            Instant createdAt) {
    }

    /**
     * @param receivedAmount số tiền thực nhận; null = đúng bằng số yêu cầu
     */
    public record ConfirmTransferRequest(
            @Positive Long receivedAmount,
            @Size(max = 1000) String note) {
    }

    public record RejectTransferRequest(@Size(max = 1000) String reason) {
    }

    // ---------- Tài khoản ngân hàng ----------

    public record BankAccountResponse(
            String id,
            String bankCode,
            String bankName,
            String accountNumber,
            String accountHolder,
            String qrAssetId,
            String transferNote,
            boolean active,
            int displayOrder) {

        public static BankAccountResponse from(BankAccount account) {
            return new BankAccountResponse(
                    account.getId(),
                    account.getBankCode(),
                    account.getBankName(),
                    account.getAccountNumber(),
                    account.getAccountHolder(),
                    account.getQrAssetId(),
                    account.getTransferNote(),
                    account.isActive(),
                    account.getDisplayOrder());
        }
    }

    public record SaveBankAccountRequest(
            @NotBlank @Size(max = 20) String bankCode,
            @NotBlank @Size(max = 255) String bankName,
            @NotBlank @Size(max = 50) String accountNumber,
            @NotBlank @Size(max = 255) String accountHolder,
            String qrAssetId,
            @Size(max = 500) String transferNote,
            Boolean active,
            Integer displayOrder) {
    }
}
