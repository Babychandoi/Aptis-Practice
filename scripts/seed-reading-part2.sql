-- Metadata MySQL cho 39 bộ Reading Part 2 (sắp xếp câu).
-- Dùng cùng UUID với scripts/seed-reading-part2.js (nội dung ở MongoDB).
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part2.sql
--
-- Chạy lại nhiều lần an toàn: dùng ON DUPLICATE KEY UPDATE.
--
-- title = TÊN ĐỀ TÀI của bài đọc (Films, Weekend activities...), không phải
-- "Part 2.N": học viên phải biết đề nói về gì trước khi chọn luyện.
--
-- topic_id = NHÓM CHỦ ĐỀ. Nhiều bộ là các phiên bản khác nhau của cùng chủ đề
-- (famous singer ×4, coffee shop ×5...), gom chung topic để MockTestService
-- không lấy hai bộ cùng chủ đề vào một đề thi thử. Nhóm này do V23 tạo; script
-- KHÔNG tạo lại topic "Part 2.N" nữa vì làm thế sẽ phá việc gom nhóm.

-- Chốt charset trong chính script: client mặc định latin1 sẽ làm tên tiếng Việt
-- thành "Leo nÃºi".
SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000012'; -- Reading Part 2
SET @task_type_id = '12000000-0000-4000-8000-000000000007'; -- SENTENCE_ORDERING

