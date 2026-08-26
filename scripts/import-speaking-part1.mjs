/**
 * Nhập câu hỏi Speaking Part 1 từ file JSON của aptisprep.
 *
 *   node scripts/import-speaking-part1.mjs [--dry-run] [--limit N]
 *
 * Mỗi CÂU một bộ (1 item, AUDIO_RECORDING 30 giây, 1.66 điểm) — giữ nguyên
 * kiểu 153 bộ hiện có để practice.merge-item-parts vẫn gộp 3 bộ thành một đề
 * khi tạo lượt. Không đổi sang bộ-3-câu như Speaking Part 4, vì Part 1 đề thật
 * là ba câu ĐỘC LẬP, mỗi câu ghi âm riêng.
 *
 * Đáp án mẫu vào field explanation như các bộ đang có — để học viên tham khảo
 * cách nói sau khi nộp, không dùng để chấm (AI chấm theo rubric
 * APTIS_SPEAKING_PART_1_V1).
 *
 * Script chạy lại được: câu đã có sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const SPEAKING_PART_1_ID = '16000000-0000-4000-8000-000000000031';
const RUBRIC_CODE = 'APTIS_SPEAKING_PART_1_V1';
/** Điểm mỗi câu, khớp 153 bộ hiện có (5 điểm chia cho 3 câu một đề). */
const ITEM_MAX_SCORE = 1.66;
/** Giới hạn ghi âm mỗi câu, theo đề thi thật. */
const RESPONSE_SECONDS = 30;

const [, , ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
const limitFlag = flags.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(flags[limitFlag + 1]) : Infinity;

const FILE = 'AptisPrep.com/speaking/part 1/aptisprep_speaking_part1_full.json';

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
 * Bóc đáp án mẫu ra khỏi khối text giao diện của trang gốc.
 *
 * <p>Nguồn lưu cả phần điều khiển: "Đáp án B1 / Đáp án B2-C1 / 👩 Nữ / 👨 Nam
 * / Nghe" rồi mới tới câu trả lời. Cắt từ sau chữ "Nghe" cuối cùng — đó là
 * nhãn nút phát audio, ngay trước phần nội dung.
 */
function cleanSampleAnswer(raw) {
  let text = String(raw ?? '');
  const marker = text.lastIndexOf('Nghe\n');
  if (marker >= 0) text = text.slice(marker + 'Nghe\n'.length);
  return text.trim();
}

async function main() {
  const payload = JSON.parse(readFileSync(FILE, 'utf8'));
  const questions = payload.questions ?? [];
  console.log(`File có ${questions.length} câu.`);

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

  const existing = await docs.find({ partId: SPEAKING_PART_1_ID }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }
  console.log(`DB đang có ${existing.length} bộ.`);

  const fresh = questions.filter((q) => {
    const prompt = String(q.question ?? '').trim();
    return prompt && !known.has(normalize(prompt));
  });
  console.log(`Câu cần nhập: ${fresh.length}`);

  const targets = fresh.slice(0, limit);
  if (limit !== Infinity) console.log(`Giới hạn lần này: ${targets.length} câu`);

  if (dryRun) {
    for (const q of targets.slice(0, 5)) {
      console.log(`  [dry] #${q.number}: ${q.question}`);
      console.log(`         mẫu: ${cleanSampleAnswer(q.sampleAnswer).slice(0, 90)}…`);
    }
    console.log(`\n(dry-run) sẽ nhập ${targets.length} câu.`);
    await sql.end();
    await mongo.close();
    return;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = 'AUDIO_RECORDING' LIMIT 1`,
  );
  const prefix = 'SPEAKING_P1_AP_';
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, SPEAKING_PART_1_ID, prefix],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;

  for (const q of targets) {
    const prompt = String(q.question ?? '').trim();
    const sample = cleanSampleAnswer(q.sampleAnswer);
    const code = `${prefix}${String(nextNo).padStart(3, '0')}`;
    const title = prompt.length > 200 ? `${prompt.slice(0, 197)}…` : prompt;
    const questionSetId = randomUUID();

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, 1, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, SPEAKING_PART_1_ID, taskTypeId, code, title, ITEM_MAX_SCORE, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: SPEAKING_PART_1_ID,
      taskTypeCode: 'AUDIO_RECORDING',
      title,
      instructions: `Trả lời câu hỏi. Ghi âm tối đa ${RESPONSE_SECONDS} giây.`,
      accessLevel: 'PREMIUM',
      stimulus: null,
      sections: [],
      items: [
        {
          id: randomUUID(),
          sequenceNo: 1,
          prompt: { format: 'PLAIN_TEXT', value: prompt },
          responseType: 'AUDIO_RECORDING',
          required: true,
          maxScore: ITEM_MAX_SCORE,
          options: [],
          leftItems: [],
          rightItems: [],
          constraints: { responseSeconds: RESPONSE_SECONDS },
          rubricCode: RUBRIC_CODE,
          answerKey: null,
          // Đáp án mẫu chỉ để tham khảo sau khi nộp; AI chấm theo rubric.
          explanation: sample ? { format: 'PLAIN_TEXT', value: sample } : null,
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
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: ITEM_MAX_SCORE },
      sourceRef: { provider: 'aptisprep', skill: 'speaking', part: 1, sourceId: String(q.number) },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title.slice(0, 60)}${sample ? '' : ' (KHÔNG có đáp án mẫu)'}`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`\nĐã nhập ${imported}/${targets.length} câu.`);
  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
