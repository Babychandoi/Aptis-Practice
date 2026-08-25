/**
 * Nhập đề Reading Part 1 dạng ĐOẠN VĂN + 5 CHỖ TRỐNG từ file JSON của aptisprep.
 *
 *   node scripts/import-reading-part1.mjs <file.json> [--dry-run] [--limit N]
 *
 * Khác gì ngân hàng cũ: 208 bộ cũ mỗi bộ chỉ có MỘT câu rời, hệ thống phải gộp
 * 5 bộ lại khi tạo lượt (xem `practice.merge-item-parts`). Cách đó lấy 5 câu
 * ngẫu nhiên từ cả ngân hàng nên chúng không thuộc cùng một đoạn văn — học viên
 * mất hẳn ngữ cảnh, khác đề thi thật.
 *
 * Đề nhập ở đây là một bộ hoàn chỉnh: `stimulus` giữ đoạn văn, `items` là đúng
 * 5 chỗ trống của chính đoạn đó. Nhờ vậy bỏ được merge cho Part này.
 *
 * Điểm giữ nguyên 5 câu x 2 = 10 để so sánh được với `part_scoring_rules`
 * (max_score 10, points_per_correct 2) và với lịch sử cũ.
 *
 * Script chạy lại được: đề đã có (so theo nội dung chỗ trống) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const READING_PART_1_ID = '16000000-0000-4000-8000-000000000011';
const GAP_FILL_TASK_TYPE = '12000000-0000-4000-8000-000000000003';
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Số bộ đầu để FREE, khớp luật "3 đề đầu miễn phí" của các kỹ năng khác. */
const FREE_COUNT = 3;

const [, , filePath, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
const limitFlag = flags.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(flags[limitFlag + 1]) : Infinity;

if (!filePath) {
  console.error('Thiếu đường dẫn file JSON.');
  process.exit(1);
}

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis',
};

/**
 * Chuẩn hoá để so trùng. Phải xoá cả cách đánh dấu chỗ trống: file dùng
 * "___1___" hoặc "___", DB cũ lưu "______" — cùng một câu nhưng khác số gạch.
 */
