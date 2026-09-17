-- Giao bài cho một số học viên chỉ định thay vì cả lớp: em nào yếu Writing thì
-- giao thêm bài Writing, không bắt cả lớp làm.
--
-- Không có dòng nào = giao cho cả lớp. Chọn cách này thay vì thêm cột "giao cho
-- tất cả" vì mọi bài giao cũ mặc nhiên là cả lớp, không phải vá dữ liệu.
CREATE TABLE assignment_recipients (
    assignment_id CHAR(36) NOT NULL,
    user_id       CHAR(36) NOT NULL,
    created_at    DATETIME NOT NULL,
    PRIMARY KEY (assignment_id, user_id),
    KEY idx_assignment_recipients_user (user_id),
    CONSTRAINT fk_assignment_recipients_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments (id),
    CONSTRAINT fk_assignment_recipients_user
        FOREIGN KEY (user_id) REFERENCES users (id)
-- Không khai COLLATE: các bảng khác dùng mặc định của server (utf8mb4_0900_ai_ci),
-- khai khác đi là khoá ngoại sang assignments/users không tạo được.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Học viên được chỉ định; không có dòng nào nghĩa là cả lớp';
