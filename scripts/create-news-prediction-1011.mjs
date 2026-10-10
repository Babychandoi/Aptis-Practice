/**
 * Đăng bài bảng tin "Dự đoán đề thi 11/10/2026" và gắn đề để bấm làm ngay.
 *
 *   node scripts/create-news-prediction-1011.mjs [--dry-run]
 *
 * Nội dung bài do mình viết lại từ bản dự đoán (không chép nguyên văn nguồn).
 * Đề gắn vào bài lấy từ chính các mục trong bảng exam_predictions ngày 2026-10-06:
 * mỗi mục chọn một đề đang PUBLISHED. Writing gắn đề thi thử đủ 4 phần theo câu lạc bộ.
 * Bài 10/10 được bỏ ghim để bài mới nổi lên đầu bảng tin. Đề gắn vào bài ưu tiên
 * những bộ CHƯA có ở các bài 07/10, 09/10 và 10/10, để học viên có đề mới để làm; hết đề mới của một
 * mục thì mới dùng lại đề cũ. Chạy lại không tạo bài thứ hai (nhận biết theo slug).
 */

import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

// Bản 11/10 nếu đã nhập; chưa có thì lùi về các bản trước (nội dung gần như trùng nhau).
const PREDICT_DATES = ['2026-10-11', '2026-10-10', '2026-10-09', '2026-10-06'];
const OLDER_SLUGS = ['du-doan-de-thi-ngay-7-10-nhung-chu-de-nen-on-truoc', 'du-doan-de-thi-ngay-9-10-chu-de-ra-nhieu-can-on-ky'];
const PREVIOUS_SLUG = 'du-doan-de-thi-ngay-10-10-ban-cap-nhat-moi-nhat';
const SLUG = 'du-doan-de-thi-ngay-11-10-cap-nhat-truoc-ngay-thi';
const TITLE = 'Dự đoán đề thi ngày 11/10: cập nhật chủ đề trước ngày thi';
const EXCERPT = 'Cập nhật dự đoán cho kỳ thi 11/10 ở Reading, Listening, Writing và Speaking, kèm bộ đề luyện đúng chủ đề để bấm làm ngay.';
const dryRun = process.argv.includes('--dry-run');

/** Chọn bao nhiêu mục cho mỗi nhóm để bài không biến thành danh sách vô tận. */
const PICKS = [
  { comp: 'READING', part: 'PART_3', labels: ['Game from childhood', 'Free time Activity', 'Volunteering', 'Extreme sports', 'Job and training', 'Music Festival'] },
  { comp: 'READING', part: 'PART_4', labels: ['Four-day work week', 'Mountain summits', 'Women mathematicians'] },
  { comp: 'READING', part: 'PART_2', labels: ['Famous Singer', 'New coffee shop', 'History of transportation', 'The First woman in space'] },
  { comp: 'LISTENING', part: 'PART_2', labels: ['Travel to work', 'The place to run', 'Listening to music', 'Protect the environment'] },
  { comp: 'LISTENING', part: 'PART_3', labels: ['The Internet', 'Urban farming', 'Change in the workplace', 'Homeschooling', 'Actors'] },
  { comp: 'LISTENING', part: 'PART_4', labels: ['Camera', 'Work from home', 'Sport competition', 'Importance of sleep', 'Musician’s life'] },
  {
    comp: 'SPEAKING',
    part: 'PART_2',
    labels: ['Leo núi / đi bộ đường dài', 'Đi rừng / dạo thiên nhiên', 'Tập gym / thể thao', 'Học nhóm', 'Dùng thiết bị điện tử / máy tính', 'Đọc sách báo', 'Trang trí nhà cửa / dọn nhà'],
  },
  { comp: 'SPEAKING', part: 'PART_4', labels: ['Lần vượt qua khó khăn'] },
];

/** Đề thi thử Writing theo câu lạc bộ (mã MOCK_WRITING_CLUB_xxx). */
const WRITING_MOCKS = ['003', '010', '017', '027', '026', '025', '024', '030', '005', '006', '008', '014'];

