#!/usr/bin/env node
/**
 * Soát lỗi từng đề đang hiển thị trong ngân hàng (PUBLISHED, listed, không phải đề giáo viên):
 *  - có document Mongo đúng current_revision, có câu hỏi;
 *  - trắc nghiệm: có >= 2 phương án, đáp án trỏ vào phương án có thật;
 *  - ghép cặp: mọi cặp trỏ đúng cột trái/phải;
 *  - Listening phải có audio, Speaking 2-3 phải có ảnh; mọi asset có bản ghi READY
 *    và file thật trên MinIO.
 *
 *   node scripts/check-question-bank.mjs            # in tóm tắt + 30 lỗi đầu
 *   node scripts/check-question-bank.mjs --all      # gồm cả đề đã ẩn
 */
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

async function main() {
  const all = process.argv.includes('--all');
  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root', database: process.env.MYSQL_DB ?? 'aptis',
  });
  const mongo = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
  const s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000', region: 'us-east-1', forcePathStyle: true,
    credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin', secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin' },
  });
  try {
    const [[col]] = await sql.query("SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'question_sets' AND column_name = 'listed'");
    const listedFilter = Number(col.n) && !all ? 'AND qs.listed = 1' : '';
    const [sets] = await sql.query(`
      SELECT qs.id, qs.code, qs.title, qs.current_revision AS rev, c.code AS comp, p.code AS part
        FROM question_sets qs JOIN parts p ON p.id = qs.part_id JOIN components c ON c.id = p.component_id
       WHERE qs.status = 'PUBLISHED' AND qs.owner_teacher_id IS NULL ${listedFilter}`);
    const [assetRows] = await sql.query("SELECT id, bucket_name AS bucket, object_key AS objectKey, status, asset_type AS type FROM assets");
    const assets = new Map(assetRows.map((a) => [a.id, a]));
    const docs = mongo.db().collection('question_set_documents');
    const byId = new Map();
    for (const d of await docs.find({ questionSetId: { $in: sets.map((s) => s.id) } }).toArray()) {
      if (!byId.has(d.questionSetId) || d.revision > byId.get(d.questionSetId).revision) byId.set(d.questionSetId, d);
    }

    const errors = [];
    const perPart = new Map();
    const objectChecked = new Map();
    const objectExists = async (a) => {
      const key = `${a.bucket}/${a.objectKey}`;
      if (!objectChecked.has(key)) {
        objectChecked.set(key, s3.send(new HeadObjectCommand({ Bucket: a.bucket, Key: a.objectKey })).then(() => true, () => false));
      }
      return objectChecked.get(key);
    };
    for (const s of sets) {
      const name = `${s.comp === 'GRAMMAR_VOCABULARY' ? s.part : `${s.comp} ${s.part}`}`;
      if (!perPart.has(name)) perPart.set(name, { total: 0, bad: 0 });
      perPart.get(name).total++;
      const problems = [];
      const d = byId.get(s.id);
      if (!d) problems.push('không có nội dung Mongo');
      else {
        if (d.revision !== s.rev) problems.push(`Mongo revision ${d.revision} ≠ MySQL ${s.rev}`);
        const items = d.items ?? [];
        if (!items.length) problems.push('không có câu hỏi');
        for (const [i, it] of items.entries()) {
          const at = `câu ${i + 1}`;
          const key = it.answerKey;
          if (it.responseType === 'SINGLE_CHOICE') {
            const ids = new Set((it.options ?? []).map((o) => o.id));
            if (ids.size < 2) problems.push(`${at}: < 2 phương án`);
            if ((it.options ?? []).some((o) => !String(o.content ?? '').trim())) problems.push(`${at}: phương án rỗng`);
            if (!key?.selectedOptionId || !ids.has(key.selectedOptionId)) problems.push(`${at}: đáp án không trỏ vào phương án`);
          } else if (it.responseType === 'MATCHING') {
            const left = new Set((it.leftItems ?? []).map((o) => o.id));
            const right = new Set((it.rightItems ?? []).map((o) => o.id));
            const m = key?.matches ?? {};
            if (!left.size || !right.size) problems.push(`${at}: thiếu cột ghép`);
            for (const l of left) if (!right.has(m[l])) problems.push(`${at}: cặp ${l} không có đáp án hợp lệ`);
          } else if (it.responseType === 'ORDERING') {
            const ids = new Set((it.options ?? []).map((o) => o.id));
            const order = key?.orderedOptionIds ?? [];
            if (!order.length || order.some((x) => !ids.has(x))) problems.push(`${at}: thứ tự đáp án sai`);
          }
          if (!String(it.prompt?.value ?? '').trim() && !String(d.stimulus?.value ?? '').trim() && it.responseType !== 'ORDERING') {
            problems.push(`${at}: câu hỏi rỗng`);
          }
        }
        const refs = d.assets ?? [];
        const types = new Set();
        for (const r of refs) {
          const a = assets.get(r.assetId);
          if (!a) { problems.push(`asset ${r.assetId.slice(0, 8)} không có bản ghi`); continue; }
          types.add(a.type);
          if (a.status !== 'READY') problems.push(`asset ${a.type} trạng thái ${a.status}`);
          else if (!(await objectExists(a))) problems.push(`file ${a.type} mất trên MinIO (${a.objectKey})`);
        }
        if (s.comp === 'LISTENING' && !types.has('AUDIO')) problems.push('Listening không có audio');
        if (s.comp === 'SPEAKING' && (s.part === 'PART_2' || s.part === 'PART_3') && !types.has('IMAGE')) problems.push('Speaking không có ảnh');
      }
      if (problems.length) {
        perPart.get(name).bad++;
        errors.push(`${s.code} "${String(s.title ?? '').slice(0, 40)}": ${[...new Set(problems)].slice(0, 4).join('; ')}`);
      }
    }
    console.log(`Đã soát ${sets.length} đề${all ? ' (gồm đề ẩn)' : ' đang hiển thị'}, ${objectChecked.size} file trên MinIO.`);
    for (const [name, x] of [...perPart.entries()].sort()) console.log(`  ${name.padEnd(20)} ${String(x.total).padStart(4)} đề, ${x.bad} lỗi`);
    console.log(`Tổng lỗi: ${errors.length}`);
    for (const e of errors.slice(0, 30)) console.log('  - ' + e);
    if (errors.length > 30) console.log(`  … còn ${errors.length - 30} lỗi`);
    if (errors.length) process.exitCode = 2;
  } finally {
    await sql.end();
    await mongo.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
