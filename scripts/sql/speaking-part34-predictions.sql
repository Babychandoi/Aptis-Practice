-- Thêm Speaking Part 3 và Part 4 vào bản tin dự đoán.
--
-- Ngân hàng đã có 90 đề Part 3 và 27 đề Part 4 nhưng bản tin chưa có mục nào,
-- nên học viên không vào luyện hai phần này từ trang dự đoán được.
--
-- Part 4 chưa đề nào gắn chủ đề; Part 3 thì mỗi "chủ đề" là nguyên một câu hỏi
-- dài. Gom cả hai về nhãn chủ đề ngắn theo cách bản tin bên ngoài đang chia,
-- rồi mới thêm mục dự đoán — chỉ thêm chủ đề có đề để bấm vào là mở được.
SET NAMES utf8mb4;


-- ========== Speaking Part 3: 90 đề -> 23 chủ đề ==========

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '055a2aee-fed2-4445-bb6f-0a6c185a305f', 'sp3-bien-vs-nui-vs-thanh-pho', 'Biển vs núi vs thành phố', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Biển vs núi vs thành phố');
SET @t := (SELECT id FROM topics WHERE name='Biển vs núi vs thành phố' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('0742b25b-d88a-44df-bc8a-4b920e294f7f','8b8cd79b-7320-438a-bc51-2038c2aa645c','9315bc83-dff4-4202-8d59-ca9f85c7bc24','953d9e0b-1b38-458d-a5a5-f7a4b9295efd','99f2f588-3b86-49f6-8b8c-f8803fca8103','9ab3e2b7-8021-45d1-b5ca-f8a17a3c0001','c39b767f-65f1-4a43-a7be-ce6e68d305e2','ed9b2a91-65e8-466f-ad81-3a1067af7ada','fad694f8-dd0d-4421-b003-cc7db9ad6e63');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ee793e34-e534-400b-b239-2b12bcd8d971', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Biển vs núi vs thành phố', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd4c28f7f-0b1d-4034-98e8-cf1d48f4c604', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Biển vs núi vs thành phố', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'eee47037-3c63-4c4e-94b8-cd031dd57fe5', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Biển vs núi vs thành phố', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'd5704e16-ff17-4386-936d-914083de40f6', 'sp3-du-lich-bang-tau-vs-may-bay-vs-o-to', 'Du lịch bằng tàu vs máy bay vs ô tô', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Du lịch bằng tàu vs máy bay vs ô tô');
SET @t := (SELECT id FROM topics WHERE name='Du lịch bằng tàu vs máy bay vs ô tô' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('1249ff1b-229e-4038-ac52-9de2799b1139','24625087-a510-4cd2-95d5-11187fd0529e','43d5aa6a-bb5b-4113-b757-732f121e7bbc','6820dde2-b932-4b5c-8676-aaf224b4808f','6f8579ca-c0d5-4072-aec9-7f47dc3e1887','9549c8e7-6145-44b1-a823-f0896cdaabe8','ecfbe0a4-b6eb-4dc4-b5cc-79254f5c91c3','effa0fbd-9800-4b4c-8f6d-b3e8fec6fc90','fcc48aaf-f2c3-4256-8f80-eeaa004bdce9');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '96068a98-c43e-4d63-9671-ffa92bf0bc56', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Du lịch bằng tàu vs máy bay vs ô tô', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0189ddee-35c8-4663-810f-9604a0b2c838', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Du lịch bằng tàu vs máy bay vs ô tô', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '27d6424a-c439-4cac-bab4-4eefa26201e6', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Du lịch bằng tàu vs máy bay vs ô tô', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'dd45be51-9970-422a-84a0-8ad1b8f51a14', 'sp3-the-thao-trong-nha-vs-ngoai-troi', 'Thể thao trong nhà vs ngoài trời', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Thể thao trong nhà vs ngoài trời');
SET @t := (SELECT id FROM topics WHERE name='Thể thao trong nhà vs ngoài trời' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('4e25ea02-1166-4e2c-8caf-ce5688ca5fe6','6105fa18-c4df-4aec-9814-8b01c0374d09','6a7fe7ea-a0eb-402b-8c9e-2c8463e43365','74963642-bf6e-4229-8c6e-566f0c3e8ceb','abeac752-cfbc-4d53-a091-fd666fd3f7f0','c69b6249-295a-4bdc-8cdd-5d95b36b2ec4','d9280f37-11fc-49dd-a23f-b25770ac9139','f217e5fa-3f15-4e71-a522-2f3b7e958e1e');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0b1e5f13-005b-4d5d-a7fe-ed5038394fe7', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thể thao trong nhà vs ngoài trời', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '85f74572-6456-492c-9238-47058fba6d9b', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thể thao trong nhà vs ngoài trời', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '55b6dbae-06fc-4e59-8564-f94c483d0b25', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thể thao trong nhà vs ngoài trời', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '36551f94-1891-47d7-bad3-b492619ab0ea', 'sp3-giai-tri-hai-hinh-thuc', 'Giải trí: hai hình thức', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Giải trí: hai hình thức');
SET @t := (SELECT id FROM topics WHERE name='Giải trí: hai hình thức' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('0a9afc71-346d-488b-9e3f-af00a1751598','2801e66d-5202-4c24-b4bf-0eedf6262aa5','492a3b61-4aa3-48ea-a93b-c99a73d595d5','859d1f51-7848-4975-ac60-a6fe216ab374','df053b4b-0923-4c23-ab13-8a2b303b8b93','e9312e4c-7ab2-44f9-b0fa-ee89cf3a8691');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '5dd3d03d-3059-425a-b4ae-e2b9ec7ba1a3', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Giải trí: hai hình thức', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'df1e91c0-e542-4a42-b705-b3ee5bfce4b6', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Giải trí: hai hình thức', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '4d011309-ab47-45a5-9940-62b950e99e6d', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Giải trí: hai hình thức', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'e562601f-94e0-4503-b548-8101b1350dfc', 'sp3-an-o-nha-vs-an-ngoai', 'Ăn ở nhà vs ăn ngoài', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Ăn ở nhà vs ăn ngoài');
SET @t := (SELECT id FROM topics WHERE name='Ăn ở nhà vs ăn ngoài' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('0392ac7c-33e7-458b-a590-d58d69011ead','948f3972-d6f4-454c-8ac4-0f0bcb6ffea0','b72cc5a6-2012-43db-9538-e14f87073181','ecd9e1cb-5a0f-4e59-b154-0177bd043d2c','fcc1ed32-3b41-4be0-931f-98b0269a9780');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2ab324b8-3aa0-4ecf-9bf0-09008f98e1a5', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn ở nhà vs ăn ngoài', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0df8eb40-109c-44ea-9c7a-833dcd59479e', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn ở nhà vs ăn ngoài', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '200c9900-2c99-443c-8909-f08fbba9f757', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn ở nhà vs ăn ngoài', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'b497847b-941d-468e-8a86-fc9757316545', 'sp3-nuoi-dong-vat-trong-nha', 'Nuôi động vật trong nhà', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Nuôi động vật trong nhà');
SET @t := (SELECT id FROM topics WHERE name='Nuôi động vật trong nhà' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('0ddb8675-9413-40f8-a674-5803846a0557','43b72926-a4eb-40d4-86d2-776d7d7bc0f8','6813beb8-060b-439d-8bd0-12b428cc12cc','a7399998-bfe1-403e-b127-6959a9b07e3a','d04fc43b-baa0-429b-8ead-6b9f14754007');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ef0c3973-e529-4ac7-a486-10f82b18ca7f', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nuôi động vật trong nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2994ae3f-b2a4-4a20-b4a1-7c9c5cd753d4', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nuôi động vật trong nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd89a55ef-7537-493f-a7a8-a5be47cf85c5', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nuôi động vật trong nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '2dcf3968-fdf1-41ed-941c-43c42a27befb', 'sp3-song-o-thanh-pho-vs-nong-thon', 'Sống ở thành phố vs nông thôn', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Sống ở thành phố vs nông thôn');
SET @t := (SELECT id FROM topics WHERE name='Sống ở thành phố vs nông thôn' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('42e3bebb-0b4d-4f07-a77c-6a5642406e0c','7a2ab137-74a6-47f1-bcc7-8fb8f0d045f7','c27ffe0d-1d5f-4584-8d53-519aaeee9a67','c681cfd6-c14d-4dfc-9d5c-5bcd9d332898','e0cb83cb-486a-4f0c-aa28-a9c72c78aae2');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '58b7f0d2-5f68-45c5-954f-73848ee6f886', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống ở thành phố vs nông thôn', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '1c40e60b-3981-45b3-b0d5-ef9099624e7d', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống ở thành phố vs nông thôn', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd9dd5f61-a5ee-4644-89ef-fc5acd57a33a', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống ở thành phố vs nông thôn', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '31aaa124-b26d-4ad0-b7c7-9c8541e4d4ec', 'sp3-doc-sach-vs-choi-game', 'Đọc sách vs chơi game', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Đọc sách vs chơi game');
SET @t := (SELECT id FROM topics WHERE name='Đọc sách vs chơi game' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('5e42eff4-062b-47be-9b55-4b7b9230f80c','671ed2ff-3158-4d4e-97b0-c4e8287e45be','818e2f80-7098-454d-92a5-54c51b239153','f82d0996-590d-4530-bdaa-612f1e45fbad','f9022eb9-55b8-4fbc-8f74-b535acf72f04');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2c30eb21-58e7-4c09-8f8c-4922b84152a3', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Đọc sách vs chơi game', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '5e3e5c3a-4961-4525-8aa9-9cce1a54e2cd', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Đọc sách vs chơi game', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c9eb5749-da45-48c4-9e54-ef117097a84a', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Đọc sách vs chơi game', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'd47008a3-d2dd-42eb-bd45-ca8ae122c64e', 'sp3-cho-vs-sieu-thi', 'Chợ vs siêu thị', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Chợ vs siêu thị');
SET @t := (SELECT id FROM topics WHERE name='Chợ vs siêu thị' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('6978c3e5-7ae3-45d4-8fb4-fb1c63b4c198','69e58aa6-2719-4d8c-b7ca-1c57653dee98','9cdae4c4-466d-45f3-802e-12c535737f0d','9e55e3e0-0cfd-4fc7-aa8c-5fe0cb613ce2','b14449cb-3e41-496a-b217-c3aeb0d989e7');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ef3726b1-510a-471b-b630-a01e1ebb7872', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chợ vs siêu thị', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'f82f4249-f7ab-42d3-aaa0-013612318dbf', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chợ vs siêu thị', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'f6a01095-285a-4f59-8f8d-5795c51c7584', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chợ vs siêu thị', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'a81aa442-547a-42b5-b674-b7f71bb4a6d6', 'sp3-lam-viec-trong-nha-may-vs-van-phong', 'Làm việc trong nhà máy vs văn phòng', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Làm việc trong nhà máy vs văn phòng');
SET @t := (SELECT id FROM topics WHERE name='Làm việc trong nhà máy vs văn phòng' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('07a0f495-f5d2-45b2-b524-8dd231b0abf5','1e41ffa4-302a-430c-86d4-41695641ccc4','40d3f28c-f4c0-4e4e-90b3-422a8a3fd1a8','9ca0e684-bb94-4e78-9451-124833a38ab8');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '90b8f744-c76d-4d99-962a-cc3b3396851c', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm việc trong nhà máy vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a853e5b8-bf37-476a-9ff0-2962865969fc', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm việc trong nhà máy vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'db5640f6-79b3-4ebc-adb4-bd8aee4c5bc4', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm việc trong nhà máy vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'ca40e2d7-5dbf-4772-8ca2-f4acd356edbf', 'sp3-thu-vien-vs-quan-ca-phe', 'Thư viện vs quán cà phê', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Thư viện vs quán cà phê');
SET @t := (SELECT id FROM topics WHERE name='Thư viện vs quán cà phê' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('25b4a101-64ff-4273-93c5-6022110a47bd','4ca49dcd-2cd0-43fb-8fa8-6a88bcc4b7f5','61ab2b7e-d86d-4c9c-be1b-b417b5f03cf5','8157b1dd-d1f3-41d1-872b-dea36b028522');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '1389f823-24ab-47ca-93ba-c92ef7714626', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thư viện vs quán cà phê', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'eb345b4a-489e-4820-9adb-71cb0919e52f', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thư viện vs quán cà phê', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ebcb4360-3b07-46fe-9c2d-478f2e3931a2', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Thư viện vs quán cà phê', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '88cfafc8-7bd5-4bd4-be0b-f767ba90a568', 'sp3-an-healthy-vs-fast-food', 'Ăn healthy vs fast food', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Ăn healthy vs fast food');
SET @t := (SELECT id FROM topics WHERE name='Ăn healthy vs fast food' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('3340534c-e1d2-45b6-a7ef-81b4ed453433','6970e010-032b-48de-8372-a376f4de4a79','b7eef05d-1303-471f-afad-db575edaa429','d5ccbf3c-d79f-4cf3-aa8c-14b26c3cc36b');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '9bfc15fe-b7b1-40cf-81b5-f67e67e35084', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn healthy vs fast food', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '7e92e6ea-5974-47fc-8fd4-be4e504ce0b2', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn healthy vs fast food', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '21929844-1af8-4270-af8b-e663413e4798', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ăn healthy vs fast food', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '40b44dd1-f9f6-4b4e-b9ab-a35b0953ec9c', 'sp3-am-nhac-nghe-o-nha-vs-xem-truc-tiep', 'Âm nhạc: nghe ở nhà vs xem trực tiếp', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Âm nhạc: nghe ở nhà vs xem trực tiếp');
SET @t := (SELECT id FROM topics WHERE name='Âm nhạc: nghe ở nhà vs xem trực tiếp' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('0de8390b-eced-48a3-b464-25bbe89e197e','2c34d23d-1e9d-4741-8250-056a7ff7f0ff','e2f292cb-71df-4f96-8682-6b133cecb0c9');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'e5119224-d4f0-4b46-bc2a-9e2d08e31835', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Âm nhạc: nghe ở nhà vs xem trực tiếp', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '7d36d09f-7d74-4bba-8731-3a4c641b12ee', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Âm nhạc: nghe ở nhà vs xem trực tiếp', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'b5bcee91-fa86-4dec-9b4d-903d5ff1dbbf', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Âm nhạc: nghe ở nhà vs xem trực tiếp', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '867791b7-99a5-438a-a961-6aa531259220', 'sp3-lam-vuon-trong-cay', 'Làm vườn / trồng cây', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Làm vườn / trồng cây');
SET @t := (SELECT id FROM topics WHERE name='Làm vườn / trồng cây' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('8220d10e-c344-4c23-b152-901480306dfd','e853c697-64f8-4d28-9c30-b242f6913959','ee68f472-7ebb-411c-8b0b-a5cd909e0912');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '513c1611-3076-414c-ba72-b3385a64ab0d', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm vườn / trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '17ad707e-87e7-4b3b-8923-729c6591fd6f', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm vườn / trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '05d2be08-05fa-439d-a032-82ec095b90c1', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm vườn / trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '1bc88f41-059b-43b0-8ad7-258cb132006e', 'sp3-song-voi-gia-dinh-vs-song-mot-minh', 'Sống với gia đình vs sống một mình', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Sống với gia đình vs sống một mình');
SET @t := (SELECT id FROM topics WHERE name='Sống với gia đình vs sống một mình' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('c305d056-6477-43b3-8413-0dd596bee68e','d0c85535-d2e8-4fc2-9e9a-d65bf9c895a1','fdb83bd9-676e-49ce-8c7a-ec269e202d5a');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c0992ec1-4d6d-4584-8347-e69c8cf61e6e', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống với gia đình vs sống một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'f501eddb-1ce6-4e52-88e5-6893602dda1f', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống với gia đình vs sống một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd20cc73b-e0df-4ab4-aecf-6ba7dafb8726', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Sống với gia đình vs sống một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '3abbbe51-f60f-4169-80fa-f4446cdd04f0', 'sp3-nau-an-cung-gia-dinh-vs-nau-mot-minh', 'Nấu ăn cùng gia đình vs nấu một mình', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Nấu ăn cùng gia đình vs nấu một mình');
SET @t := (SELECT id FROM topics WHERE name='Nấu ăn cùng gia đình vs nấu một mình' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('336343e0-183a-4dd9-9e01-7b018ddca2af','f2495e55-2308-4d94-a2c9-ac0453a0ae76');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '541125f6-b4d4-48a3-9c7b-7d368d830b96', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nấu ăn cùng gia đình vs nấu một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '4f8cb90b-48ec-4f76-a2ba-6a9968956a19', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nấu ăn cùng gia đình vs nấu một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '49d11e90-a159-4c32-a90b-517b8cc69ae2', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nấu ăn cùng gia đình vs nấu một mình', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '69883394-7e55-45d0-a8f2-fdb355eb46f4', 'sp3-chup-anh-vs-viet-nhat-ky', 'Chụp ảnh vs viết nhật ký', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Chụp ảnh vs viết nhật ký');
SET @t := (SELECT id FROM topics WHERE name='Chụp ảnh vs viết nhật ký' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('69d1a8d8-f283-40b2-acef-a44591c25b1c','f79e8868-59ba-46ef-9fe7-252263b7081a');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0cc465f4-61f5-4016-b3f5-d33acf212db8', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chụp ảnh vs viết nhật ký', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'b2bfc963-63ed-4de2-88ae-99d2b8d7b1a4', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chụp ảnh vs viết nhật ký', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a2da8efc-519b-4ba1-aa30-85064eb94116', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Chụp ảnh vs viết nhật ký', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '9ad5ed13-08c8-40ec-901e-b399fa524dbf', 'sp3-nhat-rac-vs-trong-cay', 'Nhặt rác vs trồng cây', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Nhặt rác vs trồng cây');
SET @t := (SELECT id FROM topics WHERE name='Nhặt rác vs trồng cây' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('707ac18c-13a4-4db8-a617-7947a7a93fc2','8e1dda44-fe3f-40fb-98e1-35c563c39e7d');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'fed1054e-181a-4a34-b04a-b826d962907c', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nhặt rác vs trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ec114400-92bc-4040-8318-d1591a38c114', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nhặt rác vs trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '65d264a4-3320-4ced-a6c9-e1d11f93a26c', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Nhặt rác vs trồng cây', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '70a4dcb2-2b65-4264-a76d-b12cb25c22d9', 'sp3-mua-he-vs-mua-dong', 'Mùa hè vs mùa đông', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Mùa hè vs mùa đông');
SET @t := (SELECT id FROM topics WHERE name='Mùa hè vs mùa đông' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('a4551edf-34c0-43c6-bc2a-23aac63398d7','b724d7bc-8fab-4076-8c9f-2d2eba145c8f');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd6fdb808-b6cb-424f-aaa1-427b7a309bed', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Mùa hè vs mùa đông', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'fca8e0d1-a1da-467f-ba15-c5ddea71b461', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Mùa hè vs mùa đông', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '43968d86-d0cf-4014-9f67-619d9bc8c0f6', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Mùa hè vs mùa đông', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '7b1c718d-2206-4b93-9bdc-17b2b27dc505', 'sp3-o-nha-vs-van-phong', 'Ở nhà vs văn phòng', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Ở nhà vs văn phòng');
SET @t := (SELECT id FROM topics WHERE name='Ở nhà vs văn phòng' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('2ccbe5a0-8ed3-408b-aac5-c03c6387651e');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'e7a6d877-beeb-476c-ab47-975c91eee1a1', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ở nhà vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 19, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0b6a68f7-73d8-4d4e-97d5-3806a28d12db', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ở nhà vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 19, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '925d9db4-0649-478c-a7e5-0d77a70bd379', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Ở nhà vs văn phòng', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 19, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'bedb3b16-19e6-4d15-b16b-82fd8c35a18e', 'sp3-viec-nha', 'Việc nhà', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Việc nhà');
SET @t := (SELECT id FROM topics WHERE name='Việc nhà' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('40435b96-67b3-4387-9b96-d91d09a206d7');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'da644aff-51dd-4b0c-b954-85c73b86f736', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Việc nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c30831d6-bc63-4531-8cdb-65aef65862aa', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Việc nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'eaac6d0a-1193-4bff-8bfb-8d8e63c86751', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Việc nhà', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '6716ac7f-39be-42b8-9a65-abc0187d2bf0', 'sp3-lam-mot-minh-vs-lam-nhom', 'Làm một mình vs làm nhóm', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Làm một mình vs làm nhóm');
SET @t := (SELECT id FROM topics WHERE name='Làm một mình vs làm nhóm' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('60991d2b-92e4-4d50-af32-0cd8018c56de');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'fc687d18-3d2a-496f-96fe-39e55ca3487e', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm một mình vs làm nhóm', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 21, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd6a982cc-e8ed-48ff-ac4a-2cb3b5215e48', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm một mình vs làm nhóm', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 21, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a7792958-5535-453a-8cff-d138ad56bfd1', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Làm một mình vs làm nhóm', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 21, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '2522bbd5-5ce1-4199-8c85-7c825ca45a48', 'sp3-bao-tang-vs-noi-vui-choi', 'Bảo tàng vs nơi vui chơi', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Bảo tàng vs nơi vui chơi');
SET @t := (SELECT id FROM topics WHERE name='Bảo tàng vs nơi vui chơi' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('81312f48-bc50-4f47-bd69-9a5eb030fa6e');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '8a2b0ecc-ebe8-4393-b565-988d03ec17d7', '2026-08-26', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Bảo tàng vs nơi vui chơi', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 22, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '7dd37c07-2f8a-4871-88d1-c60804d38f93', '2026-08-27', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Bảo tàng vs nơi vui chơi', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 22, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'bb54372b-5d94-483e-88ea-4156675f3366', '2026-09-05', @t, '16000000-0000-4000-8000-000000000033', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Bảo tàng vs nơi vui chơi', 'Part 3', 'Bản tin dự đoán', 'PUBLISHED', 22, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000033');

-- ========== Speaking Part 4: 27 đề -> 19 chủ đề ==========

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '6e41d733-3345-4e99-8e72-b1c2460d10f1', 'sp4-lan-vuot-qua-kho-khan', 'Lần vượt qua khó khăn', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần vượt qua khó khăn');
SET @t := (SELECT id FROM topics WHERE name='Lần vượt qua khó khăn' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('1f4f336c-ebd0-4647-9423-5b5120e93d0c','6ac39461-1289-4c07-bdb7-46000ec51b21','7bbfcd46-86ea-4ce7-9af8-cb77ebcb78a9');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'b191874e-b531-4a57-a3bb-6b520966729f', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vượt qua khó khăn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'bd321621-e855-4512-939d-e557ef5331a6', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vượt qua khó khăn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '4fd90d0f-e7fb-4532-90a0-b6fdcd027fed', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vượt qua khó khăn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'bd427799-6562-4151-85c3-60e31446cd9c', 'sp4-lan-mua-do-dat-tien', 'Lần mua đồ đắt tiền', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần mua đồ đắt tiền');
SET @t := (SELECT id FROM topics WHERE name='Lần mua đồ đắt tiền' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('2a3d7732-df08-47f4-b350-83f199cc5d60','a4dd371d-7859-48ec-8a18-e23002c0c798','f0c55b94-ff8b-48aa-897f-09d1d70a54f3');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '26073256-1d5c-42ba-a049-9ae7145c995b', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần mua đồ đắt tiền', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0de64592-fd0b-4cbd-84bd-62b951964ffc', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần mua đồ đắt tiền', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '641f04e3-c5e3-4b05-89cb-178711e58e1b', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần mua đồ đắt tiền', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '788f603d-1882-46f9-8cd4-69da2961b190', 'sp4-lan-nhan-qua-tang-qua', 'Lần nhận quà / tặng quà', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần nhận quà / tặng quà');
SET @t := (SELECT id FROM topics WHERE name='Lần nhận quà / tặng quà' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('1374c054-9510-457b-a3e5-620dc2ad67f9','edc1f564-e9c1-4226-a57f-d84744a34cf3');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '6787f80c-fdbc-4fae-9e6c-a3e8e4dfa43c', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận quà / tặng quà', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '67fab450-fa00-4f40-9a71-2bbab80c08f3', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận quà / tặng quà', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '5e254557-62e3-45a8-aba5-b6a86a412deb', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận quà / tặng quà', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '1a5c96d9-c5ce-42d7-a748-2af0b81b1638', 'sp4-lan-voi-va-ban-ron', 'Lần vội vã / bận rộn', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần vội vã / bận rộn');
SET @t := (SELECT id FROM topics WHERE name='Lần vội vã / bận rộn' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('595d284b-d703-4fc8-b351-799bad1371dc','ecb00dcb-e061-479d-9f34-738b14454d4a');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '148d37ec-bd42-4f82-b108-d23bd2af72f1', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vội vã / bận rộn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '9b49024a-b6e6-436b-a618-e389fa4276cd', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vội vã / bận rộn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c94d24d2-02a6-4168-9b08-1aab31439553', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần vội vã / bận rộn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'c97c142b-0c93-4d7b-8ba5-03275a3c55a1', 'sp4-lan-giup-ai-do-duoc-giup-do', 'Lần giúp ai đó / được giúp đỡ', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần giúp ai đó / được giúp đỡ');
SET @t := (SELECT id FROM topics WHERE name='Lần giúp ai đó / được giúp đỡ' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('809f7e8b-48dc-4e1c-b76c-2fb752cd30fe','ee97e380-4087-47cc-8b68-9cf0dba7375c');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '6dbf5245-a945-4fab-a335-220a67b33b8a', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần giúp ai đó / được giúp đỡ', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2226a32d-409c-49c1-b1ee-1c0af81adcc2', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần giúp ai đó / được giúp đỡ', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '46ef51a9-ae52-4a1a-9e4c-0850a338f4b4', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần giúp ai đó / được giúp đỡ', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '6206c0df-654a-4eaa-9693-70d634824f41', 'sp4-lan-noi-chuyen-voi-nguoi-lon-nho-tuoi-hon', 'Lần nói chuyện với người lớn / nhỏ tuổi hơn', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần nói chuyện với người lớn / nhỏ tuổi hơn');
SET @t := (SELECT id FROM topics WHERE name='Lần nói chuyện với người lớn / nhỏ tuổi hơn' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('beeeaccb-3d46-4de9-9bb8-757e354290dc','cb128571-6ccb-41a4-91b1-03aadcab88da');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c1673bbb-b84d-4eaf-86db-230b8f702973', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nói chuyện với người lớn / nhỏ tuổi hơn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a5e8b8c0-1bc4-4fe5-8322-08cbee014476', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nói chuyện với người lớn / nhỏ tuổi hơn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c18b269a-15c0-4f2f-a057-af12ef8d18c9', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nói chuyện với người lớn / nhỏ tuổi hơn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '533e02a2-2e6e-427f-a94c-09b905413199', 'sp4-lan-xem-tac-pham-nghe-thuat', 'Lần xem tác phẩm nghệ thuật', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần xem tác phẩm nghệ thuật');
SET @t := (SELECT id FROM topics WHERE name='Lần xem tác phẩm nghệ thuật' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('05e31698-30ad-4b5e-a70e-03fe8af72f47');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '73303414-9df5-49f9-82a2-0f0a423d6ab3', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần xem tác phẩm nghệ thuật', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '7fef449e-1791-48e1-ba9d-e6be5c8589fc', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần xem tác phẩm nghệ thuật', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '66fe22b9-b706-454f-8a23-96e03085e73b', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần xem tác phẩm nghệ thuật', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'b17413dd-efd1-452e-80ea-a036d54da7e9', 'sp4-lan-tham-ai-do', 'Lần thăm ai đó', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần thăm ai đó');
SET @t := (SELECT id FROM topics WHERE name='Lần thăm ai đó' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('14948fc3-1a36-4ad7-b714-cdc6d0b32af0');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c8428b89-8902-4df4-be1d-e61bc7837ea9', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thăm ai đó', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '9cfbc9a2-c894-4c9b-8b3e-484066a807c9', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thăm ai đó', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a6c8b879-b952-48cf-863a-702e7a9ac4b7', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thăm ai đó', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '95710c14-9a3f-48c2-b508-860a28b55e71', 'sp4-lan-hoc-ky-nang-ngon-ngu-moi', 'Lần học kỹ năng / ngôn ngữ mới', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần học kỹ năng / ngôn ngữ mới');
SET @t := (SELECT id FROM topics WHERE name='Lần học kỹ năng / ngôn ngữ mới' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('202dcf4f-be98-4b16-bc9c-3e0d538c40e7');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '5ada8dd5-bf87-4b14-9f74-176cc3e6ca9a', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần học kỹ năng / ngôn ngữ mới', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'c9f4b3a2-b1ed-4f42-8f9c-36910f7b87b1', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần học kỹ năng / ngôn ngữ mới', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '47261e0c-14b2-446d-9f97-b05d74825d43', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần học kỹ năng / ngôn ngữ mới', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'd61fe074-44ae-4305-8197-329206377cb9', 'sp4-lan-nhan-tin-tot', 'Lần nhận tin tốt', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần nhận tin tốt');
SET @t := (SELECT id FROM topics WHERE name='Lần nhận tin tốt' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('2c82507e-90a8-46f4-9aab-41362aebca27');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'eb60be89-d15f-49e7-8d84-124eeae50de1', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận tin tốt', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2e07b22b-1adb-44ff-ae4c-a7db6824dab6', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận tin tốt', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'b8f294dd-5c6a-4019-96fe-abc2825171aa', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần nhận tin tốt', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '61a9e52b-89e1-4a05-8f2c-ae97b4dc55b9', 'sp4-lan-hoa-minh-vao-thien-nhien', 'Lần hoà mình vào thiên nhiên', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần hoà mình vào thiên nhiên');
SET @t := (SELECT id FROM topics WHERE name='Lần hoà mình vào thiên nhiên' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('31937872-70f1-49c9-bc43-2c0f37cbcd03');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'b0b27352-82ca-4469-b9d2-a31087ac2351', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần hoà mình vào thiên nhiên', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '0bd3ab5c-b2f5-404f-9046-c126591a473f', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần hoà mình vào thiên nhiên', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'f88a17e6-b827-4039-bdcc-d9c74d87ae26', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần hoà mình vào thiên nhiên', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'a4fce095-1b66-4b29-a5f5-a03e8c03a7a9', 'sp4-lan-dung-truoc-nhieu-lua-chon', 'Lần đứng trước nhiều lựa chọn', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần đứng trước nhiều lựa chọn');
SET @t := (SELECT id FROM topics WHERE name='Lần đứng trước nhiều lựa chọn' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('72ed8ff9-9212-4506-afa8-b59f1dc68e65');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '770d7e18-5ab0-4155-bd71-48b68c2af0e2', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đứng trước nhiều lựa chọn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '7d219279-4af6-4976-90c9-3a75702a1579', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đứng trước nhiều lựa chọn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '15668ad1-84ed-46dc-b97c-f0b71d5fd99c', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đứng trước nhiều lựa chọn', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '239892dc-21f9-4da3-bc10-f81ff89498e2', 'sp4-lan-di-choi-cong-vien-giai-tri', 'Lần đi chơi công viên giải trí', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần đi chơi công viên giải trí');
SET @t := (SELECT id FROM topics WHERE name='Lần đi chơi công viên giải trí' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('c44517d9-7cf2-408d-be1a-47023350f0a5');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '1f65728f-0f4a-4360-a745-458b4aaed75c', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đi chơi công viên giải trí', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '81a50212-bd06-49cf-9d1d-577f0bf6ccb4', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đi chơi công viên giải trí', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'af535e9e-ca62-40e6-bb75-41f6c462ac85', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đi chơi công viên giải trí', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '338a402d-317c-4aa5-87c2-65ae8d8bbb6d', 'sp4-lan-thu-mot-dieu-moi-mao-hiem', 'Lần thử một điều mới / mạo hiểm', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần thử một điều mới / mạo hiểm');
SET @t := (SELECT id FROM topics WHERE name='Lần thử một điều mới / mạo hiểm' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('c44f73a5-8afa-4c79-b489-ddacef648fe3');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'f9def8b2-7bd6-4ad8-ba97-e188bad1de59', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thử một điều mới / mạo hiểm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '4cab2059-13a7-4f2b-a800-3817c28ef687', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thử một điều mới / mạo hiểm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'e304d165-55c5-4929-bc2d-b6fb3243b7a0', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần thử một điều mới / mạo hiểm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '2404e0a3-fc27-4352-ab7f-fb10af20e8ef', 'sp4-lan-lam-viec-nhom', 'Lần làm việc nhóm', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần làm việc nhóm');
SET @t := (SELECT id FROM topics WHERE name='Lần làm việc nhóm' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('db83e3a2-adb9-42b8-8137-d4a770df15ca');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'd7275aa2-99e4-46f9-95b0-8af2c4825c90', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm việc nhóm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '6099be7e-0af2-4f8a-ad55-330d0f6f7f36', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm việc nhóm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '82df4119-a929-4e8f-a761-f34881302ca3', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm việc nhóm', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'de347199-13af-4253-9294-ca167dee4887', 'sp4-lan-lam-dieu-minh-khong-thich', 'Lần làm điều mình không thích', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần làm điều mình không thích');
SET @t := (SELECT id FROM topics WHERE name='Lần làm điều mình không thích' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('dd2cc5c5-00b7-406c-b86d-c520a6b406c6');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'a14023a0-64af-4660-9561-51b7b3dff788', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm điều mình không thích', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '73d02335-7215-4b6c-bb0b-9e0ec0f32d85', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm điều mình không thích', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'bb145a54-9a8f-46b6-892e-9f88a21e7444', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần làm điều mình không thích', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 15, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'e5fc2bb1-edfa-45d5-9bb1-571c27b2e7fe', 'sp4-lan-doc-mot-quyen-sach-hay', 'Lần đọc một quyển sách hay', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần đọc một quyển sách hay');
SET @t := (SELECT id FROM topics WHERE name='Lần đọc một quyển sách hay' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('ddc08cde-95db-4690-93ec-e7f2238d5bd4');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '33fd31ca-e1db-4e32-afa7-1b899dd2af88', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đọc một quyển sách hay', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'ed5d3f1d-f902-4e85-92db-b44095ef680e', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đọc một quyển sách hay', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '65d31eeb-a37c-4568-8be8-9c61ef27a67b', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đọc một quyển sách hay', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 16, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT '736af276-524c-4076-ae23-97e6703ed4cc', 'sp4-lan-su-dung-internet', 'Lần sử dụng Internet', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần sử dụng Internet');
SET @t := (SELECT id FROM topics WHERE name='Lần sử dụng Internet' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('e7887275-5e2f-4e3f-b61d-ba78308b51c1');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'eb995eb7-628a-419f-8b72-069361e9e948', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần sử dụng Internet', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'cb1662f3-0e9c-4696-9e32-689547b54443', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần sử dụng Internet', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT 'fbab0c98-a1d1-4076-8edc-1b2bbab68211', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần sử dụng Internet', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 17, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT 'dc0263b8-49a4-4925-aa37-79071bf53bb7', 'sp4-lan-dat-cau-hoi', 'Lần đặt câu hỏi', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE name='Lần đặt câu hỏi');
SET @t := (SELECT id FROM topics WHERE name='Lần đặt câu hỏi' LIMIT 1);
UPDATE question_sets SET topic_id=@t, updated_at=NOW()
WHERE id IN ('eda1d576-2d39-4f94-ba96-fec659c5564b');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '2ff99553-904e-43fc-b66b-53351d420ab0', '2026-08-26', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đặt câu hỏi', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-26' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '8b0faeb9-abb2-4875-8a62-17e849d26ebf', '2026-08-27', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đặt câu hỏi', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-08-27' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
INSERT INTO exam_predictions
 (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT '812a37be-e75d-4947-a6db-42e895c7445c', '2026-09-05', @t, '16000000-0000-4000-8000-000000000034', (SELECT id FROM components WHERE code='SPEAKING'), 'HOT', 'Lần đặt câu hỏi', 'Part 4', 'Bản tin dự đoán', 'PUBLISHED', 18, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM exam_predictions WHERE predict_date='2026-09-05' AND topic_id=@t AND part_id='16000000-0000-4000-8000-000000000034');
