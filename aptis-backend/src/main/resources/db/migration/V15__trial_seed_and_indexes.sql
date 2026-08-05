-- =====================================================================
-- V15 : Chiến dịch dùng thử mẫu và index còn thiếu
--
-- import_jobs/export_jobs đã có index (status, queued_at) từ V9, và
-- refunds đã có (order_id, status) — không thêm trùng.
-- =====================================================================

-- Chiến dịch dùng thử 7 ngày, mỗi người một lần
INSERT INTO trial_campaigns
    (id, code, name, duration_days, max_uses_per_user, starts_at, ends_at,
     status, created_at, updated_at)
VALUES
    ('1d000000-0000-4000-8000-000000000001', 'TRIAL7',
     'Dùng thử Premium 7 ngày', 7, 1,
     NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), 'ACTIVE', NOW(), NOW());

-- Job dọn lượt dùng thử hết hạn quét theo (status, ends_at).
-- Index sẵn có idx_user_trials_active bắt đầu bằng user_id nên không dùng được
-- cho truy vấn không lọc theo user.
CREATE INDEX idx_user_trials_expiry ON user_trials (status, ends_at);

-- Trang quản trị liệt kê hoàn tiền theo trạng thái, sắp xếp theo thời điểm yêu
-- cầu. Index sẵn có bắt đầu bằng order_id nên không phục vụ được truy vấn này.
CREATE INDEX idx_refunds_status_requested ON refunds (status, requested_at);
