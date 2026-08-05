-- Mỗi QR chuyển khoản thủ công chỉ có hiệu lực trong giao diện 10 phút.
ALTER TABLE bank_transfer_requests
    ADD COLUMN qr_expires_at DATETIME NULL AFTER admin_note;

-- Cho các yêu cầu đang chờ hiện tại một cửa sổ 10 phút kể từ lúc deploy.
UPDATE bank_transfer_requests
SET qr_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
WHERE status = 'PENDING';
