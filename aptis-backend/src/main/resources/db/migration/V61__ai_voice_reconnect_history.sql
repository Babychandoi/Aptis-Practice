-- A transport reconnect keeps the same billed room and its complete ordered text archive.
ALTER TABLE ai_conversation_sessions
    ADD COLUMN voice VARCHAR(30) NOT NULL DEFAULT 'Aoede',
    ADD COLUMN history_json LONGTEXT NULL,
    ADD COLUMN history_revision BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN connection_prompt LONGTEXT NULL,
    ADD COLUMN memory_context LONGTEXT NULL;

ALTER TABLE ai_conversation_turns
    ADD COLUMN client_turn_id VARCHAR(100) NULL,
    ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;
