-- =====================================================================
-- V11 : user_roles.assigned_at nhận giá trị mặc định
--
-- Lý do: User.roles map bằng @ManyToMany + @JoinTable nên Hibernate chỉ ghi
-- (user_id, role_id) và bỏ qua cột phụ assigned_at, khiến insert lỗi
-- "Field 'assigned_at' doesn't have a default value".
--
-- Đặt default ở DB thay vì chuyển sang entity trung gian: gán role là thao tác
-- đơn giản, chưa cần đọc/ghi assigned_at từ code. Khi nào cần quản lý ai gán
-- và gán lúc nào thì tách UserRole thành entity riêng với @EmbeddedId.
-- =====================================================================

ALTER TABLE user_roles
    MODIFY COLUMN assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
