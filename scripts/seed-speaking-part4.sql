-- Metadata MySQL cho 67 đề Speaking Part 4.
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part4.js bằng
--   node scripts/gen-speaking-part4-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part4.sql
--
-- hotness lấy theo số ngọn lửa của từng đề (đề hay ra thi thì nhiều lửa hơn).
-- 3 đề đầu để FREE làm bài dùng thử, còn lại PREMIUM — theo quy ước đang áp
-- cho toàn bộ ngân hàng đề.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000034'; -- Speaking Part 4
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
('a8000000-0000-4000-8000-000000000001', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_01', 'Talk about a time you received a difficult question. (Kể về một lần bạn nhận được một câu hỏi khó)', 4, 5, 'FREE', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000002', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_02', 'Talk about a time you visited a friend. (Kể về một lần bạn tới thăm một người bạn)', 4, 5, 'FREE', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000003', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_03', 'Describe a time when you achieved something. (Kể về một lần bạn đạt được thành tựu)', 4, 5, 'FREE', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000004', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_04', 'Talk about a time you had a long trip. (Kể về một lần bạn có một chuyến đi dài)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000005', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_05', 'Talk about a time you helped someone. (Kể về một lần bạn giúp đỡ ai đó)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000006', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_06', 'Talk about a busy time you had. (Kể về một lần bạn bận rộn)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000007', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_07', 'Describe a time when you learned a new skill. (Kể về một lần bạn học một kỹ năng mới)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000008', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_08', 'Talk about a time you had many choices. (Kể về một lần bạn có nhiều sự lựa chọn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000009', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_09', 'Talk about a time you spent a lot of time planning something. (Kể về một lần bạn mất nhiều thời gian để lên kế hoạch cho một việc)', 4, 2, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000010', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_10', 'Talk about a time you wanted something but couldn''t get it. (Kể về một lần bạn muốn thứ gì đó nhưng không có được)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000011', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_11', 'Describe a time when you hurried to do something. (Kể về một lần bạn vội vã làm gì đó)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000012', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_12', 'Describe a time when you helped someone. (Kể về một lần bạn giúp đỡ một ai đó)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000013', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_13', 'Describe a time you explored a forest. (Kể về một lần bạn vào rừng chơi)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000014', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_14', 'Talk about a time you participated in an activity for children. (Kể về một lần tham gia hoạt động cho trẻ em)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000015', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_15', 'Tell about a time you saved money to do something. (Kể về một lần bạn tiết kiệm tiền để làm gì đó)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000016', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_16', 'Talk about a time you visited a tall building. (Kể về một lần đi thăm tòa nhà cao tầng)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000017', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_17', 'Describe a time when you laughed out loud with a friend. (Kể về một lần bạn cười lớn với người bạn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000018', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_18', 'Describe a time when you faced a difficult question. (Kể về một lần bạn gặp câu hỏi khó)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000019', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_19', 'Describe a time when you had a holiday or vacation. (Kể về một lần bạn có 1 kỳ nghỉ lễ)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000020', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_20', 'Describe a time when you worked in a team. (Kể về một lần bạn làm việc nhóm)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000021', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_21', 'Talk about a time you encountered bad weather. (Kể về một lần gặp thời tiết xấu)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000022', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_22', 'Describe a time when you did an extreme sport. (Kể về một lần bạn chơi thể thao mạo hiểm)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000023', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_23', 'Talk about a time you met a new friend. (Kể về một lần gặp một người bạn mới)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000024', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_24', 'Describe a time when you received good news. (Kể về một lần bạn nhận được một tin tốt)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000025', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_25', 'Describe a time when you made a great effort. (Kể về một lần bạn nỗ lực)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000026', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_26', 'A time you asked a good question. (Kể về lần bạn đặt một câu hỏi hay)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000027', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_27', 'Talk about a time you did something you didn''t want to do. (Kể về một lần bạn làm việc mình không muốn làm)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000028', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_28', 'Describe a time when you worked with both elderly people and children. (Kể về một lần bạn làm việc với người già và trẻ)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000029', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_29', 'Talk about a time you watched a sports match. (Kể về một lần xem một trận đấu thể thao)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000030', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_30', 'Talk about a time you attended a music festival. (Kể về một lần tham gia lễ hội âm nhạc)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000031', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_31', 'Talk about a time you visited a new city. (Kể về một lần thăm một thành phố mới)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000032', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_32', 'Describe a time when you wanted to buy something but couldn''t. (Kể về một lần bạn muốn mua gì đó nhưng không thể)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000033', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_33', 'Talk about a time you wanted to buy something but couldn''t. (Kể về một lần muốn mua gì đó nhưng không được)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000034', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_34', 'Talk about a time you visited an old building. (Kể về một lần thăm một tòa nhà cổ)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000035', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_35', 'Talk about a time you received a gift. (Kể về một lần bạn được tặng quà)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000036', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_36', 'Talk about a time you attended an English course. (Kể về một lần bạn tham gia một khóa học tiếng Anh)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000037', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_37', 'Talk about a challenge you have faced. (Kể về một thử thách của bạn)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000038', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_38', 'Tell me a time you read a good book. (Kể về một lần bạn đọc 1 cuốn sách hay)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000039', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_39', 'Talk about a place you have traveled to. (Kể về nơi bạn đã từng đi du lịch)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000040', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_40', 'Talk about a time you broke a rule. (Kể về một lần phạm luật)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000041', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_41', 'Talk about a time someone asked you to stop doing something. (Kể về một lần ai đó yêu cầu dừng làm việc gì)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000042', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_42', 'Talk about a time you got lost. (Kể về một lần bị lạc đường)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000043', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_43', 'Talk about a time you had to put in a lot of effort. (Kể về một lần bạn phải dành nhiều nỗ lực)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000044', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_44', 'Talk about your favorite outfit. (Kể về trang phục yêu thích của bạn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000045', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_45', 'Tell me a time you went to see a work of art. (Kể về một lần bạn đi xem một tác phẩm nghệ thuật)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000046', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_46', 'Talk about a time someone was rude to you. (Kể về một lần ai đó thiếu lịch sự với bạn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000047', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_47', 'Talk about a time you were in a hurry. (Kể về một lần bạn vội vàng)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000048', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_48', 'Talk about your sleeping habits. (Kể về thói quen ngủ của bạn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000049', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_49', 'Describe a time when you went to an amusement park. (Kể về một lần bạn đi công viên giải trí)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000050', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_50', 'Talk about a time you were helped. (Kể về một lần bạn được giúp đỡ)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000051', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_51', 'Tell me about a time when you met a foreigner. (Kể về một lần bạn gặp một người nước ngoài)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000052', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_52', 'Tell me about a time when you changed your daily routine. (Kể về một lần bạn thay đổi thói quen hằng ngày)', 4, 5, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000053', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_53', 'Talk about a time you shared something with someone. (Kể về một lần bạn chia sẻ thứ gì đó với người khác)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000054', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_54', 'Talk about a time you (or someone you know) changed jobs. (Kể về một lần bạn hoặc người bạn quen thay đổi công việc)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000055', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_55', 'Tell me about a time when you had to wait for something important. (Kể về một lần bạn phải chờ đợi điều gì quan trọng)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000056', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_56', 'Tell me about a time when someone gave you a compliment. (Kể về một lần ai đó khen ngợi bạn)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000057', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_57', 'Tell me about a sports event you watched or took part in. (Kể về một sự kiện thể thao bạn xem hoặc tham gia)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000058', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_58', 'Tell me about a time when technology helped you. (Kể về một lần công nghệ giúp ích cho bạn)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000059', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_59', 'Tell me about something new you learned recently. (Kể về điều gì mới mà bạn học được gần đây)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000060', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_60', 'Tell me about a time when you had a different opinion from an older or younger person. (Kể về một lần bạn có quan điểm khác với người lớn tuổi hoặc nhỏ tuổi hơn)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000061', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_61', 'Tell me about a time when you took part in a volunteer or community activity. (Kể về một lần bạn tham gia hoạt động thiện nguyện hoặc cộng đồng)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000062', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_62', 'Tell me about a time when you had a major responsibility. (Kể về một lần bạn có trách nhiệm lớn)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000063', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_63', 'Talk about a presentation you gave to other people. (Kể về một bài trình bày bạn từng thực hiện)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000064', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_64', 'Talk about a time when you tried something new. (Kể về một lần bạn thử điều gì mới)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000065', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_65', 'Tell me about a time when you changed schools. (Kể về một lần bạn chuyển trường)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000066', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_66', 'Tell me about a time when you wore formal clothes. (Kể về một lần bạn mặc trang phục trang trọng)', 4, 3, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW()),
('a8000000-0000-4000-8000-000000000067', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_67', 'Tell me about some interesting information that you learned recently. (Kể về một thông tin thú vị bạn mới biết)', 4, 4, 'PREMIUM', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    difficulty = VALUES(difficulty),
    hotness = VALUES(hotness),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT hotness, COUNT(*) AS so_de
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000034'
GROUP BY hotness ORDER BY hotness DESC;
