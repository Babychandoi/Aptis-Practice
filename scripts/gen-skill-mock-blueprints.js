// Sinh đề thi thử CỐ ĐỊNH cho từng kỹ năng: Reading, Listening, Speaking, Writing.
//
// Chạy:
//   node scripts/gen-skill-mock-blueprints.js            # xem trước, không ghi
//   node scripts/gen-skill-mock-blueprints.js --write    # sinh file SQL
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/skill-mock-blueprints.sql
//
// Mỗi đề chốt sẵn dùng bộ câu hỏi nào (selection_strategy = FIXED), nên "Đề số 7"
// của Reading luôn là cùng một đề — học viên làm lại được, so điểm với nhau được.
// Khác với blueprint RANDOM sẵn có: mỗi lần thi là một tổ hợp khác nhau.
//
// SỐ ĐỀ MỖI KỸ NĂNG = phần bị hạn chế nhất, để KHÔNG bộ nào bị dùng lại ở hai đề:
//   Reading   14  (nghẽn ở Part 3, chỉ có 14 bộ)
//   Listening 29  (nghẽn ở Part 2, 29 bộ)
//   Speaking  49  (nghẽn ở Part 2, 49 bộ)
//   Writing   46  (cả 4 Part đều 46)
//
// Grammar & Vocabulary bỏ qua: chưa có bộ câu hỏi nào.
//
// Part gộp câu (Reading P1, Speaking P1, Writing P1) cần nhiều bộ cho một bài —
// số bộ lấy theo `merge-item-parts` trong application.yml.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WRITE = process.argv.includes('--write');
const dir = __dirname;

/**
 * Số bộ một đề cần ở mỗi Part; khớp merge-item-parts và cấu trúc đề thật.
 *
 * Thứ tự thi thật (Aptis ESOL General Guide for Teachers, British Council):
 * Core 25' → Reading 35' → Listening 40' → Writing 50' → Speaking 12'.
 * Mảng này chỉ sinh blueprint riêng từng kỹ năng nên thứ tự không quan trọng,
 * nhưng bài thi đủ 5 kỹ năng thì phải theo đúng dãy trên.
 */
const SKILLS = [
  {
    code: 'READING',
    name: 'Reading',
    parts: [
      { suffix: '11', label: 'Part 1', setsPerTest: 5 },
      // Đề thật có HAI task sắp xếp câu ("In this part, there are two tasks" —
      // Guide for Teachers), mỗi task 5 chỗ đổi chỗ. Thang điểm 10 = 10 câu x 1đ.
      { suffix: '12', label: 'Part 2', setsPerTest: 2 },
      { suffix: '13', label: 'Part 3', setsPerTest: 1 },
      { suffix: '14', label: 'Part 4', setsPerTest: 1 },
    ],
  },
  {
    code: 'LISTENING',
    name: 'Listening',
    parts: [
      { suffix: '21', label: 'Part 1', setsPerTest: 1 },
      { suffix: '22', label: 'Part 2', setsPerTest: 1 },
      { suffix: '23', label: 'Part 3', setsPerTest: 1 },
      { suffix: '24', label: 'Part 4', setsPerTest: 1 },
    ],
  },
  {
    code: 'SPEAKING',
    name: 'Speaking',
    parts: [
      { suffix: '31', label: 'Part 1', setsPerTest: 3 },
      { suffix: '32', label: 'Part 2', setsPerTest: 1 },
      { suffix: '33', label: 'Part 3', setsPerTest: 1 },
      { suffix: '34', label: 'Part 4', setsPerTest: 1 },
    ],
  },
  {
    code: 'WRITING',
    name: 'Writing',
    parts: [
      { suffix: '41', label: 'Part 1', setsPerTest: 5 },
      { suffix: '42', label: 'Part 2', setsPerTest: 1 },
      { suffix: '43', label: 'Part 3', setsPerTest: 1 },
      { suffix: '44', label: 'Part 4', setsPerTest: 1 },
    ],
  },
];

const partId = (suffix) => '16000000-0000-4000-8000-0000000000' + suffix;

