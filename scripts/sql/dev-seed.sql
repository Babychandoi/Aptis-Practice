-- Kích hoạt sẵn mọi tài khoản dev: khỏi phải vào Mailpit bấm link xác thực.
UPDATE users SET status='ACTIVE', email_verified_at=NOW();

-- Gán vai trò
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email='admin@dev.local' AND r.code='SUPER_ADMIN';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email='teacher@dev.local' AND r.code='TEACHER';

-- Học viên: vai STUDENT đã gán lúc đăng ký, không cần thêm.

-- Tạo lớp cho giáo viên, mã cố định để dễ nhớ khi test.
INSERT INTO classrooms
 (id, teacher_user_id, name, description, join_code, join_enabled,
  system_content_enabled, pricing_type, price_amount, status, created_at, updated_at)
SELECT 'd0000000-0000-4000-8000-000000000001', u.id,
 'Aptis Cấp tốc T9 – Sáng thứ 7', 'Lớp mẫu để thử tính năng',
 'DEV123', 1, 1, 'FREE', 0, 'ACTIVE', NOW(), NOW()
FROM users u WHERE u.email='teacher@dev.local';

-- Xếp sẵn 2 học viên vào lớp, để 1 người tự thử quét mã DEV123.
INSERT INTO classroom_members
 (id, classroom_id, user_id, role, status, payment_status, joined_at, created_at, updated_at)
SELECT UUID(), 'd0000000-0000-4000-8000-000000000001', u.id,
 'STUDENT', 'ACTIVE', 'NOT_REQUIRED', NOW(), NOW(), NOW()
FROM users u WHERE u.email IN ('student@dev.local','student2@dev.local');

-- Premium cho một học viên để thử phần chung của hệ thống.
INSERT INTO user_entitlements
 (id, user_id, entitlement_code, source_type, starts_at, ends_at, created_at, updated_at)
SELECT UUID(), u.id, 'PREMIUM_CONTENT_ACCESS', 'ADMIN_GRANT',
 NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY), NOW(), NOW()
FROM users u WHERE u.email='student@dev.local';
