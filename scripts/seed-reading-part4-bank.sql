-- Reading Part 4: thay toàn bộ bằng 24 đề từ nguồn.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part4-bank.js
-- Chạy SAU khi đã seed Mongo.
--
-- 11 đề cũ (8 PUBLISHED + 3 DRAFT thiếu passage) là bản tự tạo, nội dung không
-- trùng nguồn nên xoá hẳn. Lượt làm bài đã dọn sạch nên không vướng khoá ngoại.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000014';
SET @task_type_id = '12000000-0000-4000-8000-000000000006';

-- 1. Nhóm chủ đề (bỏ qua nếu đã có).
INSERT INTO topics (id, code, name, is_active, created_at, updated_at)
SELECT UUID(), t.code, t.name, 1, NOW(), NOW() FROM (
  SELECT 'R4_SRC_001' AS code, 'Mountain' AS name
  UNION ALL
  SELECT 'R4_SRC_002' AS code, 'Digital innovation' AS name
  UNION ALL
  SELECT 'R4_SRC_003' AS code, 'The Arrival of the Four-Day Work Week' AS name
  UNION ALL
  SELECT 'R4_SRC_004' AS code, 'Tech Forward' AS name
  UNION ALL
  SELECT 'R4_SRC_005' AS code, 'Consumer' AS name
  UNION ALL
  SELECT 'R4_SRC_006' AS code, 'Wellness Trends' AS name
  UNION ALL
  SELECT 'R4_SRC_007' AS code, 'Women Mathematicians' AS name
  UNION ALL
  SELECT 'R4_SRC_008' AS code, 'Eating' AS name
  UNION ALL
  SELECT 'R4_SRC_009' AS code, 'Frozen land' AS name
  UNION ALL
  SELECT 'R4_SRC_010' AS code, 'Meatless' AS name
  UNION ALL
  SELECT 'R4_SRC_011' AS code, 'Music' AS name
  UNION ALL
  SELECT 'R4_SRC_012' AS code, 'Tulips' AS name
  UNION ALL
  SELECT 'R4_SRC_013' AS code, 'Early Australia' AS name
  UNION ALL
  SELECT 'R4_SRC_014' AS code, 'Charles Dicken' AS name
  UNION ALL
  SELECT 'R4_SRC_015' AS code, 'Children and Exercises' AS name
  UNION ALL
  SELECT 'R4_SRC_016' AS code, 'Coffee' AS name
  UNION ALL
  SELECT 'R4_SRC_017' AS code, 'Consumer age' AS name
  UNION ALL
  SELECT 'R4_SRC_018' AS code, 'Doggett’s coat and badge' AS name
  UNION ALL
  SELECT 'R4_SRC_019' AS code, 'Early Australia' AS name
  UNION ALL
  SELECT 'R4_SRC_020' AS code, 'Eating in China' AS name
  UNION ALL
  SELECT 'R4_SRC_021' AS code, 'Meatless diet' AS name
  UNION ALL
  SELECT 'R4_SRC_022' AS code, 'Zoo' AS name
  UNION ALL
  SELECT 'R4_SRC_023' AS code, 'Cultural Exchange' AS name
  UNION ALL
  SELECT 'R4_SRC_024' AS code, 'Tulips' AS name
) AS t
WHERE NOT EXISTS (SELECT 1 FROM topics x WHERE x.code = t.code);

-- 2. Xoá đề cũ (chạy trước INSERT để code cũ không chặn code mới).
DELETE FROM question_sets
WHERE part_id = @part_id AND id NOT IN (
  'b4000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000002',
  'b4000000-0000-4000-8000-000000000003',
  'b4000000-0000-4000-8000-000000000004',
  'b4000000-0000-4000-8000-000000000005',
  'b4000000-0000-4000-8000-000000000006',
  'b4000000-0000-4000-8000-000000000007',
  'b4000000-0000-4000-8000-000000000008',
  'b4000000-0000-4000-8000-000000000009',
  'b4000000-0000-4000-8000-000000000010',
  'b4000000-0000-4000-8000-000000000011',
  'b4000000-0000-4000-8000-000000000012',
  'b4000000-0000-4000-8000-000000000013',
  'b4000000-0000-4000-8000-000000000014',
  'b4000000-0000-4000-8000-000000000015',
  'b4000000-0000-4000-8000-000000000016',
  'b4000000-0000-4000-8000-000000000017',
  'b4000000-0000-4000-8000-000000000018',
  'b4000000-0000-4000-8000-000000000019',
  'b4000000-0000-4000-8000-000000000020',
  'b4000000-0000-4000-8000-000000000021',
  'b4000000-0000-4000-8000-000000000022',
  'b4000000-0000-4000-8000-000000000023',
  'b4000000-0000-4000-8000-000000000024'
);

