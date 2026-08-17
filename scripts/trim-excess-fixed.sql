-- Xoá đề cố định dư so với question_set_count.
--
-- Reading Part 2 từng để count = 2 (sai: đề thật chỉ một bài sắp xếp câu). Khi
-- sửa count về 1, bảng blueprint_fixed_question_sets vẫn giữ 2 đề nên lượt thi
-- lấy cả hai — ra 10 ô trả lời thay vì 5.
--
-- Giữ đề có display_order nhỏ nhất để bài thi cố định không đổi nội dung.
-- Dùng bảng tạm vì MySQL không cho subquery đọc chính bảng đang DELETE.
CREATE TEMPORARY TABLE tmp_excess AS
SELECT f.blueprint_rule_id, f.question_set_id
FROM (
    SELECT f.blueprint_rule_id, f.question_set_id,
           ROW_NUMBER() OVER (PARTITION BY f.blueprint_rule_id
                              ORDER BY f.display_order, f.question_set_id) AS rn
    FROM blueprint_fixed_question_sets f
    JOIN blueprint_part_rules r ON r.id = f.blueprint_rule_id
    WHERE r.selection_strategy = 'FIXED'
) f
JOIN blueprint_part_rules r ON r.id = f.blueprint_rule_id
WHERE f.rn > r.question_set_count;

DELETE f FROM blueprint_fixed_question_sets f
JOIN tmp_excess t ON t.blueprint_rule_id = f.blueprint_rule_id
                 AND t.question_set_id = f.question_set_id;

SELECT COUNT(*) AS con_lech FROM (
  SELECT r.id FROM blueprint_part_rules r
  LEFT JOIN blueprint_fixed_question_sets f ON f.blueprint_rule_id = r.id
  WHERE r.selection_strategy = 'FIXED'
  GROUP BY r.id, r.question_set_count
  HAVING COUNT(f.question_set_id) <> r.question_set_count) x;
