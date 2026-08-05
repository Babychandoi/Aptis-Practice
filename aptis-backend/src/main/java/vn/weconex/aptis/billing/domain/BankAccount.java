package vn.weconex.aptis.billing.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tài khoản ngân hàng nhận tiền chuyển khoản.
 *
 * <p>Quản trị khai báo thông tin thật rồi bật {@code isActive}. Bản ghi seed để
 * tắt sẵn: bật một tài khoản với số tài khoản mẫu thì tiền của học viên bay đi
 * đâu không biết.
 */
@Entity
@Table(name = "bank_accounts")
@Getter
@Setter
@NoArgsConstructor
public class BankAccount {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    /** Mã ngân hàng theo chuẩn VietQR (VCB, TCB, MB...) — cần để sinh mã QR. */
    @Column(name = "bank_code", length = 20, nullable = false)
    private String bankCode;

    @Column(name = "bank_name", length = 255, nullable = false)
    private String bankName;

    @Column(name = "account_number", length = 50, nullable = false)
    private String accountNumber;

    @Column(name = "account_holder", length = 255, nullable = false)
    private String accountHolder;

    /** Ảnh QR tĩnh tải lên; để trống thì sinh QR động theo số tiền. */
    @Column(name = "qr_asset_id", columnDefinition = "CHAR(36)")
    private String qrAssetId;

    @Column(name = "transfer_note", length = 500)
    private String transferNote;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

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
}
