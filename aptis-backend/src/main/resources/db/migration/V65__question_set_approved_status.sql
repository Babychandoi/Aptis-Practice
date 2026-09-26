-- Ngân hàng câu hỏi: thêm bước "Đã duyệt" giữa Chờ duyệt và Phát hành (mock 09/2026).
--
-- Tách duyệt nội dung khỏi phát hành: biên tập viên duyệt xong, người phụ trách
-- đợt cập nhật mới phát hành hàng loạt cùng lúc. Đường cũ IN_REVIEW -> PUBLISHED
-- vẫn giữ để luồng hiện tại không gãy.
ALTER TABLE question_sets
    MODIFY COLUMN status ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED')
        NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN approved_by CHAR(36) NULL COMMENT 'Người duyệt nội dung' AFTER published_at,
    ADD COLUMN approved_at DATETIME NULL AFTER approved_by;
