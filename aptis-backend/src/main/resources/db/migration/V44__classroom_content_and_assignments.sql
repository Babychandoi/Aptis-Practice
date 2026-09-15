-- Nội dung riêng của lớp và bài giao.
--
-- Bốn nhóm bảng:
--   1. Tài liệu lớp (file/link)
--   2. Bảng tin riêng — khác bảng tin chung của hệ thống
--   3. Dự đoán đề riêng của giáo viên
--   4. Bài giao và bài nộp
--
-- Đề giáo viên tự soạn dùng lại bảng question_sets, chỉ thêm owner_teacher_id:
-- đề đó vẫn cần AI chấm, vẫn cần lưu snapshot khi học viên làm, vẫn cần hiện
-- trong trang làm bài — tách bảng riêng là nhân đôi toàn bộ luồng đó.

ALTER TABLE question_sets
    ADD COLUMN owner_teacher_id CHAR(36) NULL AFTER topic_id,
    ADD KEY idx_question_sets_owner (owner_teacher_id);

CREATE TABLE classroom_materials (
    id              CHAR(36)     NOT NULL,
    classroom_id    CHAR(36)     NOT NULL,
    created_by      CHAR(36)     NOT NULL,
    title           VARCHAR(255) NOT NULL,
    material_type   ENUM('FILE','LINK') NOT NULL,
    -- FILE: trỏ sang assets (MinIO). LINK: dùng link_url.
    asset_id        CHAR(36)     NULL,
    link_url        VARCHAR(1000) NULL,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_classroom_materials_class (classroom_id, created_at),
    CONSTRAINT fk_classroom_materials_class FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
    CONSTRAINT fk_classroom_materials_author FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Thông báo chỉ học viên trong lớp thấy.
CREATE TABLE classroom_posts (
    id              CHAR(36)     NOT NULL,
    classroom_id    CHAR(36)     NOT NULL,
    created_by      CHAR(36)     NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         MEDIUMTEXT   NOT NULL,
    status          ENUM('PUBLISHED','HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_classroom_posts_class (classroom_id, status, created_at),
    CONSTRAINT fk_classroom_posts_class FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
    CONSTRAINT fk_classroom_posts_author FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nhận định riêng của giáo viên, bên cạnh dự đoán chung của hệ thống.
CREATE TABLE classroom_predictions (
    id              CHAR(36)     NOT NULL,
    classroom_id    CHAR(36)     NOT NULL,
    created_by      CHAR(36)     NOT NULL,
    component_id    CHAR(36)     NULL,
    title           VARCHAR(255) NOT NULL,
    content         MEDIUMTEXT   NULL,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_classroom_predictions_class (classroom_id, created_at),
    CONSTRAINT fk_classroom_predictions_class FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
    CONSTRAINT fk_classroom_predictions_author FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_classroom_predictions_component FOREIGN KEY (component_id) REFERENCES components (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assignments (
    id              CHAR(36)     NOT NULL,
    classroom_id    CHAR(36)     NOT NULL,
    created_by      CHAR(36)     NOT NULL,
    title           VARCHAR(255) NOT NULL,
    instructions    TEXT         NULL,
    -- QUESTION_SETS: giao vài đề cụ thể. BLUEPRINT: giao đề full 4 part.
    source_type     ENUM('QUESTION_SETS','BLUEPRINT') NOT NULL DEFAULT 'QUESTION_SETS',
    blueprint_id    CHAR(36)     NULL,
    due_at          DATETIME     NULL,
    status          ENUM('DRAFT','PUBLISHED','CLOSED') NOT NULL DEFAULT 'PUBLISHED',
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_assignments_class (classroom_id, status, created_at),
    CONSTRAINT fk_assignments_class FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
    CONSTRAINT fk_assignments_author FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_assignments_blueprint FOREIGN KEY (blueprint_id) REFERENCES test_blueprints (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assignment_question_sets (
    assignment_id   CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    display_order   INT      NOT NULL DEFAULT 0,
    PRIMARY KEY (assignment_id, question_set_id),
    CONSTRAINT fk_assignment_qs_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id),
    CONSTRAINT fk_assignment_qs_question_set FOREIGN KEY (question_set_id) REFERENCES question_sets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assignment_submissions (
    id              CHAR(36)     NOT NULL,
    assignment_id   CHAR(36)     NOT NULL,
    user_id         CHAR(36)     NOT NULL,
    -- Trỏ sang lượt làm bài có sẵn; NULL khi học viên chưa bắt đầu.
    attempt_id      CHAR(36)     NULL,
    status          ENUM('NOT_STARTED','IN_PROGRESS','SUBMITTED','LATE','GRADED')
                    NOT NULL DEFAULT 'NOT_STARTED',
    submitted_at    DATETIME     NULL,
    -- NULL = giữ điểm AI. Giáo viên nhập vào là ghi đè.
    teacher_score   DECIMAL(8,2) NULL,
    teacher_comment TEXT         NULL,
    graded_by       CHAR(36)     NULL,
    graded_at       DATETIME     NULL,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    -- Mỗi học viên một bài nộp cho mỗi bài giao.
    UNIQUE KEY uk_assignment_submissions_slot (assignment_id, user_id),
    KEY idx_assignment_submissions_user (user_id, status),
    KEY idx_assignment_submissions_attempt (attempt_id),
    CONSTRAINT fk_assignment_sub_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id),
    CONSTRAINT fk_assignment_sub_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_assignment_sub_grader FOREIGN KEY (graded_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
