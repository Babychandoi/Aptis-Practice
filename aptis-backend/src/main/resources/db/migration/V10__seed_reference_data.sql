-- =====================================================================
-- V10 : Seed dữ liệu tham chiếu
-- UUID cố định để môi trường dev/test/prod giống nhau và migration idempotent.
-- =====================================================================

-- ---------- Roles ----------
INSERT INTO roles (id, code, name, description, created_at, updated_at) VALUES
('10000000-0000-4000-8000-000000000001', 'STUDENT',          'Học viên',            'Người dùng cuối, luyện thi',                    NOW(), NOW()),
('10000000-0000-4000-8000-000000000002', 'CONTENT_EDITOR',   'Biên tập nội dung',   'Tạo và sửa câu hỏi',                            NOW(), NOW()),
('10000000-0000-4000-8000-000000000003', 'CONTENT_REVIEWER', 'Duyệt nội dung',      'Duyệt và xuất bản câu hỏi',                     NOW(), NOW()),
('10000000-0000-4000-8000-000000000004', 'TEACHER',          'Giáo viên',           'Chấm Speaking/Writing, xem bài học viên',       NOW(), NOW()),
('10000000-0000-4000-8000-000000000005', 'SUPPORT',          'Hỗ trợ',              'Hỗ trợ học viên, xem đơn hàng',                 NOW(), NOW()),
('10000000-0000-4000-8000-000000000006', 'FINANCE',          'Kế toán',             'Xem doanh thu, xử lý hoàn tiền',                NOW(), NOW()),
('10000000-0000-4000-8000-000000000007', 'ADMIN',            'Quản trị',            'Quản trị hệ thống',                             NOW(), NOW()),
('10000000-0000-4000-8000-000000000008', 'SUPER_ADMIN',      'Quản trị cấp cao',    'Toàn quyền',                                    NOW(), NOW());

-- ---------- Permissions ----------
INSERT INTO permissions (id, code, name, description) VALUES
('11000000-0000-4000-8000-000000000001', 'question_set:read',     'Xem câu hỏi',            NULL),
('11000000-0000-4000-8000-000000000002', 'question_set:write',    'Tạo/sửa câu hỏi',        NULL),
('11000000-0000-4000-8000-000000000003', 'question_set:review',   'Duyệt câu hỏi',          NULL),
('11000000-0000-4000-8000-000000000004', 'question_set:publish',  'Xuất bản câu hỏi',       NULL),
('11000000-0000-4000-8000-000000000005', 'question_set:archive',  'Lưu trữ câu hỏi',        NULL),
('11000000-0000-4000-8000-000000000006', 'asset:write',           'Tải file lên',           NULL),
('11000000-0000-4000-8000-000000000007', 'user:read',             'Xem học viên',           NULL),
('11000000-0000-4000-8000-000000000008', 'user:write',            'Sửa học viên',           NULL),
('11000000-0000-4000-8000-000000000009', 'entitlement:grant',     'Tặng/thu hồi quyền',     NULL),
('11000000-0000-4000-8000-000000000010', 'order:read',            'Xem đơn hàng',           NULL),
('11000000-0000-4000-8000-000000000011', 'refund:write',          'Xử lý hoàn tiền',        NULL),
('11000000-0000-4000-8000-000000000012', 'plan:write',            'Quản lý gói dịch vụ',    NULL),
('11000000-0000-4000-8000-000000000013', 'evaluation:review',     'Chấm/sửa điểm bài thi',  NULL),
('11000000-0000-4000-8000-000000000014', 'report:read',           'Xem báo cáo',            NULL),
('11000000-0000-4000-8000-000000000015', 'blueprint:write',       'Quản lý đề thi thử',     NULL),
('11000000-0000-4000-8000-000000000016', 'audit:read',            'Xem nhật ký quản trị',   NULL);

-- ---------- Role -> Permission ----------
-- CONTENT_EDITOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000002', id FROM permissions
WHERE code IN ('question_set:read', 'question_set:write', 'asset:write');

-- CONTENT_REVIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000003', id FROM permissions
WHERE code IN ('question_set:read', 'question_set:review', 'question_set:publish',
               'question_set:archive', 'asset:write');

-- TEACHER
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000004', id FROM permissions
WHERE code IN ('question_set:read', 'user:read', 'evaluation:review', 'report:read');

-- SUPPORT
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000005', id FROM permissions
WHERE code IN ('user:read', 'order:read');

-- FINANCE
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000006', id FROM permissions
WHERE code IN ('order:read', 'refund:write', 'plan:write', 'report:read');

-- ADMIN: tất cả trừ audit:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000007', id FROM permissions
WHERE code <> 'audit:read';

-- SUPER_ADMIN: tất cả
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-4000-8000-000000000008', id FROM permissions;

