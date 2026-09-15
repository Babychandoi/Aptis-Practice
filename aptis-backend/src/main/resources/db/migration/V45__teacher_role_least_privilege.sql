-- Thu hẹp quyền của vai trò TEACHER.
--
-- V10 dựng vai trò TEACHER cho nhân viên chấm bài nội bộ ("Chấm Speaking/Writing,
-- xem bài học viên") nên cấp kèm user:read và report:read — hồi đó người giữ vai
-- trò này là người của công ty.
--
-- Từ khi bán tài khoản giáo viên ra ngoài, vai trò vẫn giữ nguyên quyền cũ, nên
-- một giáo viên khách hàng đọc được /admin/users (toàn bộ email người dùng của
-- nền tảng) và /admin/reports. Đây là rò rỉ dữ liệu khách hàng, gỡ bỏ.
--
-- question_set:read vẫn giữ: giáo viên cần xem đề hệ thống để giao bài cho lớp
-- (AssignmentService kiểm tra riêng lớp nào được bật kho đề hệ thống).
-- evaluation:review vẫn giữ: đó là việc chấm bài, đúng với vai trò.

DELETE rp FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.code = 'TEACHER'
  AND p.code IN ('user:read', 'report:read');

-- Mô tả lại vai trò cho khớp thực tế: đây là giáo viên bên ngoài có lớp riêng,
-- không phải nhân viên chấm bài.
UPDATE roles
SET description = 'Dạy lớp của mình: giao bài, chấm bài, theo dõi học viên trong lớp'
WHERE code = 'TEACHER';
