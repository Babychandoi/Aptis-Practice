/**
 * Nhập đề Reading Part 2 (sắp xếp câu) từ file aptisprep.
 *
 *   node scripts/import-reading-part2.mjs <file.json> [--dry-run] [--limit N]
 *
 * Mỗi bộ là MỘT item ORDERING: 5 câu trong sentencePool thành 5 options
 * (s1..s5 / A..E), đáp án là thứ tự đúng ở answerKey.orderedOptionIds.
 * 5 điểm, 1 điểm mỗi câu đúng vị trí — khớp 66 bộ hiện có.
 *
 * Cả 5 câu đều xáo trộn; leadText trong file KHÔNG phải câu cố định (0/66 bộ
 * trong DB dùng nó), nên không đưa vào bài.
 *
 * Chỉ nhập đề CÓ TÊN: 31/71 biến thể trong file không có title/baseTitle/
 * topic.title nào, đặt tên tự sinh thì học viên không biết đề nói về gì.
 *
 * Giữ nguyên phần "(Version N)" trong tên: đó là các biến thể nội dung khác
 * nhau của cùng chủ đề, bỏ đi thì trùng tên và không phân biệt được.
 *
 * Script chạy lại được: đề đã có (so theo nội dung câu) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const READING_PART_2_ID = '16000000-0000-4000-8000-000000000012';
const TASK_TYPE_CODE = 'SENTENCE_ORDERING';
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];
/** 1 điểm mỗi câu đúng vị trí, tổng 5 — khớp part_scoring_rules. */
const POINTS_PER_CORRECT = 1;
const SENTENCE_COUNT = 5;

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

const normalize = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Làm gọn tên đề nhưng GIỮ "(Version N)".
 *
 * <p>Chỉ bỏ phần ghi chú của người soạn lẫn vào trong ngoặc, ví dụ
 * "(Version 2 - khác nội dung nhưng cùng cách sắp xếp với Ver 1)" -> "(Version 2)".
 */
function cleanTitle(text) {
  return String(text ?? '')
    .replace(/\(\s*(Version\s*\d+)\s*[-–][^)]*\)/gi, '($1)')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));

  const candidates = [];
  let noTitle = 0;
  let wrongCount = 0;
  for (const topic of payload.topics ?? []) {
    for (const variant of topic.variants ?? []) {
      const pool = variant.sentencePool ?? [];
      const order = variant.correctOrder ?? [];
      const rawName =
        (variant.title && String(variant.title).trim()) ||
        (variant.baseTitle && String(variant.baseTitle).trim()) ||
        (topic.title && String(topic.title).trim());

      if (!rawName) {
        noTitle += 1;
        continue;
      }
      if (pool.length !== SENTENCE_COUNT || order.length !== SENTENCE_COUNT) {
        wrongCount += 1;
        continue;
      }

      // options theo đúng thứ tự đã xáo của file; orderedOptionIds là đáp án.
      const options = pool.map((sentence, index) => ({
        id: `s${index + 1}`,
        code: OPTION_CODES[index],
        content: String(sentence).trim(),
      }));
      const byContent = new Map(options.map((o) => [normalize(o.content), o.id]));
      const ordered = [...order]
        .sort((a, b) => a.position - b.position)
        .map((o) => byContent.get(normalize(o.sentence)));
      if (ordered.some((id) => !id)) {
        wrongCount += 1;
        continue;
      }

      candidates.push({ title: cleanTitle(rawName), topic: cleanTitle(topic.title), options, ordered });
    }
  }

  console.log(
    `File: ${candidates.length} đề dùng được` +
      ` (bỏ ${noTitle} đề không có tên, ${wrongCount} đề lệch ${SENTENCE_COUNT} câu).`,
  );

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

  const existing = await docs.find({ partId: READING_PART_2_ID }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      for (const option of item.options ?? []) {
        if (option?.content) known.add(normalize(option.content));
      }
    }
  }

  const fresh = candidates.filter(
    (set) => !set.options.some((o) => known.has(normalize(o.content))),
  );
  console.log(`DB đang có ${existing.length} bộ | đề cần nhập: ${fresh.length}`);

  const targets = fresh.slice(0, limit);
  if (limit !== Infinity) console.log(`Giới hạn lần này: ${targets.length} đề`);

  if (dryRun) {
    for (const set of targets.slice(0, 3)) {
      console.log(`  [dry] ${set.title}`);
      set.ordered.forEach((id, index) => {
        const option = set.options.find((o) => o.id === id);
        console.log(`         ${index + 1}. ${option.content.slice(0, 70)}`);
      });
    }
    console.log(`\n(dry-run) sẽ nhập ${targets.length} đề.`);
    await sql.end();
    await mongo.close();
    return;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = ? LIMIT 1`,
    [TASK_TYPE_CODE],
  );
  const prefix = 'READING_P2_AP_';
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, READING_PART_2_ID, prefix],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;
  const maxScore = SENTENCE_COUNT * POINTS_PER_CORRECT;

  for (const set of targets) {
    const code = `${prefix}${String(nextNo).padStart(3, '0')}`;
    const questionSetId = randomUUID();
    const title = set.title.length > 200 ? `${set.title.slice(0, 197)}…` : set.title;

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 1, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, READING_PART_2_ID, taskTypeId, code, title, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: READING_PART_2_ID,
      taskTypeCode: TASK_TYPE_CODE,
      title,
      instructions: 'Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.',
      accessLevel: 'PREMIUM',
      stimulus: { format: 'PLAIN_TEXT', value: `Topic: ${set.topic || title}` },
      sections: [],
      items: [
        {
          id: randomUUID(),
          sequenceNo: 1,
          prompt: null,
          responseType: 'ORDERING',
          required: true,
          maxScore,
          options: set.options,
          leftItems: [],
          rightItems: [],
          constraints: { pointsPerCorrect: POINTS_PER_CORRECT },
          rubricCode: null,
          answerKey: {
            type: 'ORDERING',
            selectedOptionId: null,
            selectedOptionIds: [],
            matches: {},
            orderedOptionIds: set.ordered,
            acceptedValues: [],
            caseSensitive: false,
          },
          explanation: null,
        },
      ],
      assets: [],
      settings: {
        shuffleOptions: false,
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'reading', part: 2 },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title.slice(0, 65)}`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`\nĐã nhập ${imported}/${targets.length} đề.`);
  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
