-- Đề thi thử của hệ thống khai báo thiếu câu ở những part mà kho lưu mỗi câu
-- một đề riêng: học viên chỉ được hỏi 1 câu ngữ pháp thay vì 25, 1 đoạn nghe
-- thay vì 13. Các part còn lại đã gói sẵn đủ câu trong một đề nên giữ nguyên.
--
-- Từ vựng để 5 vì kho mới có 5 đề; thêm đề thì chỉnh số này lên 25.
-- Chỉ động vào bài của hệ thống, bài giáo viên tự ghép do họ tự chịu trách nhiệm.
UPDATE blueprint_part_rules bpr
JOIN test_blueprints b ON b.id = bpr.blueprint_id
JOIN parts p ON p.id = bpr.part_id
JOIN components c ON c.id = p.component_id
SET bpr.question_set_count = CASE
        WHEN c.code = 'SPEAKING' AND p.code = 'PART_1' THEN 3
        WHEN c.code = 'WRITING' AND p.code = 'PART_1' THEN 5
        WHEN c.code = 'LISTENING' AND p.code = 'PART_1' THEN 13
        WHEN c.code = 'GRAMMAR_VOCABULARY' AND p.code = 'GRAMMAR' THEN 25
        WHEN c.code = 'GRAMMAR_VOCABULARY' AND p.code = 'VOCABULARY' THEN 5
        ELSE bpr.question_set_count
    END
WHERE b.owner_teacher_id IS NULL
  AND bpr.question_set_count = 1
  AND ((c.code = 'SPEAKING' AND p.code = 'PART_1')
       OR (c.code = 'WRITING' AND p.code = 'PART_1')
       OR (c.code = 'LISTENING' AND p.code = 'PART_1')
       OR (c.code = 'GRAMMAR_VOCABULARY' AND p.code IN ('GRAMMAR', 'VOCABULARY')));
