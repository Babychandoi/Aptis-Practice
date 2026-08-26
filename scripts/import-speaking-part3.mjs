/**
 * Nhập đề Speaking Part 3 (so sánh hai tranh) từ aptisprep, kèm tải ảnh về MinIO.
 *
 *   node scripts/import-speaking-part3.mjs <file.json> [--dry-run] [--limit N]
 *
 * Mỗi bộ = HAI ảnh + 3 câu ghi âm 45 giây, 5 điểm mỗi câu (tổng 15). Câu 1
 * luôn là "Tell me what you see in the two pictures", hai câu sau mở rộng.
 *
 * Khác Part 2 ở chỗ hai ảnh có role riêng: STIMULUS_IMAGE và SECONDARY_IMAGE,
 * theo đúng cách 60 bộ hiện có đang lưu.
 *
 * Ảnh tải về MinIO thay vì dùng URL Cloudinary: hệ thống hiển thị qua assetId
 * và tự ký presigned URL, dùng link ngoài thì bên đó xoá file là đề chết.
 *
 * Đáp án mẫu vào explanation — để học viên tham khảo cách nói sau khi nộp,
 * không dùng để chấm (AI chấm theo rubric APTIS_SPEAKING_PART_3_V1).
 *
 * Script chạy lại được. So trùng bằng câu 2-3 vì câu 1 giống nhau ở mọi đề.
 */

import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SPEAKING_PART_3_ID = '16000000-0000-4000-8000-000000000033';
const RUBRIC_CODE = 'APTIS_SPEAKING_PART_3_V1';
const CONTENT_BUCKET = 'aptis-content';
/** Điểm mỗi câu, khớp 60 bộ hiện có (3 câu x 5 = 15). */
const POINTS_PER_ITEM = 5;
const RESPONSE_SECONDS = 45;
const MIN_WORDS = 68;
const MAX_WORDS = 90;
/** Role của ảnh 1 và ảnh 2, đúng như các bộ đang lưu. */
const IMAGE_ROLES = ['STIMULUS_IMAGE', 'SECONDARY_IMAGE'];

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

function imageType(url) {
  const ext = String(url ?? '').match(/\.(webp|jpe?g|png|gif)(?:$|\?)/i)?.[1]?.toLowerCase();
  if (ext === 'png') return { ext: 'png', mime: 'image/png' };
  if (ext === 'gif') return { ext: 'gif', mime: 'image/gif' };
  if (ext === 'jpg' || ext === 'jpeg') return { ext: 'jpg', mime: 'image/jpeg' };
  return { ext: 'webp', mime: 'image/webp' };
}

