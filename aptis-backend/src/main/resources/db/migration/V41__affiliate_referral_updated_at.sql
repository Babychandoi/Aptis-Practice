-- affiliate_referrals thiếu updated_at.
--
-- Entity kế thừa BaseEntity nên Hibernate đòi cả hai cột thời gian, còn V40 chỉ
-- tạo created_at vì bảng này coi như chỉ ghi một lần. Thêm cột cho khớp thay vì
-- bỏ BaseEntity — mọi entity khác đều dùng nó.
ALTER TABLE affiliate_referrals
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at;
