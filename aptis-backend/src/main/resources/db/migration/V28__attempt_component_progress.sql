-- Tiến độ theo từng kỹ năng của một lượt thi đủ 5 kỹ năng.
--
-- Đề thật cho mỗi kỹ năng một khoảng thời gian riêng (Nói 12', Nghe 40',
-- Ngữ pháp & Từ vựng 25', Đọc 35', Viết 50'), nộp xong kỹ năng nào là khóa kỹ
-- năng đó. Một mốc expires_at chung ở test_attempts không diễn tả được điều này
-- — thí sinh có thể dồn hết giờ vào một kỹ năng.
--
-- Chỉ dùng cho lượt MOCK_TEST không gắn component_id. Luyện từng part vẫn dùng
-- test_attempts.expires_at như cũ.

CREATE TABLE attempt_component_progress (
    id               CHAR(36)  NOT NULL,
    attempt_id       CHAR(36)  NOT NULL,
    component_id     CHAR(36)  NOT NULL,

    -- Chép từ components.display_order để sắp xếp và tìm kỹ năng kế tiếp mà
    -- không phải join; thứ tự kỹ năng của một lượt đã chốt lúc bắt đầu.
    display_order    INT       NOT NULL,

    duration_seconds INT       NOT NULL,

    -- null = chưa tới lượt. Kỹ năng đầu được mở ngay khi start, các kỹ năng sau
    -- mở khi kỹ năng trước nộp xong.
    started_at       DATETIME  NULL,
    expires_at       DATETIME  NULL,

    -- Đã nộp: không sửa, không xem lại được nữa.
    submitted_at     DATETIME  NULL,

    created_at       DATETIME  NOT NULL,
    updated_at       DATETIME  NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_acp_attempt_component (attempt_id, component_id),
    KEY idx_acp_attempt_order (attempt_id, display_order),
    CONSTRAINT fk_acp_attempt FOREIGN KEY (attempt_id)
        REFERENCES test_attempts (id) ON DELETE CASCADE,
    CONSTRAINT fk_acp_component FOREIGN KEY (component_id)
        REFERENCES components (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
