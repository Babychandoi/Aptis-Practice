/**
 * Đăng bài bảng tin "Dự đoán đề thi 07/10/2026" và gắn đề để bấm làm ngay.
 *
 *   node scripts/create-news-prediction-1007.mjs [--dry-run]
 *
 * Nội dung bài do mình viết lại từ bản dự đoán (không chép nguyên văn nguồn).
 * Đề gắn vào bài lấy từ chính các mục trong bảng exam_predictions ngày 2026-10-06:
 * mỗi mục chọn một đề đang PUBLISHED. Writing gắn đề thi thử đủ 4 phần theo câu lạc bộ.
 * Chạy lại không tạo bài thứ hai (nhận biết theo slug).
 */

import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const PREDICT_DATE = '2026-10-06';
const SLUG = 'du-doan-de-thi-ngay-7-10-nhung-chu-de-nen-on-truoc';
const TITLE = 'Dự đoán đề thi ngày 7/10: những chủ đề nên ôn trước ở cả 4 kỹ năng';
const EXCERPT = 'Danh sách chủ đề có khả năng ra cao ở Reading, Listening, Writing và Speaking cho kỳ thi 7/10, kèm đề luyện đúng chủ đề để bấm làm ngay.';
const dryRun = process.argv.includes('--dry-run');

/** Chọn bao nhiêu mục cho mỗi nhóm để bài không biến thành danh sách vô tận. */
const PICKS = [
  { comp: 'READING', part: 'PART_3', labels: ['Game from childhood', 'Free time Activity', 'Volunteering', 'Extreme sports', 'Job and training', 'Music Festival'] },
  { comp: 'READING', part: 'PART_4', labels: ['Four-day work week', 'Mountain summits', 'Women mathematicians'] },
  { comp: 'READING', part: 'PART_2', labels: ['Famous Singer', 'New coffee shop', 'History of transportation', 'The First woman in space'] },
  { comp: 'LISTENING', part: 'PART_2', labels: ['Travel to work', 'The place to run', 'Listening to music', 'Protect the environment'] },
  { comp: 'LISTENING', part: 'PART_3', labels: ['The Internet', 'Urban farming', 'Change in the workplace', 'Homeschooling'] },
  { comp: 'LISTENING', part: 'PART_4', labels: ['Sport competition', 'Importance of sleep', 'Musician’s life'] },
  {
    comp: 'SPEAKING',
    part: 'PART_2',
    labels: ['Leo núi / đi bộ đường dài', 'Đi rừng / dạo thiên nhiên', 'Tập gym / thể thao', 'Học nhóm', 'Dùng thiết bị điện tử / máy tính', 'Đọc sách báo', 'Trang trí nhà cửa / dọn nhà'],
  },
  { comp: 'SPEAKING', part: 'PART_4', labels: ['Lần vượt qua khó khăn'] },
];

/** Đề thi thử Writing theo câu lạc bộ (mã MOCK_WRITING_CLUB_xxx). */
const WRITING_MOCKS = ['001', '019', '035', '033', '009', '037', '029', '034', '004', '032', '002', '036'];

