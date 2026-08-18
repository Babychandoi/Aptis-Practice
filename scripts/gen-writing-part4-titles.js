// Chuẩn hoá tiêu đề Writing Part 4 cho khớp Part 2 và Part 3.
//
// Chạy:
//   node scripts/gen-writing-part4-titles.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/writing-part4-titles.sql
//   docker cp scripts/writing-part4-titles.mongo.js aptis-mongo:/tmp/w4.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/w4.js
//
// LÝ DO: Part 2 và Part 3 đã đổi sang tên club sạch ("Language Club (Version 1)"),
// còn Part 4 vẫn giữ ba kiểu viết khác nhau:
//   "Language Club (V1) – Part 4"        -> V1 thay vì Version 1
//   "Technology Club – Part 4 (Version 1)" -> hậu tố nằm sau "Part 4"
//   "Fashion Club – Part 4"              -> thừa "– Part 4"
//
// Không khớp tên thì không ghép được đề thi Writing theo club: đề thật Part 2,
// 3, 4 phải cùng một câu lạc bộ.
//
// Đọc tiêu đề hiện có từ DB rồi chuẩn hoá, không chốt cứng danh sách — thêm đề
// mới vào Part 4 xong chạy lại là tự chuẩn hoá luôn.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = __dirname;
const PART_ID = '16000000-0000-4000-8000-000000000044';

const rows = execFileSync('docker', [
  'exec', '-i', 'aptis-mysql', 'mysql', '-uaptis', '-paptis', '-N',
  '--default-character-set=utf8mb4', 'aptis', '-e',
  `SELECT id, code, title FROM question_sets WHERE part_id='${PART_ID}' ORDER BY code;`,
], { encoding: 'utf8' });

const sets = [];
for (const line of rows.split(/\r?\n/)) {
  const cols = line.trim().split(/\t/);
  if (cols.length === 3 && /^[0-9a-f-]{36}$/.test(cols[0])) {
    sets.push({ id: cols[0], code: cols[1], title: cols[2] });
  }
}
if (sets.length === 0) throw new Error('Không đọc được đề Writing Part 4');

/**
 * "Technology Club – Part 4 (Version 1)" -> "Technology Club (Version 1)"
 * "Language Club (V1) – Part 4"          -> "Language Club (Version 1)"
 * "Fashion Club – Part 4"                -> "Fashion Club"
 */
function normalize(raw) {
  // Hậu tố phiên bản có thể nằm sau "Part 4"; tách ra trước khi bỏ "Part 4".
  let version = null;
  let name = raw.replace(/\((Version\s*\d)\)\s*$/i, (_, group) => {
    version = group.replace(/Version\s*/i, 'Version ');
    return '';
  });

  // Viết tắt V1/V2 ngay sau tên club.
  name = name.replace(/\(V(\d)\)/gi, (_, digit) => `(Version ${digit})`);

  name = name
    .replace(/\s*[-–]\s*Part\s*4\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–]\s*$/, '')
    .trim();

  if (version && !/\(Version/i.test(name)) name = `${name} (${version})`;
  return name;
}

const parsed = sets.map((entry) => ({ ...entry, name: normalize(entry.title) }));
const changed = parsed.filter((entry) => entry.name !== entry.title);

console.log(`Writing Part 4: ${parsed.length} đề, ${changed.length} đề đổi tiêu đề`);
changed.slice(0, 8).forEach((entry) => {
  console.log(`  "${entry.title}"  ->  "${entry.name}"`);
});

// Tên trùng nhau sau khi chuẩn hoá nghĩa là hai đề khác nhau cùng tên — ghép đề
// thi theo club sẽ không biết chọn cái nào.
const seen = new Map();
const duplicates = [];
for (const entry of parsed) {
  if (seen.has(entry.name)) duplicates.push([seen.get(entry.name), entry]);
  else seen.set(entry.name, entry);
}
if (duplicates.length > 0) {
  console.log(`\n  CẢNH BÁO: ${duplicates.length} cặp trùng tên sau khi chuẩn hoá:`);
  duplicates.forEach(([a, b]) => {
    console.log(`    ${a.code} "${a.title}"  ==  ${b.code} "${b.title}"  ->  "${b.name}"`);
  });
}

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

const sql = `-- Chuẩn hoá tiêu đề Writing Part 4 cho khớp Part 2 và Part 3.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part4-titles.js
-- Đọc thẳng tiêu đề hiện có trong DB rồi chuẩn hoá; chạy lại được nhiều lần.

SET NAMES utf8mb4;

${changed.map((entry) =>
  `UPDATE question_sets SET title='${esc(entry.name)}', updated_at=NOW() WHERE id='${entry.id}';`)
  .join('\n')}

SELECT COUNT(*) AS de, SUM(title LIKE '%Part 4%') AS con_hau_to
FROM question_sets WHERE part_id='${PART_ID}' AND status='PUBLISHED';
`;
fs.writeFileSync(path.join(dir, 'writing-part4-titles.sql'), sql, 'utf8');

const mongoScript = `// SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part4-titles.js
const target = db.getSiblingDB('aptis');
const PAIRS = ${JSON.stringify(changed.map((e) => ({ id: e.id, title: e.name })), null, 1)};

let n = 0;
PAIRS.forEach(function (entry) {
  const r = target.question_set_documents.updateOne(
    { _id: entry.id }, { $set: { title: entry.title, updatedAt: new Date() } });
  n += r.modifiedCount;
});
print('Da doi tieu de ' + n + '/' + PAIRS.length + ' de Writing Part 4');
`;
fs.writeFileSync(path.join(dir, 'writing-part4-titles.mongo.js'), mongoScript, 'utf8');

console.log('\nĐã sinh:');
console.log('  scripts/writing-part4-titles.sql');
console.log('  scripts/writing-part4-titles.mongo.js');
