/**
 * Nhập đề Listening Part 1 và Part 3 từ aptisprep, kèm tải audio về MinIO.
 *
 *   node scripts/import-listening-part13.mjs <1|3|4|all> [--dry-run] [--limit N]
 *
 *   P1  mỗi bộ MỘT câu 3 đáp án, audio riêng gắn theo item
 *       (assets: ITEM_AUDIO:<itemId>). Ngân hàng có 260 bộ dạng này và
 *       practice.merge-item-parts gộp 13 bộ thành một đề khi tạo lượt.
 *   P3  mỗi bộ 4 nhận định, nghe hai người rồi chọn Man / Woman / Both.
 *       Một audio dùng chung cho cả bộ (assets: MAIN_AUDIO).
 *
 * Audio tải về MinIO thay vì dùng URL Cloudinary: hệ thống phát audio qua
 * assetId và tự ký presigned URL, dùng link ngoài sẽ phải sửa cả luồng phát và
 * nếu bên đó xoá file thì đề chết.
 *
 * Script chạy lại được: đề đã có (so theo nội dung câu hỏi) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const PART_ID = {
  1: '16000000-0000-4000-8000-000000000021',
  2: '16000000-0000-4000-8000-000000000022',
  3: '16000000-0000-4000-8000-000000000023',
  4: '16000000-0000-4000-8000-000000000024',
};
const DOC_TASK_TYPE = { 1: 'SINGLE_CHOICE', 2: 'SPEAKER_MATCHING', 3: 'SPEAKER_MATCHING', 4: 'SINGLE_CHOICE' };
const SQL_TASK_TYPE = { 1: 'SINGLE_CHOICE', 2: 'SPEAKER_MATCHING', 3: 'SPEAKER_MATCHING', 4: 'SINGLE_CHOICE' };
const CONTENT_BUCKET = 'aptis-content';
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];
/** Điểm mỗi câu, khớp part_scoring_rules (points_per_correct = 2). */
const POINTS_PER_ITEM = 2;

const INSTRUCTIONS = {
  1: 'Nghe đoạn hội thoại và chọn đáp án đúng.',
  2: 'Nghe bốn người nói và ghép mỗi người với ý phù hợp.',
  3: 'Nghe hai người trao đổi và xác định mỗi ý kiến thuộc về người đàn ông, người phụ nữ hoặc cả hai.',
  4: 'Nghe bài nói và chọn đáp án đúng cho mỗi câu hỏi.',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitFlag = args.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : Infinity;
const target = args[0];

if (!target) {
  console.error('Dùng: node scripts/import-listening-part13.mjs <1|3|all> [--dry-run] [--limit N]');
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
};

const normalize = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Bỏ ghi chú biên tập ở đầu câu hỏi — nguồn hay chèn "(Đề cập nhật ngày
 * 24/8/2026)" hoặc "(Đề mới tháng 8/2026)". Đó là chú thích cho người soạn,
 * không phải phần đề, để nguyên thì học viên đọc thấy lạ.
 */
const cleanPrompt = (text) =>
  String(text ?? '')
    .replace(/^\s*\(\s*Đề\s[^)]*\)\s*/iu, '')
    .trim();

/** Part 1: mỗi bản ghi là một bộ một câu. */
function buildPart1(record) {
  const prompt = cleanPrompt(record.question);
  const options = (record.options ?? []).map((o, index) => ({
    id: OPTION_CODES[index],
    code: OPTION_CODES[index],
    content: String(o.text ?? '').trim(),
  }));
  const answerLabel = record.correctAnswer?.label;
  const answer = options.find((o) => o.code === answerLabel);
  if (!prompt || options.length === 0 || !answer || !record.audioUrl) return null;

  return {
    title: prompt.length > 200 ? `${prompt.slice(0, 197)}…` : prompt,
    audioUrl: record.audioUrl,
    // Part 1 gắn audio theo ITEM: mỗi câu một đoạn nghe riêng.
    audioRole: 'ITEM_AUDIO',
    stimulus: null,
    items: [
      {
        prompt,
        options,
        answerId: answer.id,
        transcript: String(record.transcript ?? '').trim() || null,
      },
    ],
  };
}

