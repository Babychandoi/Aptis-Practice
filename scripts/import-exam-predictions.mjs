/**
 * Nhập dự đoán đề từ file JSON (bóc từ bản tin của nguồn tham khảo).
 *
 *   node scripts/import-exam-predictions.mjs <file.json> [--dry-run] [--create-topics]
 *
 * Mỗi mục cần một topic để lọc đề khi học viên bấm vào. Nhãn trong bản tin
 * thường không trùng y nguyên tên topic trong hệ thống ("Music Festival" vs
 * "Lễ hội âm nhạc"), nên khớp theo nhiều bước:
 *
 *   1. Tên topic khớp y nguyên (đã chuẩn hoá)
 *   2. Tiêu đề đề trong part đó chứa nhãn -> lấy topic của đề đó
 *   3. Tên topic chứa nhãn hoặc ngược lại
 *
 * Không khớp được thì bỏ qua và in ra, trừ khi có --create-topics: lúc đó tạo
 * topic mới nhưng CHƯA gắn đề nào, nên mục sẽ hiện "0 đề" cho tới khi biên tập
 * gắn đề vào topic đó.
 *
 * Script chạy lại được: unique key (ngày, topic, part) khiến mục trùng bị bỏ.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const [, , filePath, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
const createTopics = flags.includes('--create-topics');

if (!filePath) {
  console.error('Thiếu đường dẫn file JSON.');
  process.exit(1);
}

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
};

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    // Bỏ dấu tiếng Việt để "Lễ hội" khớp được với "Le hoi".
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Mã code cho topic mới: "Music Festival" -> "music-festival". */
const slugify = (value) => normalize(value).replace(/ /g, '-').slice(0, 100);

