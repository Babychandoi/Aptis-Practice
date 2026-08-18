-- Metadata MySQL cho 14 bộ Reading Part 3 (ghép nhận định với người nói).
-- Dùng cùng UUID với scripts/seed-reading-part3.js (nội dung ở MongoDB).
--
-- Chạy SAU khi đã seed Mongo. Phải có --default-character-set=utf8mb4, nếu không
-- client mặc định latin1 sẽ làm tên tiếng Việt thành "Leo nÃºi":
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part3.sql
--
-- Chạy lại nhiều lần an toàn: dùng ON DUPLICATE KEY UPDATE.
--
-- Topic gán theo NHÓM CHỦ ĐỀ ngay từ đầu (giống cách V23 làm cho Part 2): ngân
-- hàng đề có nhiều bộ là phiên bản khác nhau của cùng chủ đề, gom chung topic để
-- MockTestService không bao giờ lấy hai bộ cùng chủ đề vào một đề thi thử.

-- Chốt charset trong chính script: không phụ thuộc cấu hình client.
SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000013'; -- Reading Part 3
SET @task_type_id = '12000000-0000-4000-8000-000000000005'; -- SPEAKER_MATCHING

-- ---------- Nhóm chủ đề ----------
INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES
('a3200000-0000-4000-8000-000000000001', NULL, 'R3_CHILDHOOD_GAMES', 'Trò chơi tuổi thơ',      'Games from childhood',                TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000002', NULL, 'R3_EXTREME_SPORTS',  'Thể thao mạo hiểm',      'Extreme sports các phiên bản',        TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000003', NULL, 'R3_MUSIC_FESTIVAL',  'Lễ hội âm nhạc',         'Music festival các phiên bản',        TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000004', NULL, 'R3_TECH_CHILDHOOD',  'Công nghệ thời thơ ấu',  'Technology in childhood các phiên bản', TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000005', NULL, 'R3_WORK_LIFE',       'Cân bằng công việc',     'Work and life balance',               TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000006', NULL, 'R3_CHILDHOOD_MEM',   'Ký ức tuổi thơ',         'Childhood memories',                  TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000007', NULL, 'R3_FREE_TIME',       'Hoạt động rảnh rỗi',     'Free time activity',                  TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000008', NULL, 'R3_CAREER',          'Nghề nghiệp & đào tạo',  'Job and training, career',            TRUE, NOW(), NOW()),
('a3200000-0000-4000-8000-000000000009', NULL, 'R3_VOLUNTEERING',    'Hoạt động tình nguyện',  'Volunteering',                        TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_active = TRUE,
    updated_at = NOW();

-- ---------- Question sets ----------
-- item_count = 1 (một bài ghép), max_score = 16 khớp part_scoring_rules Part 3
-- (2đ/nhận định × 7 + 2đ perfect bonus).
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
('a3000000-0000-4000-8000-000000000001', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000001', 'READING_PART_3_01', 'Games from childhood',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000002', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000002', 'READING_PART_3_02', 'Extreme sports',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000003', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000003', 'READING_PART_3_03', 'Music festival',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000004', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000004', 'READING_PART_3_04', 'Technology in childhood',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000005', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000004', 'READING_PART_3_05', 'Technology in childhood (phiên bản 2)',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000006', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000005', 'READING_PART_3_06', 'Work and life balance',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000007', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000006', 'READING_PART_3_07', 'Childhood memories',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000008', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000003', 'READING_PART_3_08', 'Music festival (phiên bản 2)',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000009', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000002', 'READING_PART_3_09', 'Extreme sports (phiên bản 2)',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000010', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000007', 'READING_PART_3_10', 'Free time activity', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000011', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000008', 'READING_PART_3_11', 'Job and training', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000012', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000003', 'READING_PART_3_12', 'Music festival (phiên bản 3)', 3, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000013', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000009', 'READING_PART_3_13', 'Volunteering', 3, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW()),
('a3000000-0000-4000-8000-000000000014', @part_id, @task_type_id, 'a3200000-0000-4000-8000-000000000008', 'READING_PART_3_14', 'Career', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 480, 16.00, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    difficulty = VALUES(difficulty),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT COUNT(*) AS reading_part_3_sets
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000013';