/**
 * Part 2: nghe 4 người rồi ghép mỗi người với một ý trong danh sách 6 lựa chọn.
 *
 * <p>File để {@code prompt} của từng người RỖNG — nhãn người nói nằm ở
 * {@code person} ("Person A"). DB hiện lưu prompt là "Người nói A", nên đặt
 * đúng như vậy để giao diện thống nhất với 29 bộ có sẵn.
 *
 * <p>Mỗi người một audio riêng: DB gắn ITEM_AUDIO:item_1..4. File chỉ có MỘT
 * audioUrl cho cả bộ, nên dùng chung một asset cho cả 4 item.
 */
function buildPart2(record) {
  const persons = record.persons ?? [];
  if (persons.length === 0 || !record.audioUrl) return null;

  const items = [];
  for (const [index, person] of persons.entries()) {
    const letter =
      String(person.person ?? '').match(/([A-Z])\s*$/)?.[1] ?? String.fromCharCode(65 + index);
    const options = (person.choices ?? []).map((choice, i) => ({
      id: OPTION_CODES[i],
      code: OPTION_CODES[i],
      content: String(choice).trim(),
    }));
    let answer = Number.isInteger(person.answerIndex) ? person.answerIndex : -1;
    if (answer < 0 && person.correctAnswer) {
      answer = options.findIndex((o) => normalize(o.content) === normalize(person.correctAnswer));
    }
    if (options.length === 0 || answer < 0 || answer >= options.length) return null;
    items.push({
      prompt: `Người nói ${letter}`,
      options,
      answerId: options[answer].id,
      transcript: null,
    });
  }

  const topic = String(record.topic ?? record.topicSlug ?? 'Listening Part 2').trim();
  return {
    title: `${topic} (2026)`,
    audioUrl: record.audioUrl,
    // Một audio dùng cho cả 4 item, gắn theo từng item như 29 bộ hiện có.
    audioRole: 'ITEM_AUDIO_ALL',
    stimulus: null,
    items,
  };
}

/** Part 3: 4 nhận định, chọn Man / Woman / Both; một audio cho cả bộ. */
function buildPart3(record) {
  const statements = record.statements ?? [];
  if (statements.length === 0 || !record.audioUrl) return null;

  const items = [];
  for (const s of statements) {
    const prompt = String(s.statement ?? '').trim();
    const raw = s.options ?? [];
    const options = raw.map((o, index) => ({
      id: OPTION_CODES[index],
      code: OPTION_CODES[index],
      content: String(o).trim(),
    }));
    const answer = options.find(
      (o) => normalize(o.content) === normalize(s.correctAnswer),
    );
    if (!prompt || options.length === 0 || !answer) return null;
    items.push({ prompt, options, answerId: answer.id, transcript: null });
  }

  const topic = String(record.topic ?? record.topicSlug ?? 'Listening Part 3').trim();
  return {
    title: `${topic} (2026)`,
    audioUrl: record.audioUrl,
    audioRole: 'MAIN_AUDIO',
    stimulus: null,
    items,
    transcript: String(record.transcript ?? '').trim() || null,
  };
}

/**
 * Part 4: mỗi biến thể là một bài nói với 2 câu trắc nghiệm, một audio chung.
 * File Part 4 xếp theo topics.variants chứ không phải records như Part 1/3.
 */
function buildPart4(variant, topic) {
  const questions = variant.questions ?? [];
  if (questions.length === 0 || !variant.audioUrl) return null;

  const items = [];
  for (const q of questions) {
    const prompt = cleanPrompt(q.prompt);
    const options = (q.options ?? []).map((o, index) => ({
      id: OPTION_CODES[index],
      code: OPTION_CODES[index],
      content: String(o).trim(),
    }));
    let index = Number.isInteger(q.answerIndex) ? q.answerIndex : -1;
    if (index < 0 && q.correctAnswer) {
      index = options.findIndex((o) => normalize(o.content) === normalize(q.correctAnswer));
    }
    if (!prompt || index < 0 || index >= options.length) return null;
    items.push({ prompt, options, answerId: options[index].id, transcript: null });
  }

  const name = String(topic.title ?? topic.topicSlug ?? 'Listening Part 4')
    .replace(/-/g, ' ')
    .trim();
  return {
    title: `${name.charAt(0).toUpperCase()}${name.slice(1)} (2026)`,
    audioUrl: variant.audioUrl,
    audioRole: 'MAIN_AUDIO',
    stimulus: null,
    items,
  };
}

