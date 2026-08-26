/**
 * Gộp topic của Writing Part 2/3/4 theo CLUB.
 *
 *   node scripts/tag-writing-club-topics.mjs [--dry-run]
 *
 * Đề thi Writing thật: Part 2, 3, 4 cùng một câu lạc bộ và làm liền một mạch
 * (điền form -> trả lời chat -> viết hai email). Nhưng ngân hàng gắn MỖI PART
 * MỘT TOPIC RIÊNG ("Research materials" cho Part 2, "Books and reading" cho
 * Part 3, "Book Club - Part 4" cho Part 4), nên lọc theo chủ đề "Book" chỉ ra
 * đúng một part thay vì cả ba.
 *
 * Script dồn cả ba về một topic mang tên club, lấy từ tiêu đề đề ("Book Club",
 * "Travel Club (Version 2)" -> "Travel Club"). Part 1 không gộp: nó là ngân
 * hàng câu rời về bản thân, không thuộc club nào.
 *
 * Chạy lại được: chỉ ghi khi topic hiện tại khác topic đích.
 */

import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const dryRun = process.argv.includes('--dry-run');

const WRITING_PARTS = {
  2: '16000000-0000-4000-8000-000000000042',
  3: '16000000-0000-4000-8000-000000000043',
  4: '16000000-0000-4000-8000-000000000044',
};

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
    .replace(/ /g, '-')
    .slice(0, 90);

/**
 * Tên club từ tiêu đề đề: bỏ hậu tố "(Version N)" và phần mô tả sau dấu gạch.
 *
 * <p>"Travel Club (Version 2)" -> "Travel Club"
 * <p>"Movie Club – A Film Recommendation" -> "Movie Club"
 *
 * <p>Giữ "(Version N)" thì mỗi bản thành một chủ đề riêng, học viên bấm "Travel"
 * chỉ ra một bản trong khi ngân hàng có hai.
 */
function clubName(title) {
  return String(title ?? '')
    .replace(/\s*\(Version\s*\d+[^)]*\)/gi, '')
    .split(/\s+[–—-]\s+/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

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

  async function ensureTopic(name) {
    const existing = topicByName.get(normalize(name));
    if (existing) return existing.id;

    const id = randomUUID();
    if (!dryRun) {
      await sql.execute(
        `INSERT INTO topics (id, code, name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [id, `wclub-${slugify(name)}`.slice(0, 100), name],
      );
    }
    topicByName.set(normalize(name), { id, name });
    console.log(`   + tạo topic "${name}"`);
    return id;
  }

  const [sets] = await sql.query(
    `SELECT qs.id, qs.title, qs.topic_id AS topicId, qs.part_id AS partId
       FROM question_sets qs
      WHERE qs.part_id IN (?, ?, ?) AND qs.status = 'PUBLISHED'`,
    [WRITING_PARTS[2], WRITING_PARTS[3], WRITING_PARTS[4]],
  );
  console.log(`Writing Part 2/3/4: ${sets.length} bộ`);

  // Chỉ gộp club có đề ở NHIỀU part: club một part thì gộp không giải quyết gì
  // và chỉ tạo thêm topic thừa.
  const partsByClub = new Map();
  for (const set of sets) {
    const club = clubName(set.title);
    if (!club) continue;
    const bucket = partsByClub.get(club) ?? new Set();
    bucket.add(set.partId);
    partsByClub.set(club, bucket);
  }

  let updated = 0;
  const perClub = new Map();

  for (const set of sets) {
    const club = clubName(set.title);
    if (!club) continue;
    if ((partsByClub.get(club)?.size ?? 0) < 2) continue;

    const topicId = await ensureTopic(club);
    if (set.topicId === topicId) continue;

    if (!dryRun) {
      await sql.execute(
        `UPDATE question_sets SET topic_id = ?, updated_at = NOW() WHERE id = ?`,
        [topicId, set.id],
      );
    }
    updated += 1;
    perClub.set(club, (perClub.get(club) ?? 0) + 1);
  }

  console.log(`\n${dryRun ? '(dry-run) ' : ''}Đã gộp ${updated} bộ vào ${perClub.size} club:`);
  for (const [club, count] of [...perClub].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`   ${String(count).padStart(2)} bộ — ${club}`);
  }
  if (perClub.size > 15) console.log(`   … còn ${perClub.size - 15} club`);

  await sql.end();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
