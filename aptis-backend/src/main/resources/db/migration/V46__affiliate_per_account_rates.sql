-- Hoa hồng / giảm giá riêng cho từng người giới thiệu.
--
-- Trước đây mọi người dùng chung một tỉ lệ trong affiliate_settings. Nay cần
-- thoả thuận riêng: giáo viên đưa học viên vào đăng ký web thường được mức tốt
-- hơn người giới thiệu thường, và mức đó khác nhau theo từng người.
--
-- NULL = dùng tỉ lệ chung. Không đặt mặc định bằng số để phân biệt được
-- "chưa cấu hình riêng" với "cố ý đặt 0%" — đặt 0 là một thoả thuận hợp lệ
-- (ví dụ chỉ cho giảm giá, không trả hoa hồng).

ALTER TABLE affiliate_accounts
    ADD COLUMN commission_percent INT NULL
        COMMENT 'Hoa hồng riêng của người này; NULL = theo tỉ lệ chung'
        AFTER status,
    ADD COLUMN discount_percent INT NULL
        COMMENT 'Giảm giá riêng cho người nhập mã này; NULL = theo tỉ lệ chung'
        AFTER commission_percent,
    ADD COLUMN rate_note VARCHAR(255) NULL
        COMMENT 'Lý do đặt mức riêng, để người sau biết vì sao'
        AFTER discount_percent;

-- Chặn số vô lý ngay ở tầng dữ liệu: tỉ lệ ngoài 0-100 làm sai tiền, mà tiền
-- sai thì phát hiện ra đã muộn.
ALTER TABLE affiliate_accounts
    ADD CONSTRAINT ck_affiliate_accounts_commission
        CHECK (commission_percent IS NULL OR (commission_percent BETWEEN 0 AND 100)),
    ADD CONSTRAINT ck_affiliate_accounts_discount
        CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 0 AND 100));

-- Lưu lại mức giảm đã áp vào từng hoa hồng.
--
-- commission_percent đã được chụp sẵn từ V40, nhưng discount_percent thì chưa —
-- khi tỉ lệ đổi, không còn cách nào biết đơn cũ đã giảm bao nhiêu phần trăm.
ALTER TABLE affiliate_commissions
    ADD COLUMN discount_percent INT NULL
        COMMENT 'Mức giảm đã áp cho người mua ở đơn này'
        AFTER commission_percent;