-- ---------- Task types ----------
INSERT INTO task_types
    (id, code, name, renderer_key, validator_key, response_type, schema_version, is_active, created_at, updated_at)
VALUES
('12000000-0000-4000-8000-000000000001', 'SINGLE_CHOICE',     'Chọn một đáp án',        'single-choice',     'SINGLE_CHOICE',     'SINGLE_CHOICE',     1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000002', 'MULTIPLE_CHOICE',   'Chọn nhiều đáp án',      'multiple-choice',   'MULTIPLE_CHOICE',   'MULTIPLE_CHOICE',   1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000003', 'GAP_FILL_CHOICE',   'Điền khuyết có sẵn',     'gap-fill-choice',   'SINGLE_CHOICE',     'SINGLE_CHOICE',     1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000004', 'MATCHING',          'Nối cặp',                'matching',          'MATCHING',          'MATCHING',          1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000005', 'SPEAKER_MATCHING',  'Nối người nói',          'speaker-matching',  'MATCHING',          'MATCHING',          1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000006', 'HEADING_MATCHING',  'Nối tiêu đề',            'heading-matching',  'MATCHING',          'MATCHING',          1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000007', 'SENTENCE_ORDERING', 'Sắp xếp câu',            'sentence-ordering', 'ORDERING',          'SENTENCE_ORDERING', 1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000008', 'SHORT_TEXT',        'Trả lời ngắn',           'short-text',        'TEXT_EXACT',        'SHORT_TEXT',        1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000009', 'LONG_TEXT',         'Viết đoạn/bài',          'long-text',         NULL,                'LONG_TEXT',         1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000010', 'AUDIO_RECORDING',   'Ghi âm',                 'audio-recording',   NULL,                'AUDIO_RECORDING',   1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000011', 'IMAGE_DESCRIPTION', 'Miêu tả tranh',          'image-description', NULL,                'AUDIO_RECORDING',   1, TRUE, NOW(), NOW()),
('12000000-0000-4000-8000-000000000012', 'IMAGE_COMPARISON',  'So sánh hai tranh',      'image-comparison',  NULL,                'AUDIO_RECORDING',   1, TRUE, NOW(), NOW());

-- ---------- Exam product / version ----------
INSERT INTO exam_products (id, code, name, description, is_active, created_at, updated_at) VALUES
('13000000-0000-4000-8000-000000000001', 'APTIS_GENERAL',  'Aptis General',  'Bài thi Aptis General của British Council', TRUE, NOW(), NOW()),
('13000000-0000-4000-8000-000000000002', 'APTIS_ADVANCED', 'Aptis Advanced', 'Bài thi Aptis Advanced',                    TRUE, NOW(), NOW());

INSERT INTO exam_versions (id, exam_product_id, code, name, valid_from, valid_to, status, created_at, updated_at) VALUES
('14000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001',
 'APTIS_GENERAL_2024', 'Aptis General 2024', '2024-01-01', NULL, 'PUBLISHED', NOW(), NOW());

-- ---------- Components ----------
INSERT INTO components
    (id, exam_version_id, code, name, description, display_order, duration_seconds, max_score, is_active, created_at, updated_at)
