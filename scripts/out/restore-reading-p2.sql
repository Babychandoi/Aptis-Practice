-- Trả Reading Part 2 về 2 đề.
--
-- Tôi đã sai khi hạ xuống 1: tài liệu chính thức ghi "In this part, there are
-- two tasks" và thang điểm ở màn Cấu hình chấm điểm là 10 điểm x 1 điểm/câu
-- = 10 ô = 2 đề x 5 câu. Bản sửa trước làm bài thi chỉ còn 5 ô, mất nửa số điểm.
UPDATE blueprint_part_rules r
JOIN parts p      ON p.id = r.part_id
JOIN components c ON c.id = p.component_id
SET r.question_set_count = 2
WHERE c.code = 'READING' AND p.code = 'PART_2';

-- Bù lại đề cố định đã xoá: mỗi rule FIXED lấy thêm đề PUBLISHED cùng Part
-- chưa dùng, chọn theo code để chạy lại vẫn ra cùng kết quả.
CREATE TEMPORARY TABLE tmp_need AS
SELECT r.id AS rule_id, r.part_id, r.question_set_count - COUNT(f.question_set_id) AS thieu
FROM blueprint_part_rules r
JOIN parts p      ON p.id = r.part_id
JOIN components c ON c.id = p.component_id
LEFT JOIN blueprint_fixed_question_sets f ON f.blueprint_rule_id = r.id
WHERE r.selection_strategy = 'FIXED' AND c.code = 'READING' AND p.code = 'PART_2'
GROUP BY r.id, r.part_id, r.question_set_count
HAVING thieu > 0;

INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order)
SELECT x.rule_id, x.qs_id, x.rn + x.da_co
FROM (
    SELECT n.rule_id, qs.id AS qs_id,
           ROW_NUMBER() OVER (PARTITION BY n.rule_id ORDER BY qs.code) AS rn,
           n.thieu,
           (SELECT COUNT(*) FROM blueprint_fixed_question_sets f2
            WHERE f2.blueprint_rule_id = n.rule_id) AS da_co
    FROM tmp_need n
    JOIN question_sets qs ON qs.part_id = n.part_id AND qs.status = 'PUBLISHED'
    WHERE qs.id NOT IN (
        SELECT f3.question_set_id FROM blueprint_fixed_question_sets f3
        WHERE f3.blueprint_rule_id = n.rule_id)
) x
WHERE x.rn <= x.thieu
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

SELECT COUNT(*) AS rule_con_lech FROM (
  SELECT r.id FROM blueprint_part_rules r
  LEFT JOIN blueprint_fixed_question_sets f ON f.blueprint_rule_id = r.id
  WHERE r.selection_strategy = 'FIXED'
  GROUP BY r.id, r.question_set_count
  HAVING COUNT(f.question_set_id) <> r.question_set_count) x;
