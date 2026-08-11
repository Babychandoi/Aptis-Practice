SET NAMES utf8mb4;

INSERT INTO assets
    (id, bucket_name, object_key, asset_type, mime_type, original_filename,
     file_size, access_scope, status, created_at, updated_at)
VALUES
('e5000000-0000-4000-8000-000000000001', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000001.jpg', 'IMAGE', 'image/jpeg', '1 Hai bố con ăn sáng.jpg', 191381, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000002', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000002.jpg', 'IMAGE', 'image/jpeg', '2 Người đàn ông đọc báo trước màn ti vi (2026).jpg', 156504, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000003', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000003.jpg', 'IMAGE', 'image/jpeg', '3 Người đàn ông viết thư.jpg', 143770, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000004', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000004.jpg', 'IMAGE', 'image/jpeg', 'Người đàn ông đang năm xem ti vi (2026).jpg', 201461, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000005', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000005.jpg', 'IMAGE', 'image/jpeg', '5 Cô gái thư giãn trên du thuyền.jpg', 202131, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000006', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000006.jpg', 'IMAGE', 'image/jpeg', 'Nhóm bạn ăn uống tại nhà hàng (2026).jpg', 147630, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000007', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000007.jpg', 'IMAGE', 'image/jpeg', 'Nhóm người leo núi (2026).jpg', 321203, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000008', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000008.jpg', 'IMAGE', 'image/jpeg', 'Người mẹ cõng con trên vai.jpg', 167398, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000009', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000009.jpg', 'IMAGE', 'image/jpeg', 'Nhóm phụ nữ đi mua sắm (2026).jpg', 186617, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000010', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000010.jpg', 'IMAGE', 'image/jpeg', 'Người cầm điều khiển chọn kênh truyền hình.jpg', 141729, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000011', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000011.jpg', 'IMAGE', 'image/jpeg', 'Người đàn ông vẽ tranh.jpg', 185152, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000012', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000012.jpg', 'IMAGE', 'image/jpeg', 'Hai bố con chơi bóng đá (2026).jpg', 369737, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000013', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000013.jpg', 'IMAGE', 'image/jpeg', 'Mọi người xem tranh tại bảo tàng (2026).jpg', 191499, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000014', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000014.jpg', 'IMAGE', 'image/jpeg', 'Bé gái nằm nghe nhạc trên cỏ (2026).jpg', 185305, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000015', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000015.jpg', 'IMAGE', 'image/jpeg', 'Cặp đôi dọn nhà (2026).jpg', 170498, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000016', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000016.jpg', 'IMAGE', 'image/jpeg', 'Giáo viên hướng dẫn trẻ làm bánh (2026).jpg', 161273, 'SIGNED_URL', 'READY', NOW(), NOW()),
('e5000000-0000-4000-8000-000000000017', 'aptis-content', 'content/speaking/part2/images/e5000000-0000-4000-8000-000000000017.jpg', 'IMAGE', 'image/jpeg', 'Đồng nghiệp họp trong văn phòng (2026).jpg', 108744, 'SIGNED_URL', 'READY', NOW(), NOW())
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
('a5000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000002', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000003', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000004', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000005', 'e5000000-0000-4000-8000-000000000005', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000006', 'e5000000-0000-4000-8000-000000000006', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000007', 'e5000000-0000-4000-8000-000000000007', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000008', 'e5000000-0000-4000-8000-000000000008', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000009', 'e5000000-0000-4000-8000-000000000009', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000010', 'e5000000-0000-4000-8000-000000000010', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000011', 'e5000000-0000-4000-8000-000000000011', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000012', 'e5000000-0000-4000-8000-000000000012', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000013', 'e5000000-0000-4000-8000-000000000013', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000014', 'e5000000-0000-4000-8000-000000000014', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000015', 'e5000000-0000-4000-8000-000000000015', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000016', 'e5000000-0000-4000-8000-000000000016', 'MAIN_IMAGE', 1),
('a5000000-0000-4000-8000-000000000017', 'e5000000-0000-4000-8000-000000000017', 'MAIN_IMAGE', 1)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

SELECT COUNT(*) AS anh_part2 FROM assets WHERE asset_type = 'IMAGE';
