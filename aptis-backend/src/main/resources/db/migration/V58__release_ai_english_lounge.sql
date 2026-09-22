-- Phát hành chính thức gói AI English Lounge để học viên có thể mua.
UPDATE subscription_plans
SET status = 'ACTIVE', updated_at = NOW()
WHERE code IN ('AI_LOUNGE_30', 'AI_LOUNGE_90');
