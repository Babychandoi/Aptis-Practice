-- Năm bộ đề được ghi nhận ra thi, ví dụ 2026.
--
-- Trước đây client lọc "đề 2026" bằng cách dò chuỗi "(2026)" trong tiêu đề, nên
-- chỉ chạy được nếu biên tập viên nhớ gõ năm vào tên đề. Tách thành cột riêng
-- để tiêu đề chỉ còn nội dung đề, và để lọc được bằng truy vấn thật.
--
-- NULL = chưa ghi nhận năm nào. Không đặt mặc định: một bộ đề không có năm
-- khác hẳn với một bộ đề của năm hiện tại.

ALTER TABLE question_sets
    ADD COLUMN exam_year SMALLINT UNSIGNED NULL COMMENT 'Năm ghi nhận ra thi, NULL nếu chưa rõ'
        AFTER hotness;

-- Lọc theo phần + năm là truy vấn client gọi mỗi lần đổi chip lọc.
CREATE INDEX idx_question_sets_part_year ON question_sets (part_id, exam_year);
