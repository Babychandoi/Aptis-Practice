-- Speaking Part 2 lại bị tính trên thang 15 cho các bài làm SAU V62.
--
-- V62 chỉ sửa question_sets.max_score trong MySQL, nhưng khi tạo lượt làm
-- AttemptSnapshotFactory.resolveMaxScore lấy tổng maxScore các item trong
-- MongoDB (3 × 5 = 15). Nội dung Mongo được sửa riêng bằng
-- scripts/fix-speaking-part2-max.js; migration này chỉ dọn các bài đã lỡ lưu
-- thang 15 (trên prod: 11 lượt thi thử từ 25/09).
--
-- Cùng cách với V62: quy về thang 10 theo đúng tỷ lệ đã chấm, làm tròn bội số
-- 0.5, chạm trần thì giữ trần. Chỉ đụng dòng đang ở trần 15 nên chạy lại cũng
-- không trôi điểm.
--
-- Không tính lại test_attempts / attempt_component_scores: điểm kỹ năng đã được
-- quy về thang 50 theo tỷ lệ, và tỷ lệ không đổi khi đổi thang 15 → 10.
UPDATE attempt_question_sets aqs
JOIN question_sets qs ON qs.id = aqs.question_set_id
JOIN parts p ON p.id = qs.part_id
JOIN components c ON c.id = p.component_id
SET aqs.awarded_score = CASE
        WHEN aqs.awarded_score IS NULL THEN NULL
        WHEN aqs.awarded_score >= 15 THEN 10.00
        ELSE LEAST(10.00, ROUND(aqs.awarded_score * 10 / 15 * 2) / 2)
    END,
    aqs.max_score = 10.00
WHERE c.code = 'SPEAKING'
  AND p.code = 'PART_2'
  AND aqs.max_score = 15.00;