const BODY = `Kỳ thi ngày **7/10** sắp tới, và dưới đây là những chủ đề mà nhiều người đi thi gần đây nhắc tới nhiều nhất. Đây là **dự đoán dựa trên tần suất**, không phải đề chính thức: dùng nó để quyết định ôn gì trước, đừng bỏ hẳn các chủ đề còn lại.

Mỗi kỹ năng bên dưới đều có đề luyện đúng chủ đề ở cuối bài. Bấm vào là làm được ngay.

## Reading

Reading là kỹ năng dễ "ăn chắc" nhất nếu bạn nhận ra chủ đề sớm, vì vốn từ của mỗi chủ đề khá lặp lại.

**Part 4 (ghép tiêu đề cho từng đoạn)** — ba bài được nhắc nhiều: *Four-day work week*, *Mountain summits*, *Women mathematicians*. Khi ôn, đừng đọc để hiểu hết từng chữ. Hãy tập tìm câu chủ đề của mỗi đoạn rồi so với tiêu đề.

**Part 3 (ghép ý kiến với người nói)** — sáu chủ đề đáng ưu tiên:

- Trò chơi thời thơ ấu (*Game from childhood*)
- Hoạt động lúc rảnh (*Free time Activity*)
- Tình nguyện (*Volunteering*)
- Thể thao mạo hiểm (*Extreme sports*)
- Việc làm và đào tạo (*Job and training*)
- Lễ hội âm nhạc (*Music Festival*)

**Part 2 (sắp xếp câu thành đoạn)** — nhóm này ít chắc chắn hơn, nên coi là phần ôn thêm: cuối tuần, phim ảnh, cuối học kỳ, ca sĩ nổi tiếng, ngày chào đón tân sinh viên, quán cà phê mới, lịch sử giao thông, người phụ nữ đầu tiên bay vào không gian, ngày hội thể thao gia đình.

## Listening

**Part 2** — các chủ đề đời thường, nghe một lần là bắt được ý chính: diễn viên, đi làm bằng gì, nơi chạy bộ, nghe nhạc, tập thể dục, bảo vệ môi trường, thói quen học, mua sắm trực tuyến, máy tính, hoạt động ngoài trời, đọc sách.

**Part 3** — hội thoại ngắn về: Internet, thiết kế cộng đồng, nông nghiệp đô thị, thay đổi nơi làm việc, chính trị, nghệ thuật, công nghệ thông tin, học tại nhà, trung tâm văn hoá địa phương, âm nhạc và ca sĩ, làm việc từ xa.

**Part 4** — phần này khó đoán nhất nên mức tin cậy thấp hơn. Những bài hay xuất hiện: chiến dịch quảng bá, giải đấu thể thao, bí ý tưởng khi viết, podcast, giấc ngủ, kế hoạch phát triển vùng, đời sống nhạc sĩ, nghiên cứu về hạnh phúc.

Mẹo cho Part 4: đọc kỹ câu hỏi trước khi nghe, và ghi chú *từ khoá*, không ghi cả câu.

## Writing

Danh sách câu lạc bộ có khả năng ra cao: Travel, Community, Food, Music, Museum, Debate, Car, Art, Sports, Social, Reading, Computer, Film, Fashion, Book, English, Photography.

Nhóm mức vừa: Television, Home Living, Technology, Gardening, Cooking, Beautiful Home, Science, Business, Language, Fitness.

Bạn không cần ôn hết. Chọn **3–4 câu lạc bộ** quen thuộc nhất với cuộc sống của mình, viết thật trơn tru, vì cấu trúc bốn phần giống nhau ở mọi câu lạc bộ. Phần đề luyện bên dưới là đề thi thử trọn bốn phần.

## Speaking

**Part 1** — câu hỏi cá nhân quen thuộc: nơi ở, gia đình, bạn bè, sinh nhật, mùa yêu thích, sở thích, lịch trình trong ngày, đi lại, trang phục hôm nay; thêm giải trí (sách, phim, ca sĩ, thể thao) và chuyện chung như trường cũ, chuyến đi gần nhất, thời tiết.

**Part 2 (mô tả tranh)** — tranh thường rơi vào hai nhóm:

- *Hoạt động:* leo núi, đi rừng, mua sắm, tập gym, dạo thiên nhiên, chơi game, học nhóm, dùng thiết bị điện tử, xem tranh, đọc báo, xem phim, nghe nhạc nơi công cộng, ngồi quán cà phê.
- *Gia đình:* nấu ăn, ăn uống, trang trí nhà, mẹ đọc sách cho con, trẻ chơi đồ chơi.

**Part 3 (so sánh)** — các cặp hay gặp: thư viện và quán cà phê, làm việc ở nhà và ở văn phòng, làm một mình và làm nhóm, đọc sách và chơi game, ăn lành mạnh và ăn nhanh, chợ và siêu thị, nông thôn và thành phố, sống một mình và sống với gia đình, nhà cổ và nhà tiện nghi, ngoài trời và trong nhà, mùa này và mùa kia.

**Part 4 (kể trải nghiệm)** — chủ đề kiểu "lần bạn…": tự tin, gặp bạn mới, thuyết trình, nhận tin vui, vượt qua khó khăn, thử điều mới, đi nơi mới, đưa ra lựa chọn khó, tặng hoặc nhận quà, làm từ thiện, đạt thành tựu. Dự phòng: khoảng cách thế hệ, mua món đồ đắt, tiết kiệm tiền, đổi công việc hoặc trường học.

Mẹo chung cho Part 4: chuẩn bị **một khung kể chuyện** (bối cảnh, chuyện xảy ra, cảm xúc, bài học) dùng được cho mọi đề, thay vì học thuộc từng câu.

## Cách dùng bài này

1. Chọn kỹ năng bạn yếu nhất và làm hết đề luyện ở mục đó trước.
2. Với mỗi đề, làm xong hãy xem lại phần giải thích, ghi lại 3–5 từ hoặc cụm mới.
3. Hai ngày cuối, chỉ ôn lại từ đã ghi, đừng mở thêm chủ đề mới.

Chúc bạn thi tốt.
`;

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
  charset: 'utf8mb4',
});

