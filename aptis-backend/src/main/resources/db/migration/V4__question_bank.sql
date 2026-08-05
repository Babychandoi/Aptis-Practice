-- =====================================================================
-- V4 : Metadata ngân hàng câu hỏi
-- Nội dung chi tiết nằm ở MongoDB (question_set_documents)
-- MySQL là nguồn quyết định câu hỏi có xuất hiện cho học viên hay không
-- =====================================================================

CREATE TABLE question_sets (
    id CHAR(36) NOT NULL,
    part_id CHAR(36) NOT NULL,
    task_type_id CHAR(36) NOT NULL,
    topic_id CHAR(36) NULL,

    code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NULL,

    difficulty TINYINT NULL,
    cefr_min ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,
    cefr_max ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2') NULL,

    access_level ENUM('FREE', 'PREMIUM') NOT NULL DEFAULT 'PREMIUM',

    status ENUM(
        'DRAFT',
        'IN_REVIEW',
        'PUBLISHED',
        'SUSPENDED',
        'ARCHIVED'
    ) NOT NULL DEFAULT 'DRAFT',

    -- Mongo dùng questionSetId làm _id, cột này chỉ để đối soát/kiểm tra
    current_revision INT NOT NULL DEFAULT 1,
    content_checksum VARCHAR(128) NULL,

    item_count INT NOT NULL DEFAULT 0,
    estimated_seconds INT NULL,
    max_score DECIMAL(8, 2) NOT NULL DEFAULT 1,
    published_at DATETIME NULL,

    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_question_sets_code (code),

    -- Index chính cho luồng chọn câu hỏi ở PHẦN IX
    KEY idx_question_sets_filter (part_id, status, access_level, difficulty),
    KEY idx_question_sets_topic (topic_id),
    KEY idx_question_sets_task_type (task_type_id),

    CONSTRAINT fk_question_sets_part
        FOREIGN KEY (part_id) REFERENCES parts (id),
    CONSTRAINT fk_question_sets_task_type
        FOREIGN KEY (task_type_id) REFERENCES task_types (id),
    CONSTRAINT fk_question_sets_topic
        FOREIGN KEY (topic_id) REFERENCES topics (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE question_set_tags (
    question_set_id CHAR(36) NOT NULL,
    tag_id CHAR(36) NOT NULL,

    PRIMARY KEY (question_set_id, tag_id),
    KEY idx_question_set_tags_tag (tag_id),

    CONSTRAINT fk_question_set_tags_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id),
    CONSTRAINT fk_question_set_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Liên kết asset dùng trong một bộ câu hỏi.
-- Mongo cũng có mảng assets[], bảng này để truy vấn ngược "asset đang dùng ở đâu"
-- và để validate trạng thái READY trước khi publish.
CREATE TABLE question_set_assets (
    question_set_id CHAR(36) NOT NULL,
    asset_id CHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,

    PRIMARY KEY (question_set_id, asset_id, role),
    KEY idx_question_set_assets_asset (asset_id),

    CONSTRAINT fk_question_set_assets_question
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id),
    CONSTRAINT fk_question_set_assets_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Ghi đè quyền truy cập theo chiến dịch hoặc theo từng học viên.
-- user_id NULL = áp dụng cho mọi học viên.
CREATE TABLE content_access_overrides (
    id CHAR(36) NOT NULL,
    resource_type ENUM('QUESTION_SET', 'COMPONENT', 'PART', 'MOCK_TEST') NOT NULL,
    resource_id CHAR(36) NOT NULL,
    access_level ENUM('FREE', 'PREMIUM') NOT NULL,

    user_id CHAR(36) NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    reason VARCHAR(500) NULL,

    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_content_access_resource (resource_type, resource_id, starts_at, ends_at),
    KEY idx_content_access_user (user_id, starts_at, ends_at),

    CONSTRAINT fk_content_access_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
