/**
 * Bổ sung chủ đề Speaking cho Dự đoán đề 06/10/2026 theo danh sách của website.
 *
 *   node scripts/add-speaking-prediction-topics.mjs [--dry-run]
 *
 * Website liệt kê các hoạt động Part 2 ("Leo núi, Đi rừng, tập gym, học nhóm, ...")
 * nhưng dự đoán Speaking của mình chỉ có 4 chủ đề Part 2, và nhiều đề Part 2 chưa
 * gắn chủ đề nào (11 đề mới nhập hôm nay + 21 đề cũ). Script này:
 *
 *   1. tạo chủ đề mới cho các hoạt động còn thiếu;
 *   2. gắn vào đó các đề Part 2 CHƯA có chủ đề, chọn đích danh theo câu hỏi 2
 *      của đề (ảnh và câu hỏi đã được xem tay, không đoán tự động);
 *   3. thêm mục tương ứng vào bản dự đoán 06/10/2026.
 *
 * Một đề chỉ gắn được một chủ đề nên script không bao giờ đổi chủ đề đã có:
 * đề đã có chủ đề thì bỏ qua. Chạy lại không nhân đôi.
 */

import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const PREDICT_DATE = '2026-10-06';
const SOURCE = 'Aptistest.edu.vn (kỳ thi 07/10/2026)';
const SPEAKING_PART_2 = '16000000-0000-4000-8000-000000000032';
const SPEAKING_PART_4 = '16000000-0000-4000-8000-000000000034';
const dryRun = process.argv.includes('--dry-run');

/** Mỗi nhóm: tên chủ đề dự đoán + câu hỏi 2 của các đề cần gắn (nhận diện đề). */
const NEW_TOPICS = [
  { name: 'Leo núi / đi bộ đường dài', sets: ['When was the last time you went somewhere with your friends?'] },
  { name: 'Đi rừng / dạo thiên nhiên', sets: ['What outdoor activities do you like to do with your family or friends?', 'Tell me about a time when you made a plan'] },
  { name: 'Tập gym / thể thao', sets: ['When should people exercise?', 'What are the health benefits of participating in sports?'] },
  { name: 'Học nhóm', sets: ['Tell me about a time when you studied with other people'] },
  { name: 'Dùng thiết bị điện tử / máy tính', sets: ['What is your experience of using a computer?'] },
  { name: 'Đọc sách báo', sets: ['What kind of things do you enjoy reading?', 'Do you often read newspapers?'] },
  { name: 'Trang trí nhà cửa / dọn nhà', sets: ['Do you like decorating your home?', 'When was the last time you decorated your room?', 'Do you like things to be tidy?'] },
];

/** Chủ đề đã có trong dự đoán: gắn thêm đề cùng nội dung vào đó. */
const EXISTING_TOPICS = [
  {
    partId: SPEAKING_PART_2,
    name: 'Gia đình sinh hoạt cùng nhau (ăn uống, nấu ăn, xem TV)',
    sets: ['Have you ever helped someone cook?', 'What do you have for breakfast?', 'Tell me the last time you went to a restaurant with your friends?'],
  },
  { partId: SPEAKING_PART_4, name: 'Lần vượt qua khó khăn', sets: ['Tell me about a time when you overcame a difficulty'] },
];

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const slug = (v) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
const docs = mongo.db().collection('question_set_documents');

/** Tìm id đề (đang PUBLISHED, đúng Part) có một câu hỏi chứa đoạn text này. */
async function findSet(partId, text) {
  const key = norm(text);
  const found = (await docs.find({ partId }, { projection: { questionSetId: 1, items: 1 } }).toArray())
    .filter((d) => d.items.some((i) => norm(i.prompt?.value).includes(key)));
  return found.map((d) => d.questionSetId);
}

const [[admin]] = await sql.query(`SELECT id FROM users WHERE id IN (SELECT user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code IN ('SUPER_ADMIN','ADMIN')) ORDER BY created_at LIMIT 1`);
const [[speaking]] = await sql.query(`SELECT id FROM components WHERE code = 'SPEAKING'`);
const [[{ maxOrder }]] = await sql.query(
  `SELECT COALESCE(MAX(display_order), 0) AS maxOrder FROM exam_predictions WHERE predict_date = ? AND component_id = ?`, [PREDICT_DATE, speaking.id]);
let order = Number(maxOrder);

async function assign(topicId, partId, sampleTexts, label) {
  let assigned = 0;
  for (const text of sampleTexts) {
    const ids = await findSet(partId, text);
    if (ids.length === 0) { console.log(`    ! không thấy đề: "${text.slice(0, 60)}"`); continue; }
    for (const id of ids) {
      const [[row]] = await sql.query(`SELECT topic_id, status FROM question_sets WHERE id = ?`, [id]);
      if (!row || row.status !== 'PUBLISHED') continue;
      if (row.topic_id) { console.log(`    = bỏ qua (đã có chủ đề): "${text.slice(0, 50)}"`); continue; }
      if (!dryRun) await sql.execute(`UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id = ? AND topic_id IS NULL`, [topicId, id]);
      assigned += 1;
    }
  }
  console.log(`  ${label}: gắn ${assigned} đề`);
}

for (const group of NEW_TOPICS) {
  console.log(`\n[mới] ${group.name}`);
  const code = `sp2-pred-${slug(group.name)}`.slice(0, 100);
  let [[topic]] = await sql.query(`SELECT id FROM topics WHERE code = ?`, [code]);
  if (!topic && !dryRun) {
    const id = randomUUID();
    await sql.execute(`INSERT INTO topics (id, code, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`, [id, code, group.name]);
    topic = { id };
  }
  const topicId = topic?.id ?? 'dry-run';
  await assign(topicId, SPEAKING_PART_2, group.sets, 'đề Part 2');

  const [[exists]] = await sql.query(`SELECT COUNT(*) AS n FROM exam_predictions WHERE predict_date = ? AND component_id = ? AND (part_id <=> ?) AND label = ?`, [PREDICT_DATE, speaking.id, SPEAKING_PART_2, group.name]);
  if (Number(exists.n) === 0) {
    order += 1;
    if (!dryRun) {
      await sql.execute(
        `INSERT IGNORE INTO exam_predictions (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'HOT', ?, 'Part 2', ?, 'PUBLISHED', ?, ?, NOW(), NOW())`,
        [randomUUID(), PREDICT_DATE, topicId, SPEAKING_PART_2, speaking.id, group.name, SOURCE, order, admin.id]);
    }
    console.log(`  + thêm vào dự đoán: ${group.name}`);
  }
}

for (const group of EXISTING_TOPICS) {
  console.log(`\n[đã có] ${group.name}`);
  const [[topic]] = await sql.query(`SELECT id FROM topics WHERE name = ? LIMIT 1`, [group.name]);
  if (!topic) { console.log('  ! không thấy chủ đề này, bỏ qua'); continue; }
  await assign(topic.id, group.partId, group.sets, 'đề gắn thêm');
}

console.log(`\n${dryRun ? '(dry-run) không ghi gì.' : 'Xong.'}`);
await sql.end();
await mongo.close();
