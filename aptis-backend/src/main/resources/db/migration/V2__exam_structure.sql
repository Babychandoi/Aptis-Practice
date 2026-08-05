-- =====================================================================
-- V2 : Cấu trúc kỳ thi
-- Exam Product -> Exam Version -> Component -> Part
-- =====================================================================

CREATE TABLE exam_products (
    id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_exam_products_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE exam_versions (
    id CHAR(36) NOT NULL,
    exam_product_id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_exam_versions_code (code),
    KEY idx_exam_versions_product (exam_product_id, status),

    CONSTRAINT fk_exam_versions_product
        FOREIGN KEY (exam_product_id) REFERENCES exam_products (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- GRAMMAR_VOCABULARY / READING / LISTENING / SPEAKING / WRITING
CREATE TABLE components (
    id CHAR(36) NOT NULL,
    exam_version_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    display_order INT NOT NULL,
    duration_seconds INT NULL,
    max_score DECIMAL(8, 2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_components_version_code (exam_version_id, code),
    KEY idx_components_version_order (exam_version_id, display_order),

    CONSTRAINT fk_components_exam_version
        FOREIGN KEY (exam_version_id) REFERENCES exam_versions (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE parts (
    id CHAR(36) NOT NULL,
    component_id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    instructions TEXT NULL,
    display_order INT NOT NULL,
    default_duration_seconds INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_parts_component_code (component_id, code),
    KEY idx_parts_component_order (component_id, display_order),

    CONSTRAINT fk_parts_component
        FOREIGN KEY (component_id) REFERENCES components (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- renderer_key / validator_key trỏ tới implementation ở backend & frontend
CREATE TABLE task_types (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    renderer_key VARCHAR(100) NOT NULL,
    validator_key VARCHAR(100) NULL,
    response_type VARCHAR(50) NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_task_types_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE topics (
    id CHAR(36) NOT NULL,
    parent_id CHAR(36) NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_topics_code (code),
    KEY idx_topics_parent (parent_id),

    CONSTRAINT fk_topics_parent
        FOREIGN KEY (parent_id) REFERENCES topics (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tags (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_tags_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
