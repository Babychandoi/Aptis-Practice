-- Đề "không hiện trong ngân hàng": vẫn PUBLISHED nên link cũ (bài bảng tin, Cập nhật
-- đề, lịch sử làm bài, thi thử chọn sẵn đề) vẫn mở và làm lại được, nhưng không còn
-- được liệt kê, đếm hay bốc ngẫu nhiên khi luyện theo Part, thi thử, dự đoán đề.
--
-- scripts/aptisprep-practice-curate.mjs đặt listed = 0 cho đề không có trên các trang
-- luyện của aptisprep.com, để ngân hàng chỉ còn bộ đề chuẩn.
ALTER TABLE question_sets
    ADD COLUMN listed TINYINT(1) NOT NULL DEFAULT 1 AFTER status,
    ADD KEY idx_question_sets_part_listed (part_id, status, listed);
