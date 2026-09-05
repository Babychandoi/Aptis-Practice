/**
 * Tạo đề thi thử Writing đầy đủ 4 phần cho club, khớp đúng bài viết bảng tin.
 *
 * Vì sao cần: đã có sẵn "Thi thử Writing - <club>" cho nhiều club, nhưng bản của
 * Music Club và English Club dùng bộ Part 2/3/4 KHÁC với bài mẫu trên bảng tin.
 * Học viên đọc bài mẫu về tiếng ồn rồi bấm vào lại gặp đề tìm tình nguyện viên.
 *
 * Ở đây tạo bản riêng ghép đúng các bộ mà bài viết hướng dẫn.
 *
 * Dùng:
 *   node scripts/create-writing-club-blueprints.mjs [--dry-run]
 */
import mysql from 'mysql2/promise';

const EXAM_VERSION = '14000000-0000-4000-8000-000000000001';
const WRITING_COMPONENT = '15000000-0000-4000-8000-000000000005';
const PART = {
  1: '16000000-0000-4000-8000-000000000041',
  2: '16000000-0000-4000-8000-000000000042',
  3: '16000000-0000-4000-8000-000000000043',
  4: '16000000-0000-4000-8000-000000000044',
};

const dryRun = process.argv.includes('--dry-run');

/**
 * Mỗi đề: 5 bộ câu rời cho Part 1, và một bộ cho mỗi Part 2/3/4.
 *
 * Part 1 phải là 5 bộ CÂU RỜI chứ không dùng bộ gộp 5 câu: blueprint đã khai
 * questionSetCount = 5, đưa bộ gộp vào sẽ thành 25 câu.
 */
const BLUEPRINTS = [
  {
    code: 'MOCK_WRITING_CLUB_101',
    name: 'Thi thử Writing - Music Club (bản bảng tin)',
    description: 'Đủ 4 phần, khớp bài hướng dẫn Top 5 Writing trên bảng tin',
    suffix: '000101',
    part1: [
      '0521363f-714b-48e9-b30f-f6fbab89208a', // How many people are in your family?
      '8e5a2a80-0586-4ac7-b720-5f6a2501b602', // What is your hobby?
      '026ba016-65f0-4c51-aa62-c98a61a78e9d', // What did you do last night?
      '8e5a2a80-0586-4ac7-b720-5f6a2501b604', // How do you go to work?
      '8e5a2a80-0586-4ac7-b720-5f6a2501b605', // What kind of music do you like?
    ],
    part2: '747b2572-8308-4299-bcba-67c81856b939', // lần gần nhất nghe nhạc
    part3: '760347c6-2805-4649-b850-f32542f32baf', // how often / con trai / văn hoá
    part4: 'b47d7292-dd1c-4ff7-8b81-d804740cf51a', // hàng xóm phàn nàn tiếng ồn
  },
  {
    code: 'MOCK_WRITING_CLUB_102',
    name: 'Thi thử Writing - English Club (bản bảng tin)',
    description: 'Đủ 4 phần, khớp bài hướng dẫn Top 5 Writing trên bảng tin',
    suffix: '000102',
    part1: [
      '6d0537dd-9af5-4d2e-9400-2af1f1a96e01', // How is the weather today?
      '78ec89fc-3a9a-4f3b-ab5c-d0f4efb477b9', // What is your favourite season of the year?
      '6d0537dd-9af5-4d2e-9400-2af1f1a96e03', // What do you like to do every morning?
      '153a0282-3bef-4089-ac47-0b8ffc5d2a03', // What do you do in your free time?
      '026ba016-65f0-4c51-aa62-c98a61a78e9d', // What did you do last night?
    ],
    part2: '6e1a7c83-4eb6-41f5-8c66-3c804cdfdb7c', // dùng internet để làm gì
    part3: 'bdaaaf6e-74db-4040-a14b-08db3287126a', // 6 tiếng học tiếng Anh / ngôn ngữ phổ biến
    part4: 'd76f16da-fa5b-42ad-8994-cc142c0a1e85', // talk show bị huỷ
  },
];

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
});

let created = 0;

for (const bp of BLUEPRINTS) {
  const [[existing]] = await sql.query('SELECT id FROM test_blueprints WHERE code = ? LIMIT 1', [
    bp.code,
  ]);
  if (existing) {
    console.log(`  BỎ QUA ${bp.name}: đã tồn tại`);
    continue;
  }

  // Kiểm mọi bộ đề tồn tại và đúng Part trước khi ghi: để FK báo lỗi thì không
  // biết bộ nào sai.
  const wanted = [
    ...bp.part1.map((id) => ({ id, part: PART[1] })),
    { id: bp.part2, part: PART[2] },
    { id: bp.part3, part: PART[3] },
    { id: bp.part4, part: PART[4] },
  ];
  let ok = true;
  for (const item of wanted) {
    const [[row]] = await sql.query(
      "SELECT part_id, status FROM question_sets WHERE id = ? LIMIT 1",
      [item.id],
    );
    if (!row) {
      console.log(`  LỖI: không có bộ đề ${item.id}`);
      ok = false;
    } else if (row.part_id !== item.part) {
      console.log(`  LỖI: bộ ${item.id} không thuộc Part mong muốn`);
      ok = false;
    } else if (row.status !== 'PUBLISHED') {
      console.log(`  LỖI: bộ ${item.id} chưa xuất bản`);
      ok = false;
    }
  }
  if (!ok) continue;

  const blueprintId = `1d000000-0000-4000-8000-${bp.suffix.padStart(12, '0')}`;
  const ruleId = (part) => `1e000000-0000-4000-8000-${String(part).padStart(6, '0')}${bp.suffix}`;

  if (dryRun) {
    console.log(`  [dry] ${bp.name}`);
    console.log(`        Part 1: ${bp.part1.length} câu | Part 2/3/4: mỗi phần 1 bộ`);
    created += 1;
    continue;
  }

  await sql.query(
    `INSERT INTO test_blueprints
       (id, exam_version_id, component_id, code, name, description, mode,
        access_level, duration_seconds, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'MOCK_TEST', 'PREMIUM', 3000, 'PUBLISHED', NOW(), NOW())`,
    [blueprintId, EXAM_VERSION, WRITING_COMPONENT, bp.code, bp.name, bp.description],
  );

  const rules = [
    { part: PART[1], count: bp.part1.length, order: 1, sets: bp.part1, key: 1 },
    { part: PART[2], count: 1, order: 2, sets: [bp.part2], key: 2 },
    { part: PART[3], count: 1, order: 3, sets: [bp.part3], key: 3 },
    { part: PART[4], count: 1, order: 4, sets: [bp.part4], key: 4 },
  ];

  for (const rule of rules) {
    const id = ruleId(rule.key);
    await sql.query(
      `INSERT INTO blueprint_part_rules
         (id, blueprint_id, part_id, question_set_count, selection_strategy,
          allow_free_content, allow_premium_content, display_order)
       VALUES (?, ?, ?, ?, 'FIXED', 1, 1, ?)`,
      [id, blueprintId, rule.part, rule.count, rule.order],
    );

    let order = 1;
    for (const setId of rule.sets) {
      await sql.query(
        `INSERT INTO blueprint_fixed_question_sets
           (blueprint_rule_id, question_set_id, display_order)
         VALUES (?, ?, ?)`,
        [id, setId, order++],
      );
    }
  }

  console.log(`  ✓ ${bp.name} (${bp.code})`);
  created += 1;
}

console.log(`\nTạo mới: ${created}`);
await sql.end();
