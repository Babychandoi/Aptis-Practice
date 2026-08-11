-- Metadata MySQL cho 15 đề Speaking Part 2 (LÔ 3).
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part2-batch3.js bằng
--   node scripts/gen-speaking-part2-batch3-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2-batch3.sql
--
-- Mỗi đề: 1 ảnh dùng chung + 3 câu × 5 điểm = 15 điểm, mỗi câu nói 45 giây.
-- Toàn bộ lô 3 là PREMIUM: 3 đề FREE dùng thử đã nằm ở lô 1.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000032'; -- Speaking Part 2
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     exam_year, access_level, status, current_revision, item_count,
     estimated_seconds, max_score, published_at, created_at, updated_at)
VALUES
('a7000000-0000-4000-8000-000000000001', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C01', 'What do you think about living in a crowded city? (Thành phố đông đúc)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000002', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C02', 'Do you like dancing? Why? Why not? (Nhảy múa)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000003', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C03', 'Tell me about a time you laughed a lot. (Cười nhiều)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000004', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C04', 'Tell me about a time you decorated your room. What did you change? (Trang trí phòng)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000005', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C05', 'Tell me about a time you used your phone to contact someone important. (Dùng điện thoại)', 3, 5, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000006', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C06', 'Why do some families enjoy cycling together? (Gia đình đạp xe)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000007', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C07', 'Tell me about a meeting you attended at work or school. (Sắp xếp phòng khách)', 3, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000008', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C08', 'What kind of animals do you enjoy being around? (Yêu thích động vật)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000009', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C09', 'Which do you enjoy more: getting news from printed papers or from television? (Tin tức báo in và TV)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000010', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C10', 'Why do some people enjoy walking in a forest? (Đi bộ trong rừng)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000011', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C11', 'Tell me about a time when you had to wait in a long queue. (Xếp hàng chờ đợi)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000012', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C12', 'What toys or games did you enjoy when you were a child? (Đồ chơi trẻ em)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000013', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C13', 'Tell me about a time when you did a creative activity with other people. (Hoạt động sáng tạo)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000014', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C14', 'Do you prefer studying alone or studying in a group? Why? (Học nhóm)', 3, 5, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a7000000-0000-4000-8000-000000000015', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_C15', 'Tell me about the last time you used public transport (Đi xe buýt)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW())
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
