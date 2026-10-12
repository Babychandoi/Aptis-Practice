-- Register and verify this exact email first. Run only on the IELTS database.
-- Use an authenticated database operator; this file contains no password.
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'teacher@ielts.local'
  AND u.status = 'ACTIVE'
  AND u.email_verified_at IS NOT NULL
  AND r.code = 'TEACHER';
