/**
 * Giữ phần Speaking của bản dự đoán trước sang ngày mới.
 *
 *   node scripts/carry-speaking-predictions.mjs <ngày-mới YYYY-MM-DD> "<nguồn>" [--dry-run]
 *
 * Website aptisprep chỉ đưa Speaking dưới dạng dòng mô tả chung ("Part 3: Đời
 * sống: Đọc sách vs chơi game, ..."), không phải danh sách chủ đề. Trong khi
 * trang Dự đoán đề của học viên chỉ hiện bản mới nhất, nên nếu bản mới không
 * có Speaking thì tab Speaking sẽ trống. Script sao nguyên các mục Speaking đã
 * biên tập của bản gần nhất sang ngày mới. Chạy lại không nhân đôi (unique key).
 */
import mysql from 'mysql2/promise';

const [, , newDate, source, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
if (!newDate) { console.error('Thiếu ngày mới.'); process.exit(1); }

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});

const [[prev]] = await sql.query(
  `SELECT MAX(ep.predict_date) AS d FROM exam_predictions ep JOIN components c ON c.id = ep.component_id
    WHERE c.code = 'SPEAKING' AND ep.predict_date < ?`, [newDate]);
if (!prev?.d) { console.log('Không có bản Speaking trước đó để giữ.'); process.exit(0); }

const [[{ n }]] = await sql.query(
  `SELECT COUNT(*) AS n FROM exam_predictions ep JOIN components c ON c.id = ep.component_id
    WHERE c.code = 'SPEAKING' AND ep.predict_date = ?`, [prev.d]);
console.log(`Bản Speaking gần nhất: ${prev.d.toISOString().slice(0, 10)} (${n} mục) -> ${newDate}`);
if (dryRun) { console.log('(dry-run) không ghi.'); await sql.end(); process.exit(0); }

const [result] = await sql.execute(
  `INSERT IGNORE INTO exam_predictions
     (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_by, created_at, updated_at)
   SELECT UUID(), ?, ep.topic_id, ep.part_id, ep.component_id, ep.priority, ep.label, ep.section_label, ?, ep.status, ep.display_order, ep.created_by, NOW(), NOW()
     FROM exam_predictions ep JOIN components c ON c.id = ep.component_id
    WHERE c.code = 'SPEAKING' AND ep.predict_date = ?`,
  [newDate, source || null, prev.d]);
console.log(`Đã giữ ${result.affectedRows} mục Speaking.`);
await sql.end();
