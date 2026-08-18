// Đẩy 15 ảnh Speaking Part 2 LÔ 3 lên MinIO rồi tạo bản ghi trong bảng assets.
//
// Chạy:  node scripts/upload-speaking-part2-batch3-images.js
//
// Ảnh khác hoàn toàn lô 1 — mỗi ảnh đã được xem để bài mẫu miêu tả đúng nội
// dung, vì tên file trong thư mục không luôn khớp ảnh thật.
//
// Chạy lại được: upload ghi đè cùng object key, còn MySQL dùng upsert.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '..', 'Aptis', 'speaking', 'part 2');
const BUCKET = 'aptis-content';
const MINIO_CONTAINER = 'aptis-minio';

// Thứ tự PHẢI khớp mảng TOPICS trong seed-speaking-part2-batch3.js.
const IMAGES = [
  "Đám đông đi qua đường.jpg",
  "Người đàn ông nhảy múa.jpg",
  "Nhóm người xem phim tại rạp.jpg",
  "Trang trí nhà (2026).png",
  "Sử dụng điện thoại (2026).png",
  "Gia đình cùng nhau đạp xe (2026).jpg",
  "Ba người trao đổi trong buổi phỏng vấn (2026).jpg",
  "Người lớn và trẻ nhỏ cưỡi ngựa.png",
  "Phỏng vấn truyền hình ngoài trời - da cat watermark (2026).png",
  "Nature - walking in a forest.jpg",
  "Queuing at a ticket office.jpg",
  "Drawing together.jpg",
  "Người mẹ đọc sách cùng con gái.jpg",
  "Học nhóm - học cùng người khác (2026).png",
  "Hai người phụ nữ ngồi trên xe buýt.jpg",
];

if (IMAGES.length !== 15) throw new Error('Cần đúng 15 ảnh');

const assetIdOf = (index) =>
  'e7000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
const questionSetIdOf = (index) =>
  'a7000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

const run = (file, args, input) =>
  execFileSync(file, args, { input: input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// mc chỉ nhìn thấy filesystem trong container, nên copy ảnh vào /tmp của
// container trước rồi mới mc cp lên bucket.
const rows = [];

IMAGES.forEach((filename, index) => {
  const source = path.join(IMAGE_DIR, filename);
  if (!fs.existsSync(source)) throw new Error('Không thấy ảnh: ' + source);

  const assetId = assetIdOf(index);
  const ext = path.extname(filename).toLowerCase();
  const objectKey = `content/speaking/part2c/images/${assetId}${ext}`;
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const size = fs.statSync(source).size;

  const tmpPath = `/tmp/p2c-${assetId}${ext}`;
  run('docker', ['cp', source, `${MINIO_CONTAINER}:${tmpPath}`]);
  run('docker', ['exec', MINIO_CONTAINER, 'mc', 'alias', 'set', 'local',
    'http://localhost:9000', 'minioadmin', 'minioadmin']);
  run('docker', ['exec', MINIO_CONTAINER, 'mc', 'cp', tmpPath,
    `local/${BUCKET}/${objectKey}`]);
  run('docker', ['exec', MINIO_CONTAINER, 'rm', '-f', tmpPath]);

  rows.push({ assetId, objectKey, mime, size, questionSetId: questionSetIdOf(index) });
  console.log(`  ${index + 1}/15 ${filename} -> ${objectKey}`);
});

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const sql = `SET NAMES utf8mb4;

INSERT INTO assets
    (id, bucket_name, object_key, asset_type, mime_type, original_filename,
     file_size, access_scope, status, created_at, updated_at)
VALUES
${rows.map((row, index) => `('${row.assetId}', '${BUCKET}', '${esc(row.objectKey)}', 'IMAGE', '${row.mime}', '${esc(IMAGES[index])}', ${row.size}, 'SIGNED_URL', 'READY', NOW(), NOW())`).join(',\n')}
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
${rows.map((row) => `('${row.questionSetId}', '${row.assetId}', 'MAIN_IMAGE', 1)`).join(',\n')}
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

SELECT COUNT(*) AS anh_part2 FROM assets WHERE asset_type = 'IMAGE';
`;

const sqlPath = path.join(__dirname, 'speaking-part2-batch3-assets.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log(`\nĐã sinh ${path.basename(sqlPath)} — chạy SAU khi seed MySQL metadata:`);
console.log('  docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/speaking-part2-batch3-assets.sql');
