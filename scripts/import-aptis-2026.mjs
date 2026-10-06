/**
 * Nhập dữ liệu AptisPrep đợt 10/2026 (thư mục Aptis/) vào ngân hàng đề.
 *
 *   node scripts/import-aptis-2026.mjs <reading|writing|grammar|vocab|listening|speaking|logs|all> [--dry-run] [--limit N]
 *
 * Bốn điều khác các script nhập cũ:
 *
 *   1. Đọc thẳng định dạng xuất mới (records[], camelCase), không cần file
 *      AptisPrep.com cũ. Số Part của website đã đổi so với ngân hàng:
 *        file Reading "P2" và "P3" (sắp xếp câu)  -> Reading Part 2 của kho
 *        file Reading "P4" (ghép ý kiến 4 người)   -> Reading Part 3 của kho
 *      Dạng ghép tiêu đề đoạn văn (Part 4 của kho) không có trong file mới.
 *   2. Chỉ nhập đề MỚI. Đề đã có nhưng website sửa vài chữ vẫn tính là đã có
 *      (so theo câu/nhận định), nên chạy lại bao nhiêu lần cũng không trùng.
 *   3. Mọi đề mới gắn exam_year = 2026, trạng thái PUBLISHED, mức khó theo file
 *      (BASIC 1 / INTERMEDIATE 3 / ADVANCED 5) ở Ngữ pháp và Từ vựng.
 *   4. Chỗ nguồn bị null (tên đề, giải thích, đáp án mẫu) được bổ sung; đáp án
 *      mẫu và giải thích lưu ở item.explanation như Speaking và Listening P1.
 *
 * Mỗi đề đánh dấu sourceRef.batch = '2026-10' trong Mongo để bước "logs" đếm
 * đúng số đề vừa nhập và ghi vào trang Cập nhật đề.
 *
 * Kết nối qua biến môi trường (mặc định trỏ vào cổng host của prod):
 *   MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DB MONGO_URI
 *   MINIO_ENDPOINT MINIO_ACCESS_KEY MINIO_SECRET_KEY DATA_DIR
 */

import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BATCH = '2026-10';
const P = {
  GRAMMAR: '16000000-0000-4000-8000-000000000001',
  VOCAB: '16000000-0000-4000-8000-000000000002',
  R2: '16000000-0000-4000-8000-000000000012',
  R3: '16000000-0000-4000-8000-000000000013',
  S1: '16000000-0000-4000-8000-000000000031',
  S2: '16000000-0000-4000-8000-000000000032',
  S3: '16000000-0000-4000-8000-000000000033',
  S4: '16000000-0000-4000-8000-000000000034',
  L1: '16000000-0000-4000-8000-000000000021',
  L2: '16000000-0000-4000-8000-000000000022',
  L3: '16000000-0000-4000-8000-000000000023',
  L4: '16000000-0000-4000-8000-000000000024',
  W1: '16000000-0000-4000-8000-000000000041',
  W2: '16000000-0000-4000-8000-000000000042',
  W3: '16000000-0000-4000-8000-000000000043',
  W4: '16000000-0000-4000-8000-000000000044',
};
const CONTENT_BUCKET = 'aptis-content';
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];
/** Bảng chữ cái của Từ vựng: bỏ chữ I cho khỏi lẫn với số 1, như 5 đề Vocabulary đang có. */
const VOCAB_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
const DIFFICULTY = { BASIC: 1, INTERMEDIATE: 3, ADVANCED: 5 };

const args = process.argv.slice(2);
const target = args[0];
const dryRun = args.includes('--dry-run');
const limitFlag = args.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : Infinity;
if (!target) {
  console.error('Dùng: node scripts/import-aptis-2026.mjs <reading|writing|grammar|vocab|listening|logs|all> [--dry-run] [--limit N]');
  process.exit(1);
}

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis',
  minioEndpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000',
  minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  dataDir: (process.env.DATA_DIR ?? 'Aptis').replace(/\/$/, ''),
};

const load = (file) => JSON.parse(readFileSync(`${env.dataDir}/${file}`, 'utf8'));

// ---------------------------------------------------------------------------
// Tiện ích văn bản
// ---------------------------------------------------------------------------

const norm = (value) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Tập từ (dài hơn 2 ký tự) của một văn bản, để đo độ giống khi website sửa vài chữ. */
const tokens = (text) =>
  new Set(String(text ?? '').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter((w) => w.length > 2));

/** Tỉ lệ từ của `a` nằm trong `b` (0..1). */
const containment = (a, b) => {
  if (a.size === 0) return 0;
  let hit = 0;
  for (const word of a) if (b.has(word)) hit += 1;
  return hit / a.size;
};

/** Bỏ ghi chú biên tập đầu câu: "(Đề mới cập nhật tháng 10/2026) ..." không phải phần đề. */
const stripNote = (text) => String(text ?? '').replace(/^\s*\(\s*Đề\s[^)]*\)\s*/iu, '').trim();

/** "music-and-singer" -> "Music and singer". */
const humanize = (slug) => {
  const s = String(slug ?? '').replace(/[-_]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

const explanationOf = (text) => {
  const value = String(text ?? '').trim();
  return value ? { format: 'PLAIN_TEXT', value } : null;
};

const clip = (text, max = 200) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** PRNG có hạt để xáo thứ tự ổn định giữa các lần chạy. */
function seeded(seedText) {
  let h = 1779033703;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Xáo cho tới khi lệch khỏi thứ tự đúng ít nhất 4/5 vị trí, tránh đề "đã sẵn đúng". */
function shuffledAway(items, seedText) {
  const rand = seeded(seedText);
  let out = items.slice();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.filter((v, i) => v === items[i]).length <= 1) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kết nối và ghi một bộ câu hỏi
// ---------------------------------------------------------------------------

let sql;
let mongo;
let docs;
let s3;
let adminId;
const counters = new Map();
const taskTypeCache = new Map();

async function connect() {
  sql = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDb,
    charset: 'utf8mb4',
  });
  mongo = new MongoClient(env.mongoUri);
  await mongo.connect();
  docs = mongo.db().collection('question_set_documents');
  s3 = new S3Client({
    endpoint: env.minioEndpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: env.minioAccessKey, secretAccessKey: env.minioSecretKey },
    forcePathStyle: true,
  });
  const [[admin]] = await sql.query(
    `SELECT id AS id FROM users
      WHERE id IN (SELECT user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                   WHERE r.code IN ('SUPER_ADMIN','ADMIN'))
      ORDER BY created_at LIMIT 1`,
  );
  if (!admin) throw new Error('Không tìm thấy tài khoản admin để gán created_by');
  adminId = admin.id;
}

async function taskTypeId(code) {
  if (!taskTypeCache.has(code)) {
    const [[row]] = await sql.query(`SELECT id FROM task_types WHERE code = ? LIMIT 1`, [code]);
    if (!row) throw new Error(`Không có task_type ${code}`);
    taskTypeCache.set(code, row.id);
  }
  return taskTypeCache.get(code);
}

