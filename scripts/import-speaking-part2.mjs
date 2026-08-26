/**
 * Nhập đề Speaking Part 2 (miêu tả tranh) từ aptisprep, kèm tải ảnh về MinIO.
 *
 *   node scripts/import-speaking-part2.mjs <file.json> [--dry-run] [--limit N]
 *
 * Mỗi bộ = 1 ảnh + 3 câu ghi âm 45 giây, 5 điểm mỗi câu (tổng 15). Câu 1 luôn
 * là "Describe this picture", hai câu sau mở rộng chủ đề.
 *
 * Ảnh tải về MinIO thay vì dùng URL Cloudinary: hệ thống hiển thị ảnh qua
 * assetId và tự ký presigned URL, dùng link ngoài sẽ phải sửa cả luồng hiển
 * thị và nếu bên đó xoá file thì đề chết.
 *
 * Đáp án mẫu vào field explanation như 49 bộ hiện có — để học viên tham khảo
 * cách nói sau khi nộp, không dùng để chấm (AI chấm theo rubric
 * APTIS_SPEAKING_PART_2_V1).
 *
 * Script chạy lại được: đề đã có sẽ bị bỏ qua. So trùng bằng câu 2-3 vì câu 1
 * ("Describe this picture") giống nhau ở mọi đề.
 */

import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SPEAKING_PART_2_ID = '16000000-0000-4000-8000-000000000032';
const RUBRIC_CODE = 'APTIS_SPEAKING_PART_2_V1';
const CONTENT_BUCKET = 'aptis-content';
/** Điểm mỗi câu, khớp 49 bộ hiện có (3 câu x 5 = 15). */
const POINTS_PER_ITEM = 5;
const RESPONSE_SECONDS = 45;
const MIN_WORDS = 60;
const MAX_WORDS = 90;

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

/** Đuôi file và mime theo URL Cloudinary; ảnh của nguồn hiện là webp. */
function imageType(url) {
  const ext = String(url ?? '').match(/\.(webp|jpe?g|png|gif)(?:$|\?)/i)?.[1]?.toLowerCase();
  if (ext === 'png') return { ext: 'png', mime: 'image/png' };
  if (ext === 'gif') return { ext: 'gif', mime: 'image/gif' };
  if (ext === 'jpg' || ext === 'jpeg') return { ext: 'jpg', mime: 'image/jpeg' };
  return { ext: 'webp', mime: 'image/webp' };
}

/**
 * Tên đề lấy từ câu 2 — câu 1 luôn là "Describe this picture" nên không phân
 * biệt được đề nào với đề nào.
 */
function titleFrom(questions) {
  const source = questions[1] ?? questions[0] ?? '';
  const text = String(source).replace(/[?.!]+$/, '').trim();
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const lessons = payload.lessons ?? [];
  console.log(`File có ${lessons.length} đề (${payload.extractedQuestions ?? '?'} câu).`);

  const candidates = [];
  let skipped = 0;
  for (const lesson of lessons) {
    const questions = (lesson.questions ?? [])
      .map((q) => ({
        prompt: String(q.question ?? '').trim(),
        sample: String(q.sampleAnswer ?? '').trim(),
      }))
      .filter((q) => q.prompt);
    if (questions.length === 0 || !lesson.imageUrl) {
      skipped += 1;
      continue;
    }
    candidates.push({
      imageUrl: lesson.imageUrl,
      imageAlt: String(lesson.imageAlt ?? '').trim() || null,
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

  const existing = await docs.find({ partId: SPEAKING_PART_2_ID }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }

  // Bỏ câu 1 khi so trùng: "Describe this picture" giống nhau ở mọi đề.
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
      console.log(`  [dry] ${set.title}`);
      console.log(`         ảnh: ${set.imageUrl.slice(0, 70)}…`);
      set.questions.forEach((q, index) => {
        console.log(`         ${index + 1}. ${q.prompt}`);
        console.log(`            mẫu: ${q.sample.slice(0, 70)}…`);
      });
    }
    console.log(`\n(dry-run) sẽ nhập ${targets.length} đề (mỗi đề tải 1 ảnh).`);
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
    `SELECT id AS taskTypeId FROM task_types WHERE code = 'IMAGE_DESCRIPTION' LIMIT 1`,
  );
  const prefix = 'SPEAKING_P2_AP_';
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, SPEAKING_PART_2_ID, prefix],
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
    // --- ảnh về MinIO ---
    let bytes;
    try {
      const response = await fetch(set.imageUrl);
      if (!response.ok) {
        console.error(`  BỎ QUA ${set.title.slice(0, 40)}: ảnh HTTP ${response.status}`);
        continue;
      }
      bytes = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error(`  BỎ QUA ${set.title.slice(0, 40)}: tải ảnh lỗi ${error.message}`);
      continue;
    }

    const { ext, mime } = imageType(set.imageUrl);
    const assetId = randomUUID();
    const objectKey = `content/speaking/part2/${assetId}.${ext}`;
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
    bytesTotal += bytes.length;

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
      // Chỉ để tham khảo sau khi nộp; AI chấm theo rubric.
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
      [questionSetId, SPEAKING_PART_2_ID, taskTypeId, code, set.title,
        items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId: SPEAKING_PART_2_ID,
      taskTypeCode: 'AUDIO_RECORDING',
      title: set.title,
      instructions: `Nhìn ảnh và trả lời ${items.length} câu hỏi. Mỗi câu nói ${RESPONSE_SECONDS} giây (khoảng ${MIN_WORDS}–${MAX_WORDS} từ).`,
      accessLevel: 'PREMIUM',
      stimulus: null,
      sections: [],
      items,
      assets: [{ assetId, role: 'MAIN_IMAGE', displayOrder: 1 }],
      settings: {
        shuffleOptions: false,
        // Ba câu đi theo mạch từ miêu tả ảnh đến mở rộng chủ đề.
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'speaking', part: 2 },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(
      `  + ${code} — ${set.title.slice(0, 55)} (${items.length} câu, ${maxScore}đ, ảnh ${(bytes.length / 1024).toFixed(0)}KB)`,
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
