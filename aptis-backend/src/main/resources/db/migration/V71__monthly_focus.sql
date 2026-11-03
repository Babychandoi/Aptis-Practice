-- Đề trọng điểm tháng: danh sách đề được chọn lọc theo từng trang luyện, đồng bộ
-- từ aptisprep.com mỗi tuần (scripts/aptisprep-monthly-focus.mjs).
--
-- page_key là trang luyện theo cách chia của website, KHÔNG phải Part của kho:
--   listening-1..4, reading-1, reading-2-3, reading-4, reading-5, speaking-1..4,
--   writing (danh sách câu lạc bộ) — reading-2-3 gộp hai Part web vào Part 2 kho,
--   reading-4 là Part 3 kho (ghép ý kiến), reading-5 là Part 4 kho (ghép tiêu đề).

-- Chủ đề trong một trang: gom các phiên bản của cùng chủ đề (Listening 2-4,
-- Reading 2-5) hoặc câu lạc bộ Writing. Số sao/hạng là mức ưu tiên do biên tập chấm.
CREATE TABLE monthly_focus_topics (
    id CHAR(36) NOT NULL,
    page_key VARCHAR(32) NOT NULL,
    topic_key VARCHAR(160) NOT NULL,
    title VARCHAR(255) NOT NULL,
    stars TINYINT NULL,
    topic_rank INT NULL,
    -- Câu lạc bộ Writing: tên icon (lucide) và màu nền của thẻ.
    icon_name VARCHAR(64) NULL,
    color VARCHAR(32) NULL,
    description VARCHAR(500) NULL,
    display_order INT NOT NULL DEFAULT 0,
    synced_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_monthly_focus_topics (page_key, topic_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Đề thuộc trang. Một đề có thể nằm ở nhiều câu lạc bộ (câu Writing Part 1 lặp lại
-- giữa các câu lạc bộ) nên khoá duy nhất gồm cả topic_key.
CREATE TABLE monthly_focus_items (
    id CHAR(36) NOT NULL,
    page_key VARCHAR(32) NOT NULL,
    -- '' khi trang không chia chủ đề (Listening 1, Reading 1, Speaking).
    topic_key VARCHAR(160) NOT NULL DEFAULT '',
    question_set_id CHAR(36) NOT NULL,
    -- Writing: Part của câu lạc bộ (1-4). Trang khác để NULL.
    club_part TINYINT NULL,
    version_no INT NULL,
    display_order INT NOT NULL DEFAULT 0,
    -- Mã bản ghi bên website, để đối chiếu khi đồng bộ lại.
    source_id VARCHAR(64) NULL,
    synced_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_monthly_focus_items (page_key, topic_key, question_set_id),
    KEY idx_monthly_focus_items_page (page_key, display_order),

    CONSTRAINT fk_monthly_focus_items_set
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Tiến độ học viên trên từng đề của trang trọng điểm: số lần làm, số lần đúng và
-- kết quả lần gần nhất để tô màu ô trong lưới "Tiến độ học". Speaking/Writing
-- không tự chấm được nên chỉ ghi DONE.
CREATE TABLE monthly_focus_progress (
    user_id CHAR(36) NOT NULL,
    page_key VARCHAR(32) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    correct_attempts INT NOT NULL DEFAULT 0,
    last_result ENUM('CORRECT','WRONG','DONE') NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (user_id, page_key, question_set_id),

    CONSTRAINT fk_monthly_focus_progress_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_monthly_focus_progress_set
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Mẹo của Admin hiện dưới trình luyện, theo trang (cùng page_key) — riêng
-- Writing theo Part của câu lạc bộ: writing-1..4.
CREATE TABLE study_part_tips (
    id CHAR(36) NOT NULL,
    page_key VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    -- Mảng JSON các dòng mẹo, hiện thành danh sách gạch đầu dòng.
    content JSON NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_study_part_tips_page (page_key, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
