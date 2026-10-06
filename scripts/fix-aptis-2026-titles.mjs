/**
 * Sửa tên 30 đề Reading Part 2 (đợt 10/2026) bị đặt chung "Sentence ordering (Version N)".
 *
 *   node scripts/fix-aptis-2026-titles.mjs [--dry-run]
 *
 * Nguồn không có tên đề nên bản nhập đầu đặt tạm theo chủ đề, mà chủ đề cũng
 * trống. Tên mới lấy từ câu mở đầu của đề (nếu file có) hoặc câu đầu tiên theo
 * thứ tự đúng, ví dụ "Richard wanted to improve his handwriting".
 *
 * Chỉ động vào đề có sourceRef.batch = '2026-10' và tên bắt đầu bằng
 * "Sentence ordering", nên chạy lại không ảnh hưởng gì. Cũng sửa luôn mục
 * Cập nhật đề của Reading Part 2 vì mô tả có ghi mẫu tên đề.
 */

import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const READING_PART_2 = '16000000-0000-4000-8000-000000000012';
const dryRun = process.argv.includes('--dry-run');

const norm = (v) => String(v ?? '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Chủ đề viết tay cho từng đề, khoá theo 30 ký tự đầu của câu đúng thứ nhất
 * (đã chuẩn hoá). Không dùng chính câu đó làm tên vì sẽ lộ đáp án câu số 1.
 */
const TOPICS = {
  'liam applied for a scholarship': 'Applying for a scholarship',
  'richard wanted to improve his': 'Improving handwriting',
  'the robotics club designed a': 'A solar-powered car',
  'the city celebrated a histori': 'A historical anniversary',
  'the school introduced a digit': 'Digital attendance system',
  'a biology class conducted a p': 'A plant growth experiment',
  'the beach town prepared for t': 'Tourist season at the beach',
  'the town decided to build a n': 'Building a playground',
  'henry wanted to write his fir': 'Writing a first novel',
  'the bakery introduced a new p': 'A new pastry',
  'the city zoo welcomed a newbo': 'A newborn giraffe',
  'an environmental group organi': 'A beach cleanup',
  'mark volunteered at the commu': 'Volunteering at a food bank',
  'a group of friends planned a': 'A movie night',
  'tom decided to start a small': 'A small vegetable garden',
  'a team of engineers worked on': 'A bridge repair project',
  'a severe drought affected the': 'A severe drought',
  'emma adopted a rescue dog': 'Adopting a rescue dog',
  'a local author visited the sc': "An author's school visit",
  'a science team planned to stu': 'A scientific island trip',
  'the library introduced a digi': 'Digital library borrowing',
  'sarah started a daily meditat': 'A daily meditation routine',
  'the new company started offer': 'Eco-friendly products',
  'the wildlife rescue center ca': 'Caring for an injured fox',
  'the research team developed a': 'Developing a smartphone app',
  'james wanted to build his own': 'Building a computer',
  'the river near the town began': 'A rising river',
  'olivia planned a surprise bir': 'A surprise birthday party',
  'the company upgraded its comp': 'Upgrading computer systems',
  'the town hosted an annual cul': 'An annual cultural festival',
};
const titleFrom = (sentence, fallback) => {
  const n = norm(sentence);
  return Object.entries(TOPICS).find(([prefix]) => n.startsWith(prefix.trim()))?.[1] ?? fallback;
};

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

const used = new Set((await docs.find({ partId: READING_PART_2 }, { projection: { title: 1 } }).toArray()).map((d) => norm(d.title)));
const targets = await docs
  .find({ partId: READING_PART_2, 'sourceRef.batch': '2026-10', title: /^Sentence ordering/ })
  .sort({ createdAt: 1 })
  .toArray();
console.log(`Đề cần đổi tên: ${targets.length}`);

const renamed = [];
for (const doc of targets) {
  const item = doc.items[0];
  const byId = new Map(item.options.map((o) => [o.id, o.content]));
  const lead = /Câu mở đầu: (.+)$/m.exec(doc.stimulus?.value ?? '')?.[1];
  const first = lead || byId.get(item.answerKey.orderedOptionIds[0]);
  const base = titleFrom(first, 'Sentence ordering');
  let title = base;
  for (let v = 2; used.has(norm(title)); v += 1) title = `${base} (Version ${v})`;
  used.add(norm(title));
  renamed.push(title);
  console.log(`  ${doc.title}  ->  ${title}`);
  if (dryRun) continue;
  await sql.execute(`UPDATE question_sets SET title = ?, updated_at = NOW() WHERE id = ?`, [title, doc.questionSetId]);
  await docs.updateOne(
    { _id: doc._id },
    { $set: { title, 'stimulus.value': doc.stimulus.value.replace(/^Topic: .*/, `Topic: ${title}`), updatedAt: new Date() } },
  );
}

if (!dryRun && renamed.length > 0) {
  const sample = renamed.slice(0, 4).join(', ');
  const description = `Cập nhật ${renamed.length} đề mới Reading Part 2 (sắp xếp câu) (đợt tháng 10/2026), đã phát hành và gắn nhóm đề 2026: ${sample} và nhiều chủ đề khác.`;
  const [result] = await sql.execute(
    `UPDATE content_update_logs SET description = ?, updated_at = NOW()
      WHERE part_id = ? AND label = 'Update Reading' AND log_date = CURDATE()`,
    [description, READING_PART_2],
  );
  console.log(`Mục Cập nhật đề đã sửa: ${result.affectedRows}`);
}

await sql.end();
await mongo.close();