async function main() {
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  const sql = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDb,
  });

  const [components] = await sql.query('SELECT id, code, name FROM components');
  const componentByCode = new Map(components.map((c) => [c.code, c]));

  const [parts] = await sql.query('SELECT id, component_id, name FROM parts');
  const partByName = new Map(parts.map((p) => [normalize(p.name), p]));

  const [topics] = await sql.query('SELECT id, code, name FROM topics');
  const topicByName = new Map(topics.map((t) => [normalize(t.name), t]));
  const topicByCode = new Map(topics.map((t) => [normalize(t.code), t]));

  // Tiêu đề đề kèm topic, để khớp nhãn tiếng Anh với topic tên tiếng Việt.
  const [titles] = await sql.query(`
      SELECT qs.title, qs.topic_id AS topicId, qs.part_id AS partId
        FROM question_sets qs
       WHERE qs.topic_id IS NOT NULL AND qs.status = 'PUBLISHED'`);

  const [[admin]] = await sql.query(
    `SELECT id FROM users
      WHERE id IN (SELECT user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                   WHERE r.code IN ('SUPER_ADMIN','ADMIN'))
      LIMIT 1`,
  );

  /** Tìm topic cho một nhãn; trả về {topic, how} hoặc null. */
  function resolveTopic(label, partId) {
    const key = normalize(label);

    const exact = topicByName.get(key) ?? topicByCode.get(key);
    if (exact) return { topic: exact, how: 'tên khớp' };

    // Tiêu đề đề trong đúng part chứa nhãn — cách khớp đáng tin nhất cho nhãn
    // tiếng Anh, vì tiêu đề đề cũng tiếng Anh.
    const inPart = titles.filter(
      (t) => (!partId || t.partId === partId) && normalize(t.title).includes(key),
    );
    if (inPart.length > 0) {
      const found = topics.find((t) => t.id === inPart[0].topicId);
      if (found) return { topic: found, how: `qua đề "${inPart[0].title.slice(0, 40)}"` };
    }

    // Nới ra: bất kỳ đề nào chứa nhãn.
    const anywhere = titles.filter((t) => normalize(t.title).includes(key));
    if (anywhere.length > 0) {
      const found = topics.find((t) => t.id === anywhere[0].topicId);
      if (found) return { topic: found, how: `qua đề khác part "${anywhere[0].title.slice(0, 30)}"` };
    }

    // Cuối cùng: tên topic chứa nhãn hoặc ngược lại. Chỉ nhận khi nhãn đủ dài
    // (tránh "Art" khớp bừa vào "Started") VÀ hai bên gần bằng nhau về độ dài.
    //
    // Ràng buộc độ dài là cần: không có nó thì "A musician's life" khớp vào
    // topic "Music" chỉ vì chứa chữ "music" — sai chủ đề hoàn toàn.
    if (key.length >= 5) {
      const words = key.split(' ');
      const partial = topics.find((t) => {
        const name = normalize(t.name);
        if (!name.includes(key) && !key.includes(name)) return false;
        // Tên topic phải trùng phần ĐẦU hoặc CUỐI của nhãn, không phải lọt
        // giữa: "A musician's life" chứa "music" ở giữa nên khớp vào topic
        // "Music" là sai chủ đề, còn "Mountain summits" bắt đầu bằng
        // "Mountain" thì đúng.
        const nameWords = name.split(' ');
        const head = words.slice(0, nameWords.length).join(' ');
        const tail = words.slice(-nameWords.length).join(' ');
        return name === head || name === tail || name.includes(key);
      });
      if (partial) return { topic: partial, how: `gần giống "${partial.name}"` };
    }

    return null;
  }

  let inserted = 0;
  let created = 0;
  const missing = [];

  for (const skill of payload.skills ?? []) {
    const component = componentByCode.get(skill.component);
    if (!component) {
      console.error(`Bỏ kỹ năng không tìm thấy: ${skill.component}`);
      continue;
    }

    let order = 0;
    for (const section of skill.sections ?? []) {
      const part = section.part ? partByName.get(normalize(section.part)) : null;
      if (section.part && !part) {
        console.error(`  Bỏ section "${section.sectionLabel}": không thấy part ${section.part}`);
        continue;
      }
      // Part phải thuộc đúng kỹ năng, nếu không lọc đề sẽ ra rỗng.
      if (part && part.component_id !== component.id) {
        console.error(
          `  Bỏ section "${section.sectionLabel}": ${section.part} không thuộc ${skill.component}`,
        );
        continue;
      }

      for (const item of section.items ?? []) {
        order += 1;
        let resolved = resolveTopic(item.label, part?.id);

        if (!resolved && createTopics) {
          const id = randomUUID();
          if (!dryRun) {
            await sql.execute(
              `INSERT INTO topics (id, code, name, is_active, created_at, updated_at)
               VALUES (?, ?, ?, 1, NOW(), NOW())`,
              [id, `pred-${slugify(item.label)}`.slice(0, 100), item.label],
            );
          }
          const fresh = { id, code: slugify(item.label), name: item.label };
          topics.push(fresh);
          topicByName.set(normalize(item.label), fresh);
          resolved = { topic: fresh, how: 'TẠO MỚI (chưa gắn đề)' };
          created += 1;
        }

        if (!resolved) {
          missing.push(`${skill.component} / ${section.sectionLabel} / ${item.label}`);
          continue;
        }

        if (dryRun) {
          console.log(
            `  [dry] ${skill.component} ${section.sectionLabel} | ${item.label}` +
              ` -> ${resolved.topic.name} (${resolved.how})`,
          );
        } else {
          // INSERT IGNORE: unique key (ngày, topic, part) chặn mục trùng khi
          // chạy lại, và khi hai nhãn khác nhau khớp về cùng một topic.
          const [result] = await sql.execute(
            `INSERT IGNORE INTO exam_predictions
               (id, predict_date, topic_id, part_id, component_id, priority,
                label, section_label, source, status, display_order,
                created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?, NOW(), NOW())`,
            [
              randomUUID(),
              payload.predictDate,
              resolved.topic.id,
              part?.id ?? null,
              component.id,
              item.priority === 'BACKUP' ? 'BACKUP' : 'HOT',
              item.label,
              section.sectionLabel ?? null,
              payload.source ?? null,
              order,
              admin?.id ?? null,
            ],
          );
          if (result.affectedRows > 0) inserted += 1;
        }
      }
    }
  }

  console.log(
    `\n${dryRun ? '(dry-run) ' : ''}Đã nhập ${inserted} mục` +
      `${created ? `, tạo ${created} topic mới` : ''}.`,
  );
  if (missing.length) {
    console.log(`\nKhông khớp được topic (${missing.length} mục) — chạy lại với --create-topics để tạo:`);
    for (const label of missing) console.log(`   ${label}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
