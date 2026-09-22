ALTER TABLE ai_conversation_sessions
    ADD COLUMN connect_latency_ms BIGINT NULL AFTER output_tokens,
    ADD COLUMN reconnect_count INT NOT NULL DEFAULT 0 AFTER connect_latency_ms,
    ADD COLUMN disconnect_count INT NOT NULL DEFAULT 0 AFTER reconnect_count,
    ADD COLUMN rate_limit_count INT NOT NULL DEFAULT 0 AFTER disconnect_count;

-- Giai đoạn benchmark đầu chỉ cho 10-25 phiên/project.
UPDATE gemini_live_providers SET max_concurrent = 10 WHERE max_concurrent < 10;
UPDATE gemini_live_providers SET max_concurrent = 25 WHERE max_concurrent > 25;
