-- =====================================================================
-- V6 : Đơn hàng, thanh toán, webhook, hoàn tiền, mã giảm giá
-- Mọi thao tác tạo order / payment phải có idempotency_key.
-- Chỉ kích hoạt Premium khi webhook hoặc API đối soát xác nhận thành công.
-- =====================================================================

CREATE TABLE orders (
    id CHAR(36) NOT NULL,
    order_code VARCHAR(50) NOT NULL,
    user_id CHAR(36) NOT NULL,

    status ENUM(
        'PENDING',
        'AWAITING_PAYMENT',
        'PAID',
        'CANCELLED',
        'EXPIRED',
        'REFUNDED',
        'PARTIALLY_REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    subtotal_amount BIGINT NOT NULL,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',

    promotion_code_id CHAR(36) NULL,

    idempotency_key VARCHAR(255) NOT NULL,
    expires_at DATETIME NULL,
    paid_at DATETIME NULL,
    cancelled_at DATETIME NULL,

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_code (order_code),
    UNIQUE KEY uk_orders_idempotency (idempotency_key),
    KEY idx_orders_user_status (user_id, status, created_at),
    KEY idx_orders_expiry (status, expires_at),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE user_subscriptions
    ADD CONSTRAINT fk_user_subscriptions_order
        FOREIGN KEY (source_order_id) REFERENCES orders (id);

CREATE TABLE order_items (
    id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    item_type ENUM('SUBSCRIPTION_PLAN') NOT NULL,
    item_id CHAR(36) NOT NULL,

    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL,

    metadata_json JSON NULL,

    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_item (item_type, item_id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE payment_transactions (
    id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,

    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255) NULL,
    provider_order_id VARCHAR(255) NULL,

    status ENUM(
        'INITIATED',
        'PENDING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'INITIATED',

    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',

    idempotency_key VARCHAR(255) NOT NULL,
    payment_url TEXT NULL,

    initiated_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    failed_at DATETIME NULL,

    error_code VARCHAR(100) NULL,
    error_message VARCHAR(1000) NULL,

    -- Lưu raw để đối soát; không log thông tin nhạy cảm ra file log
    raw_request_json JSON NULL,
    raw_response_json JSON NULL,

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_idempotency (idempotency_key),
    KEY idx_payment_order (order_id, status),
    KEY idx_payment_provider_transaction (provider, provider_transaction_id),

    CONSTRAINT fk_payment_transactions_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- UNIQUE (provider, provider_event_id) đảm bảo webhook idempotent.
-- provider_event_id NULL được MySQL cho phép trùng, service phải fallback
-- sang checksum payload khi provider không gửi event id.
CREATE TABLE payment_webhook_events (
    id CHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NULL,
    payload_checksum VARCHAR(128) NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,

    event_type VARCHAR(100) NULL,
    payload_json JSON NOT NULL,

    processing_status ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED')
        NOT NULL DEFAULT 'RECEIVED',

    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    received_at DATETIME NOT NULL,
    processed_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_webhook_provider_event (provider, provider_event_id),
    UNIQUE KEY uk_webhook_provider_checksum (provider, payload_checksum),
    KEY idx_webhook_status (processing_status, received_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE refunds (
    id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    payment_transaction_id CHAR(36) NOT NULL,

    amount BIGINT NOT NULL,
    reason VARCHAR(1000) NULL,

    status ENUM('REQUESTED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED')
        NOT NULL DEFAULT 'REQUESTED',

    provider_refund_id VARCHAR(255) NULL,
    requested_by CHAR(36) NULL,
    requested_at DATETIME NOT NULL,
    completed_at DATETIME NULL,

    PRIMARY KEY (id),
    KEY idx_refunds_order (order_id, status),
    KEY idx_refunds_payment (payment_transaction_id),

    CONSTRAINT fk_refunds_order
        FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_refunds_payment
        FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions (id),
    CONSTRAINT fk_refunds_requested_by
        FOREIGN KEY (requested_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE promotion_codes (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,

    discount_type ENUM('FIXED_AMOUNT', 'PERCENTAGE') NOT NULL,
    -- FIXED_AMOUNT: số đồng. PERCENTAGE: giá trị 1-100.
    discount_value BIGINT NOT NULL,

    max_discount_amount BIGINT NULL,
    min_order_amount BIGINT NULL,
    max_total_uses INT NULL,
    max_uses_per_user INT NULL,
    total_used_count INT NOT NULL DEFAULT 0,

    starts_at DATETIME NULL,
    ends_at DATETIME NULL,

    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ENDED') NOT NULL DEFAULT 'DRAFT',

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_promotion_codes_code (code),
    KEY idx_promotion_codes_status (status, starts_at, ends_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_promotion
        FOREIGN KEY (promotion_code_id) REFERENCES promotion_codes (id);

CREATE TABLE promotion_redemptions (
    id CHAR(36) NOT NULL,
    promotion_code_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    discount_amount BIGINT NOT NULL,
    redeemed_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    -- Một order chỉ redeem một lần cho cùng một mã
    UNIQUE KEY uk_redemptions_order_code (order_id, promotion_code_id),
    KEY idx_redemptions_user (promotion_code_id, user_id),

    CONSTRAINT fk_redemptions_promotion
        FOREIGN KEY (promotion_code_id) REFERENCES promotion_codes (id),
    CONSTRAINT fk_redemptions_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_redemptions_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
