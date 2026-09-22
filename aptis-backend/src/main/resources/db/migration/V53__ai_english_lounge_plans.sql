-- AI English Lounge là sản phẩm tách biệt: không thêm quyền này vào Premium luyện đề.
INSERT INTO subscription_plans
    (id, code, name, description, billing_type, duration_days, price_amount, currency, status, display_order, created_at, updated_at)
VALUES
('18000000-0000-4000-8000-000000000006', 'AI_LOUNGE_30', 'AI English Lounge 30 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 30 ngày', 'ONE_TIME', 30, 99000, 'VND', 'ACTIVE', 101, NOW(), NOW()),
('18000000-0000-4000-8000-000000000007', 'AI_LOUNGE_90', 'AI English Lounge 90 ngày',
 'Trò chuyện tiếng Anh bằng giọng nói cùng AI trong 90 ngày', 'ONE_TIME', 90, 249000, 'VND', 'ACTIVE', 102, NOW(), NOW());

INSERT INTO plan_features (id, plan_id, feature_code, feature_value, display_name, display_order) VALUES
(UUID(), '18000000-0000-4000-8000-000000000006', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000006', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2),
(UUID(), '18000000-0000-4000-8000-000000000007', 'AI_CONVERSATION_ACCESS', 'true', 'Mở AI English Lounge', 1),
(UUID(), '18000000-0000-4000-8000-000000000007', 'AI_CONVERSATION_VOICE', 'true', 'Hội thoại tiếng Anh bằng giọng nói', 2);
