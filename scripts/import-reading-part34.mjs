/**
 * Nhập đề Reading Part 3 (ghép người) và Part 4 (ghép tiêu đề) từ aptisprep.
 *
 *   node scripts/import-reading-part34.mjs <3|4|all> [--dry-run] [--limit N]
 *
 * Cả hai part đều là dạng MATCHING một item:
 *
 *   P3  4 người (Person A-D) nói ở stimulus, 7 nhận định ở leftItems, đáp án
 *       là map "nhận định -> người". 16 điểm, 2 điểm mỗi câu đúng.
 *   P4  7 đoạn văn ở leftItems, 7 tiêu đề ở rightItems, đáp án là map
 *       "đoạn -> tiêu đề". 14 điểm, 2 điểm mỗi câu đúng.
 *
 * Chấm PARTIAL_MATCH nên ghép đúng vài câu vẫn được điểm phần đó.
 *
 * Script chạy lại được: đề đã có (so theo nội dung) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const PART_ID = {
  3: '16000000-0000-4000-8000-000000000013',
  4: '16000000-0000-4000-8000-000000000014',
};
/**
 * taskTypeCode trong document Mongo — Part 3 dùng OPINION_MATCHING dù
 * task_types (MySQL) không có mã đó.
 */
const DOC_TASK_TYPE = { 3: 'OPINION_MATCHING', 4: 'HEADING_MATCHING' };
/** Mã tra task_types của MySQL: Part 3 các bộ hiện có đều gắn SPEAKER_MATCHING. */
const SQL_TASK_TYPE = { 3: 'SPEAKER_MATCHING', 4: 'HEADING_MATCHING' };
const POINTS_PER_CORRECT = 2;

