-- Chương trình giới thiệu (affiliate) hai chiều.
--
-- Người đã mua ít nhất một đơn được cấp mã giới thiệu. Ai nhập mã đó lúc thanh
-- toán thì được giảm giá, còn chủ mã ăn hoa hồng. Hoa hồng chỉ được ghi nhận
-- khi đơn chuyển PAID (admin xác nhận trong đối soát), và chỉ rút được sau khi
-- admin duyệt yêu cầu rút.
--
-- Tiền để đơn vị VND nguyên (bigint), không dùng số thập phân — khớp với
-- orders.total_amount và tránh sai số cộng dồn.

-- Tỉ lệ hoa hồng / giảm giá để trong bảng cấu hình chứ không hard-code: đây là
-- con số thương mại, đổi thường xuyên mà không nên phải sửa code và deploy lại.
CREATE TABLE affiliate_settings (
    id                      TINYINT      NOT NULL DEFAULT 1,
    commission_percent      INT          NOT NULL DEFAULT 10,
    discount_percent        INT          NOT NULL DEFAULT 5,
    -- true: chủ mã ăn hoa hồng mọi đơn về sau của người được giới thiệu.
    -- false: chỉ ăn đơn đầu tiên.
    recurring               TINYINT(1)   NOT NULL DEFAULT 1,
    -- Hoa hồng tính trên giá gốc (trước giảm) hay số tiền thực thu.
    commission_on_gross     TINYINT(1)   NOT NULL DEFAULT 1,
    min_payout_amount       BIGINT       NOT NULL DEFAULT 100000,
    -- Số ngày giữ hoa hồng ở trạng thái PENDING trước khi cho rút. 0 = rút ngay.
    hold_days               INT          NOT NULL DEFAULT 0,
    enabled                 TINYINT(1)   NOT NULL DEFAULT 1,
    updated_at              DATETIME     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_affiliate_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO affiliate_settings (id, updated_at) VALUES (1, NOW());

-- Mã giới thiệu của từng người. Mỗi người tối đa một mã.
CREATE TABLE affiliate_accounts (
    id              CHAR(36)     NOT NULL,
    user_id         CHAR(36)     NOT NULL,
    code            VARCHAR(32)  NOT NULL,
    status          ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    -- Cộng dồn để khỏi phải SUM cả bảng mỗi lần mở trang; vẫn đối chiếu được
    -- với affiliate_commissions khi cần.
    total_earned    BIGINT       NOT NULL DEFAULT 0,
    total_paid      BIGINT       NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_affiliate_accounts_user (user_id),
    UNIQUE KEY uk_affiliate_accounts_code (code),
    CONSTRAINT fk_affiliate_accounts_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ai giới thiệu ai. Ghi ngay lúc đặt đơn có mã, giữ vĩnh viễn để còn tính hoa
-- hồng cho các đơn gia hạn về sau.
CREATE TABLE affiliate_referrals (
    id                  CHAR(36)   NOT NULL,
    affiliate_user_id   CHAR(36)   NOT NULL,
    referred_user_id    CHAR(36)   NOT NULL,
    first_order_id      CHAR(36)   NULL,
    created_at          DATETIME   NOT NULL,
    PRIMARY KEY (id),
    -- Mỗi người chỉ thuộc về một người giới thiệu, ai gắn trước thì giữ.
    UNIQUE KEY uk_affiliate_referrals_referred (referred_user_id),
    KEY idx_affiliate_referrals_affiliate (affiliate_user_id),
    CONSTRAINT fk_affiliate_referrals_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES users (id),
    CONSTRAINT fk_affiliate_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users (id),
    CONSTRAINT fk_affiliate_referrals_order FOREIGN KEY (first_order_id) REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hoa hồng từng đơn.
CREATE TABLE affiliate_commissions (
    id                  CHAR(36)   NOT NULL,
    affiliate_user_id   CHAR(36)   NOT NULL,
    referred_user_id    CHAR(36)   NOT NULL,
    order_id            CHAR(36)   NOT NULL,
    -- Chụp lại tỉ lệ lúc phát sinh: đổi cấu hình sau này không được làm thay
    -- đổi số tiền của hoa hồng đã ghi nhận.
    commission_percent  INT        NOT NULL,
    base_amount         BIGINT     NOT NULL,
    amount              BIGINT     NOT NULL,
    -- PENDING: đơn đã PAID nhưng còn trong thời gian giữ.
    -- AVAILABLE: rút được. LOCKED: đã nằm trong một yêu cầu rút.
    -- PAID: đã chi trả. CANCELLED: đơn bị hoàn/hủy sau đó.
    status              ENUM('PENDING','AVAILABLE','LOCKED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
    payout_id           CHAR(36)   NULL,
    available_at        DATETIME   NULL,
    created_at          DATETIME   NOT NULL,
    updated_at          DATETIME   NOT NULL,
    PRIMARY KEY (id),
    -- Một đơn chỉ sinh hoa hồng một lần, kể cả khi admin bấm xác nhận hai lần.
    UNIQUE KEY uk_affiliate_commissions_order (order_id),
    KEY idx_affiliate_commissions_affiliate (affiliate_user_id, status),
    KEY idx_affiliate_commissions_payout (payout_id),
    CONSTRAINT fk_affiliate_commissions_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES users (id),
    CONSTRAINT fk_affiliate_commissions_referred FOREIGN KEY (referred_user_id) REFERENCES users (id),
    CONSTRAINT fk_affiliate_commissions_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Yêu cầu rút tiền, admin duyệt thủ công rồi chuyển khoản.
CREATE TABLE affiliate_payouts (
    id                  CHAR(36)     NOT NULL,
    affiliate_user_id   CHAR(36)     NOT NULL,
    amount              BIGINT       NOT NULL,
    status              ENUM('REQUESTED','APPROVED','REJECTED','PAID') NOT NULL DEFAULT 'REQUESTED',
    -- Thông tin nhận tiền do người rút tự khai, chụp lại tại thời điểm yêu cầu
    -- vì họ có thể đổi tài khoản sau đó.
    bank_name           VARCHAR(255) NOT NULL,
    bank_account_number VARCHAR(64)  NOT NULL,
    bank_account_name   VARCHAR(255) NOT NULL,
    note                VARCHAR(500) NULL,
    admin_note          VARCHAR(500) NULL,
    reviewed_by         CHAR(36)     NULL,
    reviewed_at         DATETIME     NULL,
    paid_at             DATETIME     NULL,
    created_at          DATETIME     NOT NULL,
    updated_at          DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_affiliate_payouts_status (status, created_at),
    KEY idx_affiliate_payouts_affiliate (affiliate_user_id, created_at),
    CONSTRAINT fk_affiliate_payouts_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES users (id),
    CONSTRAINT fk_affiliate_payouts_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE affiliate_commissions
    ADD CONSTRAINT fk_affiliate_commissions_payout
    FOREIGN KEY (payout_id) REFERENCES affiliate_payouts (id);

-- Mã giới thiệu dùng lúc đặt đơn. Tách khỏi promotion_code_id vì hai thứ khác
-- bản chất: mã khuyến mãi là chiến dịch của admin, mã giới thiệu gắn với một
-- người dùng cụ thể và kéo theo hoa hồng.
ALTER TABLE orders
    ADD COLUMN affiliate_code VARCHAR(32) NULL AFTER promotion_code_id,
    ADD COLUMN affiliate_user_id CHAR(36) NULL AFTER affiliate_code,
    ADD KEY idx_orders_affiliate (affiliate_user_id),
    ADD CONSTRAINT fk_orders_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES users (id);

INSERT INTO permissions (id, code, name, description) VALUES
    (UUID(), 'affiliate:read', 'Xem giới thiệu', 'Xem danh sách giới thiệu và hoa hồng'),
    (UUID(), 'affiliate:manage', 'Quản lý giới thiệu', 'Duyệt yêu cầu rút tiền, chỉnh cấu hình hoa hồng');

-- Kế toán xem được, quản trị thì duyệt được.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('FINANCE','ADMIN','SUPER_ADMIN') AND p.code = 'affiliate:read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ADMIN','SUPER_ADMIN') AND p.code = 'affiliate:manage';
