/**
 * Gắn topic cho đề Speaking theo chủ đề dự đoán.
 *
 *   node scripts/tag-speaking-topics.mjs [--dry-run]
 *
 * Vì sao cần: cả 153 bộ Speaking Part 1 cũ đều gắn vào MỘT topic duy nhất
 * ("Đời sống hàng ngày") và 120 bộ mới nhập thì chưa gắn topic nào. Lọc theo
 * chủ đề "Nơi bạn sống" vì thế không ra đề nào, dù ngân hàng có đủ.
 *
 * Cách làm: mỗi chủ đề dự đoán có một bộ từ khoá tiếng Anh; đề nào tiêu đề
 * chứa từ khoá thì gắn vào topic đó. Đề không khớp chủ đề nào thì giữ nguyên —
 * thà để trống còn hơn gắn sai, vì gắn sai thì học viên bấm chủ đề A lại ra
 * đề của chủ đề B.
 *
 * Chạy lại được: chỉ ghi khi topic hiện tại khác topic mới.
 */

import mysql from 'mysql2/promise';

const dryRun = process.argv.includes('--dry-run');

const PART = {
  1: '16000000-0000-4000-8000-000000000031',
  2: '16000000-0000-4000-8000-000000000032',
  3: '16000000-0000-4000-8000-000000000033',
  4: '16000000-0000-4000-8000-000000000034',
};

/**
 * Chủ đề -> từ khoá trong tiêu đề đề. Tên topic khớp đúng nhãn đã dùng ở bản
 * tin dự đoán để không phải tạo topic trùng nghĩa.
 *
 * Thứ tự có ý nghĩa: chủ đề nào đứng trước được ưu tiên khi một đề khớp nhiều
 * bộ từ khoá (ví dụ "Which room does your family spend most of the time in?"
 * khớp cả "Phòng của bạn" và "Thành viên trong gia đình").
 */
const RULES = [
  // --- Speaking Part 1 ---
  // Đặt trước "Nơi bạn sống": đề về địa điểm tham quan hay có chữ "place" nên
  // dễ bị bộ từ khoá của chủ đề kia bắt trước.
  { part: 1, topic: 'Địa điểm nổi tiếng', keywords: ['famous place', 'tourist', 'landmark', 'special place', 'beautiful place', 'favorite place', 'favourite place', 'place you would like to visit', 'place to visit', 'visited a traditional village', 'place you visited'] },
  { part: 1, topic: 'Nơi bạn sống', keywords: ['where you live', 'where do you live', 'your neighborhood', 'your neighbourhood', 'your hometown', 'about your city', 'your house', 'your home', 'live in a house', 'place you live'] },
  { part: 1, topic: 'Thành phố nổi tiếng ở nước bạn', keywords: ['famous city', 'a city in your country', 'big city', 'famous place', 'famous area', 'place you would like to visit'] },
  { part: 1, topic: 'Phòng của bạn', keywords: ['your room', 'describe your room', 'which room'] },
  { part: 1, topic: 'Thành viên trong gia đình', keywords: ['your family', 'people in your family', 'family member', 'your parents', 'your brother', 'your sister'] },
  { part: 1, topic: 'Your friend', keywords: ['your friend', 'a close friend', 'best friend', 'with your friends'] },
  { part: 1, topic: 'Sinh nhật của bạn', keywords: ['birthday'] },
  { part: 1, topic: 'Làm gì khi ở với gia đình', keywords: ['with your family', 'time with your family', 'family do together'] },
  { part: 1, topic: 'Thích làm gì khi rảnh', keywords: ['free time', 'your hobby', 'in your spare time', 'like doing', 'enjoy doing', 'relax'] },
  { part: 1, topic: 'Bộ phim yêu thích / Lần cuối xem phim', keywords: ['favourite film', 'favorite film', 'favourite movie', 'favorite movie', 'watch a film', 'watched a film', 'watch movies', 'go to the cinema'] },
  { part: 1, topic: 'Trường học đầu tiên', keywords: ['first school', 'your school', 'primary school'] },

  // --- Speaking Part 2 (miêu tả tranh) ---
  { part: 2, topic: 'Xếp hàng', keywords: ['queue', 'queuing', 'waiting in line', 'wait for someone'] },
  { part: 2, topic: 'Mua sắm / mua quần áo', keywords: ['shopping', 'buy clothes', 'clothes', 'market', 'supermarket'] },
  { part: 2, topic: 'Trên đường / xe bus', keywords: ['bus', 'travel by car', 'on the road', 'traffic', 'journey to work', 'commute'] },
  { part: 2, topic: 'Gia đình sinh hoạt cùng nhau', keywords: ['family', 'eating together', 'cooking', 'watch tv', 'watching tv', 'housework'] },
  { part: 2, topic: 'Đứa trẻ và người mẹ', keywords: ['child', 'children', 'baby', 'mother', 'parent'] },
];

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
};

const normalize = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const slugify = (value) =>
  normalize(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/ /g, '-')
    .slice(0, 90);

async function main() {
  const sql = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDb,
  });

  const [topics] = await sql.query('SELECT id, code, name FROM topics');
  const topicByName = new Map(topics.map((t) => [normalize(t.name), t]));

  /** Lấy topic theo tên, tạo mới nếu chưa có. */
  async function ensureTopic(name) {
    const existing = topicByName.get(normalize(name));
    if (existing) return existing.id;

    const id = crypto.randomUUID();
    if (!dryRun) {
      await sql.execute(
        `INSERT INTO topics (id, code, name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [id, `spk-${slugify(name)}`.slice(0, 100), name],
      );
    }
    const fresh = { id, name };
    topicByName.set(normalize(name), fresh);
    console.log(`   + tạo topic "${name}"`);
    return id;
  }

  let updated = 0;
  const perTopic = new Map();

  for (const partNo of [1, 2]) {
    const rules = RULES.filter((r) => r.part === partNo);
    const [sets] = await sql.query(
      `SELECT id, title, topic_id AS topicId FROM question_sets
        WHERE part_id = ? AND status = 'PUBLISHED'`,
      [PART[partNo]],
    );
    console.log(`\n=== Speaking Part ${partNo}: ${sets.length} bộ ===`);

    for (const set of sets) {
      const title = normalize(set.title);
      // Chủ đề đầu tiên khớp thắng: RULES đã xếp theo mức cụ thể giảm dần.
      const rule = rules.find((r) => r.keywords.some((k) => title.includes(normalize(k))));
      if (!rule) continue;

      const topicId = await ensureTopic(rule.topic);
      if (set.topicId === topicId) continue;

      if (!dryRun) {
        await sql.execute(
          `UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id = ?`,
          [topicId, set.id],
        );
      }
      updated += 1;
      perTopic.set(rule.topic, (perTopic.get(rule.topic) ?? 0) + 1);
    }
  }

  console.log(`\n${dryRun ? '(dry-run) ' : ''}Đã gắn topic cho ${updated} bộ:`);
  for (const [topic, count] of [...perTopic].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(count).padStart(3)} bộ — ${topic}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
