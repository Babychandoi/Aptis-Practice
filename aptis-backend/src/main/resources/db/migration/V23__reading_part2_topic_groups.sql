-- Gom các bộ Reading Part 2 cùng chủ đề về chung một topic.
--
-- Đề thi thử lấy 2 bộ từ Part 2. Ngân hàng đề có nhiều bộ là các phiên bản khác
-- nhau của cùng một chủ đề (famous singer ×4, coffee shop ×4, healthy eating ×2...).
-- Câu chữ khác nhau nên không phải trùng dữ liệu, nhưng nếu một lượt thi rơi vào
-- hai phiên bản của cùng chủ đề thì học viên đọc hai đoạn gần như giống nhau.
--
-- Trước migration này mỗi bộ có topic riêng ("Part 2.N") nên topic không mang
-- nghĩa chủ đề và không dùng để chặn được. Sau migration, topic thành nhóm chủ
-- đề thật; MockTestService loại trừ topic đã chọn để hai bộ trong cùng một đề
-- luôn khác chủ đề.

-- ---------------------------------------------------------------
-- 1. Topic nhóm chủ đề cho Reading Part 2.
-- ---------------------------------------------------------------

INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES
('a2200000-0000-4000-8000-000000000001', NULL, 'R2_FILMS',          'Phim ảnh',              'Films, movies then and now',            TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000002', NULL, 'R2_SPORTS_EVENT',   'Sự kiện thể thao',      'Weekend activities, family sports day', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000003', NULL, 'R2_SINGER',         'Ca sĩ nổi tiếng',       'The famous singer các phiên bản',       TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000004', NULL, 'R2_WRITING_PLACE',  'Viết về một địa điểm',  'Writing about a place các phiên bản',   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000005', NULL, 'R2_TRANSPORT',      'Giao thông',            'History of transportation, public transport', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000006', NULL, 'R2_COFFEE_SHOP',    'Quán cà phê',           'New/busy coffee shop, eating at restaurant', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000007', NULL, 'R2_AI',             'Trí tuệ nhân tạo',      'Artificial intelligence các phiên bản', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000008', NULL, 'R2_WELLNESS_EVENT', 'Sự kiện sức khỏe',      'Company wellness day, wellness fair',   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000009', NULL, 'R2_WORKPLACE',      'Môi trường làm việc',   'Workplace evolution, work',             TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000010', NULL, 'R2_MUSIC_EVENT',    'Sự kiện âm nhạc',       'Music show at the park',                TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000011', NULL, 'R2_MAE_SPACE',      'Mae và vũ trụ',         'Mae the math girl, first woman in space', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000012', NULL, 'R2_IOT',            'Internet of Things',    'IoT',                                   TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000013', NULL, 'R2_PRESENTATION',   'Thuyết trình',          'Group presentation, end of term project', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000014', NULL, 'R2_SOCIAL_MEDIA',   'Mạng xã hội',           'Social media',                          TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000015', NULL, 'R2_CAMPUS_DAY',     'Ngày mở cửa trường',    'University open day, college welcoming day', TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000016', NULL, 'R2_HEALTHY_EATING', 'Ăn uống lành mạnh',     'Healthy eating các phiên bản',          TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000017', NULL, 'R2_CULTURE_EVENT',  'Sự kiện văn hóa',       'Cultural festival',                     TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000018', NULL, 'R2_TOURISM',        'Du lịch',               'Tourism',                               TRUE, NOW(), NOW()),
('a2200000-0000-4000-8000-000000000019', NULL, 'R2_TECH_EVENT',     'Sự kiện công nghệ',     'Tech fair',                             TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_active = TRUE,
    updated_at = NOW();

-- ---------------------------------------------------------------
-- 2. Gán lại topic theo nhóm chủ đề.
--    Các bộ cùng nhóm sẽ không bao giờ xuất hiện cùng nhau trong một đề.
-- ---------------------------------------------------------------

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000001', updated_at = NOW()
WHERE code IN ('READING_PART_2_01', 'READING_PART_2_06');                       -- Films / Movies then and now

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000002', updated_at = NOW()
WHERE code IN ('READING_PART_2_02', 'READING_PART_2_04');                       -- Weekend activities / Family sports day

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000003', updated_at = NOW()
WHERE code IN ('READING_PART_2_03', 'READING_PART_2_24',
               'READING_PART_2_25', 'READING_PART_2_39');                       -- The famous singer ×4

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000004', updated_at = NOW()
WHERE code IN ('READING_PART_2_05', 'READING_PART_2_26');                       -- Writing about a place ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000005', updated_at = NOW()
WHERE code IN ('READING_PART_2_07', 'READING_PART_2_31', 'READING_PART_2_38');  -- Transportation ×3

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000006', updated_at = NOW()
WHERE code IN ('READING_PART_2_08', 'READING_PART_2_15', 'READING_PART_2_27',
               'READING_PART_2_28', 'READING_PART_2_33');                       -- Coffee shop / restaurant ×5

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000007', updated_at = NOW()
WHERE code IN ('READING_PART_2_09', 'READING_PART_2_21');                       -- AI ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000008', updated_at = NOW()
WHERE code IN ('READING_PART_2_10', 'READING_PART_2_23');                       -- Wellness event ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000009', updated_at = NOW()
WHERE code IN ('READING_PART_2_11', 'READING_PART_2_17', 'READING_PART_2_29');  -- Workplace ×3

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000010', updated_at = NOW()
WHERE code = 'READING_PART_2_12';                                              -- Music show

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000011', updated_at = NOW()
WHERE code IN ('READING_PART_2_13', 'READING_PART_2_18');                       -- Mae ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000012', updated_at = NOW()
WHERE code = 'READING_PART_2_14';                                              -- IoT

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000013', updated_at = NOW()
WHERE code IN ('READING_PART_2_16', 'READING_PART_2_36');                       -- Presentation ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000014', updated_at = NOW()
WHERE code = 'READING_PART_2_19';                                              -- Social media

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000015', updated_at = NOW()
WHERE code IN ('READING_PART_2_20', 'READING_PART_2_37');                       -- Campus open day ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000016', updated_at = NOW()
WHERE code IN ('READING_PART_2_22', 'READING_PART_2_34');                       -- Healthy eating ×2

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000017', updated_at = NOW()
WHERE code = 'READING_PART_2_30';                                              -- Cultural festival

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000018', updated_at = NOW()
WHERE code = 'READING_PART_2_32';                                              -- Tourism

UPDATE question_sets SET topic_id = 'a2200000-0000-4000-8000-000000000019', updated_at = NOW()
WHERE code = 'READING_PART_2_35';                                              -- Tech fair

-- ---------------------------------------------------------------
-- 3. Dọn các topic "Part 2.N" cũ: chúng chỉ là nhãn tạm khi seed, giờ không còn
--    bộ nào trỏ vào. Chỉ xoá khi thực sự không còn tham chiếu.
-- ---------------------------------------------------------------

DELETE FROM topics
WHERE code LIKE 'READING_PART_2_%'
  AND NOT EXISTS (SELECT 1 FROM question_sets qs WHERE qs.topic_id = topics.id);
