// Chuẩn hoá tiêu đề, năm và độ hot cho 46 đề Writing Part 2.
//
// Chạy:
//   node scripts/gen-writing-part2-titles.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/writing-part2-titles.sql
//   docker cp scripts/writing-part2-titles.mongo.js aptis-mongo:/tmp/w3.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/w3.js
//
// LÝ DO: file nguồn aptis_writing_part2_questions.json chỉ có câu hỏi, không
// có tên chủ đề — nên lúc seed người ta tự đặt tên mô tả nội dung ("Writing Part 2
// - Travel and the environment"). Tên thật là tên câu lạc bộ ("Nature Club").
//
// Thứ tự dưới đây khớp set_stt trong nguồn, và set_stt khớp phần số của mã đề
// (set 1 -> WRITING_PART_2_001). Đã đối chiếu nội dung câu hỏi để xác nhận:
//   câu 1 "Why are you interested in travel?"   -> Travel Club
//   câu 2 "You are a new member of a fashion club" -> Fashion Club
//   câu 4 "When and where do you use a computer?"  -> Computer Club
//
// Năm và số lửa tách khỏi tiêu đề, lưu vào exam_year và hotness — đồng bộ với
// Reading P2/P4 và Speaking P3.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const PART_ID = '16000000-0000-4000-8000-000000000042';

/** Nguyên văn danh sách biên tập cung cấp, giữ đúng thứ tự chủ đề 1..46. */
const RAW_TITLES = [
  'Travel Club – Part 2 (2026) 🔥🔥🔥',
  'Fashion Club – Part 2 (2026) 🔥🔥🔥',
  'Language Club (Version 1) – Part 2 (2026) 🔥🔥🔥🔥🔥',
  'Computer Club - Part 2 (2026) 🔥🔥🔥',
  'Language Club (Version 2) – Part 2 (2026) 🔥🔥🔥🔥🔥',
  'College Club - Part 2',
  'Social Club – Part 2 (2026) 🔥🔥🔥🔥',
  'Nature Club (Version 2) - Part 2 (2026) 🔥🔥🔥',
  'Debate Club - Part 2 (2026) 🔥🔥🔥',
  'Science Club - Part 2 (2026) 🔥🔥🔥🔥',
  'Cooking Club - Part 2',
  'English Club (Version 2) - Part 2 (2026) 🔥🔥🔥🔥',
  'English Club V2 – Improving Speaking Skills – Part 2 (2026) 🔥🔥🔥🔥',
  'Nature Club – Part 2 (2026) 🔥🔥🔥',
  'Healthy Club - Part 2',
  'Movie Club – A Film Recommendation – Part 2',
  'Walking Club (Version 1) – Part 2 (2026) 🔥🔥🔥🔥',
  'Reading Club – Part 2 (2026) 🔥🔥🔥',
  'Business Club - Part 2 (2026) 🔥🔥🔥🔥',
  'Cinema Club - Part 2',
  'Food Club – Part 2 (2026) 🔥🔥🔥🔥🔥',
  'Photography Club – Part 2 (2026) 🔥🔥🔥',
  'Writing Club - Part 2',
  'English Club (Version 1) – Part 2 (2026) 🔥🔥🔥🔥',
  'Travel Club (Version 2) - Part 2 (2026) 🔥🔥🔥',
  'Home Living Club – My Most Used Room – Part 2 (2026) 🔥🔥🔥',
  'Technology Club – Part 2 (2026) 🔥🔥🔥🔥',
  'Beautiful Homes Club - Part 2 (2026) 🔥🔥🔥',
  'Fitness Club – Part 2 (2026) 🔥🔥🔥',
  'English Club (Version 3) - Part 2 (2026) 🔥🔥🔥🔥',
  'Television Club – Part 2 (2026) 🔥🔥',
  'Art Club – Part 2 (2026) 🔥🔥🔥🔥🔥',
  'Garden Club - Part 2 (2026) 🔥🔥🔥🔥',
  'Outdoor Club - Part 2',
  'Film Club - Part 2 (2026) 🔥🔥🔥🔥',
  'Museum Club - Part 2 (2026) 🔥🔥🔥',
  'Sports Club - Part 2 (2026) 🔥🔥🔥',
  'Music Club – Part 2 (2026) 🔥🔥🔥🔥',
  'Book Club - Part 2 (2026) 🔥🔥🔥',
  'Car Club - Part 2 (2026) 🔥🔥🔥',
  'Home Living – Part 2 (2026) 🔥🔥🔥',
  'Fitness Club – A New Healthy Habit – Part 2 (2026) 🔥🔥🔥',
  'Technology Club – Organising Study Online – Part 2 (2026) 🔥🔥🔥🔥',
  'Walking Club V2 – A Recommended Route – Part 2 (2026) 🔥🔥🔥🔥',
  'Community Club - Part 2 (2026) 🔥🔥🔥🔥',
  'Food Club (Version 2) - Part 2 (2026) 🔥🔥🔥🔥🔥',
];

