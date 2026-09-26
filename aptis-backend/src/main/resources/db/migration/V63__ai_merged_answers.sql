-- Kết quả công cụ "Gộp đề Speaking Part 4".
--
-- Học viên chọn 2–3 đề, AI tìm ý chung và viết một bài trả lời dùng được cho
-- cả nhóm. Lưu lại vì hai lý do: học viên mở lại xem được mà không tốn lượt,
-- và cùng một nhóm đề thì trả kết quả cũ thay vì gọi AI lần nữa.
CREATE TABLE ai_merged_answers (
    id               CHAR(36)     NOT NULL PRIMARY KEY,
    user_id          CHAR(36)     NOT NULL,
    -- Mã đề đã sắp xếp nối bằng dấu phẩy, để cùng một nhóm theo thứ tự nào
    -- cũng ra một khoá. Dùng tra lại kết quả cũ của chính người đó.
    set_key          VARCHAR(200) NOT NULL,
    question_set_ids JSON         NOT NULL,
    result           JSON         NOT NULL,
    model            VARCHAR(120) NULL,
    created_at       DATETIME     NOT NULL,
    updated_at       DATETIME     NOT NULL,
    CONSTRAINT uk_ai_merged_user_key UNIQUE (user_id, set_key)
) ENGINE = InnoDB;

CREATE INDEX idx_ai_merged_user_created ON ai_merged_answers (user_id, created_at);
