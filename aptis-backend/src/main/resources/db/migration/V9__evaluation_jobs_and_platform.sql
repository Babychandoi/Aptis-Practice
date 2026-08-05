-- =====================================================================
-- V9 : Chấm AI, import/export job, audit log, outbox
-- Nội dung chấm chi tiết nằm ở MongoDB (evaluation_documents).
-- =====================================================================

CREATE TABLE evaluation_jobs (
    id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    attempt_question_set_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,

    evaluation_type ENUM(
        'SPEAKING_AI',
        'WRITING_AI',
        'SPEAKING_TEACHER',
        'WRITING_TEACHER'
    ) NOT NULL,

    status ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')
        NOT NULL DEFAULT 'QUEUED',

    -- evaluation_documents._id ở MongoDB
    mongo_evaluation_document_id VARCHAR(100) NULL,

    -- Chống tạo trùng job cho cùng một bài đã nộp
    idempotency_key VARCHAR(255) NOT NULL,

    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,

    queued_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_evaluation_jobs_idempotency (idempotency_key),
    KEY idx_evaluation_jobs_queue (status, queued_at),
    KEY idx_evaluation_jobs_attempt (attempt_id, status),
    KEY idx_evaluation_jobs_user (user_id, queued_at),
    KEY idx_evaluation_jobs_aqs (attempt_question_set_id),
    KEY idx_evaluation_jobs_question (question_set_id),

    CONSTRAINT fk_evaluation_jobs_attempt
        FOREIGN KEY (attempt_id) REFERENCES test_attempts (id),
    CONSTRAINT fk_evaluation_jobs_aqs
        FOREIGN KEY (attempt_question_set_id) REFERENCES attempt_question_sets (id),
    CONSTRAINT fk_evaluation_jobs_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id),
    CONSTRAINT fk_evaluation_jobs_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Điểm tổng hợp của một lần chấm. is_final = TRUE là điểm được dùng.
-- Giáo viên có thể chấm lại và ghi đè kết quả AI.
CREATE TABLE evaluation_summaries (
    id CHAR(36) NOT NULL,
    evaluation_job_id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,

    evaluator_type ENUM('AI', 'TEACHER', 'MODERATOR') NOT NULL,
    evaluator_user_id CHAR(36) NULL,

    total_score DECIMAL(8, 2) NULL,
    max_score DECIMAL(8, 2) NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,

    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_evaluation_final (attempt_id, question_set_id, is_final),
    KEY idx_evaluation_summaries_job (evaluation_job_id),

    CONSTRAINT fk_evaluation_summaries_job
        FOREIGN KEY (evaluation_job_id) REFERENCES evaluation_jobs (id),
    CONSTRAINT fk_evaluation_summaries_attempt
        FOREIGN KEY (attempt_id) REFERENCES test_attempts (id),
    CONSTRAINT fk_evaluation_summaries_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id),
    CONSTRAINT fk_evaluation_summaries_evaluator
        FOREIGN KEY (evaluator_user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Import câu hỏi từ Excel/ZIP (API /admin/import-jobs)
CREATE TABLE import_jobs (
    id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    source_asset_id CHAR(36) NOT NULL,

    import_type ENUM('QUESTION_SET_EXCEL', 'ASSET_ZIP') NOT NULL,
    status ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED')
        NOT NULL DEFAULT 'QUEUED',

    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    error_report_asset_id CHAR(36) NULL,
    error_message TEXT NULL,

    queued_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,

    PRIMARY KEY (id),
    KEY idx_import_jobs_status (status, queued_at),
    KEY idx_import_jobs_creator (created_by, queued_at),
    KEY idx_import_jobs_source (source_asset_id),
    KEY idx_import_jobs_report (error_report_asset_id),

    CONSTRAINT fk_import_jobs_creator
        FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_import_jobs_source
        FOREIGN KEY (source_asset_id) REFERENCES assets (id),
    CONSTRAINT fk_import_jobs_report
        FOREIGN KEY (error_report_asset_id) REFERENCES assets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE export_jobs (
    id CHAR(36) NOT NULL,
    requested_by CHAR(36) NOT NULL,

    export_type ENUM('LEARNING_REPORT', 'REVENUE_REPORT', 'ATTEMPT_DETAIL', 'USER_LIST')
        NOT NULL,
    params_json JSON NULL,

    status ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')
        NOT NULL DEFAULT 'QUEUED',

    result_asset_id CHAR(36) NULL,
    error_message TEXT NULL,

    queued_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    expires_at DATETIME NULL,

    PRIMARY KEY (id),
    KEY idx_export_jobs_status (status, queued_at),
    KEY idx_export_jobs_requester (requested_by, queued_at),
    KEY idx_export_jobs_result (result_asset_id),

    CONSTRAINT fk_export_jobs_requester
        FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT fk_export_jobs_result
        FOREIGN KEY (result_asset_id) REFERENCES assets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
    id CHAR(36) NOT NULL,
    actor_user_id CHAR(36) NULL,

    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id CHAR(36) NULL,

    before_json JSON NULL,
    after_json JSON NULL,

    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(1000) NULL,

    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_audit_resource (resource_type, resource_id, created_at),
    KEY idx_audit_actor (actor_user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Outbox pattern: thay cho distributed transaction MySQL <-> MongoDB
CREATE TABLE outbox_events (
    id CHAR(36) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id CHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload_json JSON NOT NULL,

    status ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')
        NOT NULL DEFAULT 'PENDING',

    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    available_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    published_at DATETIME NULL,

    PRIMARY KEY (id),
    KEY idx_outbox_pending (status, available_at),
    KEY idx_outbox_aggregate (aggregate_type, aggregate_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
