CREATE TABLE gemini_live_providers (
    id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    project_id VARCHAR(120) NULL,
    encrypted_api_key TEXT NOT NULL,
    key_suffix VARCHAR(8) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    max_concurrent INT NOT NULL DEFAULT 10,
    consecutive_failures INT NOT NULL DEFAULT 0,
    last_success_at DATETIME NULL,
    last_error_at DATETIME NULL,
    last_error VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_gemini_provider_name (name),
    KEY idx_gemini_provider_routing (enabled, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE ai_conversation_sessions
    ADD COLUMN provider_id CHAR(36) NULL AFTER model,
    ADD KEY idx_ai_conversation_provider (provider_id, status, expires_at),
    ADD CONSTRAINT fk_ai_conversation_provider FOREIGN KEY (provider_id)
        REFERENCES gemini_live_providers (id);
