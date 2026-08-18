// Sinh scripts/seed-speaking-part4.sql từ mảng TOPICS trong
// scripts/seed-speaking-part4.js, để metadata MySQL và nội dung Mongo luôn khớp.
//
// Chạy:  node scripts/gen-speaking-part4-sql.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'seed-speaking-part4.js'), 'utf8');

const match = src.match(/const TOPICS = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('Không tìm thấy mảng TOPICS');

const TOPICS = eval(match[1]);
if (TOPICS.length !== 67) {
  throw new Error(`Kỳ vọng 67 đề, thực tế ${TOPICS.length}`);
}

/** Escape cho chuỗi SQL: nhân đôi dấu nháy đơn và backslash. */
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const header = `-- Metadata MySQL cho 67 đề Speaking Part 4.
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part4.js bằng
--   node scripts/gen-speaking-part4-sql.js
-- Sửa đề ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part4.sql
--
-- hotness lấy theo số ngọn lửa của từng đề (đề hay ra thi thì nhiều lửa hơn).
-- 3 đề đầu để FREE làm bài dùng thử, còn lại PREMIUM — theo quy ước đang áp
-- cho toàn bộ ngân hàng đề.

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000034'; -- Speaking Part 4
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
`;

const rows = TOPICS.map((entry, index) => {
  const [question, vietnamese, hot] = entry;
  const suffix = String(index + 1).padStart(2, '0');
  const id = 'a8000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
  const title = `${question} (${vietnamese})`;
  const access = index < 3 ? 'FREE' : 'PREMIUM';
  return `('${id}', @part_id, @task_type_id, @topic_id, 'SPEAKING_P4_${suffix}', '${esc(title)}', 4, ${hot}, '${access}', 'PUBLISHED', 1, 1, 180, 20.00, NOW(), NOW(), NOW())`;
});

const footer = `
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    difficulty = VALUES(difficulty),
    hotness = VALUES(hotness),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT hotness, COUNT(*) AS so_de
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000034'
GROUP BY hotness ORDER BY hotness DESC;
`;

fs.writeFileSync(
  path.join(dir, 'seed-speaking-part4.sql'),
  header + rows.join(',\n') + footer,
  'utf8');

console.log(`Đã sinh SQL cho ${TOPICS.length} đề.`);
