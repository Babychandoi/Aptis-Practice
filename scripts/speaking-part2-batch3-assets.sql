SET NAMES utf8mb4;

INSERT INTO assets
    (id, bucket_name, object_key, asset_type, mime_type, original_filename,
     file_size, access_scope, status, created_at, updated_at)
VALUES
('e7000000-0000-4000-8000-000000000001', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000001.jpg', 'IMAGE', 'image/jpeg', 'Đám đông đi qua đường.jpg', 410823, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000002', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000002.jpg', 'IMAGE', 'image/jpeg', 'Người đàn ông nhảy múa.jpg', 104947, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000003', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000003.jpg', 'IMAGE', 'image/jpeg', 'Nhóm người xem phim tại rạp.jpg', 63324, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000004', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000004.png', 'IMAGE', 'image/png', 'Trang trí nhà (2026).png', 2058963, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000005', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000005.png', 'IMAGE', 'image/png', 'Sử dụng điện thoại (2026).png', 2070502, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000006', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000006.jpg', 'IMAGE', 'image/jpeg', 'Gia đình cùng nhau đạp xe (2026).jpg', 60293, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000007', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000007.jpg', 'IMAGE', 'image/jpeg', 'Ba người trao đổi trong buổi phỏng vấn (2026).jpg', 204080, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000008', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000008.png', 'IMAGE', 'image/png', 'Người lớn và trẻ nhỏ cưỡi ngựa.png', 321883, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000009', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000009.png', 'IMAGE', 'image/png', 'Phỏng vấn truyền hình ngoài trời - da cat watermark (2026).png', 1638919, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000010', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000010.jpg', 'IMAGE', 'image/jpeg', 'Nature - walking in a forest.jpg', 2744353, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000011', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000011.jpg', 'IMAGE', 'image/jpeg', 'Queuing at a ticket office.jpg', 395114, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000012', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000012.jpg', 'IMAGE', 'image/jpeg', 'Drawing together.jpg', 414085, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000013', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000013.jpg', 'IMAGE', 'image/jpeg', 'Người mẹ đọc sách cùng con gái.jpg', 174398, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000014', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000014.png', 'IMAGE', 'image/png', 'Học nhóm - học cùng người khác (2026).png', 2208610, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e7000000-0000-4000-8000-000000000015', 'aptis-content', 'content/speaking/part2c/images/e7000000-0000-4000-8000-000000000015.jpg', 'IMAGE', 'image/jpeg', 'Hai người phụ nữ ngồi trên xe buýt.jpg', 298767, 'SIGNED_URL', 'READY', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    bucket_name = VALUES(bucket_name),
    object_key = VALUES(object_key),
    mime_type = VALUES(mime_type),
    original_filename = VALUES(original_filename),
    file_size = VALUES(file_size),
    status = VALUES(status),
    updated_at = NOW();

INSERT INTO question_set_assets (question_set_id, asset_id, role, display_order)
VALUES
('a7000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000001', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000002', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000003', 'e7000000-0000-4000-8000-000000000003', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000004', 'e7000000-0000-4000-8000-000000000004', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000005', 'e7000000-0000-4000-8000-000000000005', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000006', 'e7000000-0000-4000-8000-000000000006', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000007', 'e7000000-0000-4000-8000-000000000007', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000008', 'e7000000-0000-4000-8000-000000000008', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000009', 'e7000000-0000-4000-8000-000000000009', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000010', 'e7000000-0000-4000-8000-000000000010', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000011', 'e7000000-0000-4000-8000-000000000011', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000012', 'e7000000-0000-4000-8000-000000000012', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000013', 'e7000000-0000-4000-8000-000000000013', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000014', 'e7000000-0000-4000-8000-000000000014', 'MAIN_IMAGE', 1),
('a7000000-0000-4000-8000-000000000015', 'e7000000-0000-4000-8000-000000000015', 'MAIN_IMAGE', 1)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

SELECT COUNT(*) AS anh_part2 FROM assets WHERE asset_type = 'IMAGE';
