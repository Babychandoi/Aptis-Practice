CREATE TABLE sepay_gateway_orders (
    invoice VARCHAR(48) COLLATE utf8mb4_0900_bin NOT NULL PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    payment_id CHAR(36) NOT NULL,
    merchant_fingerprint CHAR(64) NOT NULL,
    provider_transaction_id VARCHAR(100) COLLATE utf8mb4_0900_bin NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_sepay_gateway_order(order_id),
    UNIQUE KEY uk_sepay_gateway_transaction(provider_transaction_id),
    CONSTRAINT fk_sepay_gateway_order FOREIGN KEY(order_id) REFERENCES orders(id),
    CONSTRAINT fk_sepay_gateway_payment FOREIGN KEY(payment_id) REFERENCES payment_transactions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sepay_gateway_events (
    event_key VARCHAR(160) COLLATE utf8mb4_0900_bin NOT NULL PRIMARY KEY,
    invoice VARCHAR(48) COLLATE utf8mb4_0900_bin NOT NULL,
    transaction_id VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL,
    immutable_checksum CHAR(64) NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL,
    reason VARCHAR(100) NULL,
    received_at DATETIME NOT NULL,
    processed_at DATETIME NULL,
    KEY idx_sepay_gateway_events_received(received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