const normalize = (value) =>
  String(value ?? '')
    .replace(/_+\s*\d*\s*_*/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const sets = payload.sets ?? [];
  console.log(`File có ${sets.length} đề (mỗi đề 1 đoạn văn + 5 chỗ trống).`);

  const sql = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDb,
  });
  const mongo = new MongoClient(env.mongoUri);
  await mongo.connect();
  const docs = mongo.db().collection('question_set_documents');

  // --- Bước 1: bỏ đề đã có ---------------------------------------------
  // Chỉ so với các bộ NHIỀU CÂU (đề dạng mới). Bộ 1-câu cũ luôn "khớp" một
  // chỗ trống nào đó nên nếu tính vào thì đề mới nào cũng bị coi là đã có.
  const existing = await docs
    .find({ partId: READING_PART_1_ID, 'items.4': { $exists: true } })
    .toArray();

  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }
  console.log(`DB đang có ${existing.length} bộ dạng mới (nhiều câu).`);

  const fresh = sets.filter((set) => {
    const gaps = (set.gaps ?? []).map((g) => normalize(g.prompt)).filter(Boolean);
    return gaps.length > 0 && !gaps.some((g) => known.has(g));
  });
  console.log(`Đề cần nhập: ${fresh.length}`);

  const targets = fresh.slice(0, limit);
  if (limit !== Infinity) console.log(`Giới hạn lần này: ${targets.length} đề`);

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );

  // Mã đề chạy tiếp số lớn nhất đang có để không đụng mã cũ.
  // 20 = độ dài 'READING_P1_PASSAGE_' + 1 (SUBSTRING của MySQL đếm từ 1).
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, 20) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets
      WHERE part_id = ? AND code LIKE 'READING_P1_PASSAGE_%'`,
    [READING_PART_1_ID],
  );

  if (dryRun) {
    for (const set of targets.slice(0, 5)) {
      console.log(`  [dry] set ${set.number}: ${(set.passage ?? '').slice(0, 60).replace(/\n/g, ' ')}…`);
      for (const gap of set.gaps ?? []) {
        console.log(`         ${gap.number}. ${gap.prompt}  [${(gap.wordBank ?? []).join(' / ')}] -> ${gap.correctAnswer}`);
      }
    }
    console.log(`\n(dry-run) Sẽ nhập ${targets.length} đề.`);
    await sql.end();
    await mongo.close();
    return;
  }

  // Đếm bộ FREE đã có, không dựa vào `imported`: chạy script lần hai sẽ lại
  // tạo thêm 3 bộ FREE nữa.
  const [[{ freeSoFar }]] = await sql.query(
    `SELECT COUNT(*) AS freeSoFar FROM question_sets
      WHERE part_id = ? AND code LIKE 'READING_P1_PASSAGE_%' AND access_level = 'FREE'`,
    [READING_PART_1_ID],
  );

  let nextNo = Number(maxNo) + 1;
  let freeCount = Number(freeSoFar);
  let imported = 0;

  for (const set of targets) {
    const items = (set.gaps ?? []).map((gap, index) => buildItem(gap, index));
    if (items.length === 0) continue;

    const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0);
    const code = `READING_P1_PASSAGE_${String(nextNo).padStart(3, '0')}`;
    const title = titleFrom(set);
    const accessLevel = freeCount < FREE_COUNT ? 'FREE' : 'PREMIUM';
    if (accessLevel === 'FREE') freeCount += 1;
    const questionSetId = randomUUID();

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, ?, 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, READING_PART_1_ID, GAP_FILL_TASK_TYPE, code, title,
        accessLevel, items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: READING_PART_1_ID,
      taskTypeCode: 'GAP_FILL_CHOICE',
      title,
      instructions: set.instruction
        ? String(set.instruction)
        : 'Đọc đoạn văn dưới đây. Chọn một từ phù hợp cho mỗi chỗ trống.',
      accessLevel,
      // Đoạn văn dùng chung cho cả 5 chỗ trống — frontend render stimulus
      // phía trên danh sách câu (AttemptPage).
      stimulus: { format: 'PLAIN_TEXT', value: String(set.passage ?? '') },
      sections: [],
      items,
      assets: [],
      settings: {
        shuffleOptions: false,
        // Không đảo câu: thứ tự chỗ trống phải khớp đoạn văn.
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'reading', part: 1, sourceId: String(set.number) },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title} (${items.length} chỗ trống, ${maxScore} điểm, ${accessLevel})`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`\nĐã nhập ${imported}/${targets.length} đề.`);
  await sql.end();
  await mongo.close();
}

/** Tiêu đề lấy dòng đầu có nghĩa của đoạn văn, ví dụ "Dear Sarah". */
function titleFrom(set) {
  const firstLine = String(set.passage ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const base = firstLine ? firstLine.replace(/[,:]$/, '') : `Reading Part 1 đề ${set.number}`;
  return `${base.slice(0, 80)} (2026)`;
}

function buildItem(gap, index) {
  const options = (gap.wordBank ?? []).map((content, i) => ({
    id: OPTION_CODES[i],
    code: OPTION_CODES[i],
    content: String(content),
  }));

  const answerIdx = options.findIndex(
    (o) => normalize(o.content) === normalize(gap.correctAnswer),
  );
  if (answerIdx < 0) {
    throw new Error(
      `Không tìm được đáp án "${gap.correctAnswer}" trong [${(gap.wordBank ?? []).join(', ')}]`,
    );
  }

  return {
    id: randomUUID(),
    sequenceNo: index + 1,
    prompt: { format: 'PLAIN_TEXT', value: String(gap.prompt) },
    responseType: 'SINGLE_CHOICE',
    required: true,
    maxScore: 2,
    options,
    leftItems: [],
    rightItems: [],
    constraints: { sourceQuestionId: String(gap.number ?? ''), sourceDisplayNo: '' },
    answerKey: {
      type: 'SINGLE_CHOICE',
      selectedOptionId: options[answerIdx].id,
      selectedOptionIds: [],
      matches: {},
      orderedOptionIds: [],
      acceptedValues: [],
      caseSensitive: false,
    },
  };
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
