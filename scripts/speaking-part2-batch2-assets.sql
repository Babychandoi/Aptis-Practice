SET NAMES utf8mb4;

INSERT INTO assets
    (id, bucket_name, object_key, asset_type, mime_type, original_filename,
     file_size, access_scope, status, created_at, updated_at)
VALUES
('e6000000-0000-4000-8000-000000000001', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000001.jpg', 'IMAGE', 'image/jpeg', 'Người mẹ ôm con và đọc sách.jpg', 114433, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000002', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000002.jpg', 'IMAGE', 'image/jpeg', 'Gia đình nằm thư giãn trên bãi cỏ (2026).jpg', 200276, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000003', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000003.jpg', 'IMAGE', 'image/jpeg', 'Cô gái tặng quà bất ngờ cho mẹ.jpg', 71578, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000004', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000004.jpg', 'IMAGE', 'image/jpeg', 'Người đàn ông chờ tàu hỏa.jpg', 139881, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000005', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000005.jpg', 'IMAGE', 'image/jpeg', 'Gia đình ngồi trong ô tô (2026).jpg', 243161, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000006', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000006.jpg', 'IMAGE', 'image/jpeg', 'Một người đang được phỏng vấn (2026).jpg', 156068, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000007', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000007.jpg', 'IMAGE', 'image/jpeg', 'Gia đình cùng nhau nấu ăn (2026).jpg', 180964, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000008', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000008.jpg', 'IMAGE', 'image/jpeg', 'Người phụ nữ mua sắm trong siêu thị (2026).jpg', 225184, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000009', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000009.jpg', 'IMAGE', 'image/jpeg', 'Hai bố con đạp xe (2026).jpg', 240461, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000010', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000010.png', 'IMAGE', 'image/png', 'Sắp xếp và trang trí phòng khách.png', 1912959, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000011', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000011.jpg', 'IMAGE', 'image/jpeg', 'Children playing with toys.jpg', 224546, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000012', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000012.jpg', 'IMAGE', 'image/jpeg', 'Cặp đôi đứng trước cửa hàng.jpg', 277931, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000013', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000013.jpg', 'IMAGE', 'image/jpeg', 'Trẻ em chơi vòng trong vườn (2026).jpg', 204032, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000014', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000014.jpg', 'IMAGE', 'image/jpeg', 'Người mẹ và em bé cưỡi ngựa.jpg', 182806, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000015', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000015.jpg', 'IMAGE', 'image/jpeg', 'Cậu bé tặng hoa bất ngờ cho mẹ.jpg', 71578, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000016', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000016.jpg', 'IMAGE', 'image/jpeg', 'Học sinh lên xe buýt.jpg', 256261, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e6000000-0000-4000-8000-000000000017', 'aptis-content', 'content/speaking/part2b/images/e6000000-0000-4000-8000-000000000017.jpg', 'IMAGE', 'image/jpeg', 'Group drinking coffee.jpg', 202425, 'SIGNED_URL', 'READY', NOW(), NOW())
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
('a6000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000001', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000002', 'e6000000-0000-4000-8000-000000000002', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000003', 'e6000000-0000-4000-8000-000000000003', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000004', 'e6000000-0000-4000-8000-000000000004', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000005', 'e6000000-0000-4000-8000-000000000005', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000006', 'e6000000-0000-4000-8000-000000000006', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000007', 'e6000000-0000-4000-8000-000000000007', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000008', 'e6000000-0000-4000-8000-000000000008', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000009', 'e6000000-0000-4000-8000-000000000009', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000010', 'e6000000-0000-4000-8000-000000000010', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000011', 'e6000000-0000-4000-8000-000000000011', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000012', 'e6000000-0000-4000-8000-000000000012', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000013', 'e6000000-0000-4000-8000-000000000013', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000014', 'e6000000-0000-4000-8000-000000000014', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000015', 'e6000000-0000-4000-8000-000000000015', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000016', 'e6000000-0000-4000-8000-000000000016', 'MAIN_IMAGE', 1),
('a6000000-0000-4000-8000-000000000017', 'e6000000-0000-4000-8000-000000000017', 'MAIN_IMAGE', 1)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

SELECT COUNT(*) AS anh_part2 FROM assets WHERE asset_type = 'IMAGE';
