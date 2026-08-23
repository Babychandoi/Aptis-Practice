/**
 * Nhập đề Listening Part 4 mới từ file JSON của aptisprep.
 *
 *   node scripts/import-listening-part4.mjs <file.json> [--dry-run]
 *
 * Việc script làm, theo thứ tự:
 *   1. So từng bản ghi với DB bằng nội dung câu hỏi -> chỉ lấy đề CHƯA có.
 *   2. Tải audio từ Cloudinary về MinIO và tạo bản ghi assets.
 *   3. Tạo question_sets (MySQL) + question_set_documents (MongoDB).
 *
 * Vì sao tải audio về thay vì dùng URL Cloudinary: hệ thống đọc audio qua
 * assetId và ký presigned URL từ MinIO. Dùng URL ngoài sẽ phải sửa cả luồng
 * phát audio, và nếu bên đó xoá file thì đề chết.
 *
 * Script chạy lại được nhiều lần: đề đã nhập sẽ bị bỏ qua ở bước so khớp.
 */

import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const LISTENING_PART_4_ID = '16000000-0000-4000-8000-000000000024';
const SINGLE_CHOICE_TASK_TYPE = '12000000-0000-4000-8000-000000000001';
const CONTENT_BUCKET = 'aptis-content';
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

const [, , filePath, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

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
  minioEndpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000',
  minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
};

const normalize = (value) =>
  String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const records = payload.records ?? [];
  console.log(`File có ${records.length} bản ghi (part ${payload.partNumber}).`);

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

  // --- Bước 1: tìm đề chưa có ------------------------------------------
  const existing = await docs
    .find({ partId: LISTENING_PART_4_ID }, { projection: { items: 1 } })
    .toArray();

  const knownPrompts = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const value = item?.prompt?.value;
      if (value) knownPrompts.add(normalize(value));
    }
  }
  console.log(`DB đang có ${existing.length} bộ, ${knownPrompts.size} câu hỏi.`);

  const fresh = records.filter((record) => {
    const prompts = (record.questions ?? []).map((q) => normalize(q.question));
    return !prompts.some((p) => p && knownPrompts.has(p));
  });
  console.log(`Đề mới cần nhập: ${fresh.length}`);

  if (fresh.length === 0 || dryRun) {
    if (dryRun) {
      for (const record of fresh) {
        console.log(`  - ${record.topicSlug} (${record.questions?.length ?? 0} câu)`);
      }
      console.log('\n--dry-run: không ghi gì vào hệ thống.');
    }
    await sql.end();
    await mongo.close();
    return;
  }

  // Mã tiếp theo, dò từ mã lớn nhất đang có.
  const [[{ maxCode }]] = await sql.query(
    `SELECT MAX(code) AS maxCode FROM question_sets WHERE part_id = ?`,
    [LISTENING_PART_4_ID],
  );
  let nextIndex = Number(String(maxCode ?? '').match(/(\d+)$/)?.[1] ?? 0) + 1;

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users
     WHERE id IN (SELECT user_id FROM user_roles ur
                  JOIN roles r ON r.id = ur.role_id
                  WHERE r.code IN ('SUPER_ADMIN','ADMIN'))
     LIMIT 1`,
  );
  if (!createdBy) throw new Error('Không tìm thấy tài khoản admin để gán created_by');

  const s3 = new S3Client({
    endpoint: env.minioEndpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: env.minioAccessKey, secretAccessKey: env.minioSecretKey },
    forcePathStyle: true,
  });

  let imported = 0;
  for (const record of fresh) {
    const code = `LISTENING_PART_4_${String(nextIndex).padStart(3, '0')}`;
    const title = titleFrom(record);

    // --- Bước 2: audio về MinIO ---------------------------------------
    const audio = await fetch(record.audioUrl);
    if (!audio.ok) {
      console.error(`  BỎ QUA ${code}: tải audio lỗi HTTP ${audio.status}`);
      continue;
    }
    const bytes = Buffer.from(await audio.arrayBuffer());
    const assetId = randomUUID();
    const objectKey = `content/listening/part4/${assetId}.mp3`;

    await s3.send(new PutObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: objectKey,
      Body: bytes,
      ContentType: 'audio/mpeg',
    }));

    await sql.execute(
      `INSERT INTO assets
         (id, bucket_name, object_key, asset_type, mime_type, file_size,
          checksum_sha256, access_scope, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'AUDIO', 'audio/mpeg', ?, ?, 'SIGNED_URL', 'READY', ?, NOW(), NOW())`,
      [assetId, CONTENT_BUCKET, objectKey, bytes.length,
        createHash('sha256').update(bytes).digest('hex'), createdBy],
    );

    // --- Bước 3: bộ câu hỏi -------------------------------------------
    const items = (record.questions ?? []).map((q, index) => buildItem(q, index));
    const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0);
    const questionSetId = randomUUID();

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 2, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, LISTENING_PART_4_ID, SINGLE_CHOICE_TASK_TYPE, code, title,
        items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: LISTENING_PART_4_ID,
      taskTypeCode: 'SINGLE_CHOICE',
      title,
      instructions: 'Nghe bài nói và chọn đáp án đúng cho mỗi câu hỏi.',
      accessLevel: 'PREMIUM',
      sections: [],
      items,
      assets: [{ assetId, role: 'MAIN_AUDIO', displayOrder: 1 }],
      settings: {
        shuffleOptions: false,
        shuffleItems: false,
        maxAudioPlays: 2,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore },
      // Giữ nguồn để lần sau đối soát được đề nào đến từ file nào.
      sourceRef: { provider: 'aptisprep', topicSlug: record.topicSlug, sourceId: record.id },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title} (${items.length} câu, audio ${(bytes.length / 1024).toFixed(0)}KB)`);
    nextIndex += 1;
    imported += 1;
  }

  console.log(`\nĐã nhập ${imported}/${fresh.length} đề.`);
  await sql.end();
  await mongo.close();
}

/** Tiêu đề đọc được từ topicSlug: "using-the-time-effectively" -> "Using the time effectively". */
function titleFrom(record) {
  const words = String(record.topicSlug ?? 'listening part 4').split('-');
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + ' (2026)';
}

function buildItem(question, index) {
  const options = (question.options ?? []).map((content, i) => ({
    id: OPTION_CODES[i],
    code: OPTION_CODES[i],
    content: String(content),
  }));

  // answerIndex là chỉ số 0-based trong options; đối chiếu thêm correctAnswer
  // để không lệ thuộc một trường duy nhất.
  let answerIdx = Number.isInteger(question.answerIndex) ? question.answerIndex : -1;
  if (answerIdx < 0 && question.correctAnswer) {
    answerIdx = options.findIndex((o) => normalize(o.content) === normalize(question.correctAnswer));
  }
  if (answerIdx < 0 || answerIdx >= options.length) {
    throw new Error(`Không xác định được đáp án cho câu: ${question.question}`);
  }

  return {
    id: randomUUID(),
    sequenceNo: index + 1,
    prompt: { format: 'PLAIN_TEXT', value: String(question.question) },
    responseType: 'SINGLE_CHOICE',
    required: true,
    maxScore: 2,
    options,
    leftItems: [],
    rightItems: [],
    constraints: { sourceQuestionId: String(question.id ?? ''), sourceDisplayNo: '' },
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
