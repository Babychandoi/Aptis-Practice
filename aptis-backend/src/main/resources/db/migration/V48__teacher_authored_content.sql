-- Giáo viên tự soạn đề và tự ghép bài thi cho lớp mình.
--
-- question_sets đã có owner_teacher_id từ V44. Phần còn thiếu là:
--   1. Blueprint (bài thi ghép) cũng cần chủ sở hữu, để giáo viên ghép được
--      bài full 1 kỹ năng hoặc full 5 kỹ năng riêng cho lớp.
--   2. Đường để giáo viên đề xuất đề của mình vào ngân hàng chung.

-- ---------------------------------------------------------------- Blueprint
-- Chỉ thêm chủ sở hữu. Việc "chọn tay từng đề hay để hệ thống bốc" đã có sẵn:
-- blueprint_part_rules.selection_strategy nhận giá trị FIXED, và bảng
-- blueprint_fixed_question_sets giữ danh sách đề chọn đích danh.
ALTER TABLE test_blueprints
    ADD COLUMN owner_teacher_id CHAR(36) NULL
        COMMENT 'Giáo viên tự ghép bài này; NULL = bài của hệ thống'
        AFTER component_id;

ALTER TABLE test_blueprints
    ADD CONSTRAINT fk_test_blueprints_owner
        FOREIGN KEY (owner_teacher_id) REFERENCES users (id);

CREATE INDEX idx_test_blueprints_owner
    ON test_blueprints (owner_teacher_id, status);

-- ------------------------------------------------------- Đề xuất vào kho chung
--
-- Đề của giáo viên dùng ngay trong lớp họ, không cần ai duyệt. Nhưng khi họ
-- muốn đóng góp cho ngân hàng đề chung thì phải qua admin — đề vào kho chung
-- là mọi học viên đều thấy.
CREATE TABLE question_set_contributions (
    id                CHAR(36) NOT NULL,
    question_set_id   CHAR(36) NOT NULL,
    teacher_user_id   CHAR(36) NOT NULL,

    status            ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',

    -- Lời nhắn của giáo viên khi gửi, và lý do admin từ chối.
    note              VARCHAR(1000) NULL,
    admin_note        VARCHAR(1000) NULL,

    reviewed_by       CHAR(36) NULL,
    reviewed_at       DATETIME NULL,
    created_at        DATETIME NOT NULL,
    updated_at        DATETIME NOT NULL,

    PRIMARY KEY (id),
    -- Một đề chỉ chờ duyệt một lần; gửi lại sau khi bị từ chối thì cập nhật
    -- chính dòng cũ, để admin thấy được lịch sử thay vì hàng loạt dòng trùng.
    UNIQUE KEY uk_contributions_question_set (question_set_id),
    KEY idx_contributions_pending (status, created_at),
    CONSTRAINT fk_contributions_question_set
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id) ON DELETE CASCADE,
    CONSTRAINT fk_contributions_teacher
        FOREIGN KEY (teacher_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quyền soạn đề cho giáo viên.
--
-- Không dùng lại question_set:write của admin: quyền đó cho phép sửa đề trong
-- ngân hàng chung. Giáo viên chỉ được đụng vào đề của chính mình, nên tách
-- quyền riêng để @PreAuthorize phân biệt được.
INSERT INTO permissions (id, code, name, description) VALUES
    (UUID(), 'classroom:content', 'Soạn đề cho lớp',
     'Tự soạn đề và ghép bài thi dùng trong lớp mình dạy');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'TEACHER' AND p.code = 'classroom:content';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ADMIN','SUPER_ADMIN') AND p.code = 'classroom:content';
