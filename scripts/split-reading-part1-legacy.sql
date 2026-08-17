SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000011';
SET @task_type_id = '12000000-0000-4000-8000-000000000003';
SET @topic_id     = (SELECT topic_id FROM question_sets WHERE part_id = @part_id LIMIT 1);

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, max_score,
     status, current_revision, item_count, estimated_seconds, access_level,
     published_at, created_at, updated_at)
VALUES
('0d21ff9c-db65-474c-b6d6-af7545585001', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_001', 'Is your neighborhood __?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('0d21ff9c-db65-474c-b6d6-af7545585002', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_002', 'How do you usually __ to work?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('0d21ff9c-db65-474c-b6d6-af7545585003', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_003', 'When did you meet your friend __?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('0d21ff9c-db65-474c-b6d6-af7545585004', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_004', 'Can you __ French?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('0d21ff9c-db65-474c-b6d6-af7545585005', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_005', 'Do you like going out __ with your friends?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('13ed933c-e71f-4098-816c-72845efa9c01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_006', 'I go to school by __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('13ed933c-e71f-4098-816c-72845efa9c02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_007', 'The buildings in my city are very __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('13ed933c-e71f-4098-816c-72845efa9c03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_008', 'There are many green __ near my home.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('13ed933c-e71f-4098-816c-72845efa9c04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_009', 'I eat __ with my family every morning.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('13ed933c-e71f-4098-816c-72845efa9c05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_010', 'I do __ to feel relaxed.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('24d5f0ca-5f9a-4bd4-9d50-7edfd7091801', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_011', 'Where is your __?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('24d5f0ca-5f9a-4bd4-9d50-7edfd7091802', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_012', 'Do you talk to __ at work?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('24d5f0ca-5f9a-4bd4-9d50-7edfd7091803', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_013', 'Is the task __ for you?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('24d5f0ca-5f9a-4bd4-9d50-7edfd7091804', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_014', 'What do you __ in the morning?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('24d5f0ca-5f9a-4bd4-9d50-7edfd7091805', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_015', 'What do you like to __ on TV?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('72d88237-00fb-41d7-89a7-700ec8caaf01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_016', 'I always study in the __ before school.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('72d88237-00fb-41d7-89a7-700ec8caaf02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_017', 'My __ and I play football after class.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('72d88237-00fb-41d7-89a7-700ec8caaf03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_018', 'I always __ my bag on the chair.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('72d88237-00fb-41d7-89a7-700ec8caaf04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_019', 'Apples are very __ for your health.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('72d88237-00fb-41d7-89a7-700ec8caaf05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_020', 'We eat rice and __ every day.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('7819a413-4616-4f54-9adc-dc16d67af701', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_021', 'My bedroom is very __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('7819a413-4616-4f54-9adc-dc16d67af702', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_022', 'We usually __ at a hotel on vacation.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('7819a413-4616-4f54-9adc-dc16d67af703', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_023', 'There are many flowers in the __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('7819a413-4616-4f54-9adc-dc16d67af704', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_024', 'Some __ near my home are very tall.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('7819a413-4616-4f54-9adc-dc16d67af705', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_025', 'My grandfather is very __ but still strong.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a5953d8e-2230-4508-96ba-754b91177d01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_026', 'I usually stay at __ on Sundays.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a5953d8e-2230-4508-96ba-754b91177d02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_027', 'My father can __ very well.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a5953d8e-2230-4508-96ba-754b91177d03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_028', 'I like spending time with my __ after school.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a5953d8e-2230-4508-96ba-754b91177d04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_029', 'Let''s go for a __ in the park.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a5953d8e-2230-4508-96ba-754b91177d05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_030', 'Your sister looks very __ today.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a801829f-c04c-484c-8ca9-7fdfa6829501', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_031', 'My uncle works on a __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a801829f-c04c-484c-8ca9-7fdfa6829502', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_032', 'The children were very __ about the trip.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a801829f-c04c-484c-8ca9-7fdfa6829503', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_033', 'Turn __ at the next corner.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a801829f-c04c-484c-8ca9-7fdfa6829504', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_034', 'We walked along the __ to the park.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('a801829f-c04c-484c-8ca9-7fdfa6829505', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_035', 'I usually __ milk in the morning.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('b9e00ead-1ad2-4c17-a993-67c6db96ce01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_036', 'Where is the train __ in this town?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('b9e00ead-1ad2-4c17-a993-67c6db96ce02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_037', 'The bus __ here every morning.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('b9e00ead-1ad2-4c17-a993-67c6db96ce03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_038', 'The traffic light is __ so you can go now.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('b9e00ead-1ad2-4c17-a993-67c6db96ce04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_039', 'We usually have __ at 7 p.m.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('b9e00ead-1ad2-4c17-a993-67c6db96ce05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_040', 'Do you like watching __ on weekends?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('bc8857da-98d2-44be-b3ff-ea6e67472d01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_041', 'I drink coffee in the __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('bc8857da-98d2-44be-b3ff-ea6e67472d02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_042', 'Children play in the __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('bc8857da-98d2-44be-b3ff-ea6e67472d03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_043', 'What time do you __ home?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('bc8857da-98d2-44be-b3ff-ea6e67472d04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_044', 'We eat bread for __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('bc8857da-98d2-44be-b3ff-ea6e67472d05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_045', 'Nice to __ you.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('d8e9db97-ae3d-429e-b871-aba4c2ad6d01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_046', 'I want to __ my grandparents this weekend.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('d8e9db97-ae3d-429e-b871-aba4c2ad6d02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_047', 'My __ is very clean and bright.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('d8e9db97-ae3d-429e-b871-aba4c2ad6d03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_048', 'The weather is __ today.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('d8e9db97-ae3d-429e-b871-aba4c2ad6d04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_049', 'We went to the city by __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('d8e9db97-ae3d-429e-b871-aba4c2ad6d05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_050', 'I can __ English very well.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec3830ca-7d33-475b-977d-2925f223a301', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_051', 'Do you jog in the __ in the morning?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec3830ca-7d33-475b-977d-2925f223a302', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_052', 'Does the gym offer __ for yoga?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec3830ca-7d33-475b-977d-2925f223a303', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_053', 'Is English __ for you?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec3830ca-7d33-475b-977d-2925f223a304', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_054', 'What do you eat for __ every day?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec3830ca-7d33-475b-977d-2925f223a305', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_055', 'Do you practice __ to relax?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec494119-b3e6-4598-8e8d-40d2db835e01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_056', 'I want to travel to the __ this summer.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec494119-b3e6-4598-8e8d-40d2db835e02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_057', 'Please keep your room __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec494119-b3e6-4598-8e8d-40d2db835e03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_058', 'We have English __ on Monday.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec494119-b3e6-4598-8e8d-40d2db835e04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_059', 'I like helping __ people.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('ec494119-b3e6-4598-8e8d-40d2db835e05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_060', 'Can you spell these __ for me?', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('f3f879a6-2755-4ef5-8aab-566ff97f6c01', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_061', 'The supermarket is __ my house.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('f3f879a6-2755-4ef5-8aab-566ff97f6c02', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_062', 'This t-shirt is too __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('f3f879a6-2755-4ef5-8aab-566ff97f6c03', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_063', 'She buys a dress at the __.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('f3f879a6-2755-4ef5-8aab-566ff97f6c04', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_064', 'I like to __ with my friends.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW()),
('f3f879a6-2755-4ef5-8aab-566ff97f6c05', @part_id, @task_type_id, @topic_id, 'READING_P1_OLD_065', 'We __ our grandparents.', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title = VALUES(title), item_count = VALUES(item_count),
    max_score = VALUES(max_score), updated_at = NOW();

-- 13 đề gốc đang được attempt_question_sets tham chiếu (40 lượt đã làm), nên
-- KHÔNG xoá được: xoá sẽ mất lịch sử làm bài. Chuyển sang ARCHIVED để học
-- viên không thấy nữa nhưng dữ liệu và thống kê cũ vẫn nguyên vẹn.
UPDATE question_sets SET status = 'ARCHIVED', updated_at = NOW()
WHERE id IN ('0d21ff9c-db65-474c-b6d6-af75455850f6','13ed933c-e71f-4098-816c-72845efa9cb3','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855','72d88237-00fb-41d7-89a7-700ec8caaf2e','7819a413-4616-4f54-9adc-dc16d67af7eb','a5953d8e-2230-4508-96ba-754b91177d3a','a801829f-c04c-484c-8ca9-7fdfa68295b6','b9e00ead-1ad2-4c17-a993-67c6db96ce46','bc8857da-98d2-44be-b3ff-ea6e67472d8c','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c','ec3830ca-7d33-475b-977d-2925f223a3dd','ec494119-b3e6-4598-8e8d-40d2db835ebe','f3f879a6-2755-4ef5-8aab-566ff97f6c96');

SELECT COUNT(*) AS de, SUM(item_count) AS cau, SUM(item_count > 1) AS de_nhieu_cau
FROM question_sets WHERE part_id = '16000000-0000-4000-8000-000000000011';
