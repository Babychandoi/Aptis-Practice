-- Metadata MySQL cho 17 đề Speaking Part 2.
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part2.js bằng
--   node scripts/gen-speaking-part2-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2.sql
--
-- Mỗi đề: 1 ảnh dùng chung + 3 câu × 5 điểm = 15 điểm, mỗi câu nói 45 giây.
-- 3 đề đầu để FREE làm bài dùng thử, còn lại PREMIUM — theo quy ước đang áp
-- cho toàn bộ ngân hàng đề.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000032'; -- Speaking Part 2
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     exam_year, access_level, status, current_revision, item_count,
     estimated_seconds, max_score, published_at, created_at, updated_at)
VALUES
('a5000000-0000-4000-8000-000000000001', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_01', 'What do you usually eat for breakfast? (Bữa sáng)', 3, 4, NULL, 'FREE', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000002', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_02', 'How do most people in your country learn about world news? (Tin tức và báo chí)', 3, 5, 2026, 'FREE', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000003', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_03', 'Have you ever written a hand letter? (Thư tay)', 3, 3, NULL, 'FREE', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000004', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_04', 'Do you often watch TV? (Xem tivi và thời gian rảnh)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000005', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_05', 'Tell us the last time you went to the sea? (Biển)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000006', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_06', 'Why do people like eating out with friends? (Ăn uống cùng bạn bè)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000007', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_07', 'Do you like to climb mountains? (Leo núi và hoạt động ngoài trời)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000008', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_08', 'When was the last time you visited a new place? (Đi đến nơi mới)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000009', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_09', 'Tell me the last time you went shopping? (Mua sắm)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000010', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_10', 'How often do you watch films or programmers at home? Why? (Phim ảnh và học qua video)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000011', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_11', 'Describe the last time you looked at some art (Nghệ thuật)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000012', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_12', 'What are the benefits of outdoor activities? (Hoạt động ngoài trời cùng gia đình)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000013', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_13', 'What are the benefits of viewing artworks? (Bảo tàng và tác phẩm nghệ thuật)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000014', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_14', 'What do you do to relax? (Thư giãn)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000015', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_15', 'Describe the last time you did some physical work. (Việc nhà và lao động)', 3, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000016', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_16', 'How do people learn to cook in your culture (Nấu ăn)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a5000000-0000-4000-8000-000000000017', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_17', 'Tell us about the time you give a presentation. How did you feel? (Thuyết trình)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    difficulty = VALUES(difficulty),
    hotness = VALUES(hotness),
    exam_year = VALUES(exam_year),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT hotness, COUNT(*) AS so_de
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000032'
GROUP BY hotness ORDER BY hotness DESC;
