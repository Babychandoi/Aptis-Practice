-- =====================================================================
-- V5 : Gói dịch vụ, subscription, entitlement, dùng thử
-- Quyền Premium thực tế được xác định bằng user_entitlements,
-- KHÔNG dùng một cột users.is_premium.
-- =====================================================================

CREATE TABLE subscription_plans (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,

    billing_type ENUM('ONE_TIME', 'RECURRING') NOT NULL DEFAULT 'ONE_TIME',

    -- NULL = trọn đời
    duration_days INT NULL,
    price_amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',

    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',

    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_subscription_plans_code (code),
    KEY idx_subscription_plans_status (status, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE plan_features (
    id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    feature_code VARCHAR(100) NOT NULL,
    feature_value VARCHAR(500) NULL,
    display_name VARCHAR(255) NULL,
    display_order INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uk_plan_features (plan_id, feature_code),

    CONSTRAINT fk_plan_features_plan
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_subscriptions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,

    status ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REVOKED')
        NOT NULL DEFAULT 'PENDING',

    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,

    -- FK về orders được thêm ở V6 (orders chưa tồn tại ở bước này)
    source_order_id CHAR(36) NULL,
    activated_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    revoked_at DATETIME NULL,
    revoke_reason VARCHAR(500) NULL,

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_user_subscriptions_active (user_id, status, starts_at, ends_at),
    KEY idx_user_subscriptions_expiry (status, ends_at),
    KEY idx_user_subscriptions_plan (plan_id),
    KEY idx_user_subscriptions_order (source_order_id),

    CONSTRAINT fk_user_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_subscriptions_plan
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Bảng quyền thực tế dùng khi kiểm tra truy cập.
-- ends_at NULL = vĩnh viễn. revoked_at NOT NULL = đã thu hồi.
CREATE TABLE user_entitlements (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    entitlement_code VARCHAR(100) NOT NULL,

    source_type ENUM('SUBSCRIPTION', 'PROMOTION', 'ADMIN_GRANT', 'TRIAL') NOT NULL,
    source_id CHAR(36) NULL,

    starts_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    revoked_at DATETIME NULL,

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_entitlements_check (
        user_id,
        entitlement_code,
        revoked_at,
        starts_at,
        ends_at
    ),
    KEY idx_entitlements_source (source_type, source_id),

    CONSTRAINT fk_user_entitlements_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trial_campaigns (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_days INT NOT NULL,
    max_uses_per_user INT NOT NULL DEFAULT 1,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_trial_campaigns_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_trials (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_user_trials_active (user_id, status, starts_at, ends_at),
    KEY idx_user_trials_campaign (campaign_id),

    CONSTRAINT fk_user_trials_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_trials_campaign
        FOREIGN KEY (campaign_id) REFERENCES trial_campaigns (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
