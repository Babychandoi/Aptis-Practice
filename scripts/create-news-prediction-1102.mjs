/**
 * Đăng bài bảng tin "Dự đoán đề thi 02/11/2026" và gắn đề để bấm làm ngay.
 *
 *   node scripts/create-news-prediction-1102.mjs [--dry-run]
 *
 * Nội dung bài do mình viết lại từ bản dự đoán (không chép nguyên văn nguồn).
 * Đề gắn vào bài lấy từ chính các mục trong bảng exam_predictions ngày 2026-10-06:
 * mỗi mục chọn một đề đang PUBLISHED. Writing gắn đề thi thử đủ 4 phần theo câu lạc bộ.
 * Bài 31/10 được bỏ ghim để bài mới nổi lên đầu bảng tin. Đề gắn vào bài ưu tiên
 * những bộ CHƯA có ở các bài 07/10, 09/10 và 10/10, để học viên có đề mới để làm; hết đề mới của một
 * mục thì mới dùng lại đề cũ. Chạy lại không tạo bài thứ hai (nhận biết theo slug).
 */

import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

// Bản 11/10 nếu đã nhập; chưa có thì lùi về các bản trước (nội dung gần như trùng nhau).
const PREDICT_DATES = ['2026-11-02', '2026-10-31', '2026-10-28'];
const PREVIOUS_SLUG = 'du-doan-de-thi-ngay-31-10-cap-nhat-moi-nhat-truoc-ngay-thi';
const SLUG = 'du-doan-de-thi-ngay-2-11-them-walking-garden-va-cong-nghe';
const TITLE = 'Dự đoán đề thi ngày 2/11: thêm Walking, Garden và công nghệ thông tin';
const EXCERPT = 'Cập nhật dự đoán cho kỳ thi 2/11 ở Reading, Listening, Writing và Speaking, kèm bộ đề luyện đúng chủ đề để bấm làm ngay.';
const dryRun = process.argv.includes('--dry-run');

/** Chọn bao nhiêu mục cho mỗi nhóm để bài không biến thành danh sách vô tận. */
const PICKS = [
  { comp: 'READING', part: 'PART_3', labels: ['Game from childhood', 'Free time Activity', 'Volunteering', 'Extreme sports', 'Job and training', 'Music Festival'] },
  { comp: 'READING', part: 'PART_4', labels: ['Four-day work week', 'Mountain summits', 'Women mathematicians'] },
  { comp: 'READING', part: 'PART_2', labels: ['The First woman in space', 'Famous Singer', 'New coffee shop', 'History of transportation'] },
  { comp: 'LISTENING', part: 'PART_2', labels: ['Visit a museum', 'Travel to work', 'The place to run', 'Protect the environment'] },
  { comp: 'LISTENING', part: 'PART_3', labels: ['Information Technology', 'University Technology', 'Environmental program', 'Urban farming', 'Homeschooling', 'Actors'] },
  { comp: 'LISTENING', part: 'PART_4', labels: ['Camera', 'A book about scientists', 'Making Plan', 'A guide book', 'Managing financial spending', 'Importance of sleep'] },
  {
    comp: 'SPEAKING',
    part: 'PART_2',
    labels: ['Leo núi / đi bộ đường dài', 'Đi rừng / dạo thiên nhiên', 'Tập gym / thể thao', 'Học nhóm', 'Dùng thiết bị điện tử / máy tính', 'Đọc sách báo', 'Trang trí nhà cửa / dọn nhà'],
  },
  { comp: 'SPEAKING', part: 'PART_4', labels: ['Lần vượt qua khó khăn'] },
];

/** Đề thi thử Writing theo câu lạc bộ (mã MOCK_WRITING_CLUB_xxx). */
const WRITING_MOCKS = ['016', '030', '007', '017', '027', '012', '034', '022', '029', '035', '033', '019'];

