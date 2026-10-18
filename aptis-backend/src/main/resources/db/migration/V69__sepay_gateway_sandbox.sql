-- Sandbox invoices intentionally have no FK/link to real orders or subscriptions.
CREATE TABLE sepay_sandbox_orders (
    invoice VARCHAR(64) NOT NULL PRIMARY KEY,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_by CHAR(36) NOT NULL,
    provider_order_id VARCHAR(100) NULL,
    ipn_count INT NOT NULL DEFAULT 0,
    ipn_received_at DATETIME NULL,
    api_verified_at DATETIME NULL,
    message VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_sepay_sandbox_creator FOREIGN KEY(created_by) REFERENCES users(id),
    KEY idx_sepay_sandbox_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
