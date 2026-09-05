-- Đề thi thử (đủ 4 phần) gắn vào bài viết bảng tin.
--
-- Khác news_post_question_sets ở chỗ: bảng kia gắn từng BỘ ĐỀ LẺ, học viên bấm
-- vào chỉ làm một phần. Bài hướng dẫn cả bốn phần Writing thì cần mở một lượt
-- thi thử đi hết Part 1 đến Part 4, không phải bốn lượt rời.
CREATE TABLE news_post_blueprints (
    post_id       CHAR(36) NOT NULL,
    blueprint_id  CHAR(36) NOT NULL,
    -- Nhãn hiện cho học viên; để trống thì lấy tên blueprint
    label         VARCHAR(160)      DEFAULT NULL,
    display_order INT      NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, blueprint_id),
    KEY idx_npb_post (post_id, display_order),
    CONSTRAINT fk_npb_post FOREIGN KEY (post_id)
        REFERENCES news_posts (id) ON DELETE CASCADE,
    -- Không cascade khi xoá đề thi thử: xoá mà bài viết mất liên kết trong im
    -- lặng thì người soạn không biết bài của mình đã hỏng.
    CONSTRAINT fk_npb_blueprint FOREIGN KEY (blueprint_id)
        REFERENCES test_blueprints (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
