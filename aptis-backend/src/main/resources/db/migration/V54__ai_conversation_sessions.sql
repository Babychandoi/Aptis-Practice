CREATE TABLE ai_conversation_sessions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    cefr_level VARCHAR(4) NOT NULL,
    model VARCHAR(120) NOT NULL,
    started_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    previous_session_id CHAR(36) NULL,
    summary JSON NULL,
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    error_message VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ai_conversation_user_status (user_id, status, expires_at),
    KEY idx_ai_conversation_previous (previous_session_id),
    CONSTRAINT fk_ai_conversation_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_ai_conversation_previous FOREIGN KEY (previous_session_id)
        REFERENCES ai_conversation_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
