// Sinh đề thi thử Writing theo CÂU LẠC BỘ: Part 2, 3, 4 của cùng một club.
//
// Chạy:
//   node scripts/gen-writing-club-blueprints.js            # xem trước
//   node scripts/gen-writing-club-blueprints.js --write    # sinh SQL
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/writing-club-blueprints.sql
//
// LÝ DO VIẾT LẠI: bản trước (gen-skill-mock-blueprints.js) cắt lát ngân hàng
// theo thứ tự mã đề, nên một bài test ghép Travel Club + Nature Club + Fashion
// Club. Đề thi Aptis thật thì Part 2, 3, 4 đều thuộc một câu lạc bộ: học viên
// điền form của club, rồi chat nhóm với thành viên, rồi viết email cho chủ tịch.
//
// Tên bài test lấy luôn tên club ("Thi thử Writing - Art Club").
//
// Part 1 KHÔNG tham gia: đó là form thông tin cá nhân, không thuộc club nào —
// lấy 5 câu bất kỳ từ ngân hàng câu rời.
//
// Quy tắc:
//   - Chỉ ghép club có đủ cả P2, P3, P4; thiếu part thì bỏ.
//   - Club có nhiều đề trong một part thì lấy đề có mã nhỏ nhất.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WRITE = process.argv.includes('--write');
const dir = __dirname;

const PART_IDS = {
  1: '16000000-0000-4000-8000-000000000041',
  2: '16000000-0000-4000-8000-000000000042',
  3: '16000000-0000-4000-8000-000000000043',
  4: '16000000-0000-4000-8000-000000000044',
};
/** Part 1 gộp 5 câu rời thành một form, theo merge-item-parts. */
const PART1_SETS = 5;

function query(sql) {
  return execFileSync('docker', [
    'exec', '-i', 'aptis-mysql', 'mysql', '-uaptis', '-paptis', '-N',
    '--default-character-set=utf8mb4', 'aptis', '-e', sql,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\t/))
    .filter((cols) => cols.length > 1 && cols[0]);
}

const componentRow = query(
  "SELECT id, exam_version_id FROM components WHERE code='WRITING';")[0];
if (!componentRow) throw new Error('Không tìm thấy component WRITING');
const [componentId, examVersionId] = componentRow;

/** Đề của một Part, sắp theo mã để "đề đầu tiên" luôn xác định. */
function setsOf(part) {
  return query(`SELECT code, id, title FROM question_sets `
    + `WHERE part_id='${PART_IDS[part]}' AND status='PUBLISHED' ORDER BY code;`)
    .map(([code, id, title]) => ({ code, id, title }));
}

/**
 * Khoá ghép club: tên club + số phiên bản, bỏ phần mô tả phụ.
 *
 * Cùng một bộ đề nhưng ba Part đặt tên khác nhau:
 *   P2 "Technology Club – Organising Study Online"
 *   P3 "Technology Club – Focus, Backups and Responsible AI"
 *   P4 "Technology Club (Version 2)"
 * Ghép theo tên đầy đủ thì ba cái này thành ba club riêng và không đề nào đủ
 * part. Rút về "technology club" + số phiên bản mới ghép được.
 *
 * Phiên bản nhận từ "(Version N)" hoặc "VN –" ở giữa tên; không có thì là 1.
 */