if (RAW_TITLES.length !== 46) {
  throw new Error(`Kỳ vọng 46 tiêu đề, có ${RAW_TITLES.length}`);
}

/**
 * Tách "Nature Club – Part 3 (2026) 🔥🔥🔥" thành tên sạch, năm, độ hot.
 *
 * Bỏ luôn hậu tố "– Part 3" vì Part đã hiện ở chỗ khác trên giao diện; giữ lại
 * chỉ làm tiêu đề dài mà không thêm thông tin. "(partial)" thì giữ vì nó nói
 * đề chưa đủ câu.
 */
function parseTitle(raw) {
  const year = raw.match(/\((20\d{2})\)/);
  const hotness = (raw.match(/🔥/g) || []).length;

  const name = raw
    .replace(/\((20\d{2})\)/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    // "– Part 3" ở cuối hoặc giữa chuỗi, cả gạch ngang dài lẫn ngắn.
    .replace(/\s*[-–]\s*Part\s*2\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–]\s*$/, '')
    .trim();

  return { name, year: year ? Number(year[1]) : null, hotness: hotness || null };
}

const parsed = RAW_TITLES.map((raw, index) => ({
  stt: index + 1,
  code: 'WRITING_PART_2_' + String(index + 1).padStart(3, '0'),
  ...parseTitle(raw),
}));

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const sql = `-- Chuẩn hoá tiêu đề Writing Part 2 theo danh sách biên tập.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part2-titles.js
-- Sửa danh sách trong file .js rồi chạy lại, đừng sửa tay file này.
--
-- Tiêu đề cũ là tên mô tả tự đặt lúc seed ("Writing Part 2 - Travel and the
-- environment") vì file nguồn không có tên chủ đề. Tên thật là tên câu lạc bộ.
-- Năm và số lửa tách sang exam_year / hotness thay vì để trong tiêu đề.

SET NAMES utf8mb4;

${parsed.map((entry) =>
  `UPDATE question_sets SET title='${esc(entry.name)}'`
  + `, exam_year=${entry.year ?? 'NULL'}`
  + `, hotness=${entry.hotness ?? 'NULL'}`
  + `, updated_at=NOW() WHERE part_id='${PART_ID}' AND code='${entry.code}';`).join('\n')}

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(hotness) AS co_lua
FROM question_sets WHERE part_id='${PART_ID}' AND status='PUBLISHED';

SELECT hotness, COUNT(*) AS so_de FROM question_sets
WHERE part_id='${PART_ID}' AND status='PUBLISHED'
GROUP BY hotness ORDER BY hotness DESC;
`;
fs.writeFileSync(path.join(dir, 'writing-part2-titles.sql'), sql, 'utf8');

// Mongo giữ bản sao tiêu đề trong document nên phải cập nhật cùng lúc; id lấy
// trực tiếp từ MySQL theo mã đề để ghép đúng, Mongo không lưu code.
const { execFileSync } = require('child_process');

const idRows = execFileSync('docker', [
  'exec', '-i', 'aptis-mysql', 'mysql', '-uaptis', '-paptis', '-N',
  '--default-character-set=utf8mb4', 'aptis', '-e',
  `SELECT code, id FROM question_sets WHERE part_id='${PART_ID}' ORDER BY code;`,
], { encoding: 'utf8' });

const idByCode = {};
for (const line of idRows.split(/\r?\n/)) {
  const cols = line.trim().split(/\t/);
  if (cols.length === 2 && /^[0-9a-f-]{36}$/.test(cols[1])) idByCode[cols[0]] = cols[1];
}

const pairs = parsed
  .filter((entry) => idByCode[entry.code])
  .map((entry) => ({ id: idByCode[entry.code], title: entry.name }));

const missing = parsed.filter((entry) => !idByCode[entry.code]);
if (missing.length > 0) {
  console.log(`  CẢNH BÁO: ${missing.length} mã đề không có trong DB: `
    + missing.map((entry) => entry.code).join(', '));
}

const mongoScript = `// SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part2-titles.js
const target = db.getSiblingDB('aptis');
const PAIRS = ${JSON.stringify(pairs, null, 1)};

let n = 0;
PAIRS.forEach(function (entry) {
  const r = target.question_set_documents.updateOne(
    { _id: entry.id }, { $set: { title: entry.title, updatedAt: new Date() } });
  n += r.modifiedCount;
});
print('Da doi tieu de ' + n + '/' + PAIRS.length + ' de Writing Part 2');
`;
fs.writeFileSync(path.join(dir, 'writing-part2-titles.mongo.js'), mongoScript, 'utf8');

console.log(`Đã sinh SQL cho ${parsed.length} đề.`);
console.log(`  có năm: ${parsed.filter((e) => e.year).length}`);
console.log(`  có lửa: ${parsed.filter((e) => e.hotness).length}`);
console.log('\n5 tiêu đề đầu sau khi chuẩn hoá:');
parsed.slice(0, 5).forEach((entry) => {
  console.log(`  ${entry.code}: "${entry.name}"`
    + ` | năm ${entry.year ?? '-'} | lửa ${entry.hotness ?? '-'}`);
});
