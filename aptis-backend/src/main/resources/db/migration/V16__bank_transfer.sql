-- Thanh toán chuyển khoản thủ công: học viên chuyển tiền kèm mã nội dung,
-- quản trị đối soát tay rồi xác nhận.
--
-- Không thay thế cổng thanh toán tự động — hai đường tồn tại song song, đều
-- kết thúc bằng cùng một luồng kích hoạt subscription.

-- ---------------------------------------------------------------------
-- Tài khoản ngân hàng nhận tiền
-- ---------------------------------------------------------------------
CREATE TABLE bank_accounts (
    id                CHAR(36)     NOT NULL,
    bank_code         VARCHAR(20)  NOT NULL COMMENT 'Mã ngân hàng theo chuẩn VietQR, vd VCB, TCB',
    bank_name         VARCHAR(255) NOT NULL,
    account_number    VARCHAR(50)  NOT NULL,
    account_holder    VARCHAR(255) NOT NULL,
    -- Ảnh QR tĩnh do quản trị tải lên; để trống thì sinh QR động theo VietQR
    qr_asset_id       CHAR(36)     NULL,
    transfer_note     VARCHAR(500) NULL COMMENT 'Ghi chú thêm hiển thị cho học viên',
    is_active         BOOLEAN      NOT NULL DEFAULT FALSE,
    display_order     INT          NOT NULL DEFAULT 0,
    created_by        CHAR(36)     NULL,
    created_at        DATETIME     NOT NULL,
    updated_at        DATETIME     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_bank_accounts_qr FOREIGN KEY (qr_asset_id) REFERENCES assets (id),
    INDEX idx_bank_accounts_active (is_active, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Yêu cầu chuyển khoản gắn với đơn hàng
-- ---------------------------------------------------------------------
CREATE TABLE bank_transfer_requests (
    id                CHAR(36)     NOT NULL,
    order_id          CHAR(36)     NOT NULL,
    bank_account_id   CHAR(36)     NOT NULL,

    -- Mã 8 chữ số học viên phải ghi trong nội dung chuyển khoản. UNIQUE để
    -- không bao giờ có hai đơn cùng mã — đó là thứ duy nhất dùng để đối soát.
    transfer_code     VARCHAR(8)   NOT NULL,

    -- Chốt số tiền tại thời điểm tạo yêu cầu. Không đọc lại từ orders lúc xác
    -- nhận: giá gói có thể đã đổi, phải đối chiếu đúng số học viên đã thấy.
    amount            BIGINT       NOT NULL,
    currency          VARCHAR(10)  NOT NULL DEFAULT 'VND',

    status            ENUM('PENDING','CLAIMED','CONFIRMED','REJECTED','EXPIRED')
                      NOT NULL DEFAULT 'PENDING',

    -- Học viên tự báo đã chuyển; chưa phải bằng chứng, chỉ để quản trị biết
    -- đơn nào cần đối soát.
    claimed_at        DATETIME     NULL,
    claim_note        VARCHAR(1000) NULL,

    confirmed_by      CHAR(36)     NULL,
    confirmed_at      DATETIME     NULL,
    -- Số tiền thực nhận, có thể lệch số yêu cầu (chuyển thiếu/thừa)
    confirmed_amount  BIGINT       NULL,
    admin_note        VARCHAR(1000) NULL,

    expires_at        DATETIME     NULL COMMENT 'Chết theo hạn đơn hàng',
    created_at        DATETIME     NOT NULL,
    updated_at        DATETIME     NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_bank_transfer_code UNIQUE (transfer_code),
    -- Một đơn chỉ có một yêu cầu chuyển khoản: gọi lại API trả về cái cũ thay
    -- vì sinh mã mới, nếu không học viên chuyển theo mã cũ sẽ không khớp.
    CONSTRAINT uk_bank_transfer_order UNIQUE (order_id),
    CONSTRAINT fk_btr_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_btr_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id),
    INDEX idx_btr_status (status, created_at),
    INDEX idx_btr_claimed (status, claimed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Tài khoản mẫu (chưa kích hoạt — quản trị phải sửa thông tin thật rồi bật)
-- ---------------------------------------------------------------------
INSERT INTO bank_accounts
    (id, bank_code, bank_name, account_number, account_holder,
     transfer_note, is_active, display_order, created_at, updated_at)
VALUES
    ('1b000000-0000-4000-8000-000000000001', 'VCB', 'Vietcombank',
     '0000000000', 'NGUYEN VAN A',
     'Vui lòng ghi đúng mã nội dung chuyển khoản để hệ thống đối soát.',
     FALSE, 1, NOW(), NOW());