/** Lấy danh sách bộ câu hỏi PUBLISHED của một Part, sắp theo code cho ổn định. */
function fetchSets(suffix) {
  const sql = `SELECT id FROM question_sets WHERE part_id='${partId(suffix)}' `
    + `AND status='PUBLISHED' ORDER BY code, id;`;
  const out = execFileSync('docker', [
    'exec', '-i', 'aptis-mysql', 'mysql', '-uaptis', '-paptis', '-N', 'aptis', '-e', sql,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return out.split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-f-]{36}$/.test(line));
}

/** exam_version và component id lấy từ DB để không chốt cứng sai. */
function fetchIds() {
  const out = execFileSync('docker', [
    'exec', '-i', 'aptis-mysql', 'mysql', '-uaptis', '-paptis', '-N', 'aptis', '-e',
    "SELECT c.code, c.id, c.exam_version_id FROM components c "
    + "WHERE c.code IN ('READING','LISTENING','SPEAKING','WRITING');",
  ], { encoding: 'utf8' });
  const map = {};
  let examVersionId = null;
  for (const line of out.split('\n')) {
    const cols = line.trim().split(/\t/);
    if (cols.length === 3 && /^[0-9a-f-]{36}$/.test(cols[1])) {
      map[cols[0]] = cols[1];
      examVersionId = cols[2];
    }
  }
  return { components: map, examVersionId };
}

const { components, examVersionId } = fetchIds();
if (!examVersionId) throw new Error('Không đọc được exam_version_id');

const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");
/** UUID tiền định: sinh lại nhiều lần vẫn ra cùng id, không tạo bản ghi thừa. */
const uuidFrom = (prefix, a, b) =>
  `${prefix}-0000-4000-8000-${String(a).padStart(6, '0')}${String(b).padStart(6, '0')}`;

const blueprintRows = [];
const ruleRows = [];
const fixedRows = [];
const summary = [];

SKILLS.forEach((skill, skillIndex) => {
  const componentId = components[skill.code];
  if (!componentId) throw new Error(`Không tìm thấy component ${skill.code}`);

  const pools = skill.parts.map((part) => ({ ...part, sets: fetchSets(part.suffix) }));
  const empty = pools.filter((pool) => pool.sets.length === 0);
  if (empty.length > 0) {
    console.log(`  BỎ QUA ${skill.name}: Part ${empty.map((p) => p.label).join(', ')} chưa có đề`);
    return;
  }

  // Số đề tối đa = Part chia được ít lần nhất. Lấy đúng con số đó thì mỗi bộ
  // chỉ xuất hiện trong một đề duy nhất.
  const testCount = Math.min(...pools.map((pool) =>
    Math.floor(pool.sets.length / pool.setsPerTest)));

  const totalSeconds = pools.reduce((sum, pool) => sum + pool.sets.length, 0) && null;
  summary.push({
    skill: skill.name,
    testCount,
    detail: pools.map((pool) =>
      `${pool.label} ${Math.floor(pool.sets.length / pool.setsPerTest)}`).join(' | '),
  });

  for (let testIndex = 0; testIndex < testCount; testIndex++) {
    const blueprintId = uuidFrom('1b000000', skillIndex + 1, testIndex + 1);
    const number = String(testIndex + 1).padStart(3, '0');

    blueprintRows.push(
      `('${blueprintId}', '${examVersionId}', '${componentId}', `
      + `'MOCK_${skill.code}_${number}', '${esc(`Thi thử ${skill.name} - Đề ${testIndex + 1}`)}', `
      + `'${esc(`Đề cố định số ${testIndex + 1}, đủ ${skill.parts.length} phần ${skill.name}`)}', `
      + `'MOCK_TEST', 'PREMIUM', NULL, 'PUBLISHED', NOW(), NOW())`);

    pools.forEach((pool, partIndex) => {
      const ruleId = uuidFrom('1c000000',
        (skillIndex + 1) * 10 + partIndex + 1, testIndex + 1);

      ruleRows.push(
        `('${ruleId}', '${blueprintId}', '${partId(pool.suffix)}', ${pool.setsPerTest}, `
        + `'FIXED', 1, 1, ${partIndex + 1})`);

      // Cắt đúng lát của đề này: đề 1 lấy bộ 0..n-1, đề 2 lấy n..2n-1…
      const start = testIndex * pool.setsPerTest;
      const chosen = pool.sets.slice(start, start + pool.setsPerTest);
      if (chosen.length !== pool.setsPerTest) {
        throw new Error(`${skill.name} đề ${testIndex + 1} ${pool.label}: `
          + `cần ${pool.setsPerTest} bộ, chỉ còn ${chosen.length}`);
      }
      chosen.forEach((setId, order) => {
        fixedRows.push(`('${ruleId}', '${setId}', ${order + 1})`);
      });
    });
  }
});

