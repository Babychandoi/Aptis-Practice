// Sinh scripts/seed-speaking-part2-batch2.sql từ mảng TOPICS trong
// scripts/seed-speaking-part2-batch2.js, để metadata MySQL và nội dung Mongo luôn khớp.
//
// Chạy:  node scripts/gen-speaking-part2-batch2-sql.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'seed-speaking-part2-batch2.js'), 'utf8');

const match = src.match(/const TOPICS = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('Không tìm thấy mảng TOPICS');

const TOPICS = eval(match[1]);
if (TOPICS.length !== 17) {
  throw new Error(`Kỳ vọng 17 đề, thực tế ${TOPICS.length}`);
}

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const header = `-- Metadata MySQL cho 17 đề Speaking Part 2 (LÔ 2).
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part2-batch2.js bằng
--   node scripts/gen-speaking-part2-batch2-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part2-batch2.sql
--
-- Mỗi đề: 1 ảnh dùng chung + 3 câu × 5 điểm = 15 điểm, mỗi câu nói 45 giây.
-- Toàn bộ lô 2 là PREMIUM: 3 đề FREE dùng thử đã nằm ở lô 1.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000032'; -- Speaking Part 2
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     exam_year, access_level, status, current_revision, item_count,
     estimated_seconds, max_score, published_at, created_at, updated_at)
VALUES
`;

const rows = TOPICS.map((entry, index) => {
  const suffix = String(index + 1).padStart(2, '0');
  const id = 'a6000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
  // Tiêu đề = câu hỏi mở rộng (câu 2) + chủ đề tiếng Việt, vì câu 1 luôn là
  // "Describe the picture?" nên không phân biệt được đề nào với đề nào.
  const title = `${entry.questions[1][0]} (${entry.topic})`;
  const access = 'PREMIUM';
  const year = entry.year == null ? 'NULL' : entry.year;
  // 3 câu × 45 giây nói, cộng thời gian đọc câu hỏi và xem ảnh.
  return `('${id}', @part_id, @task_type_id, @topic_id, 'SPEAKING_P2_B${suffix}', '${esc(title)}', 3, ${entry.hot}, ${year}, '${access}', 'PUBLISHED', 1, 3, 180, 15.00, NOW(), NOW(), NOW())`;
});

const footer = `
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    difficulty = VALUES(difficulty),
    hotness = VALUES(hotness),
    exam_year = VALUES(exam_year),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT hotness, COUNT(*) AS so_de
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000032'
GROUP BY hotness ORDER BY hotness DESC;
`;

fs.writeFileSync(
  path.join(dir, 'seed-speaking-part2-batch2.sql'),
  header + rows.join(',\n') + footer,
  'utf8');

console.log(`Đã sinh SQL cho ${TOPICS.length} đề.`);