/** Tên đề lấy từ câu 2 — câu 1 giống nhau ở mọi đề nên không phân biệt được. */
function titleFrom(prompts) {
  const source = prompts[1] ?? prompts[0] ?? '';
  const text = String(source).replace(/[?.!]+$/, '').trim();
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const lessons = payload.lessons ?? [];
  console.log(
    `File có ${lessons.length} đề (${payload.extractedQuestions ?? '?'} câu, ${payload.extractedImages ?? '?'} ảnh).`,
  );

  const candidates = [];
  let skipped = 0;
  for (const lesson of lessons) {
    const questions = (lesson.questions ?? [])
      .map((q) => ({
        prompt: String(q.question ?? '').trim(),
        sample: String(q.sampleAnswer ?? '').trim(),
      }))
      .filter((q) => q.prompt);
    const images = (lesson.images ?? [])
      .map((i) => String(i.url ?? '').trim())
      .filter(Boolean);

    if (questions.length === 0 || images.length === 0) {
      skipped += 1;
      continue;
    }
    candidates.push({
      images,
      questions,
      title: titleFrom(questions.map((q) => q.prompt)),
    });
  }

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

  const existing = await docs.find({ partId: SPEAKING_PART_3_ID }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }

  const fresh = candidates.filter(
    (set) => !set.questions.slice(1).some((q) => known.has(normalize(q.prompt))),
  );
  console.log(
    `DB đang có ${existing.length} bộ` +
      `${skipped ? ` | bỏ ${skipped} đề thiếu ảnh/câu hỏi` : ''}` +
      ` | cần nhập: ${fresh.length}`,
  );

  const targets = fresh.slice(0, limit);
  if (limit !== Infinity) console.log(`Giới hạn lần này: ${targets.length} đề`);

  if (dryRun) {
    for (const set of targets.slice(0, 3)) {
      console.log(`  [dry] ${set.title} — ${set.images.length} ảnh`);
      set.questions.forEach((q, index) => {
        console.log(`         ${index + 1}. ${q.prompt}`);
        console.log(`            mẫu: ${q.sample.slice(0, 70)}…`);
      });
    }
    console.log(`\n(dry-run) sẽ nhập ${targets.length} đề (mỗi đề tải ${IMAGE_ROLES.length} ảnh).`);
    await sql.end();
    await mongo.close();
    return;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users
      WHERE id IN (SELECT user_id FROM user_roles ur
                   JOIN roles r ON r.id = ur.role_id
                   WHERE r.code IN ('SUPER_ADMIN','ADMIN'))
      LIMIT 1`,
  );
  if (!createdBy) throw new Error('Không tìm thấy tài khoản admin để gán created_by');

  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = 'IMAGE_COMPARISON' LIMIT 1`,
  );
  const prefix = 'SPEAKING_P3_AP_';
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, SPEAKING_PART_3_ID, prefix],
  );

  const s3 = new S3Client({
    endpoint: env.minioEndpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: env.minioAccessKey, secretAccessKey: env.minioSecretKey },
    forcePathStyle: true,
  });

  let nextNo = Number(maxNo) + 1;
  let imported = 0;
  let bytesTotal = 0;

  for (const set of targets) {
    // --- tải cả hai ảnh trước: thiếu một ảnh thì bỏ cả đề, không tạo đề lệch ---
    const uploaded = [];
    let failed = false;
    for (const [index, url] of set.images.entries()) {
      let bytes;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`  BỎ QUA ${set.title.slice(0, 40)}: ảnh ${index + 1} HTTP ${response.status}`);
          failed = true;
          break;
        }
        bytes = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        console.error(`  BỎ QUA ${set.title.slice(0, 40)}: ảnh ${index + 1} lỗi ${error.message}`);
        failed = true;
        break;
      }

      const { ext, mime } = imageType(url);
      const assetId = randomUUID();
      const objectKey = `content/speaking/part3/${assetId}.${ext}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: CONTENT_BUCKET,
          Key: objectKey,
          Body: bytes,
          ContentType: mime,
        }),
      );
      await sql.execute(
        `INSERT INTO assets
           (id, bucket_name, object_key, asset_type, mime_type, file_size,
            checksum_sha256, access_scope, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'IMAGE', ?, ?, ?, 'SIGNED_URL', 'READY', ?, NOW(), NOW())`,
        [assetId, CONTENT_BUCKET, objectKey, mime, bytes.length,
          createHash('sha256').update(bytes).digest('hex'), createdBy],
      );
      uploaded.push({ assetId, size: bytes.length });
      bytesTotal += bytes.length;
    }
    if (failed || uploaded.length === 0) continue;

    // --- bộ câu hỏi ---
    const items = set.questions.map((q, index) => ({
      id: randomUUID(),
      sequenceNo: index + 1,
      prompt: { format: 'PLAIN_TEXT', value: q.prompt },
      responseType: 'AUDIO_RECORDING',
      required: true,
      maxScore: POINTS_PER_ITEM,
      options: [],
      leftItems: [],
      rightItems: [],
      constraints: {
        prepSeconds: 0,
        responseSeconds: RESPONSE_SECONDS,
        minWords: MIN_WORDS,
        maxWords: MAX_WORDS,
      },
      rubricCode: RUBRIC_CODE,
      answerKey: null,
      explanation: q.sample ? { format: 'PLAIN_TEXT', value: q.sample } : null,
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
      [questionSetId, SPEAKING_PART_3_ID, taskTypeId, code, set.title,
        items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: SPEAKING_PART_3_ID,
      taskTypeCode: 'AUDIO_RECORDING',
      title: set.title,
      instructions: `So sánh hai bức ảnh và trả lời lần lượt ${items.length} câu hỏi. Mỗi câu nói trong ${RESPONSE_SECONDS} giây.`,
      accessLevel: 'PREMIUM',
      stimulus: null,
      sections: [],
      items,
      assets: uploaded.map((u, index) => ({
        assetId: u.assetId,
        role: IMAGE_ROLES[index] ?? `IMAGE_${index + 1}`,
        displayOrder: index + 1,
      })),
      settings: {
        shuffleOptions: false,
        // Ba câu đi theo mạch từ so sánh ảnh đến mở rộng chủ đề.
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'speaking', part: 3 },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    const kb = (uploaded.reduce((s, u) => s + u.size, 0) / 1024).toFixed(0);
    console.log(
      `  + ${code} — ${set.title.slice(0, 50)} (${items.length} câu, ${maxScore}đ, ${uploaded.length} ảnh ${kb}KB)`,
    );
    nextNo += 1;
    imported += 1;
  }

  console.log(
    `\nĐã nhập ${imported}/${targets.length} đề, tải ${(bytesTotal / 1024 / 1024).toFixed(1)} MB ảnh.`,
  );
  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