-- Nhóm chủ đề (V23 đã tạo; giữ ở đây để script chạy được trên DB sạch).
INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES
('a2200000-0000-4000-8000-000000000001', NULL, 'R2_FILMS',          'Phim ảnh',              'Films, movies then and now',                  TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000002', NULL, 'R2_SPORTS_EVENT',   'Sự kiện thể thao',      'Weekend activities, family sports day',       TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000003', NULL, 'R2_SINGER',         'Ca sĩ nổi tiếng',       'The famous singer các phiên bản',              TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000004', NULL, 'R2_WRITING_PLACE',  'Viết về một địa điểm',  'Writing about a place các phiên bản',          TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000005', NULL, 'R2_TRANSPORT',      'Giao thông',            'History of transportation, public transport', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000006', NULL, 'R2_COFFEE_SHOP',    'Quán cà phê',           'New/busy coffee shop, eating at restaurant',   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000007', NULL, 'R2_AI',             'Trí tuệ nhân tạo',      'Artificial intelligence các phiên bản',        TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000008', NULL, 'R2_WELLNESS_EVENT', 'Sự kiện sức khỏe',      'Company wellness day, wellness fair',         TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000009', NULL, 'R2_WORKPLACE',      'Môi trường làm việc',   'Workplace evolution, work',                   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000010', NULL, 'R2_MUSIC_EVENT',    'Sự kiện âm nhạc',       'Music show at the park',                      TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000011', NULL, 'R2_MAE_SPACE',      'Mae và vũ trụ',         'Mae the math girl, first woman in space',      TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000012', NULL, 'R2_IOT',            'Internet of Things',    'IoT',                                         TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000013', NULL, 'R2_PRESENTATION',   'Thuyết trình',          'Group presentation, end of term project',     TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000014', NULL, 'R2_SOCIAL_MEDIA',   'Mạng xã hội',           'Social media',                                TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000015', NULL, 'R2_CAMPUS_DAY',     'Ngày mở cửa trường',    'University open day, college welcoming day',   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000016', NULL, 'R2_HEALTHY_EATING', 'Ăn uống lành mạnh',     'Healthy eating các phiên bản',                 TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000017', NULL, 'R2_CULTURE_EVENT',  'Sự kiện văn hóa',       'Cultural festival',                           TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000018', NULL, 'R2_TOURISM',        'Du lịch',               'Tourism',                                     TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000019', NULL, 'R2_TECH_EVENT',     'Sự kiện công nghệ',     'Tech fair',                                   TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_active = TRUE,
    updated_at = NOW();

-- ---------- Question sets ----------
-- item_count = 1 (mỗi bộ là một bài sắp xếp), max_score = 5; đề thi thử lấy 2 bộ
-- nên Part 2 tổng 10đ khớp part_scoring_rules.
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
('a2000000-0000-4000-8000-000000000001', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000001', 'READING_PART_2_01', 'Films',                              2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000002', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000002', 'READING_PART_2_02', 'Weekend activities',                 2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000003', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000003', 'READING_PART_2_03', 'The famous singer',                  2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000004', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000002', 'READING_PART_2_04', 'Family sports day',                  2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000005', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000004', 'READING_PART_2_05', 'Writing about a place',              2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000006', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000001', 'READING_PART_2_06', 'Movies then and now',                2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000007', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000005', 'READING_PART_2_07', 'The history of transportation',       3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000008', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000006', 'READING_PART_2_08', 'New coffee shop',                    2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000009', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000007', 'READING_PART_2_09', 'Artificial intelligence',            3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000010', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000008', 'READING_PART_2_10', 'Company wellness day',               2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000011', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000009', 'READING_PART_2_11', 'Workplace evolution',                3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000012', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000010', 'READING_PART_2_12', 'Music show at the park',             2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000013', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000011', 'READING_PART_2_13', 'Mae - The Math Girl',                2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000014', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000012', 'READING_PART_2_14', 'IoT - Internet of Things',           3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000015', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000006', 'READING_PART_2_15', 'Eating at restaurant',               2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000016', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000013', 'READING_PART_2_16', 'A group presentation',               1, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000017', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000009', 'READING_PART_2_17', 'Workplace evolution (phiên bản 2)',  2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000018', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000011', 'READING_PART_2_18', 'The first american woman in space',   3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000019', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000014', 'READING_PART_2_19', 'Social Media',                       3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000020', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000015', 'READING_PART_2_20', 'University open day',                2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000021', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000007', 'READING_PART_2_21', 'AI - Artificial Intelligence',       3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000022', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000016', 'READING_PART_2_22', 'Healthy Eating',                     2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000023', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000008', 'READING_PART_2_23', 'Wellness Fair',                      2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000024', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000003', 'READING_PART_2_24', 'The famous singer (phiên bản 2)',    1, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000025', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000003', 'READING_PART_2_25', 'The famous singer (phiên bản 3)',    1, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000026', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000004', 'READING_PART_2_26', 'Writing about a place (phiên bản 2)', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000027', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000006', 'READING_PART_2_27', 'Busy coffee shop',                   2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000028', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000006', 'READING_PART_2_28', 'My visit to a new coffee shop',      1, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000029', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000009', 'READING_PART_2_29', 'Work',                               3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000030', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000017', 'READING_PART_2_30', 'Cultural festival',                  2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000031', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000005', 'READING_PART_2_31', 'Public Transportations',             2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000032', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000018', 'READING_PART_2_32', 'Tourism',                            3, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000033', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000006', 'READING_PART_2_33', 'New coffee shop (phiên bản 2)',      2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000034', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000016', 'READING_PART_2_34', 'Healthy eating (phiên bản 2)',       2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000035', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000019', 'READING_PART_2_35', 'Tech fair',                          2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000036', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000013', 'READING_PART_2_36', 'End of term project',                2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000037', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000015', 'READING_PART_2_37', 'College Welcoming Day',              2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000038', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000005', 'READING_PART_2_38', 'The history of transportation (phiên bản 2)', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW()),
('a2000000-0000-4000-8000-000000000039', @part_id, @task_type_id, 'a2200000-0000-4000-8000-000000000003', 'READING_PART_2_39', 'The famous singer (phiên bản 4)',    2, 3, 'FREE', 'PUBLISHED', 1, 1, 420, 5.00, NOW(), NOW(), NOW())
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

-- Dọn topic "Part 2.N" tạm của bản seed đầu (nếu còn) — không còn bộ nào trỏ vào.
DELETE FROM topics
WHERE code LIKE 'READING\_PART\_2\_%'
  AND NOT EXISTS (SELECT 1 FROM question_sets qs WHERE qs.topic_id = topics.id);

SELECT COUNT(*) AS reading_part_2_sets,
       COUNT(DISTINCT topic_id) AS so_nhom_chu_de
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000012';
