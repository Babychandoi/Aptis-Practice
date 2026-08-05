-- =====================================================================
-- V7 : Blueprint đề thi, lượt làm bài, điểm số
-- Snapshot nội dung nằm ở MongoDB (attempt_documents).
-- MySQL giữ metadata + điểm tổng hợp để báo cáo và truy vấn nhanh.
-- =====================================================================

CREATE TABLE test_blueprints (
    id CHAR(36) NOT NULL,
    exam_version_id CHAR(36) NOT NULL,
    component_id CHAR(36) NULL,

    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,

    mode ENUM('PART_PRACTICE', 'CUSTOM_PRACTICE', 'MOCK_TEST') NOT NULL,
    access_level ENUM('FREE', 'PREMIUM') NOT NULL DEFAULT 'PREMIUM',

    duration_seconds INT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_test_blueprints_code (code),
    KEY idx_test_blueprints_listing (exam_version_id, mode, status, access_level),
    KEY idx_test_blueprints_component (component_id),

    CONSTRAINT fk_test_blueprints_exam_version
        FOREIGN KEY (exam_version_id) REFERENCES exam_versions (id),
    CONSTRAINT fk_test_blueprints_component
        FOREIGN KEY (component_id) REFERENCES components (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE blueprint_part_rules (
    id CHAR(36) NOT NULL,
    blueprint_id CHAR(36) NOT NULL,
    part_id CHAR(36) NOT NULL,

    question_set_count INT NOT NULL,
    difficulty_min TINYINT NULL,
    difficulty_max TINYINT NULL,

    selection_strategy ENUM('RANDOM', 'NEW_FIRST', 'WEAK_FIRST', 'FIXED')
        NOT NULL DEFAULT 'RANDOM',

    allow_free_content BOOLEAN NOT NULL DEFAULT TRUE,
    allow_premium_content BOOLEAN NOT NULL DEFAULT TRUE,

    config_json JSON NULL,
    display_order INT NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_blueprint_rules_order (blueprint_id, display_order),
    KEY idx_blueprint_rules_part (part_id),

    CONSTRAINT fk_blueprint_rules_blueprint
        FOREIGN KEY (blueprint_id) REFERENCES test_blueprints (id),
    CONSTRAINT fk_blueprint_rules_part
        FOREIGN KEY (part_id) REFERENCES parts (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Dùng khi selection_strategy = FIXED
CREATE TABLE blueprint_fixed_question_sets (
    blueprint_rule_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    display_order INT NOT NULL,

    PRIMARY KEY (blueprint_rule_id, question_set_id),
    KEY idx_blueprint_fixed_question (question_set_id),

    CONSTRAINT fk_blueprint_fixed_rule
        FOREIGN KEY (blueprint_rule_id) REFERENCES blueprint_part_rules (id),
    CONSTRAINT fk_blueprint_fixed_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE test_attempts (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,

    blueprint_id CHAR(36) NULL,
    component_id CHAR(36) NULL,
    part_id CHAR(36) NULL,

    mode ENUM('PART_PRACTICE', 'CUSTOM_PRACTICE', 'MOCK_TEST') NOT NULL,
    access_level_used ENUM('FREE', 'PREMIUM') NOT NULL,

    status ENUM(
        'CREATED',
        'IN_PROGRESS',
        'SUBMITTED',
        'SCORING',
        'COMPLETED',
        'EXPIRED',
        'ABANDONED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'CREATED',

    started_at DATETIME NULL,
    submitted_at DATETIME NULL,
    completed_at DATETIME NULL,
    expires_at DATETIME NULL,

    duration_seconds INT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,

    raw_score DECIMAL(10, 2) NULL,
    max_score DECIMAL(10, 2) NULL,
    percentage_score DECIMAL(8, 4) NULL,
    scaled_score DECIMAL(10, 2) NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,

    total_items INT NOT NULL DEFAULT 0,
    answered_items INT NOT NULL DEFAULT 0,
    correct_items INT NOT NULL DEFAULT 0,
    incorrect_items INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_attempts_user_created (user_id, created_at),
    KEY idx_attempts_user_status (user_id, status),
    KEY idx_attempts_expiry (status, expires_at),
    KEY idx_attempts_blueprint (blueprint_id),
    KEY idx_attempts_part (part_id),
    KEY idx_attempts_component (component_id),

    CONSTRAINT fk_test_attempts_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_test_attempts_blueprint
        FOREIGN KEY (blueprint_id) REFERENCES test_blueprints (id),
    CONSTRAINT fk_test_attempts_component
        FOREIGN KEY (component_id) REFERENCES components (id),
    CONSTRAINT fk_test_attempts_part
        FOREIGN KEY (part_id) REFERENCES parts (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE attempt_question_sets (
    id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    question_revision INT NOT NULL,
    display_order INT NOT NULL,

    -- Trỏ tới phần tử tương ứng trong attempt_documents.questionSets[]
    mongo_snapshot_key VARCHAR(255) NOT NULL,

    max_score DECIMAL(8, 2) NOT NULL DEFAULT 1,
    awarded_score DECIMAL(8, 2) NULL,

    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'ANSWERED', 'SCORED', 'SKIPPED')
        NOT NULL DEFAULT 'NOT_STARTED',

    -- Kiểm soát maxAudioPlays (PHẦN IV §38.8)
    audio_play_count INT NOT NULL DEFAULT 0,

    started_at DATETIME NULL,
    answered_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_attempt_question_set_order (attempt_id, display_order),
    UNIQUE KEY uk_attempt_question_set_unique (attempt_id, question_set_id),
    KEY idx_attempt_question_sets_question (question_set_id),

    CONSTRAINT fk_attempt_question_sets_attempt
        FOREIGN KEY (attempt_id) REFERENCES test_attempts (id),
    CONSTRAINT fk_attempt_question_sets_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE attempt_component_scores (
    id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    component_id CHAR(36) NOT NULL,

    raw_score DECIMAL(10, 2) NULL,
    max_score DECIMAL(10, 2) NULL,
    percentage_score DECIMAL(8, 4) NULL,
    scaled_score DECIMAL(10, 2) NULL,
    cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_attempt_component_score (attempt_id, component_id),
    KEY idx_attempt_component_score_component (component_id),

    CONSTRAINT fk_attempt_component_scores_attempt
        FOREIGN KEY (attempt_id) REFERENCES test_attempts (id),
    CONSTRAINT fk_attempt_component_scores_component
        FOREIGN KEY (component_id) REFERENCES components (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE attempt_part_scores (
    id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    part_id CHAR(36) NOT NULL,

    raw_score DECIMAL(10, 2) NULL,
    max_score DECIMAL(10, 2) NULL,
    percentage_score DECIMAL(8, 4) NULL,

    total_items INT NOT NULL DEFAULT 0,
    correct_items INT NOT NULL DEFAULT 0,
    incorrect_items INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uk_attempt_part_score (attempt_id, part_id),
    KEY idx_attempt_part_score_part (part_id),

    CONSTRAINT fk_attempt_part_scores_attempt
        FOREIGN KEY (attempt_id) REFERENCES test_attempts (id),
    CONSTRAINT fk_attempt_part_scores_part
        FOREIGN KEY (part_id) REFERENCES parts (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- File ghi âm Speaking gắn với từng bộ câu hỏi trong attempt
CREATE TABLE attempt_recordings (
    id CHAR(36) NOT NULL,
    attempt_question_set_id CHAR(36) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    asset_id CHAR(36) NOT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    duration_ms BIGINT NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_attempt_recording (attempt_question_set_id, item_id, sequence_no),
    KEY idx_attempt_recordings_asset (asset_id),

    CONSTRAINT fk_attempt_recordings_aqs
        FOREIGN KEY (attempt_question_set_id) REFERENCES attempt_question_sets (id),
    CONSTRAINT fk_attempt_recordings_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
