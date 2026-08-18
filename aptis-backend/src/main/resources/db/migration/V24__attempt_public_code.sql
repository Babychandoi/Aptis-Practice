-- Mã ngắn công khai cho lượt làm bài, dùng làm định danh trên URL.
--
-- URL trước đây là /attempts/{uuid}: một chuỗi 36 ký tự không đọc được, dán vào
-- chat hay bookmark đều rất xấu. UUID không phải lỗ hổng (quyền đã chặn ở
-- AttemptService.requireOwned) nhưng cũng không cần lộ ra ngoài.
--
-- public_code là định danh DUY NHẤT dùng ở tầng URL; id UUID vẫn là khóa chính
-- và vẫn là thứ dùng để tham chiếu giữa MySQL / MongoDB / MinIO.
--
-- 10 ký tự hex = 16^10 ≈ 1,1e12 tổ hợp. Sinh ngẫu nhiên ở application
-- (AttemptService), không đoán được từ id.

ALTER TABLE test_attempts
    ADD COLUMN public_code VARCHAR(16) NULL AFTER id;

-- Lượt cũ: sinh mã dẫn xuất từ id để backfill xác định, chạy lại vẫn ra cùng
-- kết quả. Lượt mới do application sinh ngẫu nhiên.
UPDATE test_attempts
SET public_code = LOWER(SUBSTRING(SHA2(id, 256), 1, 10))
WHERE public_code IS NULL;

-- NOT NULL đặt sau khi backfill; UNIQUE để lookup theo mã đi thẳng vào index.
ALTER TABLE test_attempts
    MODIFY COLUMN public_code VARCHAR(16) NOT NULL,
    ADD UNIQUE KEY uk_test_attempts_public_code (public_code);