VALUES
('15000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'GRAMMAR_VOCABULARY', 'Grammar & Vocabulary', 'Ngữ pháp và từ vựng', 1, 1500, 50.00, TRUE, NOW(), NOW()),
('15000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', 'READING',            'Reading',              'Đọc hiểu',            2, 1800, 50.00, TRUE, NOW(), NOW()),
('15000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000001', 'LISTENING',          'Listening',            'Nghe hiểu',           3, 1500, 50.00, TRUE, NOW(), NOW()),
('15000000-0000-4000-8000-000000000004', '14000000-0000-4000-8000-000000000001', 'SPEAKING',           'Speaking',             'Nói',                 4,  720, 50.00, TRUE, NOW(), NOW()),
('15000000-0000-4000-8000-000000000005', '14000000-0000-4000-8000-000000000001', 'WRITING',            'Writing',              'Viết',                5, 3000, 50.00, TRUE, NOW(), NOW());

-- ---------- Parts ----------
-- Grammar & Vocabulary
INSERT INTO parts (id, component_id, code, name, description, instructions, display_order, default_duration_seconds, is_active, created_at, updated_at) VALUES
('16000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'GRAMMAR',    'Grammar',    'Câu hỏi ngữ pháp', 'Chọn đáp án đúng.',              1, 750, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000001', 'VOCABULARY', 'Vocabulary', 'Câu hỏi từ vựng',  'Chọn từ phù hợp nhất.',          2, 750, TRUE, NOW(), NOW());

-- Reading Part 1-4
INSERT INTO parts (id, component_id, code, name, description, instructions, display_order, default_duration_seconds, is_active, created_at, updated_at) VALUES
('16000000-0000-4000-8000-000000000011', '15000000-0000-4000-8000-000000000002', 'PART_1', 'Reading Part 1', 'Điền từ vào đoạn văn ngắn',  'Chọn từ phù hợp cho mỗi khoảng trống.',        1, 300, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000012', '15000000-0000-4000-8000-000000000002', 'PART_2', 'Reading Part 2', 'Sắp xếp câu thành đoạn',      'Sắp xếp các câu theo thứ tự đúng.',            2, 420, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000013', '15000000-0000-4000-8000-000000000002', 'PART_3', 'Reading Part 3', 'Nối phát biểu với người nói',  'Nối mỗi phát biểu với người phù hợp.',         3, 480, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000014', '15000000-0000-4000-8000-000000000002', 'PART_4', 'Reading Part 4', 'Nối tiêu đề với đoạn văn',    'Nối mỗi đoạn với tiêu đề phù hợp.',            4, 600, TRUE, NOW(), NOW());

-- Listening Part 1-4
INSERT INTO parts (id, component_id, code, name, description, instructions, display_order, default_duration_seconds, is_active, created_at, updated_at) VALUES
('16000000-0000-4000-8000-000000000021', '15000000-0000-4000-8000-000000000003', 'PART_1', 'Listening Part 1', 'Nghe đoạn hội thoại ngắn',     'Nghe và chọn đáp án đúng.',                   1, 600, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000022', '15000000-0000-4000-8000-000000000003', 'PART_2', 'Listening Part 2', 'Nối ý kiến với người nói',      'Nghe và nối mỗi ý kiến với người nói.',       2, 300, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000023', '15000000-0000-4000-8000-000000000003', 'PART_3', 'Listening Part 3', 'Xác định quan điểm hai người',  'Nghe và xác định ai nêu ý kiến nào.',         3, 300, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000024', '15000000-0000-4000-8000-000000000003', 'PART_4', 'Listening Part 4', 'Nghe độc thoại dài',            'Nghe và chọn đáp án đúng.',                   4, 300, TRUE, NOW(), NOW());

-- Speaking Part 1-4
INSERT INTO parts (id, component_id, code, name, description, instructions, display_order, default_duration_seconds, is_active, created_at, updated_at) VALUES
('16000000-0000-4000-8000-000000000031', '15000000-0000-4000-8000-000000000004', 'PART_1', 'Speaking Part 1', 'Trả lời câu hỏi cá nhân',       'Trả lời 3 câu hỏi, mỗi câu 30 giây.',          1, 150, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000032', '15000000-0000-4000-8000-000000000004', 'PART_2', 'Speaking Part 2', 'Miêu tả tranh',                 'Miêu tả tranh và trả lời câu hỏi liên quan.',  2, 180, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000033', '15000000-0000-4000-8000-000000000004', 'PART_3', 'Speaking Part 3', 'So sánh hai tranh',             'So sánh hai tranh và nêu quan điểm.',          3, 180, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000034', '15000000-0000-4000-8000-000000000004', 'PART_4', 'Speaking Part 4', 'Nói về chủ đề trừu tượng',      'Chuẩn bị 1 phút, nói 2 phút.',                 4, 240, TRUE, NOW(), NOW());

-- Writing Part 1-4
INSERT INTO parts (id, component_id, code, name, description, instructions, display_order, default_duration_seconds, is_active, created_at, updated_at) VALUES
('16000000-0000-4000-8000-000000000041', '15000000-0000-4000-8000-000000000005', 'PART_1', 'Writing Part 1', 'Điền form ngắn',              'Trả lời 5 câu, mỗi câu 1-5 từ.',               1,  180, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000042', '15000000-0000-4000-8000-000000000005', 'PART_2', 'Writing Part 2', 'Viết đoạn ngắn',              'Viết 20-30 từ.',                               2,  420, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000043', '15000000-0000-4000-8000-000000000005', 'PART_3', 'Writing Part 3', 'Trả lời trên diễn đàn',       'Trả lời 3 câu hỏi, mỗi câu 30-40 từ.',         3,  600, TRUE, NOW(), NOW()),
('16000000-0000-4000-8000-000000000044', '15000000-0000-4000-8000-000000000005', 'PART_4', 'Writing Part 4', 'Viết hai email',              'Viết email thân mật 50 từ và email trang trọng 120-150 từ.', 4, 1800, TRUE, NOW(), NOW());

-- ---------- Topics ----------
INSERT INTO topics (id, parent_id, code, name, description, is_active, created_at, updated_at) VALUES
('17000000-0000-4000-8000-000000000001', NULL, 'DAILY_LIFE',    'Đời sống hàng ngày', NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000002', NULL, 'WORK_CAREER',   'Công việc',          NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000003', NULL, 'EDUCATION',     'Giáo dục',           NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000004', NULL, 'ENVIRONMENT',   'Môi trường',         NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000005', NULL, 'TECHNOLOGY',    'Công nghệ',          NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000006', NULL, 'HEALTH_SPORT',  'Sức khỏe & thể thao',NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000007', NULL, 'TRAVEL',        'Du lịch',            NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000008', NULL, 'CULTURE_ARTS',  'Văn hóa & nghệ thuật', NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000009', NULL, 'SHOPPING_MONEY','Mua sắm & tiền bạc', NULL, TRUE, NOW(), NOW()),
('17000000-0000-4000-8000-000000000010', NULL, 'SOCIETY',       'Xã hội',             NULL, TRUE, NOW(), NOW());

-- ---------- Subscription plans ----------
INSERT INTO subscription_plans
    (id, code, name, description, billing_type, duration_days, price_amount, currency, status, display_order, created_at, updated_at)
VALUES
('18000000-0000-4000-8000-000000000001', 'PREMIUM_30',   'Premium 30 ngày',  'Truy cập toàn bộ nội dung Premium trong 30 ngày',  'ONE_TIME',   30,   199000, 'VND', 'ACTIVE', 1, NOW(), NOW()),
('18000000-0000-4000-8000-000000000002', 'PREMIUM_90',   'Premium 90 ngày',  'Truy cập toàn bộ nội dung Premium trong 90 ngày',  'ONE_TIME',   90,   499000, 'VND', 'ACTIVE', 2, NOW(), NOW()),
('18000000-0000-4000-8000-000000000003', 'PREMIUM_180',  'Premium 180 ngày', 'Truy cập toàn bộ nội dung Premium trong 180 ngày', 'ONE_TIME',  180,   849000, 'VND', 'ACTIVE', 3, NOW(), NOW()),
('18000000-0000-4000-8000-000000000004', 'PREMIUM_365',  'Premium 365 ngày', 'Truy cập toàn bộ nội dung Premium trong 1 năm',    'ONE_TIME',  365,  1390000, 'VND', 'ACTIVE', 4, NOW(), NOW()),
('18000000-0000-4000-8000-000000000005', 'PREMIUM_LIFE', 'Premium trọn đời', 'Truy cập vĩnh viễn',                               'ONE_TIME', NULL,  2990000, 'VND', 'ACTIVE', 5, NOW(), NOW());

-- ---------- Plan features ----------
-- Mọi gói đều mở toàn bộ feature; khác biệt duy nhất là thời hạn.
INSERT INTO plan_features (id, plan_id, feature_code, feature_value, display_name, display_order)
SELECT
    UUID(),
    p.id,
    f.feature_code,
    f.feature_value,
    f.display_name,
    f.display_order
FROM subscription_plans p
CROSS JOIN (
    SELECT 'PREMIUM_CONTENT_ACCESS' AS feature_code, 'true'      AS feature_value, 'Toàn bộ ngân hàng đề Premium' AS display_name, 1 AS display_order
    UNION ALL SELECT 'UNLIMITED_PRACTICE',   'true',      'Luyện tập không giới hạn',        2
    UNION ALL SELECT 'FULL_MOCK_TEST',       'true',      'Thi thử đầy đủ 4 kỹ năng',        3
    UNION ALL SELECT 'AI_WRITING_FEEDBACK',  'unlimited', 'Chấm Writing bằng AI',            4
    UNION ALL SELECT 'AI_SPEAKING_FEEDBACK', 'unlimited', 'Chấm Speaking bằng AI',           5
    UNION ALL SELECT 'DETAILED_ANALYTICS',   'true',      'Phân tích chi tiết theo Part',    6
    UNION ALL SELECT 'DOWNLOAD_REPORT',      'true',      'Tải báo cáo học tập',             7
) f
WHERE p.code IN ('PREMIUM_30', 'PREMIUM_90', 'PREMIUM_180', 'PREMIUM_365', 'PREMIUM_LIFE');

-- ---------- Mock test blueprint ----------
INSERT INTO test_blueprints
    (id, exam_version_id, component_id, code, name, description, mode, access_level, duration_seconds, status, created_at, updated_at)
VALUES
('19000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', NULL,
 'MOCK_FULL_V1', 'Thi thử Aptis General - Đề đầy đủ', 'Đầy đủ 5 học phần theo cấu trúc thi thật',
 'MOCK_TEST', 'PREMIUM', 9000, 'DRAFT', NOW(), NOW()),
('19000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', NULL,
 'MOCK_SHORT_FREE_V1', 'Thi thử rút gọn (miễn phí)', 'Đề rút gọn để học viên trải nghiệm',
 'MOCK_TEST', 'FREE', 1800, 'DRAFT', NOW(), NOW());