const BODY = `Đây là bản dự đoán cập nhật cho kỳ thi ngày **2/11**. So với bài 31/10, danh sách gần như không đổi, chỉ có ba điểm mới: ở **Writing** hai câu lạc bộ **Walking** (đi bộ) và **Garden** (làm vườn) được đưa lên nhóm ưu tiên cao, và ở **Listening Part 3** có thêm chủ đề **công nghệ thông tin**. Nếu bạn đã ôn theo các bài trước thì chỉ cần bổ sung phần này.

Hãy xem đây là **ước lượng theo tần suất**, không phải đề chính thức: chủ đề nào xuất hiện nhiều thì luyện trước, phần còn lại để dành thời gian sau.

Cuối bài có bộ đề luyện đúng các chủ đề này, bấm vào là làm được ngay.

## Reading

**Part 4 (ghép tiêu đề với đoạn văn)** — ba bài giữ nguyên: *Four-day work week*, *Mountain summits*, *Women mathematicians*. Mỗi đoạn thường có một câu chốt ý, hãy tập tìm câu đó trước khi nhìn danh sách tiêu đề.

**Part 3 (ghép ý kiến với người nói)** — thể thao mạo hiểm, trò chơi thuở nhỏ, hoạt động khi rảnh, làm tình nguyện, công việc và đào tạo, lễ hội âm nhạc.

**Part 2 (xếp câu thành đoạn)** — lần này **người phụ nữ Mỹ đầu tiên bay vào không gian** vẫn nằm trong nhóm cần ôn. Nhóm ôn thêm: hoạt động cuối tuần, phim, cuối học kỳ, ca sĩ nổi tiếng, ngày hội thể thao gia đình, ngày đón tân sinh viên, quán cà phê mới, lịch sử phương tiện giao thông.

## Listening

**Part 2** — đi làm, thăm bảo tàng, chỗ chạy bộ, nghe nhạc, tập thể dục, bảo vệ môi trường, thói quen học, mua hàng trên mạng, sinh hoạt ngoài trời, đọc sách.

**Part 3** — chính trị, **công nghệ thông tin (mới)**, học tại nhà, trồng trọt trong thành phố, Internet, diễn viên, thiết kế khu dân cư, thay đổi ở nơi làm việc, nghệ thuật, công nghệ ở đại học, chương trình môi trường.

**Part 4** — phần khó đoán nhất nên coi là danh sách tham khảo: ngủ đủ giấc, sách về nhà khoa học, lập kế hoạch, kịch bản phim, podcast, chiến dịch quảng bá sản phẩm, hai nhà văn, sách hướng dẫn, kế hoạch phát triển khu vực, tiểu thuyết mới ra mắt và lời chê bai về nó, nghiên cứu về hạnh phúc, quản lý chi tiêu, và camera.

Mẹo cho Part 4: đọc câu hỏi trước khi nghe, chỉ ghi *từ khoá* chứ đừng chép cả câu.

## Writing

Ưu tiên cao: Social, Business, Fitness, English, Sports, **Walking, Garden**.

Mức vừa: Television, Home Living, Technology, Cooking, Beautiful Home, Science, Language, Music, Museum, Food, Debate, Car, Art, Reading, Computer, Film, Fashion, Book, Photography.

Bốn phần Writing có khuôn giống nhau ở mọi câu lạc bộ, nên hãy luyện kỹ bảy câu lạc bộ ưu tiên cao trước, rồi chọn thêm vài câu lạc bộ quen thuộc ở nhóm vừa. Các đề thi thử bên dưới đi trọn bốn phần.

## Speaking

**Part 1** — nơi ở, gia đình, bạn bè, sinh nhật, mùa yêu thích, đặc sản quê nhà, sở thích, kế hoạch trong ngày, đi lại, một ngày bình thường, hôm nay mặc gì; giải trí (sách, nghệ sĩ, thể thao, phim, con vật); địa danh nổi tiếng, trường cũ, chuyến đi gần đây, thời tiết.

**Part 2 (tả tranh)** — hoạt động: leo núi, đi rừng, mua sắm, tập gym, dạo thiên nhiên, chơi game, học nhóm, dùng thiết bị điện tử, xem tranh, đọc báo, xem phim, nghe nhạc nơi công cộng, quán cà phê. Gia đình: nấu ăn, bữa ăn, trang trí nhà, mẹ đọc sách cho con, trẻ chơi đồ chơi.

**Part 3 (so sánh hai lựa chọn)** — thư viện hay quán cà phê, làm ở nhà hay ở văn phòng, làm một mình hay theo nhóm, học trong lớp hay học ngoài thực tế, đọc sách hay chơi game, ăn lành mạnh hay đồ ăn nhanh, chợ hay siêu thị, nhà cổ hay nhà tiện nghi, ở cùng gia đình hay ở một mình, nông thôn hay thành phố, các loại phương tiện, các nghề, thể thao trong nhà và ngoài trời, các mùa, sa mạc và vùng tuyết, các loài vật.

**Part 4 (kể trải nghiệm)** — nhận lời khen, đặt câu hỏi, chịu trách nhiệm, đạt thành tựu khi làm việc cùng người khác, nhận phản hồi, giúp hoặc không giúp ai đó, tự tin, gặp người mới, đọc sách hay, cho mượn đồ, thuyết trình, nói chuyện vui, nhận tin tốt, thay đổi thói quen, tự thử thách, vội vã, thử điều mới, vượt qua khó khăn, chờ đợi lâu, đứng trước thiên nhiên, hoạt động mạo hiểm, dùng công nghệ, có nhiều lựa chọn, khác biệt giữa các thế hệ, làm điều không thích, tặng hoặc nhận quà, làm từ thiện, không mua được món cần. Dự phòng: mua đồ đắt, mặc đồ trang trọng, tiết kiệm tiền, đổi việc hoặc đổi trường.

Với Part 4, hãy có sẵn **một khung kể** gồm bối cảnh, diễn biến, cảm xúc và điều học được. Khung này dùng được cho gần như mọi đề.

## Kế hoạch ôn gợi ý

1. Làm hết đề luyện của kỹ năng bạn yếu nhất trước.
2. Sau mỗi đề, đọc phần giải thích và ghi lại 3–5 từ hoặc cụm mới.
3. Những ngày sát kỳ thi chỉ xem lại danh sách từ đã ghi, đừng mở thêm chủ đề mới.

Chúc bạn làm bài thật tốt.
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
// Đề đã gắn ở các bài trước: tránh lặp lại nếu còn bộ khác trong cùng mục.
const [prevRows] = await sql.query(
  `SELECT question_set_id FROM news_post_question_sets`);
const previous = new Set(prevRows.map((x) => x.question_set_id));
for (const group of PICKS) {
  let got = 0;
  for (const label of group.labels) {
    const [rows] = await sql.query(
      `SELECT DISTINCT q.id, q.created_at FROM exam_predictions ep
         JOIN components c ON c.id = ep.component_id AND c.code = ?
         JOIN parts p ON p.id = ep.part_id AND p.code = ?
         JOIN question_sets q ON q.topic_id = ep.topic_id AND q.part_id = ep.part_id AND q.status = 'PUBLISHED'
        WHERE ep.predict_date IN (?, ?, ?) AND ep.label = ?
        ORDER BY q.created_at, q.id`,
      [group.comp, group.part, ...PREDICT_DATES, label]);
    const ids = rows.map((x) => x.id).filter((id) => !seen.has(id));
    const pick = ids.find((id) => !previous.has(id)) ?? ids[0];
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
// Bài 31/10 không còn là bản mới nhất: bỏ ghim để bài này nổi lên đầu bảng tin.
await sql.execute(`UPDATE news_posts SET pinned = 0, updated_at = NOW() WHERE slug = ?`, [PREVIOUS_SLUG]);
console.log(`\nĐã đăng bài ${SLUG}: ${setIds.length} bộ đề + ${mocks.length} đề thi thử.`);
await sql.end();
