// Sinh scripts/seed-speaking-part1.sql từ danh sách câu hỏi trong
// scripts/seed-speaking-part1.js, để metadata MySQL và nội dung Mongo luôn khớp.
//
// Chạy:  node scripts/gen-speaking-part1-sql.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'seed-speaking-part1.js'), 'utf8');

const match = src.match(/const QUESTIONS = (\[[\s\S]*?\n\]);/);
if (!match) throw new Error('Không tìm thấy mảng QUESTIONS');

const QUESTIONS = eval(match[1]);
if (QUESTIONS.length !== 168) {
  throw new Error(`Kỳ vọng 168 câu, thực tế ${QUESTIONS.length}`);
}

/** Escape cho chuỗi SQL: nhân đôi dấu nháy đơn và backslash. */
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const header = `-- Metadata MySQL cho 168 câu Speaking Part 1 (mỗi bộ MỘT câu).
--
-- SINH TỰ ĐỘNG từ scripts/seed-speaking-part1.js bằng
--   node scripts/gen-speaking-part1-sql.js
-- Sửa câu hỏi ở file .js rồi chạy lại lệnh trên, đừng sửa tay file này.
--
-- Chạy SAU khi đã seed Mongo:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-speaking-part1.sql

SET NAMES utf8mb4;

SET @part_id      = '16000000-0000-4000-8000-000000000031'; -- Speaking Part 1
SET @task_type_id = '12000000-0000-4000-8000-000000000010'; -- AUDIO_RECORDING
SET @topic_id     = '17000000-0000-4000-8000-000000000001'; -- Đời sống hàng ngày

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, hotness,
     access_level, status, current_revision, item_count, estimated_seconds,
     max_score, published_at, created_at, updated_at)
VALUES
`;

const rows = QUESTIONS.map((entry, index) => {
  const suffix = String(index + 1).padStart(2, '0');
  const id = 'a7000000-0000-4000-8000-' + String(index + 1).padStart(12, '0');
  return `('${id}', @part_id, @task_type_id, @topic_id, 'SPEAKING_P1_${suffix}', '${esc(entry[0])}', 2, 3, 'FREE', 'PUBLISHED', 1, 1, 30, 1.66, NOW(), NOW(), NOW())`;
});

const footer = `
ON DUPLICATE KEY UPDATE
    part_id = VALUES(part_id),
    task_type_id = VALUES(task_type_id),
    topic_id = VALUES(topic_id),
    title = VALUES(title),
    access_level = VALUES(access_level),
    status = VALUES(status),
    item_count = VALUES(item_count),
    estimated_seconds = VALUES(estimated_seconds),
    max_score = VALUES(max_score),
    published_at = COALESCE(published_at, NOW()),
    updated_at = NOW();

SELECT COUNT(*) AS speaking_part_1_questions
FROM question_sets
WHERE part_id = '16000000-0000-4000-8000-000000000031';
`;

fs.writeFileSync(
  path.join(dir, 'seed-speaking-part1.sql'),
  header + rows.join(',\n') + footer,
  'utf8');

console.log(`Đã sinh SQL cho ${QUESTIONS.length} câu.`);
