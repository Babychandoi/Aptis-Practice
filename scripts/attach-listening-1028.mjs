/**
 * Gắn chủ đề cho các đề Listening chưa có chủ đề, để mục dự đoán 28/10 mở được đề.
 *
 *   node scripts/attach-listening-1028.mjs [--dry-run]
 *
 *   - 2 đề "University And Technology (2026)" -> chủ đề của bản Version 3 (mục University Technology)
 *   - 1 đề "A new guidebook (2026)" -> chủ đề mới "A new guidebook (2026)" (mục A guide book)
 *
 * Chỉ điền đề đang để trống; đề đã có chủ đề thì giữ nguyên. Chạy lại không đổi gì.
 */
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const dryRun = process.argv.includes('--dry-run');
const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});

async function attach(label, setIds, topicCode, newTopicName) {
  let [[topic]] = await sql.query(`SELECT id FROM topics WHERE code = ?`, [topicCode]);
  if (!topic && newTopicName && !dryRun) {
    const id = randomUUID();
    await sql.execute(`INSERT INTO topics (id, code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`, [id, topicCode, newTopicName]);
    topic = { id };
  }
  const [rows] = await sql.query(`SELECT id FROM question_sets WHERE id IN (?) AND status = 'PUBLISHED' AND topic_id IS NULL`, [setIds]);
  if (!dryRun && topic && rows.length > 0) {
    await sql.query(`UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id IN (?) AND topic_id IS NULL`, [topic.id, rows.map((r) => r.id)]);
  }
  console.log(`  ${label}: ${dryRun ? 'sẽ gắn' : 'đã gắn'} ${rows.length} đề`);
}

await attach('University And Technology', ['18f2082a-044e-4b61-8e7c-4af346f043c2', '9468f4ef-4130-4a6e-82ca-051f7bc31bb3'], 'LISTENING_P3_TOPIC_028');
await attach('A new guidebook', ['d13ccc72-d5a4-4f94-9cbe-6726e64f422a'], 'LISTENING_P4_GUIDEBOOK_2026', 'A new guidebook (2026)');
await sql.end();
