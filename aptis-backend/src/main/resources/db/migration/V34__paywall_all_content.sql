-- Bỏ hẳn nội dung miễn phí vĩnh viễn: mọi bộ đề và mọi đề thi thử đều cần
-- Premium. Học viên mới được dùng thử 2 ngày kể từ lúc tạo tài khoản
-- (aptis.entitlement.signup-trial-days), sau đó phải trả phí.
--
-- Đổi luôn dữ liệu chứ không chỉ dựa vào cờ paywall-after-trial: giữ hai nguồn
-- sự thật thì trang quản trị vẫn hiện nhãn FREE trong khi học viên bị khoá.
UPDATE question_sets SET access_level = 'PREMIUM' WHERE access_level = 'FREE';
UPDATE test_blueprints SET access_level = 'PREMIUM' WHERE access_level = 'FREE';

-- content_access_overrides KHÔNG đổi: đó là quyền admin mở riêng cho từng học
-- viên, có thời hạn, không phải nhãn nội dung.
