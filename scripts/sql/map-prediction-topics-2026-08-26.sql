-- Gắn thủ công 5 chủ đề dự đoán mà không suy ra được từ tiêu đề đề.
--
-- Speaking Part 2 là dạng miêu tả tranh: nhãn trong bản tin mô tả CẢNH trong
-- ảnh ("Xếp hàng", "Gia đình sinh hoạt cùng nhau") còn tiêu đề đề là câu hỏi,
-- nên chỉ người xem ảnh mới ghép được. Listening thì tên topic và tên đề chỉ
-- khác cách viết ("New museum in town" vs "New Museum In Town").

-- 1. Speaking P1: "Làm gì khi ở với gia đình" -> đề "Tell me about your family"
SET @t_family := (SELECT id FROM topics WHERE name = 'Làm gì khi ở với gia đình' LIMIT 1);
UPDATE question_sets SET topic_id = @t_family, updated_at = NOW()
 WHERE id = '50521580-3e95-4f28-89a4-4e4ef0b364d6';

-- 2. Speaking P2: "Xếp hàng" -> đề về chờ đợi
SET @t_queue := (SELECT id FROM topics WHERE name IN ('Xếp hàng', 'Backup: Xếp hàng') ORDER BY name LIMIT 1);
UPDATE question_sets SET topic_id = @t_queue, updated_at = NOW()
 WHERE id = '647a6fd4-30bf-4bda-bc16-c61bfb527c21';

-- 3. Speaking P2: "Gia đình sinh hoạt cùng nhau" -> đề về đọc báo / ở nhà với gia đình
SET @t_home := (SELECT id FROM topics
                 WHERE name LIKE 'Gia đình sinh hoạt cùng nhau%' ORDER BY CHAR_LENGTH(name) LIMIT 1);
UPDATE question_sets SET topic_id = @t_home, updated_at = NOW()
 WHERE id = '4184f0dc-b29a-4d20-97d2-828e0e65160f';

-- 4. Listening P2: "New museum in town/Visit museum" -> đề "New Museum In Town (2026)"
SET @t_museum := (SELECT id FROM topics WHERE name = 'New museum in town/Visit museum' LIMIT 1);
UPDATE question_sets SET topic_id = @t_museum, updated_at = NOW()
 WHERE id = '000d1555-6798-4815-b851-ec4eda5a7ccd';

-- 5. Listening P2: "Place to run" -> hai đề "The Place To Run (2026)"
SET @t_run := (SELECT id FROM topics WHERE name = 'Place to run' LIMIT 1);
UPDATE question_sets SET topic_id = @t_run, updated_at = NOW()
 WHERE id IN ('3d934305-77d1-476a-a9f4-90a22c57e438', '4b6d1b06-c10c-4352-be0c-71a05d1c37e8');

SELECT t.name AS topic, COUNT(qs.id) AS so_bo
  FROM topics t LEFT JOIN question_sets qs ON qs.topic_id = t.id
 WHERE t.id IN (@t_family, @t_queue, @t_home, @t_museum, @t_run)
 GROUP BY t.id, t.name;
