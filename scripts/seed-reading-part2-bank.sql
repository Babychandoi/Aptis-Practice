-- Reading Part 2: ghi đè 20 đề, thêm 27 đề.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part2-bank.js
-- Chạy SAU khi đã seed Mongo.
--
-- Ghi đè giữ nguyên id nên 196 lượt làm bài cũ vẫn trỏ đúng bản ghi.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000012';
SET @task_type_id = '12000000-0000-4000-8000-000000000008';

-- 1. Nhóm chủ đề cho đề mới (bỏ qua nếu đã có).
INSERT IGNORE INTO topics (id, code, name, is_active, created_at, updated_at)
SELECT UUID(), t.code, t.name, 1, NOW(), NOW() FROM (
  SELECT 'R2_INSTRUCTIONS_FOR_NEW_STUDENTS' AS code, 'Instructions for new students.' AS name
  UNION ALL
  SELECT 'R2_SOLVE_A_PROBLEM' AS code, 'Solve a problem.' AS name
  UNION ALL
  SELECT 'R2_A_FAMOUS_FOOTBALL_PLAYER' AS code, 'A famous football player' AS name
  UNION ALL
  SELECT 'R2_THE_PROCESS_OF_ENTERING_A_PET_HOSPITAL' AS code, 'The process of entering a pet hospital.' AS name
  UNION ALL
  SELECT 'R2_TOM_HARPER' AS code, 'Tom Harper' AS name
  UNION ALL
  SELECT 'R2_A_SCIENTIST_S_LIFE_ALBERT_EINSTEIN' AS code, 'A scientist’s life - Albert Einstein' AS name
  UNION ALL
  SELECT 'R2_DELIVERY_MAN' AS code, 'Delivery man' AS name
  UNION ALL
  SELECT 'R2_ENTER_THE_CONFERENCE_HALL' AS code, 'Enter the conference hall' AS name
  UNION ALL
  SELECT 'R2_PAPERWORK_SUBMISSION_PROCESS' AS code, 'Paperwork submission process' AS name
  UNION ALL
  SELECT 'R2_HAND_IN_ASSIGNMENT' AS code, 'hand in assignment' AS name
  UNION ALL
  SELECT 'R2_CAR_PARK' AS code, 'Car park' AS name
  UNION ALL
  SELECT 'R2_PARTICIPATE_IN_A_RACE' AS code, 'Participate in a race.' AS name
  UNION ALL
  SELECT 'R2_FIRE_INSTRUCTIONS' AS code, 'fire instructions' AS name
  UNION ALL
  SELECT 'R2_QUY_TRINH_NOP_REPORT' AS code, 'Quy trình nộp report' AS name
  UNION ALL
  SELECT 'R2_QUA_TRINH_DUNG_MAY_IN_PRINTER' AS code, 'Quá trình dùng máy in printer' AS name
  UNION ALL
  SELECT 'R2_BETTY_BARR_S_LIFE' AS code, 'Betty Barr''s life' AS name
  UNION ALL
  SELECT 'R2_KEY_CARD' AS code, 'Key card!' AS name
  UNION ALL
  SELECT 'R2_DIEN_VIEN_NOI_TIENG_JAY_MIST' AS code, 'Diễn viên nổi tiếng Jay Mist' AS name
  UNION ALL
  SELECT 'R2_QUY_TRINH_TRONG_KHOAI' AS code, 'Quy trình trồng khoai' AS name
  UNION ALL
  SELECT 'R2_USING_PUBLIC_CYCLE' AS code, 'Using public cycle' AS name
  UNION ALL
  SELECT 'R2_QUY_TRINH_VAO_ANIMAL_HOSPITAL' AS code, 'Quy trình vào animal hospital' AS name
  UNION ALL
  SELECT 'R2_PUBLIC_TRANSPORTATION' AS code, 'Public Transportation' AS name
  UNION ALL
  SELECT 'R2_NATURAL_HISTORY_CENTRE' AS code, 'Natural history centre' AS name
  UNION ALL
  SELECT 'R2_WRITING_ABOUT_A_PLACE_VERSION_2' AS code, 'Writing about a place (Version 2)' AS name
  UNION ALL
  SELECT 'R2_TRAVEL' AS code, 'Travel' AS name
  UNION ALL
  SELECT 'R2_MY_VISIT_TO_A_NEW_COFFEE_SHOP_VERSION_2' AS code, 'My visit to a new coffee shop (Version 2)' AS name
) AS t
WHERE NOT EXISTS (SELECT 1 FROM topics x WHERE x.name = t.name);

