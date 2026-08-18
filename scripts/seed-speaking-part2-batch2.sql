-- Metadata MySQL cho 17 đề Speaking Part 2 (LÔ 2).
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part2-batch2.js bằng
--   node scripts/gen-speaking-part2-batch2-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2-batch2.sql
--
-- Mỗi đề: 1 ảnh dùng chung + 3 câu × 5 điểm = 15 điểm, mỗi câu nói 45 giây.
-- Toàn bộ lô 2 là PREMIUM: 3 đề FREE dùng thử đã nằm ở lô 1.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000032'; -- Speaking Part 2
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     exam_year, access_level, status, current_revision, item_count,
     estimated_seconds, max_score, published_at, created_at, updated_at)
VALUES
('a6000000-0000-4000-8000-000000000001', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B01', 'What do you usually read? (Đọc sách)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000002', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B02', 'In your country, do parents care about their children? (Bố mẹ quan tâm con cái)', 3, 5, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000003', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B03', 'Tell me about a time you received or gave gifts? (Tặng quà)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000004', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B04', 'Tell me about the last time you used public transport (Giao thông công cộng)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000005', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B05', 'Tell me the last time you traveled in a car? (Đi xe hơi)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000006', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B06', 'Do you prefer reading newspapers or watching news? (Tin tức truyền hình)', 3, 5, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000007', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B07', 'Why is it important to play with children? (Chơi cùng con)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000008', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B08', 'Tell me about the last time you went shopping? (Mua sắm ở siêu thị)', 3, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000009', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B09', 'In your country, do parents care about their children? (Gia đình đi chơi ngoài trời)', 3, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000010', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B10', 'Do you like visiting an exhibition? (Triển lãm và tranh ảnh)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000011', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B11', 'Why is it important to play with children? (Trẻ em chơi đồ chơi)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000012', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B12', 'Tell me the time you shopped in a local store? (Cửa hàng địa phương)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000013', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B13', 'Tell me about a game you played when you were a child. (Trò chơi trẻ em ngoài trời)', 3, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000014', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B14', 'Tell me about an animal that you like? (Động vật)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000015', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B15', 'Tell me about a time when you gave or received some flowers? (Tặng hoa)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000016', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B16', 'How do children go to school in your country? (Đến trường)', 3, 3, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW()),
('a6000000-0000-4000-8000-000000000017', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B17', 'When was the last time you went on vacation with someone else? (Đi chơi cùng người khác)', 3, 4, NULL, 'PREMIUM', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW())
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
