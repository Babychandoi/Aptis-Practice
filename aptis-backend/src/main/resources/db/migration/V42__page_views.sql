-- Ghi lượt xem trang của học viên.
--
-- Vì sao cần: hệ thống chỉ biết học viên LÀM gì (test_attempts), không biết họ
-- XEM gì. Không trả lời được "bao nhiêu người vào trang nâng cấp mà không mua",
-- "trang giới thiệu có ai để ý không", "tính năng nào đáng đầu tư thêm".
--
-- Chỉ ghi lượt xem trang, không ghi mọi lượt gọi API: mục tiêu là hiểu mối quan
-- tâm của học viên, mà số liệu đó nằm ở trang họ mở chứ không ở từng request.
-- Ghi hết API sẽ phình bảng vì mỗi trang gọi 3-5 API.

CREATE TABLE page_views (
    id              CHAR(36)     NOT NULL,
    -- NULL khi khách chưa đăng nhập xem trang công khai.
    user_id         CHAR(36)     NULL,
    -- Khóa trang do frontend gửi, vd "plans", "affiliate", "exam-prediction".
    -- Dùng khóa ổn định chứ không dùng URL: URL có id/slug thay đổi, gom nhóm
    -- lại sẽ rất khó.
    page_key        VARCHAR(64)  NOT NULL,
    -- Đường dẫn đầy đủ, để tra lại chi tiết khi cần.
    path            VARCHAR(500) NOT NULL,
    -- Trang trước đó trong ứng dụng, để biết họ đến từ đâu.
    referrer_key    VARCHAR(64)  NULL,
    session_id      CHAR(36)     NULL,
    -- Giây ở lại trang, frontend gửi khi rời trang. NULL nếu không kịp gửi.
    duration_ms     INT          NULL,
    ip_address      VARCHAR(64)  NULL,
    user_agent      VARCHAR(500) NULL,
    created_at      DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_page_views_page_time (page_key, created_at),
    KEY idx_page_views_user_time (user_id, created_at),
    KEY idx_page_views_time (created_at),
    CONSTRAINT fk_page_views_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (id, code, name, description) VALUES
    (UUID(), 'analytics:read', 'Xem thống kê', 'Xem báo cáo lượt truy cập và hành vi học viên');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ADMIN','SUPER_ADMIN') AND p.code = 'analytics:read';
