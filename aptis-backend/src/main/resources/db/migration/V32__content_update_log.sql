-- Nhật ký cập nhật nội dung: học viên xem được đề nào vừa thêm.
--
-- Không suy ra từ question_sets.published_at vì một lần cập nhật thường gồm
-- nhiều bộ câu hỏi và cần một câu mô tả do người biên tập viết ("Cập nhật đề
-- mới Câu 16-17, chủ đề: Using The Time Effectively"). Nhóm theo thời điểm
-- publish sẽ ra danh sách máy móc, không nói được ý.
CREATE TABLE content_update_logs (
    id CHAR(36) NOT NULL,

    -- Ngày hiển thị trên timeline. Tách khỏi created_at để biên tập có thể ghi
    -- lùi ngày cho đợt cập nhật đã làm trước đó.
    log_date DATE NOT NULL,

    -- Nhãn ngắn: "Listening", "Update Listening", "Tài liệu học tập"...
    label VARCHAR(64) NOT NULL,
    description VARCHAR(1000) NOT NULL,

    -- Part liên quan, để trang cập nhật lọc đúng đề. NULL = cập nhật chung
    -- (ví dụ thêm tài liệu học tập) và chỉ hiện mô tả, không có đề để làm.
    part_id CHAR(36) NULL,

    -- Chỉ hiện mục đã PUBLISHED; DRAFT để biên tập soạn trước.
    status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    display_order INT NOT NULL DEFAULT 0,

    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_content_update_logs_date (log_date DESC),
    KEY idx_content_update_logs_status (status, log_date DESC),

    CONSTRAINT fk_content_update_logs_part
        FOREIGN KEY (part_id) REFERENCES parts (id),
    CONSTRAINT fk_content_update_logs_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Bộ câu hỏi thuộc từng mục nhật ký. Bảng nối riêng thay vì cột JSON để join
-- được với question_sets và không trả về đề đã bị archive.
CREATE TABLE content_update_log_question_sets (
    log_id CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    PRIMARY KEY (log_id, question_set_id),
    KEY idx_culqs_question_set (question_set_id),

    CONSTRAINT fk_culqs_log
        FOREIGN KEY (log_id) REFERENCES content_update_logs (id) ON DELETE CASCADE,
    CONSTRAINT fk_culqs_question_set
        FOREIGN KEY (question_set_id) REFERENCES question_sets (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
