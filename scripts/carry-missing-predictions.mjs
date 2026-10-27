/**
 * Chép các mục của bản dự đoán trước mà bản mới còn thiếu, đánh dấu BACKUP.
 *
 *   node scripts/carry-missing-predictions.mjs <ngày-nguồn> <ngày-đích> [--dry-run]
 *
 * Bản mới nhập từ bài đăng nguồn thường ngắn hơn bản quản trị viên đã biên tập
 * (có nhiều mục dự phòng). Trang Dự đoán đề chỉ hiện bản mới nhất nên các mục kia
 * biến mất khỏi tab chính. Script này giữ lại chúng ở mức dự phòng; mục đã có ở
 * bản đích (cùng topic và part) thì không đụng tới. Chạy lại không nhân đôi.
 */
import mysql from 'mysql2/promise';

const [, , from, to, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
if (!from || !to) { console.error('Thiếu ngày nguồn hoặc ngày đích.'); process.exit(1); }

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});

const missing = `FROM exam_predictions s
  WHERE s.predict_date = ? AND s.status = 'PUBLISHED'
    AND NOT EXISTS (SELECT 1 FROM exam_predictions d WHERE d.predict_date = ? AND d.topic_id = s.topic_id AND d.part_id <=> s.part_id)`;

const [[{ n }]] = await sql.query(`SELECT COUNT(*) AS n ${missing}`, [from, to]);
console.log(`Mục có ở ${from} nhưng thiếu ở ${to}: ${n}`);
if (!dryRun && Number(n) > 0) {
  const [[{ maxOrder }]] = await sql.query(`SELECT COALESCE(MAX(display_order), 0) AS maxOrder FROM exam_predictions WHERE predict_date = ?`, [to]);
  const [res] = await sql.execute(
    `INSERT IGNORE INTO exam_predictions (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_by, created_at, updated_at)
     SELECT UUID(), ?, s.topic_id, s.part_id, s.component_id, 'BACKUP', s.label, s.section_label, s.source, 'PUBLISHED', ? + s.display_order, s.created_by, NOW(), NOW()
     ${missing}`,
    [to, Number(maxOrder), from, to]);
  console.log(`Đã chép ${res.affectedRows} mục.`);
} else if (dryRun) console.log('(dry-run) không ghi gì.');
await sql.end();