const INSTRUCTIONS = {
  3: 'Đọc ý kiến của bốn người và ghép mỗi nhận định với người phù hợp.',
  4: 'Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.',
};
const ITEM_PROMPT = {
  3: 'Ghép mỗi nhận định với người phù hợp.',
  4: 'Ghép mỗi đoạn văn với tiêu đề phù hợp.',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitFlag = args.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : Infinity;
const target = args[0];

if (!target) {
  console.error('Dùng: node scripts/import-reading-part34.mjs <3|4|all> [--dry-run] [--limit N]');
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

/** Bỏ "(Version 2)" khỏi tên để tiêu đề gọn như các bộ đang có. */
const baseName = (text) =>
  String(text ?? '')
    .replace(/\s*\(Version\s*\d+[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Part 3: 4 người ở stimulus, 7 nhận định ghép vào người.
 * Đáp án trong file là nhãn kiểu "Person A" -> quy về id pA/pB/pC/pD.
 */
function buildPart3(topic, variant) {
  const people = variant.people ?? [];
  const questions = variant.questions ?? [];
  if (people.length === 0 || questions.length === 0) return null;

  const rightItems = people.map((p, index) => {
    const letter = String(p.label ?? '').match(/([A-Z])\s*$/)?.[1] ?? String.fromCharCode(65 + index);
    return { id: `p${letter}`, code: letter, content: String(p.label ?? `Person ${letter}`).trim() };
  });

  const leftItems = questions.map((q, index) => ({
    id: `st${index + 1}`,
    // Giữ mã chữ như bộ hiện có (G, H, I...), chỉ để hiển thị.
    code: String.fromCharCode(71 + index),
    content: String(q.prompt ?? '').trim(),
  }));

  const matches = {};
  questions.forEach((q, index) => {
    const answer = String(q.correctAnswer ?? '');
    const letter = answer.match(/([A-Z])\s*$/)?.[1];
    const right = rightItems.find((r) => r.code === letter);
    if (right) matches[`st${index + 1}`] = right.id;
  });
  if (Object.keys(matches).length !== questions.length) return null;

  const body = people
    .map((p) => `${String(p.label ?? '').trim()}:\n${String(p.text ?? '').trim()}`)
    .join('\n\n');

  return {
    title: baseName(variant.title || topic.title),
    stimulus: {
      format: 'PLAIN_TEXT',
      value: `Topic: ${baseName(topic.title)}\n\n${body}`,
    },
    leftItems,
    rightItems,
    matches,
    count: questions.length,
  };
}

/**
 * Part 4: 7 đoạn văn ghép với 7 tiêu đề trong headingBank.
 * File cho correctHeading là NỘI DUNG tiêu đề, phải tra ngược ra id.
 */
function buildPart4(topic, variant) {
  const paragraphs = variant.paragraphs ?? [];
  const bank = variant.headingBank ?? [];
  if (paragraphs.length === 0 || bank.length === 0) return null;

  const rightItems = bank.map((h, index) => ({
    id: `h${index + 1}`,
    code: String(index + 1),
    content: String(h).trim(),
  }));

  const leftItems = paragraphs.map((p, index) => ({
    id: `para${index + 1}`,
    code: `Paragraph ${String.fromCharCode(65 + index)}`,
    content: String(p.text ?? '').trim(),
  }));

  const byContent = new Map(rightItems.map((r) => [normalize(r.content), r.id]));
  const matches = {};
  paragraphs.forEach((p, index) => {
    const id = byContent.get(normalize(p.correctHeading));
    if (id) matches[`para${index + 1}`] = id;
  });
  if (Object.keys(matches).length !== paragraphs.length) return null;

  return {
    title: baseName(variant.title || topic.title),
    stimulus: { format: 'PLAIN_TEXT', value: `Topic: ${baseName(topic.title)}` },
    leftItems,
    rightItems,
    matches,
    count: paragraphs.length,
  };
}

const FILES = {
  3: 'AptisPrep.com/reading/part 3/aptisprep_reading_part3_full.json',
  4: 'AptisPrep.com/reading/part 4/aptisprep_reading_part4_full.json',
};

async function importPart(part, sql, docs) {
  const partId = PART_ID[part];
  const payload = JSON.parse(readFileSync(FILES[part], 'utf8'));
  const build = part === 3 ? buildPart3 : buildPart4;

  const candidates = [];
  let skipped = 0;
  for (const topic of payload.topics ?? []) {
    for (const variant of topic.variants ?? []) {
      const built = build(topic, variant);
      if (built) candidates.push(built);
      else skipped += 1;
    }
  }

  // Tập nội dung đã có: quét cả leftItems vì đó là phần đặc trưng của đề.
  const existing = await docs.find({ partId }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      for (const left of item.leftItems ?? []) {
        if (left?.content) known.add(normalize(left.content));
      }
    }
  }

  const fresh = candidates.filter(
    (set) => !set.leftItems.some((l) => known.has(normalize(l.content))),
  );

  console.log(
    `\n=== Reading Part ${part} === file: ${candidates.length} đề` +
      `${skipped ? ` (bỏ ${skipped} đề dữ liệu không đủ)` : ''}` +
      ` | DB: ${existing.length} | cần nhập: ${fresh.length}`,
  );

  const targets = fresh.slice(0, limit);
  if (dryRun) {
    for (const set of targets.slice(0, 2)) {
      console.log(`  [dry] ${set.title} — ${set.count} câu, ${set.count * POINTS_PER_CORRECT} điểm`);
      console.log(`        stimulus: ${set.stimulus.value.slice(0, 90).replace(/\n/g, ' ')}…`);
      set.leftItems.slice(0, 3).forEach((l) => {
        const right = set.rightItems.find((r) => r.id === set.matches[l.id]);
        console.log(`        ${l.code}: ${l.content.slice(0, 55)} -> ${right?.content.slice(0, 40)}`);
      });
    }
    console.log(`  (dry-run) sẽ nhập ${targets.length} đề.`);
    return 0;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = ? LIMIT 1`,
    [SQL_TASK_TYPE[part]],
  );
  const prefix = `READING_P${part}_AP_`;
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, partId, prefix],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;

  for (const set of targets) {
    const maxScore = set.count * POINTS_PER_CORRECT;
    const code = `${prefix}${String(nextNo).padStart(3, '0')}`;
    const questionSetId = randomUUID();
    const title = set.title.length > 200 ? `${set.title.slice(0, 197)}…` : set.title;

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 1, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, partId, taskTypeId, code, title, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId,
      taskTypeCode: DOC_TASK_TYPE[part],
      title,
      instructions: INSTRUCTIONS[part],
      accessLevel: 'PREMIUM',
      stimulus: set.stimulus,
      sections: [],
      items: [
        {
          id: randomUUID(),
          sequenceNo: 1,
          prompt: { format: 'PLAIN_TEXT', value: ITEM_PROMPT[part] },
          responseType: 'MATCHING',
          required: true,
          maxScore,
          options: [],
          leftItems: set.leftItems,
          rightItems: set.rightItems,
          constraints: { pointsPerCorrect: POINTS_PER_CORRECT },
          answerKey: {
            type: 'MATCHING',
            selectedOptionId: null,
            selectedOptionIds: [],
            matches: set.matches,
            orderedOptionIds: [],
            acceptedValues: [],
            caseSensitive: false,
          },
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
      scoring: { strategy: 'PARTIAL_MATCH', partialCredit: true, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'reading', part },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title} (${set.count} câu, ${maxScore} điểm)`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`  Đã nhập ${imported}/${targets.length} đề.`);
  return imported;
}

async function main() {
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

  const parts = target === 'all' ? [3, 4] : [Number(target)];
  let total = 0;
  for (const part of parts) {
    if (!PART_ID[part]) throw new Error(`Part không hợp lệ: ${part}`);
    total += await importPart(part, sql, docs);
  }
  console.log(`\nTổng đã nhập: ${total} đề.`);

  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
