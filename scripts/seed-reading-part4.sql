-- Metadata MySQL cho 11 bộ Reading Part 4 (ghép tiêu đề với đoạn văn).
-- Dùng cùng UUID với scripts/seed-reading-part4.js (nội dung ở MongoDB).
--
-- Chạy SAU khi đã seed Mongo. Phải có --default-character-set=utf8mb4, nếu không
-- client mặc định latin1 sẽ làm tên tiếng Việt thành "Leo nÃºi":
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part4.sql
--
-- Chạy lại nhiều lần an toàn: dùng ON DUPLICATE KEY UPDATE.
--
-- 4.7, 4.8, 4.9 để DRAFT: tài liệu nguồn chỉ có tiêu đề, chưa có bài đọc.
-- Học viên không thấy các bộ DRAFT và selector cũng không lấy (query lọc
-- status = 'PUBLISHED'). Điền bài đọc rồi publish qua admin là dùng được.
--
-- Topic gán theo nhóm chủ đề ngay từ đầu để MockTestService không lấy hai bộ
-- cùng chủ đề vào một đề thi thử.

-- Chốt charset trong chính script: không phụ thuộc cấu hình client.
SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000014'; -- Reading Part 4
SET @task_type_id = '12000000-0000-4000-8000-000000000006'; -- HEADING_MATCHING

-- ---------- Nhóm chủ đề ----------
INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES
('a4200000-0000-4000-8000-000000000001', NULL, 'R4_MOUNTAIN',       'Leo núi',                'Mountain các phiên bản',            TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000002', NULL, 'R4_WORKWEEK',       'Tuần làm việc 4 ngày',   'Four-day workweek',                 TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000003', NULL, 'R4_DIGITAL_TECH',   'Chuyển đổi số',          'Digital transformation, technology advances, digital innovation', TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000004', NULL, 'R4_WELLNESS',       'Xu hướng sức khỏe',      'Wellness trend',                    TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000005', NULL, 'R4_WOMEN_MATH',     'Nhà toán học nữ',        'Women mathematicians các phiên bản', TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000006', NULL, 'R4_CULTURE',        'Giao lưu văn hóa',       'Cultural exchange',                 TRUE, NOW(), NOW()),
('a4200000-0000-4000-8000-000000000007', NULL, 'R4_URBAN',          'Phát triển đô thị',      'Urban development',                 TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_active = TRUE,
    updated_at = NOW();

-- ---------- Question sets ----------
-- max_score = 14 khớp part_scoring_rules Part 4 (2đ/đoạn × 7, không perfect bonus).
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
('a4000000-0000-4000-8000-000000000001', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000001', 'READING_PART_4_01', 'Mountain',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000002', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000002', 'READING_PART_4_02', 'Four-Day Workweek',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000003', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000003', 'READING_PART_4_03', 'Digital transformation (Tech Forward)',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000004', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000004', 'READING_PART_4_04', 'Wellness trend',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000005', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000005', 'READING_PART_4_05', 'Women mathematicians',  3, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000006', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000003', 'READING_PART_4_06', 'Technology advances',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
-- 4.7 - 4.9: chưa có bài đọc, để DRAFT
('a4000000-0000-4000-8000-000000000007', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000006', 'READING_PART_4_07', 'Cultural Exchange',  3, 3, 'FREE', 'DRAFT',     1, 1, 600, 14.00, NULL,   NOW(), NOW()),
('a4000000-0000-4000-8000-000000000008', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000007', 'READING_PART_4_08', 'Urban Development',  3, 3, 'FREE', 'DRAFT',     1, 1, 600, 14.00, NULL,   NOW(), NOW()),
('a4000000-0000-4000-8000-000000000009', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000003', 'READING_PART_4_09', 'Digital innovation',  3, 3, 'FREE', 'DRAFT',     1, 1, 600, 14.00, NULL,   NOW(), NOW()),
('a4000000-0000-4000-8000-000000000010', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000005', 'READING_PART_4_10', 'Women mathematicians (phiên bản 2)', 3, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW()),
('a4000000-0000-4000-8000-000000000011', @part_id, @task_type_id, 'a4200000-0000-4000-8000-000000000001', 'READING_PART_4_11', 'Mountain (phiên bản 2)', 4, 3, 'FREE', 'PUBLISHED', 1, 1, 600, 14.00, NOW(),  NOW(), NOW())
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
    updated_at = NOW();

SELECT status, COUNT(*) AS so_bo
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000014'
GROUP BY status;
