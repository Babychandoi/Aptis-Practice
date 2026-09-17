-- Khối "Hỗ trợ" trong lớp đang chỉ đường về kênh của nền tảng. Học viên trong
-- lớp cần hỏi giáo viên dạy mình, không phải hỏi chúng ta — nên mỗi lớp tự khai
-- kênh liên hệ riêng. Để trống thì khối đó không hiện.
ALTER TABLE classrooms
    ADD COLUMN support_zalo    VARCHAR(255) NULL
        COMMENT 'Link hoặc số Zalo của giáo viên' AFTER description,
    ADD COLUMN support_facebook VARCHAR(500) NULL
        COMMENT 'Trang Facebook giáo viên nhắn tin với học viên' AFTER support_zalo,
    ADD COLUMN support_group   VARCHAR(500) NULL
        COMMENT 'Nhóm trao đổi riêng của lớp' AFTER support_facebook,
    ADD COLUMN support_note    VARCHAR(500) NULL
        COMMENT 'Dòng nhắn kèm, ví dụ giờ giáo viên trả lời tin' AFTER support_group;
