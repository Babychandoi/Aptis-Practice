-- Hạn sử dụng của lớp.
--
-- Admin cấp lớp cho giáo viên theo thời hạn (7/30/90/180/365 ngày) và tự đặt
-- ngày hết hạn khi thu tiền. Hết hạn thì khoá lớp: giáo viên lẫn học viên đều
-- không vào được cho tới khi admin gia hạn.
--
-- NULL = không giới hạn, dành cho lớp đang dùng thử hoặc lớp nội bộ. Mọi lớp
-- đang có đều để NULL nên không lớp nào bị khoá vì bản cập nhật này.
ALTER TABLE classrooms
    ADD COLUMN expires_at DATETIME NULL
        COMMENT 'Hết hạn thì khoá lớp; NULL = không giới hạn'
        AFTER status;

-- Tra nhanh những lớp sắp hết hạn để nhắc admin.
CREATE INDEX idx_classrooms_expires ON classrooms (expires_at);
