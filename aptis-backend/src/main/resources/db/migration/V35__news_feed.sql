-- Bảng tin: admin đăng bài (cách làm bài, dự đoán đề), học viên bình luận.
--
-- Bài viết ĐỌC TỰ DO, bình luận cần Premium: bài hữu ích là lý do người hết hạn
-- quay lại và mua gói, còn hỏi đáp là phần trả phí.

CREATE TABLE news_posts (
    id                CHAR(36)     NOT NULL,
    slug              VARCHAR(160) NOT NULL,
    title             VARCHAR(200) NOT NULL,
    -- Tóm tắt hiện ở danh sách. Để trống thì tự cắt từ body khi hiển thị.
    excerpt           VARCHAR(500)          DEFAULT NULL,
    -- Markdown, không phải HTML: người viết là admin nên vẫn cần chống XSS khi
    -- render, và Markdown dễ sửa lại hơn HTML dán từ Word.
    body              MEDIUMTEXT   NOT NULL,
    cover_asset_id    CHAR(36)              DEFAULT NULL,
    -- Gắn đề luyện: bấm từ bài viết vào làm ngay đề liên quan.
    -- NULL cả hai = bài chỉ để đọc.
    part_id           CHAR(36)              DEFAULT NULL,
    topic_id          CHAR(36)              DEFAULT NULL,
    status            ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    -- true = ghim lên đầu bảng tin
    pinned            TINYINT(1)   NOT NULL DEFAULT 0,
    -- Tắt bình luận cho bài dễ gây tranh luận
    comments_enabled  TINYINT(1)   NOT NULL DEFAULT 1,
    -- true = bình luận phải được admin duyệt mới hiện. Đặt theo TỪNG BÀI để bật
    -- kiểm duyệt riêng cho bài nhạy cảm mà không làm chậm hỏi đáp ở bài khác.
    comments_moderated TINYINT(1)  NOT NULL DEFAULT 0,
    view_count        INT          NOT NULL DEFAULT 0,
    published_at      DATETIME              DEFAULT NULL,
    created_by        CHAR(36)              DEFAULT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_news_posts_slug (slug),
    -- Truy vấn chính của bảng tin: bài đã đăng, ghim trước, mới trước.
    KEY idx_news_posts_feed (status, pinned, published_at),
    CONSTRAINT fk_news_posts_cover FOREIGN KEY (cover_asset_id) REFERENCES assets (id),
    CONSTRAINT fk_news_posts_part FOREIGN KEY (part_id) REFERENCES parts (id),
    CONSTRAINT fk_news_posts_topic FOREIGN KEY (topic_id) REFERENCES topics (id),
    CONSTRAINT fk_news_posts_author FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE news_comments (
    id           CHAR(36)   NOT NULL,
    post_id      CHAR(36)   NOT NULL,
    user_id      CHAR(36)   NOT NULL,
    -- Một cấp trả lời: comment gốc có parent_id NULL, trả lời trỏ về comment gốc.
    -- Không cho trả lời của trả lời — luồng sâu khó đọc trên điện thoại.
    parent_id    CHAR(36)            DEFAULT NULL,
    body         VARCHAR(2000) NOT NULL,
    -- VISIBLE   : mọi người thấy
    -- PENDING   : chờ admin duyệt (bài có comments_moderated = 1)
    -- HIDDEN    : admin ẩn. KHÔNG xoá khỏi DB và người viết VẪN thấy comment của
    --             mình ở dạng mờ kèm chú thích — ẩn im lặng thì họ tưởng lỗi và
    --             gửi lại nhiều lần.
    -- DELETED   : người viết tự xoá
    status       ENUM('VISIBLE','PENDING','HIDDEN','DELETED') NOT NULL DEFAULT 'VISIBLE',
    -- Lý do ẩn, hiện cho chính người viết đọc
    hidden_reason VARCHAR(300)       DEFAULT NULL,
    hidden_by    CHAR(36)            DEFAULT NULL,
    hidden_at    DATETIME            DEFAULT NULL,
    reply_count  INT        NOT NULL DEFAULT 0,
    created_at   DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_news_comments_post (post_id, parent_id, created_at),
    KEY idx_news_comments_user (user_id),
    -- Hàng đợi duyệt trong trang quản trị
    KEY idx_news_comments_status (status, created_at),
    CONSTRAINT fk_news_comments_post FOREIGN KEY (post_id) REFERENCES news_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_news_comments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_news_comments_parent FOREIGN KEY (parent_id) REFERENCES news_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_news_comments_hidden_by FOREIGN KEY (hidden_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Quyền riêng cho bảng tin: TEACHER có thể được giao viết bài mà không cần mở
-- cả quyền sửa ngân hàng đề.
INSERT INTO permissions (id, code, name, description)
VALUES
    (UUID(), 'news:write', 'Đăng bài bảng tin', 'Tạo, sửa, đăng và ẩn bài trên bảng tin'),
    (UUID(), 'news:moderate', 'Kiểm duyệt bình luận', 'Duyệt, ẩn và xoá bình luận của học viên');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN') AND p.code IN ('news:write', 'news:moderate');
