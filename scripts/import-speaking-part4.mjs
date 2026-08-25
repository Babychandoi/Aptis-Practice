/**
 * Nhập đề Speaking Part 4 dạng MỘT CHỦ ĐỀ + 3 CÂU LIÊN QUAN từ file aptisprep.
 *
 *   node scripts/import-speaking-part4.mjs <file.json> [--dry-run] [--limit N]
 *
 * Ngân hàng cũ lưu mỗi bộ MỘT câu, blueprint lại lấy 3 bộ nên học viên nhận 3
 * chủ đề rời rạc ("một lần nhận câu hỏi khó", "một lần thăm bạn", "một lần đạt
 * thành tựu") và mỗi bộ tính 20 điểm -> Part 4 thành 60 điểm thay vì 20.
 *
 * Đề thi thật là một chủ đề duy nhất với 3 câu nối tiếp nhau, chuẩn bị 1 phút
 * rồi nói 2 phút cho CẢ BA câu. Nên mỗi bộ ở đây gồm đúng 3 item của cùng chủ
 * đề, tổng 20 điểm (rubric APTIS_SPEAKING_PART_4_V1 giữ nguyên).
 *
 * Script chạy lại được: đề đã có (so theo nội dung câu hỏi) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const SPEAKING_PART_4_ID = '16000000-0000-4000-8000-000000000034';
const RUBRIC_CODE = 'APTIS_SPEAKING_PART_4_V1';
/** Tổng điểm một đề Part 4, chia đều cho 3 câu. Khớp part_scoring_rules. */
const SET_MAX_SCORE = 20;

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
 * Câu hỏi trong file đôi khi kèm dòng hướng dẫn ("Trả lời cả 3 câu hỏi trong
 * 120 giây"). Chỉ giữ dòng đầu — phần hướng dẫn đã nằm ở instructions của bộ.
 */
const cleanQuestion = (raw) =>
  String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const sets = payload.sets ?? [];
  console.log(`File có ${sets.length} đề (mỗi đề 1 chủ đề + ${payload.questionsPerSet ?? 3} câu).`);

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

  // Chỉ so với bộ dạng MỚI (>=3 câu). Bộ 1-câu cũ luôn khớp câu đầu nên nếu
  // tính vào thì đề mới nào cũng bị coi là đã có.
  const existing = await docs
    .find({ partId: SPEAKING_PART_4_ID, 'items.2': { $exists: true } })
    .toArray();

  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }
  console.log(`DB đang có ${existing.length} bộ dạng mới (>=3 câu).`);

  const fresh = sets.filter((set) => {
    const qs = (set.questions ?? []).map((q) => normalize(cleanQuestion(q.question)));
    return qs.length > 0 && !qs.some((q) => q && known.has(q));
  });
  console.log(`Đề cần nhập: ${fresh.length}`);

  const targets = fresh.slice(0, limit);
  if (limit !== Infinity) console.log(`Giới hạn lần này: ${targets.length} đề`);

  if (dryRun) {
    for (const set of targets.slice(0, 5)) {
      console.log(`  [dry] set ${set.number} (${set.timeLimitSeconds}s):`);
      for (const q of set.questions ?? []) {
        console.log(`         Q${q.number}: ${cleanQuestion(q.question)}`);
      }
    }
    console.log(`\n(dry-run) Sẽ nhập ${targets.length} đề.`);
    await sql.end();
    await mongo.close();
    return;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT task_type_id AS taskTypeId FROM question_sets WHERE part_id = ? LIMIT 1`,
    [SPEAKING_PART_4_ID],
  );
  // 22 = độ dài 'SPEAKING_P4_TOPIC_' + 1 ... tính lại cho chắc bằng CHAR_LENGTH.
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH('SPEAKING_P4_TOPIC_') + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets
      WHERE part_id = ? AND code LIKE 'SPEAKING_P4_TOPIC_%'`,
    [SPEAKING_PART_4_ID],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;

  for (const set of targets) {
    // Bỏ câu trùng: 2/27 đề trong file lặp lại một câu (set 2 có Q1 == Q2, set
    // 3 có Q1 == Q3). Để nguyên thì học viên bị hỏi cùng một câu hai lần.
    const seen = new Set();
    const questions = [];
    for (const q of set.questions ?? []) {
      const text = cleanQuestion(q.question);
      if (!text) continue;
      const key = normalize(text);
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push(text);
    }
    if (questions.length === 0) continue;

    // Chia đều 20 điểm cho các câu; câu cuối nhận phần dư để tổng luôn đúng 20.
    const per = Math.floor((SET_MAX_SCORE / questions.length) * 100) / 100;
    const items = questions.map((q, index) => ({
      id: randomUUID(),
      sequenceNo: index + 1,
      prompt: { format: 'PLAIN_TEXT', value: q },
      responseType: 'AUDIO_RECORDING',
      required: true,
      maxScore:
        index === questions.length - 1
          ? Number((SET_MAX_SCORE - per * (questions.length - 1)).toFixed(2))
          : per,
      options: [],
      leftItems: [],
      rightItems: [],
      constraints: {},
      rubricCode: RUBRIC_CODE,
      answerKey: null,
      explanation: null,
    }));

    const code = `SPEAKING_P4_TOPIC_${String(nextNo).padStart(3, '0')}`;
    const title = titleFrom(questions[0]);
    const questionSetId = randomUUID();
    const seconds = Number(set.timeLimitSeconds) || 120;

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, SPEAKING_PART_4_ID, taskTypeId, code, title,
        items.length, SET_MAX_SCORE, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: SPEAKING_PART_4_ID,
      taskTypeCode: 'AUDIO_RECORDING',
      title,
      instructions: `Chuẩn bị 1 phút, sau đó trả lời cả ${items.length} câu hỏi trong ${Math.round(seconds / 60)} phút.`,
      accessLevel: 'PREMIUM',
      stimulus: null,
      sections: [],
      items,
      assets: [],
      settings: {
        shuffleOptions: false,
        // Ba câu nối tiếp nhau về nội dung, đảo thứ tự là mất mạch.
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: SET_MAX_SCORE },
      sourceRef: {
        provider: 'aptisprep',
        skill: 'speaking',
        part: 4,
        sourceId: String(set.number),
      },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title} (${items.length} câu, ${SET_MAX_SCORE} điểm)`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`\nĐã nhập ${imported}/${targets.length} đề.`);
  await sql.end();
  await mongo.close();
}

/** Tiêu đề lấy từ câu hỏi đầu — đó là câu nêu chủ đề của cả đề. */
function titleFrom(firstQuestion) {
  const text = firstQuestion.replace(/[.?!]+$/, '').trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
