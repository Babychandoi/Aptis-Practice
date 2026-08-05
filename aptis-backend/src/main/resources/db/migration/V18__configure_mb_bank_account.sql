-- Tài khoản nhận chuyển khoản VietQR mức 1.
-- Không lưu khóa API vì QR được sinh trực tiếp theo chuẩn EMVCo/VietQR.
UPDATE bank_accounts
SET bank_code = 'MB',
    bank_name = 'MB Bank',
    account_number = '0384896584',
    -- Chưa được chủ hệ thống cung cấp; giao diện yêu cầu người dùng kiểm tra
    -- tên thụ hưởng do ứng dụng ngân hàng hiển thị trước khi chuyển.
    account_holder = '',
    transfer_note = 'Vui lòng chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản.',
    is_active = TRUE,
    display_order = 1,
    updated_at = NOW()
WHERE id = '1b000000-0000-4000-8000-000000000001';
