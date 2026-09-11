/**
 * Tách 129 đề Speaking Part 1 khỏi chủ đề gộp "Đời sống hàng ngày".
 *
 * Vì sao cần: Part 1 có 164 đề nhưng 129 đề nhồi chung một chủ đề, nên tab "đề
 * hot nhất" chỉ hiện 14 mục Speaking trong khi mỗi đề thật là một chủ đề riêng
 * (đi lại, mùa yêu thích, sách, đi bộ...). Học viên bấm vào "Đời sống hàng ngày"
 * cũng nhận đề bất kỳ trong 129 đề đó, không chọn được thứ muốn luyện.
 *
 * Khớp theo từ khoá trong tiêu đề. Thứ tự luật QUAN TRỌNG: luật hẹp phải đứng
 * trước luật rộng, vì một tiêu đề khớp nhiều luật thì lấy luật đầu tiên — ví dụ
 * "childhood game" phải bắt trước "childhood", còn "foreign language" trước
 * "English".
 *
 * Dùng:
 *   node scripts/split-speaking-part1-topics.mjs [--dry-run]
 */
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const SPEAKING_PART_1 = '16000000-0000-4000-8000-000000000031';
const GOP_CHUNG = 'Đời sống hàng ngày';

const dryRun = process.argv.includes('--dry-run');

/**
 * [tên chủ đề, các từ khoá]. Luật hẹp trước luật rộng.
 */
const RULES = [
  ['Trò chơi tuổi thơ', ['childhood game', 'favorite childhood', 'favorite game when you were a child', 'game did you enjoy playing']],
  ['Tuổi thơ', ['childhood', 'when you were small']],
  ['Ngoại ngữ', ['foreign language', 'studying languages', 'first foreign language']],
  ['Học tiếng Anh', ['learning english', 'english learning', 'english is the most important', 'english at secondary', 'english is taught', 'english as a school subject', 'why are you learning']],
  ['Từ điển', ['dictionary', 'dictionaries']],
  ['Thư viện', ['library']],
  ['Sách', ['book']],
  ['Phim ảnh', ['film', 'favourite actor', 'favorite actor']],
  ['Truyền hình', ['television', 'tv program', 'watch tv', 'watching tv']],
  ['Âm nhạc', ['music', 'favourite singer', 'favorite singer']],
  ['Nhiếp ảnh', ['photograph']],
  ['Điện thoại di động', ['mobile phone']],
  ['Ngôn ngữ cơ thể', ['body language']],
  ['Màu sắc', ['color', 'colour']],
  ['Tiếng ồn', ['noise']],
  ['Thời tiết', ['weather']],
  ['Mùa yêu thích', ['favorite season', 'favourite season']],
  ['Đi bộ', ['walking']],
  ['Thể thao', ['sport', 'exercise']],
  ['Ăn uống', ['eat', 'food']],
  ['Quán cà phê', ['cafe']],
  ['Tiệc tùng', ['party', 'parties']],
  ['Kỳ nghỉ', ['holiday']],
  ['Chuyến đi', ['journey', 'place would you like to visit']],
  ['Phương tiện đi lại', ['transport', 'travel in your town', 'travel around your country']],
  ['Ngân hàng', ['banking']],
  ['Phỏng vấn', ['interview']],
  ['Công việc', ['your job', 'part-time job']],
  ['Nhà ở', ['house or apartment', 'room you spend', 'favorite room', 'who do you live with']],
  ['Khu phố của bạn', ['neighborhood', 'area of your city', 'part of your city']],
  ['Làng truyền thống', ['traditional village']],
  ['Đi chơi', ['going out', 'go out']],
  ['Quần áo', ['wearing', 'clothes']],
  ['Lịch sinh hoạt', ['afternoon or evening', 'plans for tonight', 'feel tired']],
  ['Giới thiệu bản thân', ['about yourself']],
  ['Kỷ niệm đáng nhớ', ['good memories']],
];

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
});

const [[gop]] = await sql.query('SELECT id FROM topics WHERE name = ? LIMIT 1', [GOP_CHUNG]);
if (!gop) {
  throw new Error(`Không tìm thấy chủ đề "${GOP_CHUNG}"`);
}

const [rows] = await sql.query(
  `SELECT id, title FROM question_sets
   WHERE part_id = ? AND status = 'PUBLISHED' AND topic_id = ?`,
  [SPEAKING_PART_1, gop.id],
);

console.log(`Có ${rows.length} đề đang gộp chung.\n`);

/** Chủ đề của một tiêu đề, hoặc null nếu không luật nào khớp. */
function resolve(title) {
  const text = ` ${String(title ?? '').toLowerCase()} `;
  for (const [topic, keywords] of RULES) {
    if (keywords.some((kw) => text.includes(kw))) {
      return topic;
    }
  }
  return null;
}

// Gom trước để in thống kê, và để biết chủ đề nào chỉ có 1 đề
const byTopic = new Map();
const unmatched = [];
for (const row of rows) {
  const topic = resolve(row.title);
  if (!topic) {
    unmatched.push(row.title);
    continue;
  }
  if (!byTopic.has(topic)) byTopic.set(topic, []);
  byTopic.get(topic).push(row);
}

const sorted = [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [topic, items] of sorted) {
  console.log(`  ${String(items.length).padStart(3)} đề  ${topic}`);
}
console.log(`\nKhông khớp luật nào: ${unmatched.length}`);
for (const title of unmatched) {
  console.log(`    - ${title}`);
}

if (dryRun) {
  console.log('\n(dry-run) chưa ghi gì.');
  await sql.end();
  process.exit(0);
}

// Tạo chủ đề còn thiếu rồi gán
let moved = 0;
for (const [topicName, items] of sorted) {
  let [[topic]] = await sql.query('SELECT id FROM topics WHERE name = ? LIMIT 1', [topicName]);

  if (!topic) {
    const id = randomUUID();
    // Mã sinh từ tên, bỏ dấu — trùng cách các topic sẵn có được đặt
    const code = topicName
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    await sql.query(
      'INSERT INTO topics (id, code, name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [id, `sp1-${code}`.slice(0, 100), topicName],
    );
    topic = { id };
    console.log(`  + tạo chủ đề "${topicName}"`);
  }

  const ids = items.map((item) => item.id);
  const [result] = await sql.query(
    `UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id IN (?)`,
    [topic.id, ids],
  );
  moved += result.affectedRows;
}

console.log(`\nĐã chuyển ${moved} đề sang chủ đề riêng.`);
console.log(`Còn ${unmatched.length} đề giữ nguyên ở "${GOP_CHUNG}".`);

await sql.end();