const [[dup]] = await sql.query(`SELECT COUNT(*) AS n FROM news_posts WHERE slug = ?`, [SLUG]);
if (Number(dup.n) > 0) {
  console.log('Bài đã tồn tại, bỏ qua.');
  await sql.end();
  process.exit(0);
}

// Gom đề: mỗi mục dự đoán lấy một đề đang PUBLISHED, bộ nào cũ nhất trước để không đổi giữa các lần chạy.
const setIds = [];
const seen = new Set();
for (const group of PICKS) {
  let got = 0;
  for (const label of group.labels) {
    const [rows] = await sql.query(
      `SELECT q.id FROM exam_predictions ep
         JOIN components c ON c.id = ep.component_id AND c.code = ?
         JOIN parts p ON p.id = ep.part_id AND p.code = ?
         JOIN question_sets q ON q.topic_id = ep.topic_id AND q.part_id = ep.part_id AND q.status = 'PUBLISHED'
        WHERE ep.predict_date = ? AND ep.label = ?
        ORDER BY q.created_at, q.id`,
      [group.comp, group.part, PREDICT_DATE, label]);
    const pick = rows.map((r) => r.id).find((id) => !seen.has(id));
    if (!pick) { console.log(`  ! không có đề: ${group.comp} ${group.part} - ${label}`); continue; }
    seen.add(pick);
    setIds.push(pick);
    got += 1;
  }
  console.log(`${group.comp} ${group.part}: ${got}/${group.labels.length} đề`);
}

const [mocks] = await sql.query(
  `SELECT id, name FROM test_blueprints WHERE status = 'PUBLISHED' AND code IN (${WRITING_MOCKS.map(() => '?').join(',')})`,
  WRITING_MOCKS.map((n) => `MOCK_WRITING_CLUB_${n}`));
console.log(`Writing: ${mocks.length}/${WRITING_MOCKS.length} đề thi thử`);

if (dryRun) {
  console.log(`\n(dry-run) sẽ gắn ${setIds.length} bộ đề và ${mocks.length} đề thi thử.`);
  await sql.end();
  process.exit(0);
}

const [[admin]] = await sql.query(
  `SELECT id FROM users WHERE id IN (SELECT user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code IN ('SUPER_ADMIN','ADMIN')) ORDER BY created_at LIMIT 1`);
const postId = randomUUID();
await sql.execute(
  `INSERT INTO news_posts (id, slug, title, excerpt, body, status, pinned, comments_enabled, comments_moderated, view_count, published_at, created_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, 'PUBLISHED', 1, 1, 0, 0, NOW(), ?, NOW(), NOW())`,
  [postId, SLUG, TITLE, EXCERPT, BODY, admin.id]);
for (const [i, id] of setIds.entries()) {
  await sql.execute(`INSERT INTO news_post_question_sets (post_id, question_set_id, display_order) VALUES (?, ?, ?)`, [postId, id, i + 1]);
}
for (const [i, m] of mocks.entries()) {
  await sql.execute(`INSERT INTO news_post_blueprints (post_id, blueprint_id, label, display_order) VALUES (?, ?, ?, ?)`, [postId, m.id, m.name.replace(/^Thi thử Writing - /, 'Writing · '), i + 1]);
}
console.log(`\nĐã đăng bài ${SLUG}: ${setIds.length} bộ đề + ${mocks.length} đề thi thử.`);
await sql.end();
