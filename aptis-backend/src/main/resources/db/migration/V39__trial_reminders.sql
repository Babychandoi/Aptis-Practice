-- Nhắc học viên trước khi hết hạn dùng thử.
--
-- Vì sao cần bảng riêng: hạn dùng thử suy ra từ users.created_at, không có bản
-- ghi nào để đánh dấu "đã nhắc". Không lưu thì job chạy lại mỗi 30 phút sẽ gửi
-- lại cùng một mail cho tới khi hết hạn.
--
-- Một hàng cho mỗi (người, mốc nhắc): về sau muốn thêm mốc mới (còn 1 giờ) thì
-- không phải sửa bảng.
CREATE TABLE trial_reminders (
    user_id     CHAR(36)    NOT NULL,
    -- BEFORE_EXPIRY: còn ít giờ nữa hết hạn. AFTER_EXPIRY: đã hết, mời mua gói.
    kind        VARCHAR(32) NOT NULL,
    sent_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, kind),
    CONSTRAINT fk_trial_reminders_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
