-- Bổ sung các thời hạn mua AI English Lounge. Đây vẫn là sản phẩm riêng,
-- không cấp quyền Premium luyện đề.
INSERT INTO subscription_plans
    (id, code, name, description, billing_type, duration_days, price_amount, currency, status, display_order, created_at, updated_at)
VALUES
('18000000-0000-4000-8000-000000000008', 'AI_LOUNGE_7', 'AI English Lounge 7 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 7 ngày, tối đa 120 phút mỗi ngày',
 'ONE_TIME', 7, 69000, 'VND', 'ACTIVE', 99, NOW(), NOW()),
('18000000-0000-4000-8000-000000000009', 'AI_LOUNGE_14', 'AI English Lounge 14 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 14 ngày, tối đa 120 phút mỗi ngày',
 'ONE_TIME', 14, 129000, 'VND', 'ACTIVE', 100, NOW(), NOW()),
('18000000-0000-4000-8000-000000000010', 'AI_LOUNGE_180', 'AI English Lounge 180 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 180 ngày, tối đa 120 phút mỗi ngày',
 'ONE_TIME', 180, 1299000, 'VND', 'ACTIVE', 103, NOW(), NOW()),
('18000000-0000-4000-8000-000000000011', 'AI_LOUNGE_365', 'AI English Lounge 365 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 365 ngày, tối đa 120 phút mỗi ngày',
 'ONE_TIME', 365, 2399000, 'VND', 'ACTIVE', 104, NOW(), NOW());

INSERT INTO plan_features (id, plan_id, feature_code, feature_value, display_name, display_order) VALUES
(UUID(), '18000000-0000-4000-8000-000000000008', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000008', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2),
(UUID(), '18000000-0000-4000-8000-000000000008', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3),
(UUID(), '18000000-0000-4000-8000-000000000009', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000009', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2),
(UUID(), '18000000-0000-4000-8000-000000000009', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3),
(UUID(), '18000000-0000-4000-8000-000000000010', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000010', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2),
(UUID(), '18000000-0000-4000-8000-000000000010', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3),
(UUID(), '18000000-0000-4000-8000-000000000011', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000011', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2),
(UUID(), '18000000-0000-4000-8000-000000000011', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3),
(UUID(), '18000000-0000-4000-8000-000000000006', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3),
(UUID(), '18000000-0000-4000-8000-000000000007', 'AI_CONVERSATION_DAILY_LIMIT', '120', 'Tối đa 120 phút mỗi ngày', 3);
