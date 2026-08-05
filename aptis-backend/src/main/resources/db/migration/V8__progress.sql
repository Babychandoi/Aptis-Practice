-- =====================================================================
-- V8 : Tiến độ học tập
-- Cập nhật bởi worker sau khi chấm (queue: cập nhật thống kê).
-- =====================================================================

CREATE TABLE user_question_stats (
    user_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,

    attempt_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    incorrect_count INT NOT NULL DEFAULT 0,

    mastery_score DECIMAL(8, 4) NOT NULL DEFAULT 0,
    average_score DECIMAL(8, 4) NOT NULL DEFAULT 0,

    last_attempted_at DATETIME NULL,
    last_correct_at DATETIME NULL,
    last_incorrect_at DATETIME NULL,
    next_review_at DATETIME NULL,

    PRIMARY KEY (user_id, question_set_id),
    -- Phục vụ luồng "câu đến lịch ôn"
    KEY idx_user_question_review (user_id, next_review_at),
    -- Phục vụ trang "Câu đã sai"
    KEY idx_user_question_incorrect (user_id, incorrect_count, last_incorrect_at),
    KEY idx_user_question_mastery (user_id, mastery_score),
    KEY idx_user_question_question (question_set_id),

    CONSTRAINT fk_user_question_stats_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_question_stats_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_part_progress (
    user_id CHAR(36) NOT NULL,
    part_id CHAR(36) NOT NULL,

    total_attempts INT NOT NULL DEFAULT 0,
    completed_question_sets INT NOT NULL DEFAULT 0,
    mastery_score DECIMAL(8, 4) NOT NULL DEFAULT 0,
    average_score DECIMAL(8, 4) NOT NULL DEFAULT 0,
    study_seconds BIGINT NOT NULL DEFAULT 0,
    last_studied_at DATETIME NULL,

    PRIMARY KEY (user_id, part_id),
    KEY idx_user_part_progress_part (part_id),

    CONSTRAINT fk_user_part_progress_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_part_progress_part
        FOREIGN KEY (part_id) REFERENCES parts (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_component_progress (
    user_id CHAR(36) NOT NULL,
    component_id CHAR(36) NOT NULL,

    total_attempts INT NOT NULL DEFAULT 0,
    mastery_score DECIMAL(8, 4) NOT NULL DEFAULT 0,
    average_score DECIMAL(8, 4) NOT NULL DEFAULT 0,
    study_seconds BIGINT NOT NULL DEFAULT 0,
    estimated_cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,
    last_studied_at DATETIME NULL,

    PRIMARY KEY (user_id, component_id),
    KEY idx_user_component_progress_component (component_id),

    CONSTRAINT fk_user_component_progress_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_component_progress_component
        FOREIGN KEY (component_id) REFERENCES components (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_daily_learning_stats (
    user_id CHAR(36) NOT NULL,
    stat_date DATE NOT NULL,

    study_seconds INT NOT NULL DEFAULT 0,
    attempts_started INT NOT NULL DEFAULT 0,
    attempts_completed INT NOT NULL DEFAULT 0,
    answered_items INT NOT NULL DEFAULT 0,
    correct_items INT NOT NULL DEFAULT 0,

    PRIMARY KEY (user_id, stat_date),

    CONSTRAINT fk_user_daily_stats_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