console.log('Số đề mỗi kỹ năng (giới hạn bởi Part ít đề nhất):');
summary.forEach((entry) => {
  console.log(`  ${entry.skill.padEnd(10)} ${String(entry.testCount).padStart(3)} đề`
    + `   [đủ cho: ${entry.detail}]`);
});
console.log(`\nTổng: ${blueprintRows.length} đề, ${ruleRows.length} rule, `
  + `${fixedRows.length} bộ câu hỏi được chốt`);

if (!WRITE) {
  console.log('\n--- XEM TRƯỚC, chưa ghi file. Thêm --write để sinh SQL. ---');
  process.exit(0);
}

const sql = `-- Đề thi thử CỐ ĐỊNH theo từng kỹ năng.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-skill-mock-blueprints.js --write
-- Sửa cấu hình trong file .js rồi chạy lại, đừng sửa tay file này.
--
-- Mỗi đề chốt sẵn bộ câu hỏi (FIXED) nên "Đề số 7" luôn giống nhau giữa các lần
-- làm và giữa các học viên. Số đề mỗi kỹ năng lấy theo Part ít đề nhất để không
-- bộ nào bị dùng lại ở hai đề khác nhau.
--
-- Chạy lại được: id tiền định + upsert, không sinh bản ghi trùng.

SET NAMES utf8mb4;

-- Xoá rule cũ của các blueprint này trước, tránh sót rule khi cấu hình đổi.
DELETE FROM blueprint_fixed_question_sets
WHERE blueprint_rule_id IN (
    SELECT id FROM blueprint_part_rules
    WHERE blueprint_id IN (SELECT id FROM test_blueprints WHERE code LIKE 'MOCK\\_%\\_%' AND component_id IS NOT NULL));
DELETE FROM blueprint_part_rules
WHERE blueprint_id IN (SELECT id FROM test_blueprints WHERE code LIKE 'MOCK\\_%\\_%' AND component_id IS NOT NULL);

INSERT INTO test_blueprints
    (id, exam_version_id, component_id, code, name, description, mode,
     access_level, duration_seconds, status, created_at, updated_at)
VALUES
${blueprintRows.join(',\n')}
ON DUPLICATE KEY UPDATE
    name = VALUES(name), description = VALUES(description),
    access_level = VALUES(access_level), status = VALUES(status), updated_at = NOW();

INSERT INTO blueprint_part_rules
    (id, blueprint_id, part_id, question_set_count, selection_strategy,
     allow_free_content, allow_premium_content, display_order)
VALUES
${ruleRows.join(',\n')};

INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order)
VALUES
${fixedRows.join(',\n')};

SELECT c.name AS ky_nang, COUNT(DISTINCT tb.id) AS so_de,
       COUNT(DISTINCT bpr.id) AS so_rule,
       COUNT(bfq.question_set_id) AS so_bo_chot
FROM test_blueprints tb
JOIN components c ON c.id = tb.component_id
LEFT JOIN blueprint_part_rules bpr ON bpr.blueprint_id = tb.id
LEFT JOIN blueprint_fixed_question_sets bfq ON bfq.blueprint_rule_id = bpr.id
WHERE tb.component_id IS NOT NULL
GROUP BY c.id, c.name, c.display_order ORDER BY c.display_order;
`;

fs.writeFileSync(path.join(dir, 'skill-mock-blueprints.sql'), sql, 'utf8');
console.log('\nĐã ghi scripts/skill-mock-blueprints.sql');
