-- Lớp học theo giao diện mới (mock 09/2026).

-- 1. Một giáo viên nhiều lớp -------------------------------------------------
-- Trước đây mỗi giáo viên đúng một lớp và DB chặn bằng UNIQUE. Admin vẫn là
-- người mở lớp; bỏ ràng buộc để một giáo viên dạy được nhiều lớp cùng lúc.
-- Tạo index thường trước: khoá ngoại tới users đang dựa vào index UNIQUE,
-- bỏ nó trước thì MySQL từ chối (lỗi 1553).
CREATE INDEX idx_classrooms_teacher ON classrooms (teacher_user_id, created_at);
ALTER TABLE classrooms DROP INDEX uk_classrooms_teacher;

-- 2. Cài đặt lớp ------------------------------------------------------------
-- join_enabled đã có từ trước. Mặc định giữ đúng hành vi cũ: vào bằng mã là
-- vào ngay, không bảng xếp hạng, xem đáp án sau khi nộp như hiện nay.
ALTER TABLE classrooms
    ADD COLUMN require_approval BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Học viên nhập mã phải chờ giáo viên duyệt' AFTER join_enabled,
    ADD COLUMN show_leaderboard BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Học viên thấy điểm của bạn cùng lớp' AFTER require_approval,
    ADD COLUMN reveal_answers_after_due BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'Mở đáp án bài giao sau khi hết hạn nộp' AFTER show_leaderboard,
    ADD COLUMN schedule_note VARCHAR(255) NULL
        COMMENT 'Lịch học dạng chữ, ví dụ Tối T3-T5-T7 19:30-21:00' AFTER description;

-- 3. Duyệt học viên vào lớp -------------------------------------------------
ALTER TABLE classroom_members
    MODIFY COLUMN status ENUM('PENDING', 'ACTIVE', 'REJECTED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN requested_at DATETIME NULL COMMENT 'Lúc gửi yêu cầu vào lớp' AFTER joined_at,
    ADD COLUMN decided_by CHAR(36) NULL COMMENT 'Giáo viên duyệt hoặc từ chối' AFTER requested_at;

-- 4. Lịch học và điểm danh --------------------------------------------------
CREATE TABLE classroom_sessions (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    classroom_id CHAR(36)     NOT NULL,
    starts_at    DATETIME     NOT NULL,
    ends_at      DATETIME     NOT NULL,
    topic        VARCHAR(255) NOT NULL,
    -- Link Meet/Zoom giáo viên dán; hệ thống không tự dựng phòng họp.
    meeting_url  VARCHAR(1000) NULL,
    status       ENUM('SCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    created_by   CHAR(36)     NOT NULL,
    created_at   DATETIME     NOT NULL,
    updated_at   DATETIME     NOT NULL,
    CONSTRAINT fk_class_session_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms (id) ON DELETE CASCADE
) ENGINE = InnoDB;
CREATE INDEX idx_class_sessions_time ON classroom_sessions (classroom_id, starts_at);

-- Giáo viên tự tích; hệ thống không đo ai có mặt trong phòng họp.
CREATE TABLE classroom_session_attendance (
    session_id CHAR(36) NOT NULL,
    user_id    CHAR(36) NOT NULL,
    present    BOOLEAN  NOT NULL,
    marked_at  DATETIME NOT NULL,
    PRIMARY KEY (session_id, user_id),
    CONSTRAINT fk_attendance_session FOREIGN KEY (session_id) REFERENCES classroom_sessions (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- 5. Bảng tin lớp: đã xem và bình luận --------------------------------------
CREATE TABLE classroom_post_reads (
    post_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    read_at DATETIME NOT NULL,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_post_read_post FOREIGN KEY (post_id) REFERENCES classroom_posts (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE classroom_post_comments (
    id         CHAR(36)      NOT NULL PRIMARY KEY,
    post_id    CHAR(36)      NOT NULL,
    user_id    CHAR(36)      NOT NULL,
    body       VARCHAR(2000) NOT NULL,
    -- Lớp học là nhóm kín do giáo viên quản lý nên hiện ngay, không chờ duyệt;
    -- giáo viên ẩn được bình luận không phù hợp.
    status     ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    created_at DATETIME      NOT NULL,
    updated_at DATETIME      NOT NULL,
    CONSTRAINT fk_post_comment_post FOREIGN KEY (post_id) REFERENCES classroom_posts (id) ON DELETE CASCADE
) ENGINE = InnoDB;
CREATE INDEX idx_post_comments_post ON classroom_post_comments (post_id, created_at);
