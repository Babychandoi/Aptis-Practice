/**
 * Gắn các đề "Actors" (Listening Part 3) chưa có chủ đề vào chủ đề "Actors (Version 1)".
 *
 *   node scripts/attach-listening-actors.mjs [--dry-run]
 *
 * Dự đoán 11/10 đưa "Actors" sang nhóm Q15 = Listening Part 3 của kho. Kho có 5 đề
 * Actors ở Part 3 nhưng chỉ 2 đề có chủ đề (mỗi đề một chủ đề riêng), 3 đề còn lại
 * để trống nên mục dự đoán chỉ mở được 1 đề. Script chỉ điền các đề đang trống;
 * đề đã có chủ đề thì giữ nguyên. Chạy lại không đổi gì.
 */

import mysql from 'mysql2/promise';

const LISTENING_PART_3 = '16000000-0000-4000-8000-000000000023';
const TOPIC_CODE = 'LISTENING_P3_TOPIC_018';
const dryRun = process.argv.includes('--dry-run');

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});

const [[topic]] = await sql.query(`SELECT id FROM topics WHERE code = ?`, [TOPIC_CODE]);
if (!topic) {
  console.log(`Không thấy chủ đề ${TOPIC_CODE}, dừng.`);
  await sql.end();
  process.exit(1);
}

const [rows] = await sql.query(
  `SELECT id, title FROM question_sets WHERE part_id = ? AND status = 'PUBLISHED' AND topic_id IS NULL AND title LIKE 'Actors%'`,
  [LISTENING_PART_3]);
for (const row of rows) console.log(`  gắn: ${row.title} (${row.id})`);

if (!dryRun && rows.length > 0) {
  await sql.query(
    `UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id IN (?) AND topic_id IS NULL`,
    [topic.id, rows.map((r) => r.id)]);
}
console.log(`${dryRun ? '(dry-run) sẽ gắn' : 'Đã gắn'} ${rows.length} đề.`);
await sql.end();
