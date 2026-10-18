/**
 * Bản dự đoán + bảng tin 13/10, xuất bản trong cùng một transaction.
 * Mặc định chỉ đọc; phải thêm --apply mới ghi dữ liệu.
 *   node scripts/update-prediction-1013.mjs --dry-run
 *   node scripts/update-prediction-1013.mjs --apply
 * Không sửa đề, tạo topic rỗng, dùng dự đoán ngày cũ hoặc khớp gần đúng.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';

export const payloadUrl = new URL('../data/exam-predictions-2026-10-13.json', import.meta.url);

const family = (name) => name.toLowerCase()
  .replace(/\(?\s*version\s*\d+\s*\)?/gi, '')
  .replace(/\(?2026\)?/g, '').replace(/-\s*bộ\s*\d+/gi, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function buildPlan(payload, { components, parts, topics, sets }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.predictDate)
      || new Date(`${payload.predictDate}T00:00:00Z`).toISOString().slice(0, 10) !== payload.predictDate) {
    throw new Error('Ngày dự đoán không hợp lệ.');
  }
  const rows = [], missing = [], seen = new Set(), sectionPlans = [];
  const add = (component, part, topic, item, sectionLabel) => {
    const candidates = sets.filter((q) => q.componentId === component.id
      && (!part || q.partId === part.id) && q.topicId === topic.id);
    if (!candidates.length) {
      missing.push(`${component.code} / ${sectionLabel} / ${item.label}: chưa có đề xuất bản đúng phạm vi`);
      return;
    }
    const key = `${component.id}:${part?.id ?? ''}:${topic.id}`;
    if (seen.has(key)) return;
    if (!['HOT', 'BACKUP'].includes(item.priority)) throw new Error(`Priority sai: ${item.label}`);
    seen.add(key);
    rows.push({ componentId: component.id, componentCode: component.code,
      partId: part?.id ?? null, topicId: topic.id, topicName: topic.name,
      label: item.label, priority: item.priority, sectionLabel,
      candidates, displayOrder: rows.filter((r) => r.componentId === component.id).length + 1 });
  };
  for (const skill of payload.skills) {
    const component = components.find((c) => c.code === skill.component);
    if (!component) throw new Error(`Không thấy kỹ năng ${skill.component}`);
    for (const section of skill.sections) {
      const part = section.part ? parts.find((p) => p.name === section.part && p.componentId === component.id) : null;
      if (section.part && !part) throw new Error(`Part không thuộc kỹ năng: ${section.part}`);
      if (section.backupRemaining && !part) throw new Error('Dự phòng còn lại phải giới hạn đúng Part.');
      sectionPlans.push({ component, part, section });
      for (const item of section.items) {
        if (!item.topicCode) {
          missing.push(`${component.code} / ${section.sectionLabel} / ${item.label}: chưa xác nhận topic phù hợp`);
          continue;
        }
        const topic = topics.find((t) => t.code === item.topicCode);
        if (!topic) throw new Error(`Mã topic không tồn tại: ${item.topicCode} (${item.label})`);
        add(component, part, topic, item, section.sectionLabel);
      }
    }
  }
  // BACKUP chỉ từ các chủ đề có đề xuất bản đúng kỹ năng/Part. Không hạ
  // các phiên bản khác của cùng chủ đề ưu tiên xuống BACKUP.
  for (const { component, part, section } of sectionPlans.filter((s) => s.section.backupRemaining)) {
    const hotFamilies = new Set(rows.filter((r) => r.partId === part.id && r.priority === 'HOT').map((r) => family(r.topicName)));
    for (const topic of topics.filter((t) => sets.some((q) => q.partId === part.id && q.topicId === t.id))) {
      if (hotFamilies.has(family(topic.name))) continue;
      add(component, part, topic, { label: topic.name, priority: 'BACKUP' }, `${section.sectionLabel} · Dự phòng`);
    }
  }
  return { rows, missing };
}

export function pickNewsSets(rows, previousIds = new Set()) {
  const seen = new Set(), perSection = new Map(), picks = [];
  for (const row of rows.filter((r) => r.priority === 'HOT' && r.componentCode !== 'WRITING')) {
    const key = `${row.componentCode}:${row.sectionLabel}`;
    if ((perSection.get(key) ?? 0) >= 6) continue;
    const available = row.candidates.filter((q) => !seen.has(q.id));
    const selected = available.find((q) => !previousIds.has(q.id)) ?? available[0];
    if (!selected) continue;
    seen.add(selected.id);
    picks.push(selected.id);
    perSection.set(key, (perSection.get(key) ?? 0) + 1);
  }
  return picks;
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => !['--apply', '--dry-run'].includes(f))
      || (flags.includes('--apply') && flags.includes('--dry-run'))) throw new Error('Dùng --dry-run hoặc --apply, không dùng cả hai.');
  const apply = flags.includes('--apply');
  const payload = JSON.parse(readFileSync(payloadUrl, 'utf8'));
  const body = readFileSync(new URL(payload.news.bodyFile, payloadUrl), 'utf8');
  if (!body.includes('13/10/2026')) throw new Error('Bài bản tin không đúng ngày.');
  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis', charset: 'utf8mb4', dateStrings: true,
  });
  let locked = false;
  try {
    if (apply) {
      const [[lock]] = await sql.query('SELECT GET_LOCK(?, 0) AS acquired', ['aptis-prediction-2026-10-13']);
      if (Number(lock.acquired) !== 1) throw new Error('Một tiến trình khác đang xuất bản bản 13/10.');
      locked = true;
    }
    const [components] = await sql.query('SELECT id, code FROM components');
    const [parts] = await sql.query('SELECT id, name, component_id AS componentId FROM parts');
    const [topics] = await sql.query('SELECT id, code, name FROM topics WHERE is_active = 1 ORDER BY name, id');
    const [sets] = await sql.query(`SELECT q.id, q.topic_id AS topicId, q.part_id AS partId, p.component_id AS componentId
      FROM question_sets q JOIN parts p ON p.id=q.part_id WHERE q.status='PUBLISHED' ORDER BY q.created_at, q.id`);
    const { rows, missing } = buildPlan(payload, { components, parts, topics, sets });
    for (const skill of payload.skills) {
      const group = rows.filter((r) => r.componentCode === skill.component);
      if (!group.length) throw new Error(`Không có đề hợp lệ cho kỹ năng ${skill.component}; dừng xuất bản.`);
      console.log(`${skill.component}: ${group.filter((r) => r.priority === 'HOT').length} ưu tiên, ${group.filter((r) => r.priority === 'BACKUP').length} mức vừa/dự phòng`);
    }
    for (const note of payload.notes) console.log(`Ghi chú: ${note}`);
    for (const item of missing) console.log(`  ! ${item}`);
    const [previous] = await sql.query(`SELECT DISTINCT l.question_set_id FROM news_post_question_sets l
      JOIN news_posts n ON n.id=l.post_id WHERE n.slug LIKE 'du-doan-de-thi-%' AND n.slug<>?`, [payload.news.slug]);
    const setIds = pickNewsSets(rows, new Set(previous.map((r) => r.question_set_id)));
    const mockCodes = payload.news.writingMocks.map((n) => `MOCK_WRITING_CLUB_${n}`);
    const [mocks] = await sql.query(`SELECT id, code, name FROM test_blueprints WHERE status='PUBLISHED' AND code IN (?)`, [mockCodes]);
    if (mocks.length !== mockCodes.length) throw new Error('Thiếu đề thi thử Writing được chọn.');
    // Mỗi blueprint phải có nội dung Writing đúng một topic ưu tiên và đủ Part 1–4.
    for (const mock of mocks) {
      const [mockSets] = await sql.query(`SELECT q.topic_id AS topicId, p.code, c.code AS component
        FROM blueprint_part_rules s JOIN blueprint_fixed_question_sets l ON l.blueprint_rule_id=s.id
        JOIN question_sets q ON q.id=l.question_set_id JOIN parts p ON p.id=q.part_id
        JOIN components c ON c.id=p.component_id WHERE s.blueprint_id=? AND q.status='PUBLISHED'`, [mock.id]);
      const writingParts = new Set(mockSets.filter((s) => s.component === 'WRITING').map((s) => s.code));
      const hotTopics = new Set(rows.filter((r) => r.componentCode === 'WRITING' && r.priority === 'HOT').map((r) => r.topicId));
      if (['PART_1', 'PART_2', 'PART_3', 'PART_4'].some((part) => !writingParts.has(part))
          || mockSets.filter((s) => s.code !== 'PART_1').some((s) => s.component !== 'WRITING' || !hotTopics.has(s.topicId))) {
        throw new Error(`Blueprint không khớp Writing ưu tiên/đủ 4 phần: ${mock.code}`);
      }
    }
    mocks.sort((a, b) => mockCodes.indexOf(a.code) - mockCodes.indexOf(b.code));
    const [[existing]] = await sql.query('SELECT COUNT(*) AS n FROM exam_predictions WHERE predict_date=?', [payload.predictDate]);
    const [[post]] = await sql.query('SELECT id FROM news_posts WHERE slug=?', [payload.news.slug]);
    console.log(`\nDự kiến: ${rows.length} mục dự đoán, ${setIds.length} bài luyện, ${mocks.length} đề thi thử Writing. Chưa xác nhận: ${missing.length} mục.`);
    console.log(`Đã có trong DB: ${existing.n} mục dự đoán, bài bản tin ${post ? 'đã tồn tại' : 'chưa tồn tại'}.`);
    if (!apply) { console.log('(dry-run) Không ghi dữ liệu.'); return; }
    if (Number(existing.n) > 0 || post) {
      if (post && Number(existing.n) === rows.length) { console.log('Bản 13/10 đã được xuất bản; không ghi lại.'); return; }
      throw new Error('Ngày/slug đã có dữ liệu khác hoặc chưa đầy đủ. Dừng để tránh ghi đè bản hiện có.');
    }
    const [[admin]] = await sql.query(`SELECT u.id FROM users u WHERE EXISTS
      (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code IN ('ADMIN','SUPER_ADMIN')) ORDER BY u.created_at LIMIT 1`);
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
      for (const [i, id] of setIds.entries()) await sql.execute('INSERT INTO news_post_question_sets (post_id,question_set_id,display_order) VALUES (?,?,?)', [postId, id, i + 1]);
      for (const [i, mock] of mocks.entries()) await sql.execute('INSERT INTO news_post_blueprints (post_id,blueprint_id,label,display_order) VALUES (?,?,?,?)', [postId, mock.id, mock.name.replace(/^Thi thử Writing - /, 'Writing · '), i + 1]);
      const [unpinned] = await sql.execute(`UPDATE news_posts SET pinned=0,updated_at=NOW()
        WHERE pinned=1 AND slug LIKE 'du-doan-de-thi-%' AND slug<>?`, [payload.news.slug]);
      await sql.commit();
      console.log(`Đã xuất bản ${payload.news.slug}. Bỏ ghim ${unpinned.affectedRows} bản dự đoán cũ (không xoá).`);
    } catch (error) { await sql.rollback(); throw error; }
  } finally {
    if (locked) await sql.query('SELECT RELEASE_LOCK(?)', ['aptis-prediction-2026-10-13']);
    await sql.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
