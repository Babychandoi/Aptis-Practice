-- Chưa phát hành cho học viên: giữ cấu hình/key pool cho admin nhưng không cho mua gói.
UPDATE subscription_plans
SET status = 'INACTIVE', updated_at = NOW()
WHERE code IN ('AI_LOUNGE_30', 'AI_LOUNGE_90');
