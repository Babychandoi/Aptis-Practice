/**
 * Sửa đề Speaking ghi sai rubric và chấm lại các bài thi bị kẹt vì nó.
 *
 *   node scripts/fix-speaking-rubric-stuck.mjs [--dry-run]
 *
 * Đề "Speaking part 1" (SPEAKING_PART_1_CRYJ0J, tạo tay 22/09) ghi rubric
 * "APTIS_SPEAKING" — mã không tồn tại, chỉ có APTIS_SPEAKING_PART_1_V1. Worker
 * không tìm thấy rubric nên job chấm thất bại sau 3 lần và bài thi nằm mãi ở
 * SCORING. Script:
 *
 *   1. đổi rubricCode trong đề (question_set_documents);
 *   2. đổi luôn trong bản chụp đề của các bài đã làm (attempt_documents), vì
 *      worker chấm theo bản chụp chứ không theo đề hiện tại;
 *   3. đưa các job thất bại vì lỗi này về hàng đợi để worker chấm lại.
 *
 * Ngoài ra bài de7ac18167 kẹt vì lỗi tranh chấp: hai job cuối xong cùng lúc, mỗi
 * job thấy job kia còn chạy nên không job nào chốt bài. Đưa lại job xong sau cùng
 * vào hàng đợi để lần chấm đó chốt bài (chấm lại một câu Writing).
 *
 * Chạy lại an toàn: chỉ đụng tới dữ liệu còn mang mã sai hoặc job còn FAILED.
 */
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const SET_ID = '5b801959-335b-4ddd-970a-e62494b54e98';
const WRONG = 'APTIS_SPEAKING';
const RIGHT = 'APTIS_SPEAKING_PART_1_V1';
const RACE_ATTEMPT = '1bef5614-5899-4140-b53c-a66d0e5cb86a';
const RACE_JOB = 'f0054063-3c6e-43b8-81c1-fac74071369d';
const dryRun = process.argv.includes('--dry-run');

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});
const mongo = new MongoClient(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
await mongo.connect();
const db = mongo.db();

const rubric = await db.collection('rubric_definitions').findOne({ code: RIGHT, status: 'ACTIVE' });
if (!rubric) {
  console.log(`Không thấy rubric ${RIGHT} đang ACTIVE, dừng.`);
  process.exit(1);
}

// 1. Đề
const setDocs = await db.collection('question_set_documents').countDocuments({ questionSetId: SET_ID, 'items.rubricCode': WRONG });
console.log(`Đề cần sửa rubric: ${setDocs}`);
if (!dryRun && setDocs > 0) {
  await db.collection('question_set_documents').updateMany(
    { questionSetId: SET_ID },
    { $set: { 'items.$[i].rubricCode': RIGHT } },
    { arrayFilters: [{ 'i.rubricCode': WRONG }] });
}

// 2. Bản chụp đề trong bài làm
const attemptFilter = { questionSets: { $elemMatch: { questionSetId: SET_ID, 'snapshot.items.rubricCode': WRONG } } };
const attemptDocs = await db.collection('attempt_documents').countDocuments(attemptFilter);
console.log(`Bài làm có bản chụp cần sửa: ${attemptDocs}`);
if (!dryRun && attemptDocs > 0) {
  await db.collection('attempt_documents').updateMany(
    attemptFilter,
    { $set: { 'questionSets.$[e].snapshot.items.$[i].rubricCode': RIGHT } },
    { arrayFilters: [{ 'e.questionSetId': SET_ID }, { 'i.rubricCode': WRONG }] });
}

// 3. Job thất bại vì thiếu rubric
const [failed] = await sql.query(
  `SELECT j.id, a.public_code, a.status FROM evaluation_jobs j JOIN test_attempts a ON a.id = j.attempt_id
    WHERE j.question_set_id = ? AND j.status = 'FAILED' AND j.error_message LIKE ?`,
  [SET_ID, `%rubric ${WRONG}%`]);
for (const r of failed) console.log(`  chấm lại: bài ${r.public_code} (${r.status})`);

// 4. Bài kẹt do tranh chấp: chỉ khi bài còn SCORING và không còn job nào chờ
const [[race]] = await sql.query(
  `SELECT a.status, (SELECT COUNT(*) FROM evaluation_jobs j WHERE j.attempt_id = a.id AND j.status IN ('QUEUED','PROCESSING')) pending
     FROM test_attempts a WHERE a.id = ?`, [RACE_ATTEMPT]);
const fixRace = race?.status === 'SCORING' && Number(race.pending) === 0;
console.log(`Bài de7ac18167: ${fixRace ? 'sẽ chấm lại 1 câu để chốt bài' : 'không cần xử lý'}`);

if (!dryRun) {
  const ids = failed.map((r) => r.id).concat(fixRace ? [RACE_JOB] : []);
  if (ids.length > 0) {
    const [res] = await sql.query(
      `UPDATE evaluation_jobs SET status = 'QUEUED', retry_count = 0, error_message = NULL, started_at = NULL, completed_at = NULL, queued_at = NOW()
        WHERE id IN (?)`, [ids]);
    console.log(`Đã đưa ${res.affectedRows} job về hàng đợi.`);
  }
}

console.log(dryRun ? '(dry-run) không ghi gì.' : 'Xong. Worker sẽ chấm trong vài phút.');
await sql.end();
await mongo.close();