function clubKey(title) {
  const version = title.match(/\(Version\s*(\d)\)/i)
    || title.match(/V(\d)/);
  const base = title
    .replace(/\(Version\s*\d\)/gi, '')
    .replace(/V\d/g, '')
    // Bỏ mô tả phụ sau dấu gạch: "Technology Club – Organising Study Online"
    .split(/\s+[-–]\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return `${base}#${version ? version[1] : '1'}`;
}

const byClub = new Map();
for (const part of [2, 3, 4]) {
  for (const entry of setsOf(part)) {
    const key = clubKey(entry.title);
    if (!byClub.has(key)) byClub.set(key, { label: entry.title, parts: {} });
    const club = byClub.get(key);
    // Club có nhiều đề trong cùng một part: giữ đề mã nhỏ nhất, đề còn lại
    // không vào bài test nào nhưng vẫn luyện riêng được.
    if (!club.parts[part]) club.parts[part] = entry;
    // Tên bài test lấy theo Part 2 vì đó là phần mở đầu của đề.
    if (part === 2) club.label = entry.title;
  }
}

const complete = [];
const incomplete = [];
for (const [, club] of byClub) {
  const { label, parts } = club;
  if (parts[2] && parts[3] && parts[4]) complete.push({ name: label, parts });
  else incomplete.push({ name: label, missing: [2, 3, 4].filter((p) => !parts[p]) });
}
complete.sort((left, right) => left.parts[2].code.localeCompare(right.parts[2].code));

const part1Sets = setsOf(1);

console.log(`Club có đủ P2+P3+P4: ${complete.length}`);
console.log(`Club thiếu part (bỏ qua): ${incomplete.length}`);
incomplete.slice(0, 6).forEach((entry) => {
  console.log(`  ${entry.name} -> thiếu P${entry.missing.join(', P')}`);
});
console.log(`\nPart 1: ${part1Sets.length} câu, mỗi bài lấy ${PART1_SETS}`
  + ` -> đủ cho ${Math.floor(part1Sets.length / PART1_SETS)} bài`);

if (complete.length * PART1_SETS > part1Sets.length) {
  console.log(`  LƯU Ý: ${complete.length} bài cần ${complete.length * PART1_SETS} câu Part 1,`
    + ` ngân hàng chỉ có ${part1Sets.length} — các bài cuối sẽ dùng lại câu.`);
}

console.log('\n8 bài test đầu:');
complete.slice(0, 8).forEach((club, index) => {
  console.log(`  ${index + 1}. ${club.name}`);
});

if (!WRITE) {
  console.log('\n--- XEM TRƯỚC, chưa ghi file. Thêm --write để sinh SQL. ---');
  process.exit(0);
}

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");
const uuidFrom = (prefix, a, b) =>
  `${prefix}-0000-4000-8000-${String(a).padStart(6, '0')}${String(b).padStart(6, '0')}`;

const blueprintRows = [];
const ruleRows = [];
const fixedRows = [];

complete.forEach((club, index) => {
  const blueprintId = uuidFrom('1d000000', 1, index + 1);
  const number = String(index + 1).padStart(3, '0');

  blueprintRows.push(
    `('${blueprintId}', '${examVersionId}', '${componentId}', `
    + `'MOCK_WRITING_CLUB_${number}', '${esc(`Thi thử Writing - ${club.name}`)}', `
    + `'${esc(`Đủ 4 phần Writing, Part 2-3-4 cùng chủ đề ${club.name}`)}', `
    + `'MOCK_TEST', 'PREMIUM', NULL, 'PUBLISHED', NOW(), NOW())`);

  // Part 1 không thuộc club nào: cắt lát ngân hàng câu rời theo thứ tự bài test.
  const part1Rule = uuidFrom('1e000000', 1, index + 1);
  ruleRows.push(`('${part1Rule}', '${blueprintId}', '${PART_IDS[1]}', ${PART1_SETS}, `
    + `'FIXED', 1, 1, 1)`);
  for (let offset = 0; offset < PART1_SETS; offset++) {
    const pick = part1Sets[(index * PART1_SETS + offset) % part1Sets.length];
    fixedRows.push(`('${part1Rule}', '${pick.id}', ${offset + 1})`);
  }

  [2, 3, 4].forEach((part) => {
    const ruleId = uuidFrom('1e000000', part, index + 1);
    ruleRows.push(`('${ruleId}', '${blueprintId}', '${PART_IDS[part]}', 1, `
      + `'FIXED', 1, 1, ${part})`);
    fixedRows.push(`('${ruleId}', '${club.parts[part].id}', 1)`);
  });
});

const sql = `-- Đề thi thử Writing theo câu lạc bộ: Part 2, 3, 4 cùng một club.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-writing-club-blueprints.js --write
--
-- Thay cho các blueprint MOCK_WRITING_* cũ: chúng cắt lát ngân hàng theo mã đề
-- nên ghép ba club khác nhau vào một bài, sai cấu trúc đề thi thật.
--
-- Part 1 là form thông tin cá nhân, không thuộc club nào, nên lấy 5 câu rời.

SET NAMES utf8mb4;

-- Xoá blueprint Writing cũ (ghép sai club) và blueprint sinh lại lần trước.
DELETE FROM blueprint_fixed_question_sets
WHERE blueprint_rule_id IN (
    SELECT id FROM blueprint_part_rules WHERE blueprint_id IN (
        SELECT id FROM test_blueprints
        WHERE code LIKE 'MOCK\\_WRITING\\_%'));
DELETE FROM blueprint_part_rules
WHERE blueprint_id IN (
    SELECT id FROM test_blueprints WHERE code LIKE 'MOCK\\_WRITING\\_%');
DELETE FROM test_blueprints WHERE code LIKE 'MOCK\\_WRITING\\_%';

INSERT INTO test_blueprints
    (id, exam_version_id, component_id, code, name, description, mode,
     access_level, duration_seconds, status, created_at, updated_at)
VALUES
${blueprintRows.join(',\n')};

INSERT INTO blueprint_part_rules
    (id, blueprint_id, part_id, question_set_count, selection_strategy,
     allow_free_content, allow_premium_content, display_order)
VALUES
${ruleRows.join(',\n')};

INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order)
VALUES
${fixedRows.join(',\n')};

SELECT COUNT(*) AS so_bai_test FROM test_blueprints WHERE code LIKE 'MOCK\\_WRITING\\_CLUB\\_%';
`;

fs.writeFileSync(path.join(dir, 'writing-club-blueprints.sql'), sql, 'utf8');
console.log(`\nĐã ghi scripts/writing-club-blueprints.sql`);
console.log(`  ${blueprintRows.length} bài test, ${ruleRows.length} rule, ${fixedRows.length} bộ chốt`);