-- 3. Đề mới.
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year,
     max_score, status, current_revision, item_count, estimated_seconds,
     access_level, published_at, created_at, updated_at)
VALUES
('b4000000-0000-4000-8000-000000000001', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_001' LIMIT 1), 'READING_P4_BANK_001', 'Mountain', 5, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'FREE', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000002', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_002' LIMIT 1), 'READING_P4_BANK_002', 'Digital innovation', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'FREE', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000003', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_003' LIMIT 1), 'READING_P4_BANK_003', 'The Arrival of the Four-Day Work Week', 5, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'FREE', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000004', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_004' LIMIT 1), 'READING_P4_BANK_004', 'Tech Forward', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000005', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_005' LIMIT 1), 'READING_P4_BANK_005', 'Consumer', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000006', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_006' LIMIT 1), 'READING_P4_BANK_006', 'Wellness Trends', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000007', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_007' LIMIT 1), 'READING_P4_BANK_007', 'Women Mathematicians', 5, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000008', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_008' LIMIT 1), 'READING_P4_BANK_008', 'Eating', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000009', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_009' LIMIT 1), 'READING_P4_BANK_009', 'Frozen land', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000010', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_010' LIMIT 1), 'READING_P4_BANK_010', 'Meatless', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000011', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_011' LIMIT 1), 'READING_P4_BANK_011', 'Music', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000012', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_012' LIMIT 1), 'READING_P4_BANK_012', 'Tulips', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000013', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_013' LIMIT 1), 'READING_P4_BANK_013', 'Early Australia', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000014', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_014' LIMIT 1), 'READING_P4_BANK_014', 'Charles Dicken', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000015', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_015' LIMIT 1), 'READING_P4_BANK_015', 'Children and Exercises', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000016', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_016' LIMIT 1), 'READING_P4_BANK_016', 'Coffee', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000017', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_017' LIMIT 1), 'READING_P4_BANK_017', 'Consumer age', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000018', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_018' LIMIT 1), 'READING_P4_BANK_018', 'Doggett’s coat and badge', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000019', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_019' LIMIT 1), 'READING_P4_BANK_019', 'Early Australia', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000020', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_020' LIMIT 1), 'READING_P4_BANK_020', 'Eating in China', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000021', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_021' LIMIT 1), 'READING_P4_BANK_021', 'Meatless diet', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000022', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_022' LIMIT 1), 'READING_P4_BANK_022', 'Zoo', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000023', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_023' LIMIT 1), 'READING_P4_BANK_023', 'Cultural Exchange', NULL, 2026, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW()),
('b4000000-0000-4000-8000-000000000024', @part_id, @task_type_id, (SELECT id FROM topics WHERE code='R4_SRC_024' LIMIT 1), 'READING_P4_BANK_024', 'Tulips', NULL, 2025, 14.00, 'PUBLISHED', 1, 1, 600, 'PREMIUM', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title = VALUES(title), hotness = VALUES(hotness), exam_year = VALUES(exam_year),
    topic_id = VALUES(topic_id), max_score = VALUES(max_score),
    status = VALUES(status), access_level = VALUES(access_level), updated_at = NOW();

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(hotness) AS co_lua,
       COUNT(DISTINCT topic_id) AS nhom, SUM(access_level = 'FREE') AS free_
FROM question_sets WHERE part_id = '16000000-0000-4000-8000-000000000014' AND status = 'PUBLISHED';
