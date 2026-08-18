-- Bổ sung đề cố định cho các Part gộp câu ở bài thi thử TỪNG KỸ NĂNG.
--
-- Bài thi từng kỹ năng dùng selection_strategy = FIXED (đề chốt sẵn để mọi học
-- viên làm cùng một đề). Với Part gộp câu, question_set_count nói cần bao nhiêu
-- câu nhưng bảng blueprint_fixed_question_sets chỉ có 1 dòng, nên lượt thi chỉ
-- lấy được 1 câu:
--
--   Listening Part 1: cần 13 câu, chỉ có 1
--   Listening Part 4: cần  2 câu, chỉ có 1
--   Speaking  Part 4: cần  3 câu, chỉ có 1
--
-- Cách bù: với mỗi rule thiếu, lấy thêm đề PUBLISHED cùng Part chưa được gán,
-- xếp tiếp display_order. Chọn theo code để mọi lần chạy ra cùng kết quả —
-- bài thi cố định thì không được đổi đề giữa các lần seed.

-- Listening Part 1 (13 câu), Listening Part 4 (2 câu), Speaking Part 4 (3 câu)
INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order)
SELECT r.id, qs.id, ROW_NUMBER() OVER (PARTITION BY r.id ORDER BY qs.code) + existing.n
FROM blueprint_part_rules r
JOIN test_blueprints b ON b.id = r.blueprint_id
JOIN parts p           ON p.id = r.part_id
JOIN components c      ON c.id = p.component_id
JOIN (
    SELECT r2.id AS rule_id, COUNT(f.question_set_id) AS n
    FROM blueprint_part_rules r2
    LEFT JOIN blueprint_fixed_question_sets f ON f.blueprint_rule_id = r2.id
    GROUP BY r2.id
) existing ON existing.rule_id = r.id
JOIN question_sets qs ON qs.part_id = r.part_id AND qs.status = 'PUBLISHED'
WHERE r.selection_strategy = 'FIXED'
  AND b.component_id IS NOT NULL
  AND r.question_set_count > existing.n
  AND (
        (c.code = 'LISTENING' AND p.code IN ('PART_1', 'PART_4'))
     OR (c.code = 'SPEAKING'  AND p.code = 'PART_4')
      )
  -- Không lấy lại đề đã gán cho chính rule này
  AND qs.id NOT IN (
        SELECT f2.question_set_id FROM blueprint_fixed_question_sets f2
        WHERE f2.blueprint_rule_id = r.id)
  -- Chỉ lấy đúng số còn thiếu
  AND (
        SELECT COUNT(*) FROM question_sets qs2
        WHERE qs2.part_id = r.part_id AND qs2.status = 'PUBLISHED'
          AND qs2.code < qs.code
          AND qs2.id NOT IN (SELECT f3.question_set_id FROM blueprint_fixed_question_sets f3
                             WHERE f3.blueprint_rule_id = r.id)
      ) < (r.question_set_count - existing.n)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

-- Kiểm tra: mọi rule FIXED phải có đủ số đề bằng question_set_count
SELECT b.code AS blueprint, p.code AS part, r.question_set_count AS can,
       COUNT(f.question_set_id) AS co,
       IF(COUNT(f.question_set_id) >= r.question_set_count, 'OK', 'THIEU') AS trang_thai
FROM blueprint_part_rules r
JOIN test_blueprints b ON b.id = r.blueprint_id
JOIN parts p           ON p.id = r.part_id
LEFT JOIN blueprint_fixed_question_sets f ON f.blueprint_rule_id = r.id
WHERE r.selection_strategy = 'FIXED' AND r.question_set_count > 1
GROUP BY b.code, p.code, r.question_set_count
HAVING trang_thai = 'THIEU'
ORDER BY b.code, p.code;
