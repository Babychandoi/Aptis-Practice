/**
 * Bản dự đoán + bài bảng tin 14/10, ghi trong cùng một transaction.
 * Dùng payload 13/10 làm nền và áp các khác biệt được khai báo rõ trong JSON.
 * Mặc định chỉ đọc; phải thêm --apply mới ghi dữ liệu.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { buildPlan, pickNewsSets } from './update-prediction-1013.mjs';

export const manifestUrl = new URL('../data/exam-predictions-2026-10-14.json', import.meta.url);

function findSection(payload, component, sectionLabel) {
  const skill = payload.skills.find((entry) => entry.component === component);
  const section = skill?.sections.find((entry) => entry.sectionLabel === sectionLabel);
  if (!section) throw new Error(`Không thấy mục ${component} / ${sectionLabel}.`);
  return section;
}

export function materializePayload(manifest) {
  const baseUrl = new URL(manifest.basedOn, manifestUrl);
  const payload = JSON.parse(readFileSync(baseUrl, 'utf8'));
  payload.predictDate = manifest.predictDate;
  payload.source = manifest.source;
  payload.notes = [...manifest.notes];
  payload.news = { ...payload.news, ...manifest.news };

  for (const change of manifest.changes.remove ?? []) {
    const section = findSection(payload, change.component, change.sectionLabel);
    const matches = section.items.filter((item) => item.label === change.label);
    if (matches.length !== 1) throw new Error(`Mục cần bỏ không tồn tại duy nhất: ${change.label}`);
    section.items = section.items.filter((item) => item.label !== change.label);
  }
  for (const change of manifest.changes.rename ?? []) {
    const section = findSection(payload, change.component, change.sectionLabel);
    const matches = section.items.filter((item) => item.label === change.from);
    if (matches.length !== 1) throw new Error(`Mục cần đổi tên không tồn tại duy nhất: ${change.from}`);
    matches[0].label = change.to;
  }
  for (const change of manifest.changes.add ?? []) {
    const section = findSection(payload, change.component, change.sectionLabel);
    if (section.items.some((item) => item.label === change.item.label)) {
      throw new Error(`Mục mới đã tồn tại: ${change.item.label}`);
    }
    section.items.push({ ...change.item });
  }
  for (const change of manifest.changes.order ?? []) {
    const section = findSection(payload, change.component, change.sectionLabel);
    const byLabel = new Map(section.items.map((item) => [item.label, item]));
    if (byLabel.size !== section.items.length || change.labels.length !== section.items.length
        || change.labels.some((label) => !byLabel.has(label))) {
      throw new Error(`Danh sách thứ tự không khớp các mục ${change.component} / ${change.sectionLabel}.`);
    }
    section.items = change.labels.map((label) => byLabel.get(label));
  }
  return payload;
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => !['--apply', '--dry-run'].includes(flag))
      || (flags.includes('--apply') && flags.includes('--dry-run'))) {
    throw new Error('Dùng --dry-run hoặc --apply, không dùng cả hai.');
  }
  const apply = flags.includes('--apply');
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const payload = materializePayload(manifest);
  const body = readFileSync(new URL(payload.news.bodyFile, manifestUrl), 'utf8');
  const dateLabel = `${payload.predictDate.slice(8, 10)}/${payload.predictDate.slice(5, 7)}/${payload.predictDate.slice(0, 4)}`;
  if (!body.includes(dateLabel)) throw new Error('Ngày trong bài bảng tin không khớp payload.');
  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis', charset: 'utf8mb4', dateStrings: true,
  });
  let locked = false;
  try {
    if (apply) {
      const [[lock]] = await sql.query('SELECT GET_LOCK(?, 0) AS acquired', [`aptis-prediction-${payload.predictDate}`]);
      if (Number(lock.acquired) !== 1) throw new Error('Một tiến trình khác đang xuất bản bản dự đoán này.');
      locked = true;
    }
    const [components] = await sql.query('SELECT id, code FROM components');
    const [parts] = await sql.query('SELECT id, name, component_id AS componentId FROM parts');
    const [topics] = await sql.query('SELECT id, code, name FROM topics WHERE is_active = 1 ORDER BY name, id');
    const [sets] = await sql.query(`SELECT q.id, q.topic_id AS topicId, q.part_id AS partId, p.component_id AS componentId
      FROM question_sets q JOIN parts p ON p.id=q.part_id WHERE q.status='PUBLISHED' ORDER BY q.created_at, q.id`);
    const { rows, missing } = buildPlan(payload, { components, parts, topics, sets });
    for (const skill of payload.skills) {
      const group = rows.filter((row) => row.componentCode === skill.component);
      if (!group.length) throw new Error(`Không có đề hợp lệ cho kỹ năng ${skill.component}; dừng xuất bản.`);
      console.log(`${skill.component}: ${group.filter((row) => row.priority === 'HOT').length} ưu tiên, ${group.filter((row) => row.priority === 'BACKUP').length} mức vừa/dự phòng`);
    }
    for (const note of payload.notes) console.log(`Ghi chú: ${note}`);
    for (const item of missing) console.log(`  ! ${item}`);

    const [previous] = await sql.query(`SELECT DISTINCT link.question_set_id FROM news_post_question_sets link
      JOIN news_posts post ON post.id=link.post_id WHERE post.slug LIKE 'du-doan-de-thi-%' AND post.slug<>?`, [payload.news.slug]);
    const setIds = pickNewsSets(rows, new Set(previous.map((row) => row.question_set_id)));
    const mockCodes = payload.news.writingMocks.map((number) => `MOCK_WRITING_CLUB_${number}`);
    const [mocks] = await sql.query(`SELECT id, code, name FROM test_blueprints WHERE status='PUBLISHED' AND code IN (?)`, [mockCodes]);
    if (mocks.length !== mockCodes.length) throw new Error('Thiếu đề thi thử Writing được chọn.');
    for (const mock of mocks) {
      const [mockSets] = await sql.query(`SELECT q.topic_id AS topicId, p.code, c.code AS component
        FROM blueprint_part_rules rule JOIN blueprint_fixed_question_sets link ON link.blueprint_rule_id=rule.id
        JOIN question_sets q ON q.id=link.question_set_id JOIN parts p ON p.id=q.part_id
        JOIN components c ON c.id=p.component_id WHERE rule.blueprint_id=? AND q.status='PUBLISHED'`, [mock.id]);
      const writingParts = new Set(mockSets.filter((row) => row.component === 'WRITING').map((row) => row.code));
      const hotTopics = new Set(rows.filter((row) => row.componentCode === 'WRITING' && row.priority === 'HOT').map((row) => row.topicId));
      if (['PART_1', 'PART_2', 'PART_3', 'PART_4'].some((part) => !writingParts.has(part))
          || mockSets.filter((row) => row.code !== 'PART_1').some((row) => row.component !== 'WRITING' || !hotTopics.has(row.topicId))) {
        throw new Error(`Blueprint không khớp Writing ưu tiên/đủ 4 phần: ${mock.code}`);
      }
    }
    mocks.sort((left, right) => mockCodes.indexOf(left.code) - mockCodes.indexOf(right.code));

    const [[existing]] = await sql.query('SELECT COUNT(*) AS n FROM exam_predictions WHERE predict_date=?', [payload.predictDate]);
    const [[post]] = await sql.query('SELECT id FROM news_posts WHERE slug=?', [payload.news.slug]);
    console.log(`\nDự kiến: ${rows.length} mục dự đoán, ${setIds.length} bài luyện, ${mocks.length} đề thi thử Writing. Chưa xác nhận: ${missing.length} mục.`);
    console.log(`Đã có trong DB: ${existing.n} mục dự đoán, bài bảng tin ${post ? 'đã tồn tại' : 'chưa tồn tại'}.`);
    if (!apply) { console.log('(dry-run) Không ghi dữ liệu.'); return; }
    if (Number(existing.n) > 0 || post) {
      if (post && Number(existing.n) === rows.length) { console.log('Bản dự đoán đã được xuất bản; không ghi lại.'); return; }
      throw new Error('Ngày/slug đã có dữ liệu khác hoặc chưa đầy đủ. Dừng để tránh ghi đè.');
    }

    const [[admin]] = await sql.query(`SELECT user.id FROM users user WHERE EXISTS
      (SELECT 1 FROM user_roles role_link JOIN roles role ON role.id=role_link.role_id WHERE role_link.user_id=user.id AND role.code IN ('ADMIN','SUPER_ADMIN')) ORDER BY user.created_at LIMIT 1`);
    if (!admin) throw new Error('Không có tác giả quản trị.');
    await sql.beginTransaction();
    try {
      for (const row of rows) await sql.execute(`INSERT INTO exam_predictions
        (id,predict_date,topic_id,part_id,component_id,priority,label,section_label,source,status,display_order,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,'PUBLISHED',?,?,NOW(),NOW())`,
      [randomUUID(), payload.predictDate, row.topicId, row.partId, row.componentId, row.priority,
        row.label, row.sectionLabel, payload.source, row.displayOrder, admin.id]);
      const postId = randomUUID();
      await sql.execute(`INSERT INTO news_posts
        (id,slug,title,excerpt,body,status,pinned,comments_enabled,comments_moderated,view_count,published_at,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,'PUBLISHED',1,1,0,0,NOW(),?,NOW(),NOW())`,
      [postId, payload.news.slug, payload.news.title, payload.news.excerpt, body, admin.id]);
      for (const [index, id] of setIds.entries()) await sql.execute('INSERT INTO news_post_question_sets (post_id,question_set_id,display_order) VALUES (?,?,?)', [postId, id, index + 1]);
      for (const [index, mock] of mocks.entries()) await sql.execute('INSERT INTO news_post_blueprints (post_id,blueprint_id,label,display_order) VALUES (?,?,?,?)', [postId, mock.id, mock.name.replace(/^Thi thử Writing - /, 'Writing · '), index + 1]);
      const [unpinned] = await sql.execute(`UPDATE news_posts SET pinned=0,updated_at=NOW()
        WHERE pinned=1 AND slug LIKE 'du-doan-de-thi-%' AND slug<>?`, [payload.news.slug]);
      await sql.commit();
      console.log(`Đã xuất bản ${payload.news.slug}. Bỏ ghim ${unpinned.affectedRows} bản dự đoán cũ (không xoá).`);
    } catch (error) { await sql.rollback(); throw error; }
  } finally {
    if (locked) await sql.query('SELECT RELEASE_LOCK(?)', [`aptis-prediction-${payload.predictDate}`]);
    await sql.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
