-- Bài thi thử "không hiện trong danh sách": vẫn PUBLISHED nên link cũ (bài bảng tin dự
-- đoán gắn đề Writing theo câu lạc bộ, lịch sử làm bài) vẫn làm được, nhưng không còn
-- trong danh sách thi thử. scripts/rebuild-skill-mocks.mjs đặt listed = 0 cho bài
-- Writing của câu lạc bộ không còn trên aptisprep.com.
ALTER TABLE test_blueprints
    ADD COLUMN listed TINYINT(1) NOT NULL DEFAULT 1 AFTER status;
