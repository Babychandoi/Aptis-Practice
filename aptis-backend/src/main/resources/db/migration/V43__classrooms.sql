-- Không gian lớp học cho giáo viên.
--
-- Mô hình: admin tạo tài khoản giáo viên, hệ thống tự sinh đúng MỘT lớp gắn với
-- tài khoản đó. Giáo viên không tự đăng ký, không tự mở thêm lớp.
--
-- Hai dòng tiền: giáo viên trả gói hàng tháng cho nền tảng (dùng lại
-- subscription_plans), còn học viên trả học phí lớp thì nền tảng thu hộ và giữ
-- lại một phần trước khi chuyển cho giáo viên.

CREATE TABLE classrooms (
    id                      CHAR(36)     NOT NULL,
    -- UNIQUE: mỗi giáo viên đúng một lớp. Ràng buộc ở DB chứ không chỉ ở code,
    -- vì đây là giả định mà mọi truy vấn phía sau đều dựa vào.
    teacher_user_id         CHAR(36)     NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT         NULL,
    -- Mã 6 ký tự để học viên nhập tay hoặc quét QR.
    join_code               VARCHAR(6)   NOT NULL,
    join_enabled            TINYINT(1)   NOT NULL DEFAULT 1,
    -- Admin bật/tắt: lớp có được giao đề từ ngân hàng hệ thống không. Đây là
    -- đòn bẩy giá — tắt thì giáo viên chỉ giao được đề tự soạn.
    system_content_enabled  TINYINT(1)   NOT NULL DEFAULT 0,
    -- Học phí lớp do giáo viên đặt, tách hẳn với gói giáo viên trả cho nền tảng.
    pricing_type            ENUM('FREE','PAID') NOT NULL DEFAULT 'FREE',
    price_amount            BIGINT       NOT NULL DEFAULT 0,
    -- Trần học viên theo gói; NULL = lấy mặc định trong teacher_settings.
    max_students            INT          NULL,
    status                  ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_at              DATETIME     NOT NULL,
    updated_at              DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_classrooms_teacher (teacher_user_id),
    UNIQUE KEY uk_classrooms_join_code (join_code),
    KEY idx_classrooms_status (status),
    CONSTRAINT fk_classrooms_teacher FOREIGN KEY (teacher_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE classroom_members (
    id              CHAR(36)   NOT NULL,
    classroom_id    CHAR(36)   NOT NULL,
    user_id         CHAR(36)   NOT NULL,
    role            ENUM('STUDENT','ASSISTANT') NOT NULL DEFAULT 'STUDENT',
    status          ENUM('ACTIVE','REMOVED') NOT NULL DEFAULT 'ACTIVE',
    -- Lớp miễn phí thì NOT_REQUIRED; lớp có phí thì PENDING cho tới khi trả.
    payment_status  ENUM('NOT_REQUIRED','PENDING','PAID') NOT NULL DEFAULT 'NOT_REQUIRED',
    joined_at       DATETIME   NOT NULL,
    created_at      DATETIME   NOT NULL,
    updated_at      DATETIME   NOT NULL,
    PRIMARY KEY (id),
    -- Vào lớp hai lần là lỗi, kể cả sau khi bị xoá rồi vào lại.
    UNIQUE KEY uk_classroom_members_slot (classroom_id, user_id),
    KEY idx_classroom_members_user (user_id, status),
    CONSTRAINT fk_classroom_members_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
    CONSTRAINT fk_classroom_members_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cấu hình chung, admin chỉnh trong trang quản trị.
CREATE TABLE teacher_settings (
    id                    TINYINT    NOT NULL DEFAULT 1,
    -- Phần trăm nền tảng giữ lại từ học phí lớp.
    platform_fee_percent  INT        NOT NULL DEFAULT 10,
    -- Trần học viên mặc định khi lớp không đặt riêng.
    default_max_students  INT        NOT NULL DEFAULT 50,
    updated_at            DATETIME   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_teacher_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO teacher_settings (id, updated_at) VALUES (1, NOW());

INSERT INTO permissions (id, code, name, description) VALUES
    (UUID(), 'classroom:write', 'Quản lý lớp học', 'Mở lớp, giao bài, chấm bài trong lớp của mình'),
    (UUID(), 'classroom:read', 'Xem lớp học', 'Xem học viên và bài giao trong lớp'),
    (UUID(), 'classroom:admin', 'Quản trị lớp học', 'Tạo tài khoản giáo viên, bật/tắt đề hệ thống, cấu hình gói');

-- Giáo viên quản lý lớp của mình; trợ giảng chỉ xem.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'TEACHER' AND p.code IN ('classroom:write', 'classroom:read');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ADMIN','SUPER_ADMIN')
  AND p.code IN ('classroom:read', 'classroom:admin');