const BODY = `Đây là bản cập nhật cuối trước kỳ thi ngày **11/10**. So với bài 10/10, danh sách gần như không đổi, chỉ có hai điều chỉnh nhỏ: ở Listening, **chủ đề diễn viên (*Actors*) chuyển sang nhóm hội thoại Part 3**, và ở Speaking Part 4, **thêm dạng đề "một lần bạn giúp ai đó"** vào nhóm xã hội. Nếu bạn đã ôn theo các bài trước thì chỉ cần bổ sung hai chỗ này.

Hãy xem đây là **bản ước lượng theo tần suất**, không phải đề chính thức. Cách dùng hợp lý là xếp thứ tự ôn: chủ đề nào xuất hiện nhiều thì luyện trước, các chủ đề còn lại để dành thời gian sau.

Cuối bài có bộ đề luyện đúng các chủ đề này, bấm vào là làm được ngay.

## Reading

**Part 4 (ghép tiêu đề với đoạn văn)** — ba bài thường gặp: *Four-day work week*, *Mountain summits*, *Women mathematicians*. Mỗi đoạn thường có một câu chốt ý. Hãy tập gạch câu đó trước, rồi mới đối chiếu với danh sách tiêu đề.

**Part 3 (ghép ý kiến với người nói)** — sáu chủ đề nên luyện trước:

- Thể thao mạo hiểm (*Extreme sports*)
- Trò chơi thuở nhỏ (*Game from childhood*)
- Hoạt động khi rảnh (*Free time Activity*)
- Làm tình nguyện (*Volunteering*)
- Công việc và đào tạo (*Job and training*)
- Lễ hội âm nhạc (*Music Festival*)

**Part 2 (xếp câu thành đoạn)** — độ chắc chắn thấp hơn, dùng làm phần ôn thêm: ngày cuối tuần, phim, cuối kỳ, ca sĩ nổi tiếng, ngày đón tân sinh viên, quán cà phê mới, lịch sử phương tiện giao thông, nữ phi hành gia đầu tiên, ngày hội thể thao của gia đình.

## Listening

**Part 2** — đề tài gần gũi: đi làm, chỗ chạy bộ, nghe nhạc, tập thể dục, giữ gìn môi trường, thói quen học, mua hàng trên mạng, máy tính, sinh hoạt ngoài trời, đọc sách.

**Part 3** — các đoạn hội thoại về Internet, thiết kế khu dân cư, trồng trọt trong thành phố, thay đổi ở nơi làm việc, chính trị, nghệ thuật, công nghệ thông tin, học tại nhà, trung tâm văn hoá địa phương, ca sĩ và âm nhạc, làm việc từ xa, **diễn viên (chuyển từ Part 2 sang)**.

**Part 4** — phần khó đoán nhất, nên hãy coi đây là danh sách tham khảo: chiến dịch quảng bá, **camera**, giải đấu thể thao, bí ý tưởng khi viết lách, podcast, ngủ đủ giấc, quy hoạch phát triển khu vực, tác giả và tiểu thuyết mới, sống chuyên nghiệp nơi công sở, cuộc sống sau đại học, nghỉ giữa kỳ học, đời sống nhạc sĩ, nghiên cứu về hạnh phúc.

Mẹo cho Part 4: đọc câu hỏi trước khi nghe, chỉ ghi *từ khoá* chứ đừng chép cả câu, vì đoạn nghe khá dài.

## Writing

Câu lạc bộ có khả năng ra cao: Travel, Community, Food, Music, Museum, Debate, Car, Art, Sports, Social, Reading, Computer, Film, Fashion, Book, English, Photography.

Mức vừa: Television, Home Living, Technology, Gardening, Cooking, Beautiful Home, Science, Business, Language, Fitness.

Đừng cố học hết. Bốn phần Writing có khuôn giống nhau ở mọi câu lạc bộ, nên chọn **3–4 câu lạc bộ** bạn dễ viết nhất và luyện cho thật mượt. Các đề thi thử bên dưới đi trọn bốn phần, và là những câu lạc bộ khác với bài 7/10 để bạn có thêm đề mới.

## Speaking

**Part 1** — hỏi về bản thân: nơi ở, gia đình, bạn bè, sinh nhật, mùa yêu thích, đặc sản quê nhà, sở thích, kế hoạch trong ngày, đi lại, một ngày bình thường, bữa ăn thường ngày, hôm nay mặc gì. Ngoài ra là giải trí (sách, nghệ sĩ, thể thao, phim, con vật) và vài câu chung như địa danh nổi tiếng, trường cũ, chuyến đi gần đây, thời tiết.

**Part 2 (tả tranh)** — hai nhóm hay gặp:

- *Hoạt động:* leo núi, đi rừng, mua sắm, tập gym, dạo thiên nhiên, chơi game, học nhóm, dùng thiết bị điện tử, xem tranh, đọc báo, xem phim, nghe nhạc nơi công cộng, quán cà phê.
- *Gia đình:* nấu ăn, bữa ăn, trang trí nhà, mẹ đọc sách cho con, trẻ chơi đồ chơi.

**Part 3 (so sánh hai lựa chọn)** — thư viện hay quán cà phê, làm ở nhà hay ở văn phòng, làm một mình hay theo nhóm, học trong lớp hay học ngoài thực tế, đọc sách hay chơi game, ăn lành mạnh hay đồ ăn nhanh, nghe nhạc ở sân khấu hay bằng tai nghe, chợ hay siêu thị, nhà cổ hay nhà tiện nghi, nhà cao tầng hay nhà riêng, ở cùng gia đình hay ở một mình, nông thôn hay thành phố, các loại phương tiện, các nghề, môn thể thao trong nhà và ngoài trời, các mùa, sa mạc và vùng tuyết, các loài vật.

**Part 4 (kể trải nghiệm)** — đề dạng "một lần bạn…": giúp đỡ ai đó, tự tin, gặp người mới, đọc sách hay, cho mượn đồ, thuyết trình, trò chuyện vui, nhận tin tốt, thư giãn, tự thử thách, vội vã, chịu trách nhiệm, đổi thói quen, thử điều mới, đến nơi lạ, vượt qua khó khăn, chọn lựa khó, chờ đợi lâu, đứng trước thiên nhiên, chuyến đi xa, khác biệt giữa các thế hệ, đạt thành tựu, gặp người gây ấn tượng, làm điều không thích, tặng hoặc nhận quà, dự sự kiện, làm từ thiện, không mua được món cần. Dự phòng: mua đồ đắt, mặc đồ trang trọng, tiết kiệm tiền, đổi việc hoặc đổi trường.

Với Part 4, thay vì học thuộc từng câu, hãy có sẵn **một khung kể** gồm bối cảnh, diễn biến, cảm xúc và điều học được. Khung này dùng được cho gần như mọi đề.

## Kế hoạch ôn gợi ý

1. Bắt đầu với kỹ năng bạn thấy yếu nhất, làm hết đề luyện của kỹ năng đó.
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
  `SELECT question_set_id FROM news_post_question_sets WHERE post_id IN (SELECT id FROM news_posts WHERE slug IN (?, ?, ?))`, [...OLDER_SLUGS, PREVIOUS_SLUG]);
const previous = new Set(prevRows.map((x) => x.question_set_id));
for (const group of PICKS) {
  let got = 0;
  for (const label of group.labels) {
    const [rows] = await sql.query(
      `SELECT DISTINCT q.id, q.created_at FROM exam_predictions ep
         JOIN components c ON c.id = ep.component_id AND c.code = ?
         JOIN parts p ON p.id = ep.part_id AND p.code = ?
         JOIN question_sets q ON q.topic_id = ep.topic_id AND q.part_id = ep.part_id AND q.status = 'PUBLISHED'
        WHERE ep.predict_date IN (?, ?, ?, ?) AND ep.label = ?
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
// Bài 10/10 không còn là bản mới nhất: bỏ ghim để bài này nổi lên đầu bảng tin.
await sql.execute(`UPDATE news_posts SET pinned = 0, updated_at = NOW() WHERE slug = ?`, [PREVIOUS_SLUG]);
console.log(`\nĐã đăng bài ${SLUG}: ${setIds.length} bộ đề + ${mocks.length} đề thi thử.`);
await sql.end();
