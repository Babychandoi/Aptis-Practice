-- Credentials are encrypted; webhook receipts and original transfer codes survive retries.
ALTER TABLE bank_transfer_requests MODIFY transfer_code VARCHAR(32) NOT NULL;

CREATE TABLE sepay_settings (
    id TINYINT NOT NULL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account_id CHAR(36) NULL,
    auth_mode VARCHAR(16) NOT NULL DEFAULT 'HMAC',
    secret_ciphertext TEXT NULL,
    secret_last_four VARCHAR(4) NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_sepay_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO sepay_settings(id,updated_at) VALUES(1,UTC_TIMESTAMP());

CREATE TABLE bank_transfer_codes (
    transfer_code VARCHAR(32) NOT NULL PRIMARY KEY,
    transfer_request_id CHAR(36) NOT NULL,
    issued_at DATETIME NOT NULL,
    CONSTRAINT fk_transfer_code_request FOREIGN KEY(transfer_request_id) REFERENCES bank_transfer_requests(id),
    KEY idx_transfer_code_request(transfer_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO bank_transfer_codes(transfer_code,transfer_request_id,issued_at)
SELECT transfer_code,id,created_at FROM bank_transfer_requests;

CREATE TABLE sepay_transactions (
    event_id BIGINT NOT NULL PRIMARY KEY,
    reference_key VARCHAR(255) NULL,
    reference_code VARCHAR(100) NULL,
    payload_checksum CHAR(64) NOT NULL,
    payload_json JSON NOT NULL,
    amount BIGINT NOT NULL,
    transfer_code VARCHAR(32) NULL,
    order_id CHAR(36) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'RECEIVED',
    reason VARCHAR(255) NULL,
    transaction_at DATETIME NOT NULL,
    received_at DATETIME NOT NULL,
    processed_at DATETIME NULL,
    UNIQUE KEY uk_sepay_reference(reference_key),
    KEY idx_sepay_received(received_at),
    KEY idx_sepay_status(status,received_at),
    CONSTRAINT fk_sepay_order FOREIGN KEY(order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
