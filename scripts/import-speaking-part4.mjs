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
 * rồi nói 2 phút cho CẢ BA câu trong MỘT lần ghi âm. Nên mỗi bộ ở đây là MỘT
 * item duy nhất, prompt liệt kê cả 3 câu, tổng 20 điểm (rubric giữ nguyên).
 *
 * Script chạy lại được: đề đã có (so theo nội dung câu hỏi) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const SPEAKING_PART_4_ID = '16000000-0000-4000-8000-000000000034';
const RUBRIC_CODE = 'APTIS_SPEAKING_PART_4_V1';
/** Tổng điểm một đề Part 4. Khớp part_scoring_rules. */
const SET_MAX_SCORE = 20;
/** Thời gian chuẩn bị trước khi ghi âm, theo đề thi thật. */
const PREP_SECONDS = 60;

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

/**
 * Bóc 3 câu hỏi từ {@code rawExpandedText} — bản text nguyên trang của nguồn.
 *
 * <p>Cần đến nó vì mảng {@code questions} của 2/27 đề bị lỗi khi nguồn xuất
 * file: chỗ đáng ra là câu hỏi thì lặp lại câu 1 kèm dòng hướng dẫn, làm mất
 * hẳn một câu (set 2 mất "How did you feel?", set 3 mất "What are the
 * characteristics of a successful team?"). rawExpandedText giữ đủ cả ba.
 *
 * <p>Trả về mảng rỗng nếu không bóc được, để phía gọi quay lại dùng
 * {@code questions}.
 */
function parseFromRaw(raw) {
  let text = String(raw ?? '');

  // Danh sách câu đánh số nằm SAU dòng hướng dẫn, và TRƯỚC khối nút/đáp án mẫu.
  const start = text.search(/Trả lời cả \d+ câu hỏi trong \d+ giây/);
  if (start >= 0) text = text.slice(start);
  const end = text.search(/\n(?:Báo lỗi|Ghi âm|Câu trả lời mẫu)/);
  if (end >= 0) text = text.slice(0, end);

  const found = [];
  const re = /\n\s*([123])\s*\n+([^\n]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const index = Number(m[1]) - 1;
    const value = m[2].trim();
    // Giữ lần xuất hiện ĐẦU của mỗi số: phần sau trang có thể nhắc lại câu.
    if (value && !found[index]) found[index] = value;
  }
  return found.filter(Boolean);
}

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

  // Chỉ so với bộ dạng MỚI — nhận ra bằng sourceRef, không bằng số item: đề
  // mới cũng chỉ có 1 item (một lần ghi âm) như đề cũ.
  const existing = await docs
    .find({ partId: SPEAKING_PART_4_ID, 'sourceRef.provider': 'aptisprep' })
    .toArray();

  // Prompt của đề mới là nhiều câu ghép bằng "\n" và có tiền tố "1. ", "2. ".
  // Tách lại từng câu để so với file.
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      for (const line of String(item?.prompt?.value ?? '').split('\n')) {
        const text = line.replace(/^\s*\d+\.\s*/, '');
        if (text.trim()) known.add(normalize(text));
      }
    }
  }
  console.log(`DB đang có ${existing.length} bộ dạng mới.`);

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
  // Không tra từ bộ có sẵn: khi xoá hết đề cũ thì Part này rỗng, không lấy
  // được. AUDIO_RECORDING là task type cố định của mọi phần Speaking.
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = 'AUDIO_RECORDING' LIMIT 1`,
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
    // Ưu tiên rawExpandedText: mảng questions của 2/27 đề bị mất một câu do
    // nguồn xuất file lỗi. Chỉ quay lại questions khi bóc raw không ra đủ.
    const fromRaw = parseFromRaw(set.rawExpandedText);
    const fromArray = (set.questions ?? [])
      .map((q) => cleanQuestion(q.question))
      .filter(Boolean);
    const picked = fromRaw.length >= fromArray.length ? fromRaw : fromArray;

    // Vẫn lọc trùng cho chắc, dù raw đã đủ ba câu khác nhau.
    const seen = new Set();
    const questions = [];
    for (const text of picked) {
      const key = normalize(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      questions.push(text);
    }
    if (questions.length === 0) continue;

    // MỘT item duy nhất chứa cả 3 câu: đề thi thật Part 4 cho ghi âm MỘT LẦN
    // 2 phút (sau 1 phút chuẩn bị) để trả lời liền mạch cả ba, khác Part 2/3
    // là mỗi câu một lần ghi 45 giây. Tách thành 3 item thì frontend
    // (RecordingRenderer) render 3 ô ghi âm riêng — sai bản chất phần thi.
    const seconds = Number(set.timeLimitSeconds) || 120;
    const items = [
      {
        id: randomUUID(),
        sequenceNo: 1,
        prompt: {
          format: 'PLAIN_TEXT',
          value: questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
        },
        responseType: 'AUDIO_RECORDING',
        required: true,
        maxScore: SET_MAX_SCORE,
        options: [],
        leftItems: [],
        rightItems: [],
        constraints: {
          prepSeconds: PREP_SECONDS,
          responseSeconds: seconds,
          questionCount: questions.length,
        },
        rubricCode: RUBRIC_CODE,
        answerKey: null,
        explanation: null,
      },
    ];

    const code = `SPEAKING_P4_TOPIC_${String(nextNo).padStart(3, '0')}`;
    const title = titleFrom(questions[0]);
    const questionSetId = randomUUID();

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      // item_count = 1: cả đề là MỘT lần ghi âm, dù prompt liệt kê nhiều câu.
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
      instructions: `Chuẩn bị ${Math.round(PREP_SECONDS / 60)} phút, sau đó trả lời cả ${questions.length} câu hỏi trong ${Math.round(seconds / 60)} phút bằng MỘT lần ghi âm.`,
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

    console.log(`  + ${code} — ${title} (${questions.length} câu trong 1 lần ghi âm, ${SET_MAX_SCORE} điểm)`);
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
