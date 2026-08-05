package vn.weconex.aptis.billing.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.Timestamps;

/**
 * Yêu cầu chuyển khoản thủ công cho một đơn hàng.
 *
 * <p>Học viên chuyển tiền kèm {@code transferCode} trong nội dung, rồi tự báo
 * đã chuyển. Quản trị đối soát sao kê ngân hàng và xác nhận — hệ thống KHÔNG tự
 * biết tiền đã về, {@code CLAIMED} chỉ là lời khai của học viên.
 */
@Entity
@Table(name = "bank_transfer_requests")
@Getter
@Setter
@NoArgsConstructor
public class BankTransferRequest {

    public enum TransferStatus {
        /** Đã sinh mã, chờ học viên chuyển tiền */
        PENDING,
        /** Học viên báo đã chuyển, chờ quản trị đối soát */
        CLAIMED,
        /** Quản trị xác nhận đã nhận tiền */
        CONFIRMED,
        /** Quản trị từ chối (không thấy tiền, sai số tiền...) */
        REJECTED,
        /** Quá hạn đơn hàng mà chưa xác nhận */
        EXPIRED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "order_id", columnDefinition = "CHAR(36)", nullable = false)
    private String orderId;

    @Column(name = "bank_account_id", columnDefinition = "CHAR(36)", nullable = false)
    private String bankAccountId;

    @Column(name = "transfer_code", length = 8, nullable = false)
    private String transferCode;

    @Column(name = "amount", nullable = false)
    private long amount;

    @Column(name = "currency", length = 10, nullable = false)
    private String currency = "VND";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private TransferStatus status = TransferStatus.PENDING;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    @Column(name = "claim_note", length = 1000)
    private String claimNote;

    @Column(name = "confirmed_by", columnDefinition = "CHAR(36)")
    private String confirmedBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "confirmed_amount")
    private Long confirmedAmount;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "expires_at")
    private Instant expiresAt;

    /** Hạn riêng của mã QR; ngắn hơn hạn đơn hàng và được gia hạn khi tạo QR mới. */
    @Column(name = "qr_expires_at")
    private Instant qrExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public static BankTransferRequest create(
            String orderId,
            String bankAccountId,
            String transferCode,
            long amount,
            String currency,
            Instant expiresAt) {

        BankTransferRequest request = new BankTransferRequest();
        request.orderId = orderId;
        request.bankAccountId = bankAccountId;
        request.transferCode = transferCode;
        request.amount = amount;
        request.currency = currency == null ? "VND" : currency;
        // Cột DATETIME làm tròn mili giây; cắt xuống giây để so sánh hạn không lệch
        request.expiresAt = Timestamps.floorToSecond(expiresAt);
        request.qrExpiresAt = Timestamps.nowFloored().plusSeconds(10 * 60L);
        return request;
    }

    /** Trạng thái cuối — không đổi được nữa. */
    public boolean isFinal() {
        return status == TransferStatus.CONFIRMED
                || status == TransferStatus.REJECTED
                || status == TransferStatus.EXPIRED;
    }

    public void markClaimed(String note) {
        this.status = TransferStatus.CLAIMED;
        this.claimedAt = Timestamps.nowFloored();
        this.claimNote = note;
    }

    public boolean isQrExpired() {
        return qrExpiresAt == null || !qrExpiresAt.isAfter(Instant.now());
    }

    /** Vô hiệu mã cũ và bắt đầu một cửa sổ QR 10 phút mới. */
    public void refreshQr(String newTransferCode) {
        this.transferCode = newTransferCode;
        this.qrExpiresAt = Timestamps.nowFloored().plusSeconds(10 * 60L);
    }

    public void confirm(String actorId, Long receivedAmount, String note) {
        this.status = TransferStatus.CONFIRMED;
        this.confirmedBy = actorId;
        this.confirmedAt = Timestamps.nowFloored();
        this.confirmedAmount = receivedAmount == null ? this.amount : receivedAmount;
        this.adminNote = note;
    }

    public void reject(String actorId, String note) {
        this.status = TransferStatus.REJECTED;
        this.confirmedBy = actorId;
        this.confirmedAt = Timestamps.nowFloored();
        this.adminNote = note;
    }

    public void markExpired() {
        this.status = TransferStatus.EXPIRED;
    }
}
