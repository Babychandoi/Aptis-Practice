-- Reading Part 2 thực tế gồm hai bài sắp xếp độc lập. Tách thành hai Part
-- trong ngân hàng câu hỏi để mỗi đề có thể chọn một bộ riêng cho từng bài.

-- Dời Part 4 cũ -> Part 5 trước để không vi phạm unique(component_id, code).
UPDATE parts
SET code = 'PART_5',
    name = 'Reading Part 5',
    description = 'Nối tiêu đề với đoạn văn',
    instructions = 'Nối mỗi đoạn với tiêu đề phù hợp.',
    display_order = 5,
    updated_at = NOW()
WHERE id = '16000000-0000-4000-8000-000000000014';

-- Dời Part 3 cũ -> Part 4.
UPDATE parts
SET code = 'PART_4',
    name = 'Reading Part 4',
    description = 'Nối phát biểu với người nói',
    instructions = 'Nối mỗi phát biểu với người phù hợp.',
    display_order = 4,
    updated_at = NOW()
WHERE id = '16000000-0000-4000-8000-000000000013';

-- Part 3 mới là bài sắp xếp câu độc lập thứ hai.
INSERT INTO parts
    (id, component_id, code, name, description, instructions,
     display_order, default_duration_seconds, is_active, created_at, updated_at)
VALUES
    ('16000000-0000-4000-8000-000000000015',
     '15000000-0000-4000-8000-000000000002',
     'PART_3', 'Reading Part 3', 'Sắp xếp câu thành đoạn',
     'Sắp xếp các câu theo thứ tự đúng.', 3, 420, TRUE, NOW(), NOW());

-- Chia 10 điểm của Part 2 cũ thành 5 + 5; giữ nguyên tổng Reading = 50.
UPDATE part_scoring_rules
SET max_score = 5, points_per_correct = 1, perfect_bonus = 0, updated_at = NOW()
WHERE part_id = '16000000-0000-4000-8000-000000000012';

INSERT INTO part_scoring_rules
    (id, part_id, max_score, points_per_correct, perfect_bonus,
     included_in_overall, created_at, updated_at)
VALUES
    ('21000000-0000-4000-8000-000000000015',
     '16000000-0000-4000-8000-000000000015',
     5, 1, 0, TRUE, NOW(), NOW());

-- Chèn Part mới vào các blueprint Reading đã tồn tại và dời thứ tự phía sau.
UPDATE blueprint_part_rules
SET display_order = display_order + 100
WHERE display_order >= 5;

UPDATE blueprint_part_rules
SET display_order = display_order - 99
WHERE display_order >= 105;

INSERT INTO blueprint_part_rules
    (id, blueprint_id, part_id, question_set_count, difficulty_min,
     difficulty_max, selection_strategy, allow_free_content,
     allow_premium_content, config_json, display_order)
SELECT UUID(), source.blueprint_id,
       '16000000-0000-4000-8000-000000000015', 1,
       source.difficulty_min, source.difficulty_max, 'RANDOM',
       source.allow_free_content, source.allow_premium_content, NULL, 5
FROM blueprint_part_rules source
WHERE source.part_id = '16000000-0000-4000-8000-000000000012'
  AND NOT EXISTS (
      SELECT 1 FROM blueprint_part_rules existing
      WHERE existing.blueprint_id = source.blueprint_id
        AND existing.part_id = '16000000-0000-4000-8000-000000000015'
  );

-- Mã đề 1, 2, 3... chỉ cần duy nhất trong từng kỹ năng.
ALTER TABLE test_blueprints DROP INDEX uk_test_blueprints_code;
ALTER TABLE test_blueprints
    ADD UNIQUE KEY uk_test_blueprints_component_code (component_id, code);
