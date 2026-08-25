/**
 * Làm sạch đoạn văn của các đề Reading Part 1 vừa nhập.
 *
 *   node scripts/fix-reading-part1-passage.mjs [--dry-run]
 *
 * 10/66 đề trong file nguồn có `passage` lẫn text giao diện của trang gốc
 * ("Luyện đọc", "Câu hỏi 25 / 66", "Nộp bài", phần mẹo làm bài...) vì bên đó
 * bóc dữ liệu bằng cách quét cả trang. Câu hỏi và đáp án không bị ảnh hưởng.
 *
 * Đoạn văn thật nằm giữa: bắt đầu ở câu chứa ___1___ và kết thúc ở câu chứa
 * ___5___. Script cắt đúng khoảng đó, dựa trên chính các item của đề nên không
 * phụ thuộc vào việc đoán chuỗi rác.
 */

import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';

const READING_PART_1_ID = '16000000-0000-4000-8000-000000000011';
const dryRun = process.argv.includes('--dry-run');

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis',
};

/** Dấu hiệu text giao diện lọt vào đoạn văn. */
const JUNK = /Luyện đọc|Câu hỏi \d+ \s*\/|Trộn câu|Auto shuffle|Xem đáp án|Nộp bài|Bảng điều khiển|Kinh nghiệm làm Part|Tip:/;

/**
 * Cắt đoạn văn thật ra khỏi khối text lẫn giao diện.
 *
 * <p>Mốc đầu lấy từ chính câu hỏi của item 1: bỏ phần chỗ trống đi thì còn
 * mấy chữ đầu câu ("The water is so"), tìm chuỗi đó trong đoạn thô. Không thể
 * dựa vào xuống dòng vì cả khối rác nằm trên một dòng liền với câu đầu.
 *
 * <p>Trả về null nếu không tìm được mốc — thà bỏ qua còn hơn ghi bừa.
 */
function extractPassage(raw, items) {
  const firstPrompt = items[0]?.prompt?.value ?? '';
  // "The water is so ___ and I can see the fish." -> "The water is so"
  const head = firstPrompt.split(/_{2,}/)[0].trim();
  if (head.length < 4) return null;

  const start = raw.indexOf(head);
  if (start < 0) return null;

  const gapCount = items.length;
  const lastIdx = raw.search(new RegExp(`___\\s*${gapCount}\\s*___`));
  if (lastIdx < 0) return null;

  // Kết thúc ở cuối câu chứa chỗ trống cuối: dấu . ? ! đầu tiên sau nó.
  const tail = raw.slice(lastIdx);
  const endOfSentence = tail.search(/[.?!]/);
  const end = endOfSentence < 0 ? raw.length : lastIdx + endOfSentence + 1;

  return raw.slice(start, end).trim();
}

async function main() {
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

  const all = await docs
    .find({ partId: READING_PART_1_ID, 'sourceRef.provider': 'aptisprep' })
    .toArray();

  const dirty = all.filter((d) => JUNK.test(d.stimulus?.value ?? '') || JUNK.test(d.title ?? ''));
  console.log(`Tổng ${all.length} đề, cần sửa ${dirty.length}.`);

  let fixed = 0;
  for (const doc of dirty) {
    const raw = doc.stimulus?.value ?? '';
    const passage = extractPassage(raw, doc.items ?? []);

    if (!passage) {
      console.log(`  ! ${doc.questionSetId}: không tìm được mốc chỗ trống, BỎ QUA`);
      continue;
    }

    // Tiêu đề lấy câu đầu của đoạn văn, thay dấu chỗ trống bằng "..." cho gọn.
    const firstLine = passage.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
    const title = `${firstLine
      .replace(/_{2,}\s*\d*\s*_*/g, '…')
      .replace(/\s+/g, ' ')
      .replace(/[,:]$/, '')
      .trim()
      .slice(0, 80)} (2026)`;

    console.log(`  + ${doc.questionSetId}`);
    console.log(`      title: ${title}`);
    console.log(`      passage: ${passage.slice(0, 90).replace(/\n/g, ' ')}…`);

    if (!dryRun) {
      await docs.updateOne(
        { _id: doc._id },
        { $set: { 'stimulus.value': passage, title, updatedAt: new Date() } },
      );
      await sql.execute(
        `UPDATE question_sets SET title = ?, updated_at = NOW() WHERE id = ?`,
        [title, doc.questionSetId],
      );
    }
    fixed += 1;
  }

  console.log(`\n${dryRun ? '(dry-run) Sẽ sửa' : 'Đã sửa'} ${fixed}/${dirty.length} đề.`);
  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