const FILES = {
  1: 'AptisPrep.com/listenning/part 1/aptisprep_listening_part1_full.json',
  2: 'AptisPrep.com/listenning/part 2/aptisprep_listening_part2_partial.json',
  3: 'AptisPrep.com/listenning/part 3/aptisprep_listening_part3_full_rsc.json',
  4: 'AptisPrep.com/listenning/part 4/aptisprep_listening_part4_practice_full.json',
};

async function importPart(part, sql, docs, s3, createdBy) {
  const partId = PART_ID[part];
  const payload = JSON.parse(readFileSync(FILES[part], 'utf8'));

  const candidates = [];
  let skipped = 0;
  if (part === 4) {
    for (const topic of payload.topics ?? []) {
      for (const variant of topic.variants ?? []) {
        const built = buildPart4(variant, topic);
        if (built) candidates.push(built);
        else skipped += 1;
      }
    }
  } else {
    const build = part === 1 ? buildPart1 : part === 2 ? buildPart2 : buildPart3;
    for (const record of payload.records ?? []) {
      const built = build(record);
      if (built) candidates.push(built);
      else skipped += 1;
    }
  }

  const existing = await docs.find({ partId }).toArray();

  // Part 2 không so được bằng prompt: mọi bộ đều dùng "Người nói A..D". Đặc
  // trưng của đề là danh sách 6 lựa chọn, nên so bằng đó.
  const byOptions = part === 2;
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      if (byOptions) {
        const key = (item.options ?? []).map((o) => o.content).join('|');
        if (key) known.add(normalize(key));
      } else {
        const v = item?.prompt?.value;
        if (v) known.add(normalize(v));
      }
    }
  }

  const fresh = candidates.filter((set) =>
    byOptions
      ? !known.has(normalize(set.items[0].options.map((o) => o.content).join('|')))
      : !set.items.some((i) => known.has(normalize(i.prompt))),
  );

  console.log(
    `\n=== Listening Part ${part} === file: ${candidates.length} đề` +
      `${skipped ? ` (bỏ ${skipped} đề thiếu dữ liệu)` : ''}` +
      ` | DB: ${existing.length} | cần nhập: ${fresh.length}`,
  );

  const targets = fresh.slice(0, limit);
  if (dryRun) {
    for (const set of targets.slice(0, 3)) {
      console.log(`  [dry] ${set.title} — ${set.items.length} câu, ${set.items.length * POINTS_PER_ITEM} điểm`);
      for (const item of set.items) {
        const ans = item.options.find((o) => o.id === item.answerId);
        console.log(`        ${item.prompt.slice(0, 60)} -> ${ans.content}`);
      }
    }
    console.log(`  (dry-run) sẽ nhập ${targets.length} đề (mỗi đề tải 1 audio).`);
    return 0;
  }

  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = ? LIMIT 1`,
    [SQL_TASK_TYPE[part]],
  );
  const prefix = `LISTENING_P${part}_AP_`;
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, partId, prefix],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;
  let bytesTotal = 0;

  for (const set of targets) {
    // --- audio về MinIO ---
    let bytes;
    try {
      const response = await fetch(set.audioUrl);
      if (!response.ok) {
        console.error(`  BỎ QUA ${set.title.slice(0, 40)}: audio HTTP ${response.status}`);
        continue;
      }
      bytes = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error(`  BỎ QUA ${set.title.slice(0, 40)}: tải audio lỗi ${error.message}`);
      continue;
    }

    const assetId = randomUUID();
    const objectKey = `content/listening/part${part}/${assetId}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: objectKey,
        Body: bytes,
        ContentType: 'audio/mpeg',
      }),
    );
    await sql.execute(
      `INSERT INTO assets
         (id, bucket_name, object_key, asset_type, mime_type, file_size,
          checksum_sha256, access_scope, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'AUDIO', 'audio/mpeg', ?, ?, 'SIGNED_URL', 'READY', ?, NOW(), NOW())`,
      [assetId, CONTENT_BUCKET, objectKey, bytes.length,
        createHash('sha256').update(bytes).digest('hex'), createdBy],
    );
    bytesTotal += bytes.length;

    // --- bộ câu hỏi ---
    const items = set.items.map((item, index) => ({
      id: randomUUID(),
      sequenceNo: index + 1,
      prompt: { format: 'PLAIN_TEXT', value: item.prompt },
      responseType: 'SINGLE_CHOICE',
      required: true,
      maxScore: POINTS_PER_ITEM,
      options: item.options,
      leftItems: [],
      rightItems: [],
      constraints: {},
      answerKey: {
        type: 'SINGLE_CHOICE',
        selectedOptionId: item.answerId,
        selectedOptionIds: [],
        matches: {},
        orderedOptionIds: [],
        acceptedValues: [],
        caseSensitive: false,
      },
    }));

    const maxScore = items.length * POINTS_PER_ITEM;
    const code = `${prefix}${String(nextNo).padStart(3, '0')}`;
    const questionSetId = randomUUID();

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, partId, taskTypeId, code, set.title, items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId,
      taskTypeCode: DOC_TASK_TYPE[part],
      title: set.title,
      instructions: INSTRUCTIONS[part],
      accessLevel: 'PREMIUM',
      stimulus: set.stimulus,
      sections: [],
      items,
      // Part 1 gắn theo item duy nhất; Part 2 gắn CÙNG asset cho cả 4 item vì
      // file chỉ có một audio; Part 3/4 dùng một audio chung MAIN_AUDIO.
      assets:
        set.audioRole === 'ITEM_AUDIO_ALL'
          ? items.map((item, index) => ({
              assetId,
              role: `ITEM_AUDIO:${item.id}`,
              displayOrder: index + 1,
            }))
          : [
              {
                assetId,
                role: set.audioRole === 'ITEM_AUDIO' ? `ITEM_AUDIO:${items[0].id}` : 'MAIN_AUDIO',
                displayOrder: 1,
              },
            ],
      settings: {
        shuffleOptions: false,
        shuffleItems: false,
        maxAudioPlays: 2,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'listening', part },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(
      `  + ${code} — ${set.title.slice(0, 55)} (${items.length} câu, ${maxScore}đ, audio ${(bytes.length / 1024).toFixed(0)}KB)`,
    );
    nextNo += 1;
    imported += 1;
  }

  console.log(
    `  Đã nhập ${imported}/${targets.length} đề, tải ${(bytesTotal / 1024 / 1024).toFixed(1)} MB audio.`,
  );
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

  const [[admin]] = await sql.query(
    `SELECT id AS createdBy FROM users
      WHERE id IN (SELECT user_id FROM user_roles ur
                   JOIN roles r ON r.id = ur.role_id
                   WHERE r.code IN ('SUPER_ADMIN','ADMIN'))
      LIMIT 1`,
  );
  if (!admin) throw new Error('Không tìm thấy tài khoản admin để gán created_by');

  const s3 = new S3Client({
    endpoint: env.minioEndpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: env.minioAccessKey, secretAccessKey: env.minioSecretKey },
    forcePathStyle: true,
  });

  const parts = target === 'all' ? [1, 2, 3, 4] : [Number(target)];
  let total = 0;
  for (const part of parts) {
    if (!PART_ID[part]) throw new Error(`Part không hợp lệ: ${part}`);
    total += await importPart(part, sql, docs, s3, admin.createdBy);
  }
  console.log(`\nTổng đã nhập: ${total} đề.`);

  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
