-- =====================================================================
-- V3 : Asset metadata (file thật nằm ở MinIO)
-- Đặt sớm vì question_sets / evaluation / user recording đều tham chiếu
-- =====================================================================

CREATE TABLE assets (
    id CHAR(36) NOT NULL,

    bucket_name VARCHAR(100) NOT NULL,
    -- object_key dài, cần prefix index cho UNIQUE (giới hạn 3072 byte của InnoDB)
    object_key VARCHAR(1000) NOT NULL,

    asset_type ENUM(
        'IMAGE',
        'AUDIO',
        'VIDEO',
        'DOCUMENT',
        'USER_RECORDING',
        'AVATAR',
        'IMPORT_FILE',
        'EXPORT_FILE'
    ) NOT NULL,

    mime_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(500) NULL,
    file_size BIGINT NULL,
    checksum_sha256 VARCHAR(128) NULL,

    duration_ms BIGINT NULL,
    width INT NULL,
    height INT NULL,

    access_scope ENUM('PUBLIC', 'PRIVATE', 'SIGNED_URL')
        NOT NULL DEFAULT 'SIGNED_URL',

    status ENUM('UPLOADING', 'READY', 'FAILED', 'DELETED')
        NOT NULL DEFAULT 'UPLOADING',

    owner_user_id CHAR(36) NULL,

    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_assets_bucket_object (bucket_name, object_key(600)),
    KEY idx_assets_owner (owner_user_id, asset_type),
    KEY idx_assets_status (status, created_at),

    CONSTRAINT fk_assets_owner
        FOREIGN KEY (owner_user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