async function nextCode(prefix, partId) {
  if (!counters.has(prefix)) {
    const [[{ maxNo }]] = await sql.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
         FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
      [prefix, partId, prefix],
    );
    counters.set(prefix, Number(maxNo));
  }
  const n = counters.get(prefix) + 1;
  counters.set(prefix, n);
  return `${prefix}${String(n).padStart(3, '0')}`;
}

/**
 * Ghi một bộ: hàng MySQL rồi tài liệu Mongo. Mongo lỗi thì xoá hàng MySQL vừa
 * tạo để không để lại đề mồ côi (có metadata mà thiếu nội dung).
 */
async function createSet(spec) {
  const {
    partId, taskTypeCode, prefix, title, difficulty = null, hotness = 3, items, stimulus = null,
    instructions, settings, scoring, assets = [], skill, part, sqlTaskTypeCode = taskTypeCode,
  } = spec;
  const maxScore = Number(items.reduce((sum, i) => sum + i.maxScore, 0).toFixed(2));
  const code = await nextCode(prefix, partId);
  const id = randomUUID();
  const safeTitle = clip(title);
  await sql.execute(
    `INSERT INTO question_sets
       (id, part_id, task_type_id, code, title, difficulty, hotness, exam_year,
        access_level, status, current_revision, item_count, max_score,
        published_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
    [id, partId, await taskTypeId(sqlTaskTypeCode), code, safeTitle, difficulty, hotness, items.length, maxScore, adminId],
  );
  try {
    await docs.insertOne({
      _id: randomUUID(),
      questionSetId: id,
      revision: 1,
      schemaVersion: 1,
      partId,
      taskTypeCode,
      title: safeTitle,
      instructions,
      accessLevel: 'PREMIUM',
      stimulus,
      sections: [],
      items,
      assets,
      settings: settings ?? {
        shuffleOptions: false, shuffleItems: false, maxAudioPlays: null, showAnswerAfterEachItem: false, allowReview: true,
      },
      scoring: scoring ?? { strategy: 'EXACT_MATCH', partialCredit: false, maxScore },
      sourceRef: { provider: 'aptisprep', skill, part, batch: BATCH },
      createdAt: new Date(),
      updatedAt: new Date(),
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });
  } catch (error) {
    await sql.execute(`DELETE FROM question_sets WHERE id = ?`, [id]);
    throw error;
  }
  console.log(`  + ${code} — ${safeTitle.slice(0, 60)} (${items.length} câu, ${maxScore}đ)`);
  return id;
}

/** Tên chưa dùng trong Part: trùng thì thêm "(Version N)" như các đề cùng chủ đề hiện có. */
function uniqueTitle(base, used) {
  let title = base;
  for (let v = 2; used.has(norm(title)); v += 1) title = `${base} (Version ${v})`;
  used.add(norm(title));
  return title;
}

const stats = {};
const tally = (key, fresh, total, written) => {
  stats[key] = { file: total, moi: fresh, da_nhap: written };
  console.log(`\n=== ${key} === file: ${total} | cần nhập: ${fresh}${dryRun ? ' (dry-run)' : ` | đã nhập: ${written}`}`);
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

async function readingPart2() {
  const existing = await docs.find({ partId: P.R2 }).toArray();
  const known = new Set();
  const used = new Set(existing.map((d) => norm(d.title)));
  for (const d of existing) for (const it of d.items ?? []) for (const o of it.options ?? []) known.add(norm(o.content));

  const records = [
    ...load('aptis_reading_part2.json').records,
    ...load('aptis_reading_part3.json').records,
  ];
  const fresh = [];
  for (const r of records) {
    const d = r.data ?? {};
    const sentences = (d.sentences ?? []).map((s) => String(s).trim());
    const order = d.correctOrder ?? [];
    if (sentences.length !== 5 || order.length !== 5) continue;
    if (sentences.some((s) => known.has(norm(s)))) continue;
    sentences.forEach((s) => known.add(norm(s)));
    fresh.push({ r, d, sentences, order });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const { r, d, sentences, order } of targets) {
      const sequence = order.map((i) => sentences[i]);
      const base = String(d.title ?? '').trim() || humanize(r.topicSlug) || 'Sentence ordering';
      const title = uniqueTitle(base, used);
      const shown = shuffledAway(sequence, sequence.join('|'));
      const options = shown.map((content, index) => ({ id: `s${index + 1}`, code: OPTION_CODES[index], content }));
      const idOf = new Map(options.map((o) => [o.content, o.id]));
      const lead = String(d.firstSentence ?? '').trim();
      const generated =
        `Thứ tự đúng:\n${sequence.map((s, i) => `${i + 1}. ${s}`).join('\n')}` +
        (lead ? `\n\nCâu mở đầu cho sẵn: ${lead}` : '');
      await createSet({
        partId: P.R2,
        taskTypeCode: 'SENTENCE_ORDERING',
        prefix: 'READING_P2_AP_',
        title,
        skill: 'reading',
        part: 2,
        instructions: 'Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.',
        stimulus: {
          format: 'PLAIN_TEXT',
          value: `Topic: ${humanize(r.topicSlug) || title}${lead ? `\n\nCâu mở đầu: ${lead}` : ''}`,
        },
        settings: { shuffleOptions: true, shuffleItems: false, maxAudioPlays: null, showAnswerAfterEachItem: false, allowReview: true },
        scoring: { strategy: 'EXACT_MATCH', partialCredit: true, maxScore: 5 },
        items: [{
          id: randomUUID(),
          sequenceNo: 1,
          prompt: null,
          responseType: 'ORDERING',
          required: true,
          maxScore: 5,
          options,
          leftItems: [],
          rightItems: [],
          constraints: { pointsPerCorrect: 1 },
          rubricCode: null,
          answerKey: {
            type: 'ORDERING', selectedOptionId: null, selectedOptionIds: [], matches: {},
            orderedOptionIds: sequence.map((s) => idOf.get(s)), acceptedValues: [], caseSensitive: false,
          },
          explanation: explanationOf(String(d.explanation ?? '').trim() ? `${d.explanation.trim()}\n\n${generated}` : generated),
        }],
      });
      written += 1;
    }
  }
  tally('Reading Part 2 (sắp xếp câu)', targets.length, records.length, written);
}

async function readingPart3() {
  const existing = await docs.find({ partId: P.R3 }).toArray();
  const used = new Set(existing.map((d) => norm(d.title)));
  const knownStatements = new Set();
  const stimulusTokens = existing.map((d) => tokens(d.stimulus?.value));
  for (const d of existing) for (const it of d.items ?? []) for (const l of it.leftItems ?? []) knownStatements.add(norm(l.content));

  const records = load('aptis_reading_part4.json').records;
  const fresh = [];
  for (const r of records) {
    const d = r.data ?? {};
    const paragraphs = d.paragraphs ?? [];
    const questions = d.questions ?? [];
    if (paragraphs.length < 2 || questions.length === 0) continue;
    // Nhận định hay lặp giữa các phiên bản của cùng chủ đề, nên một vài câu trùng chưa đủ để kết luận:
    // đề đã có khi trùng từ 5 nhận định trở lên, hoặc đoạn văn của bốn người giống từ 75%.
    const sameStatements = questions.filter((q) => knownStatements.has(norm(q.text))).length;
    const body = tokens(paragraphs.map((p) => p.content).join(' '));
    const sameBody = Math.max(0, ...stimulusTokens.map((t) => containment(body, t)));
    if (sameStatements >= 5 || sameBody >= 0.75) continue;
    questions.forEach((q) => knownStatements.add(norm(q.text)));
    fresh.push({ r, d, paragraphs, questions });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const { r, d, paragraphs, questions } of targets) {
      const letter = (i) => String.fromCharCode(65 + i);
      const rightItems = paragraphs.map((p, i) => ({ id: `p${letter(i)}`, code: letter(i), content: String(p.name ?? `Person ${letter(i)}`).trim() }));
      const leftItems = questions.map((q, i) => ({ id: `st${i + 1}`, code: String.fromCharCode(71 + i), content: String(q.text ?? '').trim() }));
      const matches = {};
      const lines = [];
      let valid = true;
      questions.forEach((q, i) => {
        const pi = paragraphs.findIndex((p) => p.id === q.correctParagraphId);
        if (pi < 0) { valid = false; return; }
        matches[`st${i + 1}`] = rightItems[pi].id;
        lines.push(`${leftItems[i].content} → ${rightItems[pi].content}`);
      });
      if (!valid) { console.error(`  BỎ QUA ${r.topicSlug}: đáp án không khớp đoạn nào`); continue; }
      const topic = humanize(r.topicSlug) || 'Opinions';
      const title = uniqueTitle(topic, used);
      const body = paragraphs.map((p, i) => `${rightItems[i].content}:\n${String(p.content ?? '').trim()}`).join('\n\n');
      await createSet({
        partId: P.R3,
        taskTypeCode: 'OPINION_MATCHING',
        sqlTaskTypeCode: 'SPEAKER_MATCHING',
        prefix: 'READING_P3_AP_',
        title,
        skill: 'reading',
        part: 3,
        instructions: 'Đọc ý kiến của bốn người và ghép mỗi nhận định với người phù hợp.',
        stimulus: { format: 'PLAIN_TEXT', value: `Topic: ${topic}\n\n${body}` },
        scoring: { strategy: 'PARTIAL_MATCH', partialCredit: true, maxScore: questions.length * 2 },
        items: [{
          id: randomUUID(),
          sequenceNo: 1,
          prompt: { format: 'PLAIN_TEXT', value: 'Ghép mỗi nhận định với người phù hợp.' },
          responseType: 'MATCHING',
          required: true,
          maxScore: questions.length * 2,
          options: [],
          leftItems,
          rightItems,
          constraints: { pointsPerCorrect: 2 },
          answerKey: {
            type: 'MATCHING', selectedOptionId: null, selectedOptionIds: [], matches, orderedOptionIds: [], acceptedValues: [], caseSensitive: false,
          },
          explanation: explanationOf(`${String(d.explanation ?? '').trim() ? `${d.explanation.trim()}\n\n` : ''}Đáp án:\n${lines.join('\n')}`),
        }],
      });
      written += 1;
    }
  }
  tally('Reading Part 3 (ghép ý kiến)', targets.length, records.length, written);
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const WRITING_RUBRIC = {
  1: 'APTIS_WRITING_PART_1_V1', 2: 'APTIS_WRITING_PART_2_V1', 3: 'APTIS_WRITING_PART_3_V1', 4: 'APTIS_WRITING_PART_4_V1',
};
const WRITING_MAX = { 1: 1, 2: 10, 3: 15, 4: 20 };
const WRITING_INSTRUCTIONS = {
  1: 'Điền biểu mẫu bằng câu trả lời ngắn. Mỗi câu trả lời từ 1 đến 15 từ.',
  2: 'Viết câu trả lời thành câu hoàn chỉnh, từ 20 đến 40 từ.',
  3: 'Reply naturally to each group-chat message. Write 30 to 60 words for each answer.',
  4: 'Read the club notice, then write one informal email and one formal email.',
};

function writingItem({ prompt, maxScore, min, max, inputMode, part, sequenceNo = 1, constraints = {}, sample }) {
  return {
    id: randomUUID(),
    sequenceNo,
    prompt: { format: 'PLAIN_TEXT', value: prompt },
    responseType: 'LONG_TEXT',
    required: true,
    maxScore,
    options: [],
    leftItems: [],
    rightItems: [],
    constraints: { minWords: min, maxWords: max, inputMode, ...constraints },
    rubricCode: WRITING_RUBRIC[part],
    answerKey: null,
    explanation: explanationOf(sample),
  };
}

const escapeHtml = (text) => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Đáp án mẫu cho câu nguồn bị null; viết tay, ngắn gọn đúng mức 1-5 từ. */
const MISSING_SAMPLES = {
  'what was your first school': 'It was a small primary school near my house.',
};

async function writingKnown(partId) {
  const existing = await docs.find({ partId }).toArray();
  const known = new Set();
  const stimuli = [];
  const titles = new Set(existing.map((d) => norm(d.title)));
  for (const d of existing) {
    stimuli.push(norm(d.stimulus?.value));
    for (const it of d.items ?? []) known.add(norm(it.prompt?.value));
  }
  return { known, stimuli, titles };
}

const isKnown = (known, text) => {
  const n = norm(stripNote(text));
  return n.length >= 8 && [...known].some((k) => k === n || k.includes(n));
};

async function writingPart1() {
  const { known, titles } = await writingKnown(P.W1);
  const rows = [];
  for (const club of load('aptis_writing_part1.json').records) {
    for (const m of club.content[0].content.messages) {
      const question = String(m.message ?? '').trim();
      if (!question || isKnown(known, question)) continue;
      known.add(norm(question));
      rows.push({ club: club.name, question, sample: String(m.correctAnswer ?? '').replace(/^[\s/]+/, '').trim() });
    }
  }
  const targets = rows.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const row of targets) {
      const sample = row.sample || MISSING_SAMPLES[norm(row.question)] || '';
      if (!sample) console.error(`  CẢNH BÁO thiếu đáp án mẫu: ${row.question}`);
      await createSet({
        partId: P.W1, taskTypeCode: 'LONG_TEXT', prefix: 'WRITING_P1_AP_', title: row.question, skill: 'writing', part: 1,
        instructions: WRITING_INSTRUCTIONS[1],
        items: [writingItem({ prompt: row.question, maxScore: WRITING_MAX[1], min: 1, max: 15, inputMode: 'SHORT', part: 1, sample })],
      });
      titles.add(norm(row.question));
      written += 1;
    }
  }
  tally('Writing Part 1 (câu hỏi ngắn)', targets.length, 180, written);
}

async function writingPart2() {
  const { known, titles } = await writingKnown(P.W2);
  const rows = [];
  for (const club of load('aptis_writing_part2.json').records) {
    const c = club.content[0].content;
    const prompt = String(c.prompt ?? '').trim();
    if (!prompt || isKnown(known, prompt)) continue;
    known.add(norm(prompt));
    rows.push({ club: club.name, prompt, c });
  }
  const targets = rows.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const row of targets) {
      const title = uniqueTitle(row.club, titles);
      await createSet({
        partId: P.W2, taskTypeCode: 'LONG_TEXT', prefix: 'WRITING_P2_AP_', title, skill: 'writing', part: 2,
        instructions: WRITING_INSTRUCTIONS[2],
        items: [writingItem({
          prompt: row.prompt, maxScore: WRITING_MAX[2], min: row.c.wordLimit?.min ?? 20, max: row.c.wordLimit?.max ?? 45,
          inputMode: 'PARAGRAPH', part: 2, sample: row.c.sampleAnswer,
        })],
      });
      written += 1;
    }
  }
  tally('Writing Part 2 (1 câu hỏi/CLB)', targets.length, 36, written);
}

async function writingPart3() {
  const { known, titles } = await writingKnown(P.W3);
  const rows = [];
  for (const club of load('aptis_writing_part3.json').records) {
    const questions = club.content[0].content.questions ?? [];
    if (questions.length === 0 || questions.filter((q) => isKnown(known, q.question)).length >= 2) continue;
    questions.forEach((q) => known.add(norm(q.question)));
    rows.push({ club: club.name, questions });
  }
  const targets = rows.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const row of targets) {
      const per = Math.round((WRITING_MAX[3] / row.questions.length) * 100) / 100;
      const title = uniqueTitle(row.club, titles);
      await createSet({
        partId: P.W3, taskTypeCode: 'LONG_TEXT', prefix: 'WRITING_P3_AP_', title, skill: 'writing', part: 3,
        instructions: WRITING_INSTRUCTIONS[3],
        items: row.questions.map((q, index) => {
          const speaker = 'ABC'[index] ?? null;
          const min = q.wordLimit?.min ?? 30;
          const rawMax = q.wordLimit?.max ?? 40;
          return writingItem({
            prompt: `${speaker}: ${String(q.question).trim()}`,
            maxScore: index === row.questions.length - 1 ? Number((WRITING_MAX[3] - per * (row.questions.length - 1)).toFixed(2)) : per,
            min,
            // Nới trần như các bộ hiện có: đề ghi 30-40 từ, DB đặt 30-60.
            max: rawMax <= 40 ? Math.round(rawMax * 1.5) : rawMax,
            inputMode: 'CHAT_REPLY', part: 3, sequenceNo: index + 1, constraints: { speaker }, sample: q.sampleAnswer,
          });
        }),
      });
      written += 1;
    }
  }
  tally('Writing Part 3 (3 tin nhắn/CLB)', targets.length, 36, written);
}

async function writingPart4() {
  const { stimuli, titles } = await writingKnown(P.W4);
  const stimulusTokens = stimuli.map((s) => tokens(s));
  const rows = [];
  for (const club of load('aptis_writing_part4.json').records) {
    const c = club.content[0].content;
    const email = c.context?.email ?? {};
    const body = String(email.body ?? '').trim();
    const key = norm(body.split(/\n+/).filter((l) => l.trim().length > 40)[0] ?? body).slice(0, 160);
    const sameBody = Math.max(0, ...stimulusTokens.map((t) => containment(tokens(body), t)));
    if (!body || sameBody >= 0.8 || (key.length > 30 && stimuli.some((s) => s.includes(key)))) continue;
    stimuli.push(norm(body));
    stimulusTokens.push(tokens(body));
    rows.push({ club: club.name, c, email, body });
  }
  const targets = rows.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const row of targets) {
      const tasks = row.c.tasks ?? [];
      if (tasks.length === 0) continue;
      const title = uniqueTitle(row.club, titles);
      const paragraphs = row.body.split(/\n{2,}|\n/).map((x) => x.trim()).filter(Boolean);
      const html = `<h4>${escapeHtml(row.club)} – Part 4</h4>${row.email.subject ? `<p><strong>${escapeHtml(row.email.subject)}</strong></p>` : ''}${paragraphs.map((x) => `<p>${escapeHtml(x)}</p>`).join('')}`;
      const scores = tasks.length === 2 ? [5, 15] : tasks.map(() => WRITING_MAX[4] / tasks.length);
      const registers = tasks.length === 2 ? ['informal', 'formal'] : tasks.map(() => 'formal');
      await createSet({
        partId: P.W4, taskTypeCode: 'LONG_TEXT', prefix: 'WRITING_P4_AP_', title, skill: 'writing', part: 4,
        instructions: WRITING_INSTRUCTIONS[4], stimulus: { format: 'HTML', value: html },
        items: tasks.map((t, index) => {
          const register = registers[index];
          const embedded = String(t.instruction).match(/\(?about\s*([\d\s\-–]+)\s*words?\)?|\((\d+)\s*words?\)/i);
          const embeddedText = embedded ? `${(embedded[1] ?? embedded[2]).trim()} words` : null;
          const min = t.wordLimit?.min ?? (register === 'informal' ? 40 : 120);
          let max = t.wordLimit?.max ?? (register === 'informal' ? 75 : 225);
          if (register === 'formal' && max <= 150) max = 225;
          return writingItem({
            prompt: String(t.instruction).trim(), maxScore: scores[index], min, max, inputMode: 'EMAIL', part: 4,
            sequenceNo: index + 1,
            constraints: { register, emailType: register, ...(embeddedText ? { embeddedWordInstruction: embeddedText } : {}) },
            sample: t.sampleAnswer,
          });
        }),
      });
      written += 1;
    }
  }
  tally('Writing Part 4 (2 email/CLB)', targets.length, 36, written);
}

// ---------------------------------------------------------------------------
// Ngữ pháp và Từ vựng
// ---------------------------------------------------------------------------

async function grammar() {
  const existing = await docs.find({ partId: P.GRAMMAR }).toArray();
  const known = new Set(existing.map((d) => norm(d.title)));
  const sets = load('aptis_grammar_vocabulary/aptis_grammar_vocabulary_all.json').sets;
  const all = sets.flatMap((s) => s.grammar);
  const fresh = [];
  for (const q of all) {
    const n = norm(q.prompt);
    const options = (q.options ?? []).map((o) => String(o).trim());
    if (!n || known.has(n) || options.length < 2 || !Number.isInteger(q.answerIndex) || !options[q.answerIndex]) continue;
    known.add(n);
    fresh.push({ q, options });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const { q, options } of targets) {
      const opts = options.map((content, i) => ({ id: OPTION_CODES[i], code: OPTION_CODES[i], content }));
      const note = String(q.contextNote ?? '').trim();
      await createSet({
        partId: P.GRAMMAR, taskTypeCode: 'GAP_FILL_CHOICE', prefix: 'GRAMMAR_AP26_', title: String(q.prompt).trim(), hotness: null,
        difficulty: DIFFICULTY[q.difficulty] ?? null, skill: 'grammar', part: 1,
        instructions: 'Chọn từ phù hợp để hoàn thành câu.',
        scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore: 1 },
        items: [{
          id: 'item_1', displayOrder: 1, responseType: 'SINGLE_CHOICE',
          prompt: { format: 'PLAIN_TEXT', value: String(q.prompt).trim() },
          maxScore: 1, options: opts, leftItems: [], rightItems: [], constraints: {},
          answerKey: {
            type: 'SINGLE_CHOICE', selectedOptionId: opts[q.answerIndex].id, selectedOptionIds: [], matches: {},
            orderedOptionIds: [], acceptedValues: [], caseSensitive: false,
          },
          explanation: explanationOf(`${note ? `Chủ điểm: ${note}\n` : ''}${String(q.explanation ?? '').trim()}`),
        }],
      });
      written += 1;
    }
  }
  tally('Ngữ pháp (1 câu/đề)', targets.length, all.length, written);
}

const VOCAB_KINDS = [
  { test: (g) => g.matchingMode === 'SYNONYM', name: 'Từ đồng nghĩa', ins: 'Chọn từ có nghĩa gần nhất với từ bên trái. Mỗi từ chỉ dùng một lần.' },
  { test: (g) => g.matchingMode === 'COLLOCATION', name: 'Từ đi kèm', ins: 'Chọn từ đi kèm phù hợp với từ bên trái để tạo thành cụm từ. Mỗi từ chỉ dùng một lần.' },
  { test: (g) => /Word definition/.test(g.contextNote ?? ''), name: 'Định nghĩa', ins: 'Chọn từ phù hợp để hoàn thành mỗi định nghĩa. Mỗi từ chỉ dùng một lần.' },
  { test: () => true, name: 'Điền từ vào câu', ins: 'Chọn từ phù hợp để hoàn thành mỗi câu. Mỗi từ chỉ dùng một lần.' },
];
const POS_VI = { 'Danh từ': 'danh từ', 'Động từ': 'động từ', 'Tính từ': 'tính từ', 'Trạng từ': 'trạng từ' };

async function vocab() {
  const existing = await docs.find({ partId: P.VOCAB }).toArray();
  const knownWords = new Set();
  const used = new Set(existing.map((d) => norm(d.title)));
  for (const d of existing) for (const it of d.items ?? []) for (const l of it.leftItems ?? []) knownWords.add(norm(l.content));

  const groups = [
    ...load('aptis_grammar_vocabulary/aptis_grammar_vocabulary_all.json').sets.flatMap((s) => s.vocabulary.map((g) => ({ ...g, from: 'gv' }))),
    ...load('aptis_vocabulary_practice/aptis_vocabulary_new_collocations.json').records.map((g) => ({ ...g, from: 'extra' })),
  ];
  const seenIds = new Set();
  const fresh = [];
  for (const g of groups) {
    const qs = g.matches ?? g.sentences ?? [];
    const leftTexts = qs.map((q) => String(q.word ?? q.text ?? '').trim());
    const options = (qs[0]?.options ?? []).map((o) => String(o).trim());
    const correct = qs.map((q) => String(q.correct ?? q.correctAnswer ?? '').trim());
    if (seenIds.has(g.id) || qs.length !== 5 || options.length !== 10 || correct.some((c) => !options.includes(c))) continue;
    if (leftTexts.filter((t) => knownWords.has(norm(t))).length >= 4) continue;
    seenIds.add(g.id);
    fresh.push({ g, qs, leftTexts, options, correct });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const { g, qs, leftTexts, options, correct } of targets) {
      const kind = VOCAB_KINDS.find((k) => k.test(g));
      const pos = POS_VI[String(g.contextNote ?? '').split('·')[1]?.trim()];
      const idMatch = String(g.id).match(/s(\d+)-v(\d+)/) ?? String(g.id).match(/collocation-(\d+)/);
      const label = g.from === 'extra' ? `Bộ bổ sung ${idMatch?.[1] ?? ''}` : `Bộ ${idMatch?.[1] ?? ''}-${idMatch?.[2] ?? ''}`;
      const title = uniqueTitle(`${kind.name}${pos ? ` ${pos}` : ''} – ${label}`.trim(), used);
      const rightItems = options.map((content, i) => ({ id: VOCAB_LETTERS[i], code: VOCAB_LETTERS[i], content }));
      const leftItems = leftTexts.map((content, i) => ({ id: `left_${i + 1}`, code: String(i + 1), content }));
      const matches = {};
      correct.forEach((c, i) => { matches[`left_${i + 1}`] = rightItems[options.indexOf(c)].id; });
      const lines = qs.map((q, i) => `${i + 1}. ${leftTexts[i]} → ${correct[i]}${String(q.explanation ?? '').trim() ? `: ${String(q.explanation).trim()}` : ''}`);
      await createSet({
        partId: P.VOCAB, taskTypeCode: 'MATCHING', prefix: 'VOCAB_AP26_', title, hotness: null,
        difficulty: DIFFICULTY[g.difficulty] ?? null, skill: 'vocabulary', part: 2,
        instructions: kind.ins,
        scoring: { strategy: 'EXACT_MATCH', partialCredit: true, maxScore: 5 },
        items: [{
          id: 'item_1', displayOrder: 1, responseType: 'MATCHING',
          prompt: { format: 'PLAIN_TEXT', value: kind.ins },
          maxScore: 5, options: [], leftItems, rightItems, constraints: {},
          answerKey: {
            type: 'MATCHING', selectedOptionId: null, selectedOptionIds: [], matches, orderedOptionIds: [], acceptedValues: [], caseSensitive: false,
          },
          explanation: explanationOf(lines.join('\n')),
        }],
      });
      written += 1;
    }
  }
  tally('Từ vựng (nhóm 5 câu)', targets.length, groups.length, written);
}

// ---------------------------------------------------------------------------
// Listening: tải audio về MinIO như script cũ
// ---------------------------------------------------------------------------

const LISTENING_INSTRUCTIONS = {
  1: 'Nghe đoạn hội thoại và chọn đáp án đúng.',
  2: 'Nghe bốn người nói và ghép mỗi người với ý phù hợp.',
  3: 'Nghe hai người trao đổi và xác định mỗi ý kiến thuộc về người đàn ông, người phụ nữ hoặc cả hai.',
  4: 'Nghe bài nói và chọn đáp án đúng cho mỗi câu hỏi.',
};
const LISTENING_TASK = { 1: 'SINGLE_CHOICE', 2: 'SPEAKER_MATCHING', 3: 'SPEAKER_MATCHING', 4: 'SINGLE_CHOICE' };
const toOptions = (list) => list.map((o) => String(o?.text ?? o ?? '').trim()).filter(Boolean).map((content, i) => ({ id: OPTION_CODES[i], code: OPTION_CODES[i], content }));

function listeningCandidates(part) {
  if (part === 1) {
    return load('aptis_listenning_part1.json').map((r) => {
      const prompt = stripNote(r.question);
      const options = toOptions(r.options ?? []);
      const answer = options[r.answer_index];
      if (!prompt || !answer || !r.audio_url) return null;
      return {
        title: prompt, audioUrl: r.audio_url, audioRole: 'ITEM_AUDIO',
        items: [{ prompt, options, answerId: answer.id, explanation: String(r.transcript ?? '').trim() }],
      };
    });
  }
  return load(`aptis_listening_part${part}.json`).records.map((r) => {
    const items = [];
    for (const [index, it] of (r.items ?? []).entries()) {
      const options = toOptions(it.options ?? []);
      const answer = options[it.answerIndex];
      if (!answer) return null;
      const prompt = part === 2 ? `Người nói ${String(it.label ?? '').match(/([A-Z])\s*$/)?.[1] ?? 'ABCD'[index]}` : stripNote(it.prompt);
      if (!prompt) return null;
      items.push({ prompt, options, answerId: answer.id, explanation: String(it.explanation ?? '').trim() });
    }
    if (items.length === 0 || !r.audioUrl) return null;
    const topic = humanize(r.topicSlug) || `Listening Part ${part}`;
    return {
      title: `${topic}${r.version ? ` (Version ${r.version})` : ''} (2026)`,
      audioUrl: r.audioUrl, audioRole: part === 2 ? 'ITEM_AUDIO_ALL' : 'MAIN_AUDIO', items,
    };
  });
}

async function listeningPart(part) {
  const partId = P[`L${part}`];
  const existing = await docs.find({ partId }).toArray();
  const known = new Set();
  for (const d of existing) {
    for (const it of d.items ?? []) {
      if (part === 2) known.add(norm((it.options ?? []).map((o) => o.content).join('|')));
      else if (it.prompt?.value) known.add(norm(it.prompt.value));
    }
  }
  const candidates = listeningCandidates(part).filter(Boolean);
  const fresh = [];
  for (const c of candidates) {
    const seen = part === 2 ? known.has(norm(c.items[0].options.map((o) => o.content).join('|'))) : c.items.some((i) => known.has(norm(i.prompt)));
    if (seen) continue;
    if (part === 2) known.add(norm(c.items[0].options.map((o) => o.content).join('|')));
    else c.items.forEach((i) => known.add(norm(i.prompt)));
    fresh.push(c);
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const set of targets) {
      let bytes;
      try {
        const response = await fetch(set.audioUrl);
        if (!response.ok) { console.error(`  BỎ QUA ${set.title.slice(0, 40)}: audio HTTP ${response.status}`); continue; }
        bytes = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        console.error(`  BỎ QUA ${set.title.slice(0, 40)}: tải audio lỗi ${error.message}`);
        continue;
      }
      const assetId = randomUUID();
      const objectKey = `content/listening/part${part}/${assetId}.mp3`;
      await s3.send(new PutObjectCommand({ Bucket: CONTENT_BUCKET, Key: objectKey, Body: bytes, ContentType: 'audio/mpeg' }));
      await sql.execute(
        `INSERT INTO assets (id, bucket_name, object_key, asset_type, mime_type, file_size, checksum_sha256,
                             access_scope, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'AUDIO', 'audio/mpeg', ?, ?, 'SIGNED_URL', 'READY', ?, NOW(), NOW())`,
        [assetId, CONTENT_BUCKET, objectKey, bytes.length, createHash('sha256').update(bytes).digest('hex'), adminId],
      );
      const items = set.items.map((item, index) => ({
        id: randomUUID(), sequenceNo: index + 1, prompt: { format: 'PLAIN_TEXT', value: item.prompt }, responseType: 'SINGLE_CHOICE',
        required: true, maxScore: 2, options: item.options, leftItems: [], rightItems: [], constraints: {},
        answerKey: {
          type: 'SINGLE_CHOICE', selectedOptionId: item.answerId, selectedOptionIds: [], matches: {}, orderedOptionIds: [], acceptedValues: [], caseSensitive: false,
        },
        explanation: explanationOf(item.explanation),
      }));
      await createSet({
        partId, taskTypeCode: LISTENING_TASK[part], prefix: `LISTENING_P${part}_AP_`, title: set.title, skill: 'listening', part,
        instructions: LISTENING_INSTRUCTIONS[part], items,
        settings: { shuffleOptions: false, shuffleItems: false, maxAudioPlays: 2, showAnswerAfterEachItem: false, allowReview: true },
        assets: set.audioRole === 'ITEM_AUDIO_ALL'
          ? items.map((item, index) => ({ assetId, role: `ITEM_AUDIO:${item.id}`, displayOrder: index + 1 }))
          : [{ assetId, role: set.audioRole === 'ITEM_AUDIO' ? `ITEM_AUDIO:${items[0].id}` : 'MAIN_AUDIO', displayOrder: 1 }],
      });
      written += 1;
    }
  }
  tally(`Listening Part ${part}`, targets.length, candidates.length, written);
}

// ---------------------------------------------------------------------------
// Speaking (file lấy lại: aptis_speaking_part1..4.json)
// ---------------------------------------------------------------------------

/** Hai đáp án mẫu của website (B1 và B2-C1) gộp thành một đoạn để học viên xem sau khi nộp. */
function sampleOf(answers) {
  const texts = (answers ?? []).map((a) => String(a?.text ?? '').trim()).filter(Boolean);
  if (texts.length === 0) return '';
  if (texts.length === 1) return texts[0];
  return `Đáp án mẫu B1:\n${texts[0]}\n\nĐáp án mẫu B2–C1:\n${texts[1]}`;
}

function imageType(url) {
  const ext = String(url ?? '').match(/\.(webp|jpe?g|png|gif)(?:$|\?)/i)?.[1]?.toLowerCase();
  if (ext === 'png') return { ext: 'png', mime: 'image/png' };
  if (ext === 'gif') return { ext: 'gif', mime: 'image/gif' };
  if (ext === 'jpg' || ext === 'jpeg') return { ext: 'jpg', mime: 'image/jpeg' };
  return { ext: 'webp', mime: 'image/webp' };
}

/** Tải ảnh về MinIO và ghi hàng assets; trả về assetId, hoặc null nếu tải lỗi. */
async function uploadImage(url, part, label) {
  let bytes;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  BỎ QUA ${label}: ảnh HTTP ${response.status}`);
      return null;
    }
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error(`  BỎ QUA ${label}: tải ảnh lỗi ${error.message}`);
    return null;
  }
  const { ext, mime } = imageType(url);
  const assetId = randomUUID();
  const objectKey = `content/speaking/part${part}/${assetId}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: CONTENT_BUCKET, Key: objectKey, Body: bytes, ContentType: mime }));
  await sql.execute(
    `INSERT INTO assets (id, bucket_name, object_key, asset_type, mime_type, file_size, checksum_sha256,
                         access_scope, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'IMAGE', ?, ?, ?, 'SIGNED_URL', 'READY', ?, NOW(), NOW())`,
    [assetId, CONTENT_BUCKET, objectKey, mime, bytes.length, createHash('sha256').update(bytes).digest('hex'), adminId],
  );
  return assetId;
}

const speakingItem = ({ prompt, maxScore, constraints, rubric, sample, sequenceNo = 1 }) => ({
  id: randomUUID(),
  sequenceNo,
  prompt: { format: 'PLAIN_TEXT', value: prompt },
  responseType: 'AUDIO_RECORDING',
  required: true,
  maxScore,
  options: [],
  leftItems: [],
  rightItems: [],
  constraints,
  rubricCode: rubric,
  answerKey: null,
  explanation: explanationOf(sample),
});

const shortTitle = (text, max = 180) => {
  const t = String(text ?? '').replace(/[?.!]+$/, '').trim();
  return t.length > max ? `${t.slice(0, max - 3)}…` : t;
};

async function speakingKnown(partId) {
  const existing = await docs.find({ partId }).toArray();
  const known = new Set();
  for (const d of existing) for (const it of d.items ?? []) if (it.prompt?.value) known.add(norm(it.prompt.value));
  return { known, joined: [...known], tokenList: [...known].map((k) => tokens(k)) };
}

/** Câu gần giống câu có sẵn (khác chính tả, thêm bớt vài chữ): giống từ 80% theo cả hai chiều. */
function isNearKnown(prompt, tokenList) {
  const t = tokens(prompt);
  return t.size > 0 && tokenList.some((k) => k.size > 0 && containment(t, k) >= 0.8 && containment(k, t) >= 0.8);
}

async function speakingPart1() {
  const { known } = await speakingKnown(P.S1);
  const rows = load('aptis_speaking_part1.json').filter((r) => {
    const q = String(r.question ?? '').trim();
    if (!q || known.has(norm(q))) return false;
    known.add(norm(q));
    return true;
  });
  const targets = rows.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const r of targets) {
      const prompt = String(r.question).trim();
      await createSet({
        partId: P.S1,
        taskTypeCode: 'AUDIO_RECORDING',
        prefix: 'SPEAKING_P1_AP_',
        title: prompt,
        skill: 'speaking',
        part: 1,
        instructions: 'Trả lời câu hỏi. Ghi âm tối đa 30 giây.',
        scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: 1.66 },
        items: [speakingItem({
          prompt, maxScore: 1.66, constraints: { responseSeconds: 30 }, rubric: 'APTIS_SPEAKING_PART_1_V1', sample: sampleOf(r.answers),
        })],
      });
      written += 1;
    }
  }
  tally('Speaking Part 1 (1 câu/đề)', targets.length, 52, written);
}

/**
 * Part 2 và 3: bài có ảnh và 3 câu hỏi nối tiếp. Câu 1 ("Describe this picture")
 * giống nhau ở mọi bài nên bỏ qua khi so trùng, như script nhập cũ.
 */
async function speakingImagePart(part) {
  const partId = P[`S${part}`];
  const cfg = part === 2
    ? {
        file: 'aptis_speaking_part2.json', task: 'IMAGE_DESCRIPTION', rubric: 'APTIS_SPEAKING_PART_2_V1', total: 10, words: [60, 90],
        instructions: (n) => `Nhìn ảnh và trả lời ${n} câu hỏi. Mỗi câu nói 45 giây (khoảng 60–90 từ).`,
      }
    : {
        file: 'aptis_speaking_part3.json', task: 'IMAGE_COMPARISON', rubric: 'APTIS_SPEAKING_PART_3_V1', total: 15, words: [68, 90],
        instructions: (n) => `So sánh hai bức ảnh và trả lời lần lượt ${n} câu hỏi. Mỗi câu nói trong 45 giây.`,
      };
  const { known, tokenList } = await speakingKnown(partId);
  const all = load(cfg.file);
  const fresh = [];
  for (const r of all) {
    const questions = (r.questions ?? [])
      .map((q) => ({ prompt: String(q.question ?? '').trim(), sample: sampleOf(q.answers) }))
      .filter((q) => q.prompt);
    const images = (part === 2 ? [r.image_url] : (r.images ?? []).map((i) => i.url)).filter(Boolean);
    if (questions.length === 0 || images.length === 0) continue;
    // Đã có khi trùng đúng một câu (bỏ câu 1), hoặc cả hai câu sau đều gần giống câu có sẵn.
    const rest = questions.slice(1);
    if (rest.some((q) => known.has(norm(q.prompt))) || (rest.length > 0 && rest.every((q) => isNearKnown(q.prompt, tokenList)))) continue;
    rest.forEach((q) => { known.add(norm(q.prompt)); tokenList.push(tokens(q.prompt)); });
    fresh.push({ questions, images });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const set of targets) {
      const title = shortTitle(set.questions[1]?.prompt ?? set.questions[0].prompt);
      const assetIds = [];
      for (const url of set.images) {
        const id = await uploadImage(url, part, title.slice(0, 40));
        if (!id) break;
        assetIds.push(id);
      }
      if (assetIds.length !== set.images.length) continue;
      // Part 2 tổng 10 điểm chia đều 3 câu (đã sửa từ 15 hôm 26/09); Part 3 mỗi câu 5 điểm.
      const per = part === 2 ? cfg.total / set.questions.length : 5;
      await createSet({
        partId,
        taskTypeCode: cfg.task,
        prefix: `SPEAKING_P${part}_AP_`,
        title,
        skill: 'speaking',
        part,
        instructions: cfg.instructions(set.questions.length),
        scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: cfg.total },
        assets: assetIds.map((assetId, i) => ({
          assetId,
          role: part === 2 ? 'MAIN_IMAGE' : ['STIMULUS_IMAGE', 'SECONDARY_IMAGE'][i] ?? `IMAGE_${i + 1}`,
          displayOrder: i + 1,
        })),
        items: set.questions.map((q, i) => speakingItem({
          prompt: q.prompt,
          maxScore: per,
          sequenceNo: i + 1,
          rubric: cfg.rubric,
          sample: q.sample,
          constraints: { prepSeconds: 0, responseSeconds: 45, minWords: cfg.words[0], maxWords: cfg.words[1] },
        })),
      });
      written += 1;
    }
  }
  tally(`Speaking Part ${part} (bài có ảnh)`, targets.length, all.length, written);
}

async function speakingPart4() {
  const { joined } = await speakingKnown(P.S4);
  const fresh = [];
  for (const r of load('aptis_speaking_part4.json')) {
    const questions = (r.questions ?? []).map((q) => String(q.question ?? '').split('\n')[0].trim()).filter(Boolean);
    if (questions.length === 0) continue;
    const first = norm(questions[0]);
    if (joined.some((p) => p.includes(first))) continue;
    joined.push(norm(questions.join(' ')));
    fresh.push({ questions, sample: String(r.sample_answer_full ?? '').trim() });
  }
  const targets = fresh.slice(0, limit);
  let written = 0;
  if (!dryRun) {
    for (const set of targets) {
      const t = set.questions[0].replace(/[.?!]+$/, '').trim();
      await createSet({
        partId: P.S4,
        taskTypeCode: 'AUDIO_RECORDING',
        prefix: 'SPEAKING_P4_AP_',
        title: t.length > 90 ? `${t.slice(0, 90)}…` : t,
        skill: 'speaking',
        part: 4,
        instructions: `Chuẩn bị 1 phút, sau đó trả lời cả ${set.questions.length} câu hỏi trong 2 phút bằng MỘT lần ghi âm.`,
        scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: 20 },
        items: [speakingItem({
          prompt: set.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
          maxScore: 20,
          rubric: 'APTIS_SPEAKING_PART_4_V1',
          sample: set.sample,
          constraints: { prepSeconds: 60, responseSeconds: 120, questionCount: set.questions.length },
        })],
      });
      written += 1;
    }
  }
  tally('Speaking Part 4 (1 chủ đề + 3 câu)', targets.length, 33, written);
}

// ---------------------------------------------------------------------------
// Trang Cập nhật đề
// ---------------------------------------------------------------------------

const LOG_SPECS = [
  { label: 'Update Reading', part: P.R2, name: 'Reading Part 2 (sắp xếp câu)' },
  { label: 'Update Reading', part: P.R3, name: 'Reading Part 3 (ghép ý kiến)' },
  { label: 'Update Writing', part: P.W1, name: 'Writing Part 1' },
  { label: 'Update Writing', part: P.W2, name: 'Writing Part 2' },
  { label: 'Update Writing', part: P.W3, name: 'Writing Part 3' },
  { label: 'Update Writing', part: P.W4, name: 'Writing Part 4' },
  { label: 'Update Listening', part: P.L1, name: 'Listening Part 1' },
  { label: 'Update Listening', part: P.L2, name: 'Listening Part 2' },
  { label: 'Update Listening', part: P.L3, name: 'Listening Part 3' },
  { label: 'Update Listening', part: P.L4, name: 'Listening Part 4' },
  { label: 'Update Speaking', part: P.S1, name: 'Speaking Part 1' },
  { label: 'Update Speaking', part: P.S2, name: 'Speaking Part 2' },
  { label: 'Update Speaking', part: P.S3, name: 'Speaking Part 3' },
  { label: 'Update Speaking', part: P.S4, name: 'Speaking Part 4' },
  { label: 'Update Grammar', part: P.GRAMMAR, name: 'Ngữ pháp' },
  { label: 'Update Vocabulary', part: P.VOCAB, name: 'Từ vựng' },
];

/**
 * Gắn các đề của đợt này vào mục Cập nhật đề để học viên bấm vào làm được.
 * Mục không gắn đề nào chỉ là thông báo, không có nút làm bài.
 *
 * LINK_MAX (biến môi trường): chỉ gắn khi mục có không quá chừng này đề. Dùng khi
 * giao diện cũ chưa biết thu gọn danh sách (Ngữ pháp có 750 đề sẽ thành 750 nút).
 */
async function linkSets(logId, partId) {
  const max = Number(process.env.LINK_MAX || Infinity);
  const [rows] = await sql.query(
    `SELECT qs.id FROM question_sets qs
      WHERE qs.part_id = ? AND qs.status = 'PUBLISHED' AND qs.id IN (?)
      ORDER BY qs.code`,
    [partId, (await docs.find({ partId, 'sourceRef.batch': BATCH }, { projection: { questionSetId: 1 } }).toArray()).map((d) => d.questionSetId)],
  );
  if (rows.length === 0 || rows.length > max) return 0;
  if (dryRun) return rows.length;
  let added = 0;
  for (const [index, row] of rows.entries()) {
    const [result] = await sql.execute(
      `INSERT IGNORE INTO content_update_log_question_sets (log_id, question_set_id, display_order) VALUES (?, ?, ?)`,
      [logId, row.id, index],
    );
    added += result.affectedRows;
  }
  return added;
}

async function logs() {
  const [[{ today }]] = await sql.query(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today`);
  let created = 0;
  for (const spec of LOG_SPECS) {
    const fresh = await docs.find({ partId: spec.part, 'sourceRef.batch': BATCH }, { projection: { title: 1 } }).toArray();
    if (fresh.length === 0) continue;
    const [existingLogs] = await sql.query(
      `SELECT id FROM content_update_logs WHERE part_id = ? AND label = ? AND description LIKE '%đợt tháng 10/2026%' LIMIT 1`,
      [spec.part, spec.label],
    );
    if (existingLogs.length > 0) {
      // Mục đã có thì chỉ bổ sung liên kết tới từng đề (nếu còn thiếu) để học viên bấm vào làm được.
      const linked = await linkSets(existingLogs[0].id, spec.part);
      console.log(`  = đã có mục "${spec.name}" của đợt này${linked > 0 ? `, gắn thêm ${linked} đề` : ''}`);
      continue;
    }
    const sample = fresh.slice(0, 4).map((d) => d.title.replace(/\s*\(2026\)$/, '')).join(', ');
    const description = clip(
      `Cập nhật ${fresh.length} đề mới ${spec.name} (đợt tháng 10/2026), đã phát hành và gắn nhóm đề 2026${fresh.length > 4 ? `: ${sample} và nhiều chủ đề khác` : `: ${sample}`}.`,
      1000,
    );
    if (!dryRun) {
      const logId = randomUUID();
      await sql.execute(
        `INSERT INTO content_update_logs (id, log_date, label, description, part_id, status, display_order, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PUBLISHED', 0, ?, NOW(), NOW())`,
        [logId, today, spec.label, description, spec.part, adminId],
      );
      await linkSets(logId, spec.part);
    }
    console.log(`  + ${spec.label}: ${description.slice(0, 110)}…`);
    created += 1;
  }
  console.log(`\nTrang Cập nhật đề: ${dryRun ? 'sẽ thêm' : 'đã thêm'} ${created} mục.`);
}

// ---------------------------------------------------------------------------

async function main() {
  await connect();
  const run = {
    reading: async () => { await readingPart2(); await readingPart3(); },
    writing: async () => { await writingPart1(); await writingPart2(); await writingPart3(); await writingPart4(); },
    grammar,
    vocab,
    speaking: async () => {
      await speakingPart1();
      await speakingImagePart(2);
      await speakingImagePart(3);
      await speakingPart4();
    },
    listening: async () => { for (const part of [1, 2, 3, 4]) await listeningPart(part); },
    logs,
  };
  const order = target === 'all' ? ['reading', 'writing', 'grammar', 'vocab', 'listening', 'speaking', 'logs'] : [target];
  for (const name of order) {
    if (!run[name]) throw new Error(`Mục không hợp lệ: ${name}`);
    await run[name]();
  }
  console.log('\n=== Tổng kết ===');
  console.table(stats);
  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