-- 2. Ghi đè metadata các đề trùng tên nhưng khác nội dung.
UPDATE question_sets SET title='College Welcoming Day', hotness=3, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000037';
UPDATE question_sets SET title='Cultural festival', hotness=3, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000030';
UPDATE question_sets SET title='The famous singer', hotness=5, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000003';
UPDATE question_sets SET title='Movies then and now', hotness=5, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000006';
UPDATE question_sets SET title='The history of transportation', hotness=4, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000007';
UPDATE question_sets SET title='IoT - Internet of Things', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000014';
UPDATE question_sets SET title='University open day', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000020';
UPDATE question_sets SET title='Workplace evolution', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000011';
UPDATE question_sets SET title='Workplace evolution (phiên bản 2)', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000017';
UPDATE question_sets SET title='Company wellness day', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000010';
UPDATE question_sets SET title='Social Media', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000019';
UPDATE question_sets SET title='Artificial intelligence', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000009';
UPDATE question_sets SET title='Mae - The Math Girl', hotness=2, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000013';
UPDATE question_sets SET title='AI - Artificial Intelligence', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000021';
UPDATE question_sets SET title='Healthy Eating', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000022';
UPDATE question_sets SET title='Wellness Fair', hotness=2, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000023';
UPDATE question_sets SET title='The famous singer (phiên bản 2)', hotness=5, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000024';
UPDATE question_sets SET title='The famous singer (phiên bản 3)', hotness=5, exam_year=2026, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000025';
UPDATE question_sets SET title='Work', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000029';
UPDATE question_sets SET title='Tech fair', hotness=NULL, exam_year=NULL, updated_at=NOW() WHERE id='a2000000-0000-4000-8000-000000000035';

-- 3. Thêm đề mới.
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year,
     max_score, status, current_revision, item_count, estimated_seconds,
     access_level, published_at, created_at, updated_at)
VALUES
('b2000000-0000-4000-8000-000000000016', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Instructions for new students.' LIMIT 1), 'READING_P2_BANK_016', 'Instructions for new students.', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000017', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Solve a problem.' LIMIT 1), 'READING_P2_BANK_017', 'Solve a problem.', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000022', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='A famous football player' LIMIT 1), 'READING_P2_BANK_022', 'A famous football player', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000023', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='The process of entering a pet hospital.' LIMIT 1), 'READING_P2_BANK_023', 'The process of entering a pet hospital.', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000025', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Tom Harper' LIMIT 1), 'READING_P2_BANK_025', 'Tom Harper', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000026', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='A scientist’s life - Albert Einstein' LIMIT 1), 'READING_P2_BANK_026', 'A scientist’s life - Albert Einstein', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000027', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Delivery man' LIMIT 1), 'READING_P2_BANK_027', 'Delivery man', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000028', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Enter the conference hall' LIMIT 1), 'READING_P2_BANK_028', 'Enter the conference hall', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000029', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Paperwork submission process' LIMIT 1), 'READING_P2_BANK_029', 'Paperwork submission process', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000031', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='hand in assignment' LIMIT 1), 'READING_P2_BANK_031', 'hand in assignment', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000032', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Car park' LIMIT 1), 'READING_P2_BANK_032', 'Car park', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000033', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Participate in a race.' LIMIT 1), 'READING_P2_BANK_033', 'Participate in a race.', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000034', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='fire instructions' LIMIT 1), 'READING_P2_BANK_034', 'fire instructions', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000035', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Quy trình nộp report' LIMIT 1), 'READING_P2_BANK_035', 'Quy trình nộp report', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000036', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Quá trình dùng máy in printer' LIMIT 1), 'READING_P2_BANK_036', 'Quá trình dùng máy in printer', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000037', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Betty Barr''s life' LIMIT 1), 'READING_P2_BANK_037', 'Betty Barr''s life', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000038', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Key card!' LIMIT 1), 'READING_P2_BANK_038', 'Key card!', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000039', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Diễn viên nổi tiếng Jay Mist' LIMIT 1), 'READING_P2_BANK_039', 'Diễn viên nổi tiếng Jay Mist', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000040', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Quy trình trồng khoai' LIMIT 1), 'READING_P2_BANK_040', 'Quy trình trồng khoai', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000042', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Using public cycle' LIMIT 1), 'READING_P2_BANK_042', 'Using public cycle', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000043', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Quy trình vào animal hospital' LIMIT 1), 'READING_P2_BANK_043', 'Quy trình vào animal hospital', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000044', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='A famous football player' LIMIT 1), 'READING_P2_BANK_044', 'A famous football player', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000045', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Public Transportation' LIMIT 1), 'READING_P2_BANK_045', 'Public Transportation', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000046', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Natural history centre' LIMIT 1), 'READING_P2_BANK_046', 'Natural history centre', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000055', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Writing about a place (Version 2)' LIMIT 1), 'READING_P2_BANK_055', 'Writing about a place (Version 2)', 3, 2026, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000062', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='Travel' LIMIT 1), 'READING_P2_BANK_062', 'Travel', NULL, NULL, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW()),
('b2000000-0000-4000-8000-000000000063', @part_id, @task_type_id, (SELECT id FROM topics WHERE name='My visit to a new coffee shop (Version 2)' LIMIT 1), 'READING_P2_BANK_063', 'My visit to a new coffee shop (Version 2)', 5, 2026, 5.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title = VALUES(title), hotness = VALUES(hotness), exam_year = VALUES(exam_year),
    topic_id = VALUES(topic_id), status = VALUES(status), updated_at = NOW();

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(DISTINCT topic_id) AS so_nhom,
       SUM(access_level = 'FREE') AS free_
FROM question_sets WHERE part_id = '16000000-0000-4000-8000-000000000012' AND status = 'PUBLISHED';
