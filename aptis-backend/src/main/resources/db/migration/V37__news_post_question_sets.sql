-- Đề gắn vào bài viết bảng tin.
--
-- Trước đây bài chỉ có part_id + topic_id, tức LỌC THEO NHÓM: bấm vào nhận 10
-- đề bất kỳ trong nhóm, mỗi người mỗi bộ khác nhau. Bài dạy cách làm một đề cụ
-- thể thì phải mở đúng đề đó, nên cần bảng nối chọn đích danh từng bộ.
--
-- Giữ nguyên part_id/topic_id trên news_posts: hai cách gắn dùng song song
-- được, bài dự đoán đề vẫn tiện dùng lối lọc theo chủ đề.
CREATE TABLE news_post_question_sets (
    post_id         CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    -- Thứ tự hiện trong danh sách, do người soạn kéo sắp
    display_order   INT      NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, question_set_id),
    KEY idx_npqs_post (post_id, display_order),
    CONSTRAINT fk_npqs_post FOREIGN KEY (post_id)
        REFERENCES news_posts (id) ON DELETE CASCADE,
    -- KHÔNG cascade khi xoá bộ đề: xoá đề mà bài viết mất luôn liên kết trong im
    -- lặng thì người soạn không biết bài của mình đã hỏng. RESTRICT buộc phải gỡ
    -- khỏi bài trước, lúc đó mới biết bài nào đang dùng.
    CONSTRAINT fk_npqs_question_set FOREIGN KEY (question_set_id)
        REFERENCES question_sets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
