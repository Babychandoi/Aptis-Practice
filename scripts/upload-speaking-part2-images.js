// Đẩy 17 ảnh Speaking Part 2 lên MinIO rồi tạo bản ghi trong bảng assets.
//
// Chạy:  node scripts/upload-speaking-part2-images.js
//
// Ảnh nằm ở Aptis/speaking/part 2 và được chọn theo THỨ TỰ TẢI VỀ (17 ảnh đầu),
// vì tên file là mô tả tiếng Việt chứ không đánh số. Danh sách chốt cứng ở dưới
// để chạy lại nhiều lần vẫn ra đúng ảnh, không phụ thuộc thời gian tạo file.
//
// assetId sinh theo công thức giống seed-speaking-part2.js nên hai script luôn
// khớp: đề thứ n dùng ảnh thứ n.
//
// Chạy lại được: upload ghi đè cùng object key, còn MySQL dùng upsert.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '..', 'Aptis', 'speaking', 'part 2');
const BUCKET = 'aptis-content';
const MINIO_CONTAINER = 'aptis-minio';
const MYSQL_CONTAINER = 'aptis-mysql';

// Thứ tự PHẢI khớp mảng TOPICS trong seed-speaking-part2.js.
const IMAGES = [
  '1 Hai bố con ăn sáng.jpg',
  '2 Người đàn ông đọc báo trước màn ti vi (2026).jpg',
  '3 Người đàn ông viết thư.jpg',
  'Người đàn ông đang năm xem ti vi (2026).jpg',
  '5 Cô gái thư giãn trên du thuyền.jpg',
  'Nhóm bạn ăn uống tại nhà hàng (2026).jpg',
  'Nhóm người leo núi (2026).jpg',
  'Người mẹ cõng con trên vai.jpg',
  'Nhóm phụ nữ đi mua sắm (2026).jpg',
  'Người cầm điều khiển chọn kênh truyền hình.jpg',
  'Người đàn ông vẽ tranh.jpg',
  'Hai bố con chơi bóng đá (2026).jpg',
  'Mọi người xem tranh tại bảo tàng (2026).jpg',
  'Bé gái nằm nghe nhạc trên cỏ (2026).jpg',
  'Cặp đôi dọn nhà (2026).jpg',
  'Giáo viên hướng dẫn trẻ làm bánh (2026).jpg',
  'Đồng nghiệp họp trong văn phòng (2026).jpg',
];

if (IMAGES.length !== 17) throw new Error('Cần đúng 17 ảnh');

const assetIdOf = (index) =>
  'e5000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
const questionSetIdOf = (index) =>
  'a5000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');

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
  const objectKey = `content/speaking/part2/images/${assetId}${ext}`;
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const size = fs.statSync(source).size;

  const tmpPath = `/tmp/p2-${assetId}${ext}`;
  run('docker', ['cp', source, `${MINIO_CONTAINER}:${tmpPath}`]);
  run('docker', ['exec', MINIO_CONTAINER, 'mc', 'alias', 'set', 'local',
    'http://localhost:9000', 'minioadmin', 'minioadmin']);
  run('docker', ['exec', MINIO_CONTAINER, 'mc', 'cp', tmpPath,
    `local/${BUCKET}/${objectKey}`]);
  run('docker', ['exec', MINIO_CONTAINER, 'rm', '-f', tmpPath]);

  rows.push({ assetId, objectKey, mime, size, questionSetId: questionSetIdOf(index) });
  console.log(`  ${index + 1}/17 ${filename} -> ${objectKey}`);
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

const sqlPath = path.join(__dirname, 'speaking-part2-assets.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log(`\nĐã sinh ${path.basename(sqlPath)} — chạy SAU khi seed MySQL metadata:`);
console.log('  docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/speaking-part2-assets.sql');
