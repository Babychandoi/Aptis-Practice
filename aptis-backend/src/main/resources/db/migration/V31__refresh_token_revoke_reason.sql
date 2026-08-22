-- Phân biệt token bị thu hồi vì đăng nhập ở nơi khác với token bị đánh cắp.
--
-- Không có cột này thì cơ chế chống đánh cắp (dùng lại token đã thu hồi ->
-- thu hồi TOÀN BỘ token của user) sẽ bắn cả phiên hợp lệ: máy cũ gọi refresh
-- bằng token vừa bị đẩy ra, hệ thống coi là bị đánh cắp và đăng xuất luôn máy
-- mới. Đã gặp đúng lỗi đó khi thử hai phiên.
--
-- NULL = thu hồi bình thường (đăng xuất, rotate). Giữ NULL cho dữ liệu cũ để
-- hành vi chống đánh cắp không đổi với token đã có.
ALTER TABLE refresh_tokens
    ADD COLUMN revoke_reason VARCHAR(32) NULL AFTER revoked_at;
