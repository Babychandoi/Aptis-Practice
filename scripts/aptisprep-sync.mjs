/**
 * Đồng bộ dự đoán đề hằng ngày từ trang aptisprep.com/exam-predictions.
 *
 *   node scripts/aptisprep-sync.mjs            # chỉ đọc: cào, so với bản trên DB, in kế hoạch
 *   node scripts/aptisprep-sync.mjs --apply    # có thay đổi thì ghi exam_predictions + đăng bài bảng tin
 *
 * Cách làm giống các lần làm tay: chép bản dự đoán gần nhất trên DB rồi chỉ sửa
 * đúng chỗ nguồn đổi.
 *  - Reading/Listening/Writing: mỗi mục nguồn khớp với một dòng của bản trước
 *    (theo nhãn hoặc tên chủ đề); chưa có thì tìm chủ đề đang có đề PUBLISHED.
 *    Mục nguồn "Ưu tiên cao" thành HOT; dòng HOT không còn trong nguồn lùi về BACKUP.
 *  - Speaking ở nguồn là đoạn mô tả tự do nên giữ nguyên bản trước, chỉ báo khi nguồn đổi.
 *  - Mục không khớp chắc chắn thì KHÔNG đoán: chỉ nêu trong bài viết và trong log.
 *
 * Trang này robots.txt cho phép; chỉ đọc HTML của chính trang (gói RSC của Next.js),
 * không gọi /api/. Bài bảng tin tự viết theo khuôn, không chép nguyên văn nguồn.
 * Trang dự đoán bên mình lấy bản có ngày gần nhất <= hôm nay, nên nguồn không đổi
 * thì không cần tạo bản mới. Chạy lại cùng ngày không ghi trùng (khoá theo ngày + slug).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';

const SOURCE_URL = 'https://www.aptisprep.com/exam-predictions';
const SNAPSHOT_DIR = new URL('../data/aptisprep/', import.meta.url);
/** Mỗi Part gắn tối đa chừng này bộ đề vào bài, để bài không thành danh sách vô tận. */
const SETS_PER_PART = 6;
/** Quá tỉ lệ này mục nguồn không khớp thì coi như trang đổi cấu trúc và dừng. */
const MAX_UNMAPPED_RATIO = 0.25;

/** Tiền tố ở nguồn → Part bên mình. Reading của nguồn đánh số khác: "Part 5" là Part 4 bên mình. */
const PREFIX_TO_PART = {
  reading: { 'Part 5': 'PART_4', 'Part 4': 'PART_3', 'Part 2+3': 'PART_2' },
  listening: { Q14: 'PART_2', Q15: 'PART_3', 'Q16-17': 'PART_4' },
};
const PART_TITLES = {
  READING: { PART_2: 'Part 2 (xếp câu thành đoạn)', PART_3: 'Part 3 (ghép ý kiến với người nói)', PART_4: 'Part 4 (ghép tiêu đề với đoạn văn)' },
  LISTENING: { PART_2: 'Part 2 (câu 14)', PART_3: 'Part 3 (câu 15)', PART_4: 'Part 4 (câu 16–17)' },
  SPEAKING: { PART_1: 'Part 1', PART_2: 'Part 2 (tả tranh)', PART_3: 'Part 3 (so sánh hai lựa chọn)', PART_4: 'Part 4 (kể trải nghiệm)' },
};
const WRITING_MAIN = 'Ưu tiên cao';
const WRITING_BACKUP = 'Vừa';
const PART_ORDER = { READING: ['PART_4', 'PART_3', 'PART_2'], LISTENING: ['PART_2', 'PART_3', 'PART_4'] };

// ---------- Cào nguồn ----------

export function extractPrediction(html) {
  let flight = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    flight += JSON.parse('"' + m[1] + '"');
  }
  const start = flight.indexOf('"prediction":{');
  if (start < 0) throw new Error('Không thấy khối "prediction" trong trang — có thể trang đã đổi cấu trúc.');
  const open = start + '"prediction":'.length;
  let depth = 0;
  for (let k = open; k < flight.length; k++) {
    if (flight[k] === '{') depth++;
    else if (flight[k] === '}' && --depth === 0) return JSON.parse(flight.slice(open, k + 1));
  }
  throw new Error('Khối "prediction" bị cắt dở.');
}

/** Gom mục nguồn thành { comp, part, section, priority, label }. */
export function sourceItems(prediction) {
  const items = [];
  const speaking = [];
  for (const section of prediction.content?.sections ?? []) {
    for (const group of section.groups ?? []) {
      const priority = group.priority === 'high' ? 'HOT' : 'BACKUP';
      for (const raw of group.items ?? []) {
        const text = String(raw).trim();
        if (!text) continue;
        if (section.skill === 'speaking') { speaking.push(text); continue; }
        if (section.skill === 'writing') {
          items.push({ comp: 'WRITING', part: null, section: priority === 'HOT' ? WRITING_MAIN : WRITING_BACKUP, priority, label: text });
          continue;
        }
        const map = PREFIX_TO_PART[section.skill];
        const m = map && text.match(/^([^:]+):\s*(.+)$/);
        const part = m && map[m[1].trim()];
        if (!part) throw new Error(`Không hiểu mục nguồn "${text}" (${section.skill}).`);
        items.push({ comp: section.skill.toUpperCase(), part, section: m[1].trim(), priority, label: m[2].trim() });
      }
    }
  }
  return { items, speaking };
}

// ---------- So khớp nhãn ----------

const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'for', 'in', 'to', 'on', 'with', 'about', 'version', 'club', 'bo']);
const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

export function tokens(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t) && !/^(19|20)\d\d$/.test(t))
    .map(stem);
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
// Nguồn hay gõ sai ("excersise", "America") nên từ dài cho lệch 1–2 ký tự.
const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && distance(a, b) <= (Math.min(a.length, b.length) >= 8 ? 2 : 1));

/** Điểm khớp 0..1: mọi từ của nhãn nguồn phải có mặt ở ứng viên, rồi xét độ trùng hai chiều. */
export function matchScore(sourceLabel, candidate) {
  const a = tokens(sourceLabel);
  const b = tokens(candidate);
  if (!a.length || !b.length) return 0;
  const hit = a.filter((t) => b.some((u) => same(t, u))).length;
  if (hit < a.length) return 0;
  return hit / (a.length + b.length - hit);
}
const ACCEPT = 0.5;

// ---------- Dựng bản mới ----------

const keyOf = (r) => [r.comp, r.part ?? '-'].join('/');
const isBackupSection = (s) => /dự phòng|vừa/i.test(s ?? '');

/**
 * Từ bản trước + mục nguồn, dựng bản mới. Trả về các dòng mới, danh sách thay đổi
 * và mục nguồn không khớp. Hàm thuần, không đụng DB, để kiểm thử được.
 */
export function buildFeed(prevRows, source, topicCandidates) {
  const rows = prevRows.map((r) => ({ ...r }));
  const used = new Set();
  const listed = [];      // { item, row } theo đúng thứ tự nguồn
  const unmapped = [];
  const added = [];       // mục mới vào nhóm HOT
  const dropped = [];     // dòng HOT bị lùi về BACKUP

  for (const item of source) {
    const pool = rows.filter((r) => r.comp === item.comp && !used.has(r) && r.comp !== 'SPEAKING');
    const score = (r) => Math.max(matchScore(item.label, r.label), matchScore(item.label, r.topicName));
    const rank = (list) => list
      .map((r) => ({ r, s: score(r) }))
      .filter((x) => x.s >= ACCEPT)
      .sort((x, y) => y.s - x.s || (x.r.priority === 'HOT' ? -1 : 0) - (y.r.priority === 'HOT' ? -1 : 0) || x.r.displayOrder - y.r.displayOrder);
    // Ưu tiên đúng Part; nguồn đôi khi xếp nhầm Part nên mới xét sang Part khác cùng kỹ năng.
    let best = rank(pool.filter((r) => r.part === item.part))[0] ?? rank(pool)[0];
    let row = best?.r;
    if (!row) {
      const topic = topicCandidates
        .filter((t) => t.comp === item.comp && (item.comp === 'WRITING' || t.part === item.part))
        .map((t) => ({ t, s: matchScore(item.label, t.topicName) }))
        .filter((x) => x.s >= ACCEPT && !rows.some((r) => r.topicId === x.t.topicId && r.part === (item.comp === 'WRITING' ? r.part : x.t.part)))
        .sort((x, y) => y.s - x.s || y.t.sets - x.t.sets)[0]?.t;
      if (topic) {
        row = {
          comp: item.comp, part: item.comp === 'WRITING' ? null : topic.part,
          componentId: topic.componentId, partId: item.comp === 'WRITING' ? null : topic.partId,
          topicId: topic.topicId, topicName: topic.topicName, label: item.label,
          priority: 'BACKUP', sectionLabel: item.section, displayOrder: 0, createdBy: null, isNew: true,
        };
        rows.push(row);
      }
    }
    if (!row) { unmapped.push(item); continue; }
    used.add(row);
    const wasHot = row.priority === 'HOT' && !isBackupSection(row.sectionLabel) && !row.isNew;
    if (item.priority === 'HOT') {
      // "new": chủ đề mới hoặc từ nhóm dự phòng lên; "promoted": vốn ở nhóm chính nhưng là BACKUP.
      const kind = row.isNew || isBackupSection(row.sectionLabel) ? 'new' : 'promoted';
      if (!wasHot) added.push({ item, row, kind });
      // Dòng dự phòng mang nhãn dài kiểu "Singers and music (2026)"; lên nhóm chính thì dùng nhãn ngắn của nguồn.
      if (kind === 'new') row.label = item.label;
      row.priority = 'HOT';
      row.sectionLabel = row.part === item.part || item.comp === 'WRITING' ? item.section : row.sectionLabel;
    } else if (wasHot) {
      dropped.push({ item, row });
      row.priority = 'BACKUP';
    }
    listed.push({ item, row });
  }

  // Dòng HOT không còn trong nguồn: lùi về nhóm dự phòng của chính Part đó.
  for (const row of rows) {
    if (row.comp === 'SPEAKING' || used.has(row) || row.priority !== 'HOT') continue;
    dropped.push({ item: null, row });
    row.priority = 'BACKUP';
    row.sectionLabel = backupSectionFor(rows, row);
  }

  // Thứ tự hiển thị theo từng kỹ năng: mục nguồn trước (đúng thứ tự nguồn), phần còn lại giữ thứ tự cũ.
  for (const comp of ['READING', 'LISTENING', 'WRITING']) {
    const head = listed.filter((x) => x.row.comp === comp).map((x) => x.row);
    const tail = rows.filter((r) => r.comp === comp && !head.includes(r)).sort((x, y) => x.displayOrder - y.displayOrder);
    [...head, ...tail].forEach((r, i) => { r.displayOrder = i + 1; });
  }
  return { rows, listed, unmapped, added, dropped };
}

function backupSectionFor(rows, row) {
  if (row.comp === 'WRITING') return WRITING_BACKUP;
  const counts = new Map();
  for (const r of rows) {
    if (r.comp === row.comp && r.part === row.part && /dự phòng/i.test(r.sectionLabel ?? '')) {
      counts.set(r.sectionLabel, (counts.get(r.sectionLabel) ?? 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ?? `${row.sectionLabel} · Dự phòng`;
}

const signature = (rows) => rows
  .map((r) => [r.comp, r.part ?? '-', r.topicId, r.priority, r.sectionLabel].join('|'))
  .sort().join('\n');

// ---------- Bài bảng tin ----------

const dm = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)}/${Number(m)}`; };
const dmy = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const uniq = (list) => [...new Set(list)];
const joinList = (list) => list.join(', ');

export function buildArticle({ date, prevDate, feed, rows, speakingChanged }) {
  const fresh = feed.added.filter((x) => x.kind === 'new');
  const promoted = feed.added.filter((x) => x.kind === 'promoted');
  const addedSet = new Set(fresh.map((x) => x.row));
  const lines = [];
  // Bài dùng nhãn và Part của dòng bên mình (đã sửa lỗi gõ của nguồn, đúng Part có đề luyện).
  const labelOf = (x) => (addedSet.has(x.row) ? `**${x.row.label} (mới)**` : x.row.label);

  lines.push(`Đây là bản dự đoán cho kỳ thi ngày **${dm(date)}**, xếp theo tần suất chủ đề xuất hiện gần đây. ` +
    'Hãy xem đây là **ước lượng để ưu tiên thời gian ôn**, không phải đề chính thức.');
  lines.push('');
  lines.push('Cuối bài có bộ đề luyện đúng các chủ đề này, bấm vào là làm được ngay.');

  const changes = [];
  const byComp = (list) => {
    const out = new Map();
    for (const x of list) {
      const comp = x.row.comp;
      const where = comp === 'WRITING' ? 'Writing' : `${comp[0]}${comp.slice(1).toLowerCase()} ${PART_TITLES[comp]?.[x.row.part]?.split(' (')[0] ?? ''}`.trim();
      out.set(where, [...(out.get(where) ?? []), x.row.label]);
    }
    return out;
  };
  for (const [where, labels] of byComp(fresh)) changes.push(`- ${where}: thêm ${joinList(uniq(labels))}.`);
  for (const [where, labels] of byComp(promoted)) changes.push(`- ${where}: ${joinList(uniq(labels))} từ nhóm ôn thêm lên ưu tiên cao.`);
  for (const [where, labels] of byComp(feed.dropped)) changes.push(`- ${where}: ${joinList(uniq(labels))} chuyển xuống nhóm ôn thêm.`);
  if (changes.length) {
    lines.push('', `## Điểm mới so với bản ${dm(prevDate)}`, '', ...changes);
    lines.push('', 'Nếu bạn đã ôn theo bài trước thì chỉ cần bổ sung phần này.');
  }

  // Reading / Listening: theo đúng danh sách nguồn, xếp theo Part bên mình.
  for (const comp of ['READING', 'LISTENING']) {
    lines.push('', `## ${comp[0]}${comp.slice(1).toLowerCase()}`);
    for (const part of PART_ORDER[comp]) {
      const hot = feed.listed.filter((x) => x.row.comp === comp && x.row.part === part && x.row.priority === 'HOT');
      const extra = feed.unmapped.filter((x) => x.comp === comp && x.part === part && x.priority === 'HOT');
      const labels = [...hot.map(labelOf), ...extra.map((x) => x.label)];
      if (labels.length) lines.push('', `**${PART_TITLES[comp][part]}** — ${joinList(uniq(labels))}.`);
    }
    if (comp === 'LISTENING') lines.push('', 'Mẹo cho câu 16–17: đọc câu hỏi trước khi nghe, chỉ ghi *từ khoá* chứ đừng chép cả câu.');
  }

  const writingHot = [
    ...feed.listed.filter((x) => x.row.comp === 'WRITING' && x.row.priority === 'HOT').map(labelOf),
    ...feed.unmapped.filter((x) => x.comp === 'WRITING' && x.priority === 'HOT').map((x) => x.label),
  ];
  const writingHotTopics = new Set(rows.filter((r) => r.comp === 'WRITING' && r.priority === 'HOT').map((r) => r.label));
  const writingMid = uniq(rows.filter((r) => r.comp === 'WRITING' && r.priority === 'BACKUP').map((r) => r.label))
    .filter((l) => !writingHotTopics.has(l));
  lines.push('', '## Writing', '', `Ưu tiên cao: ${joinList(uniq(writingHot))}.`);
  if (writingMid.length) lines.push('', `Mức vừa: ${joinList(writingMid)}.`);
  lines.push('', 'Bốn phần Writing có khuôn giống nhau ở mọi câu lạc bộ, nên hãy luyện kỹ các câu lạc bộ ưu tiên cao trước. ' +
    'Các đề thi thử bên dưới đi trọn bốn phần.');

  lines.push('', '## Speaking');
  for (const part of ['PART_1', 'PART_2', 'PART_3', 'PART_4']) {
    const labels = uniq(rows.filter((r) => r.comp === 'SPEAKING' && r.part === part).sort((a, b) => a.displayOrder - b.displayOrder).map((r) => r.label));
    if (labels.length) lines.push('', `**${PART_TITLES.SPEAKING[part]}** — ${joinList(labels)}.`);
  }
  if (speakingChanged) lines.push('', '*Phần Speaking vừa được nguồn điều chỉnh, danh sách chi tiết sẽ cập nhật ở bài sau.*');
  lines.push('', 'Với Part 4, hãy có sẵn **một khung kể** gồm bối cảnh, diễn biến, cảm xúc và điều học được. Khung này dùng được cho gần như mọi đề.');

  lines.push('', '## Kế hoạch ôn gợi ý', '',
    '1. Làm hết đề luyện của kỹ năng bạn yếu nhất trước.',
    '2. Sau mỗi đề, đọc phần giải thích và ghi lại 3–5 từ hoặc cụm mới.',
    '3. Những ngày sát kỳ thi chỉ xem lại danh sách từ đã ghi, đừng mở thêm chủ đề mới.',
    '', 'Chúc bạn làm bài thật tốt.', '');

  const headline = uniq(fresh.map((x) => x.row.label)).slice(0, 3);
  const title = headline.length
    ? `Dự đoán đề thi ngày ${dm(date)}: thêm ${headline.join(', ')}`
    : `Dự đoán đề thi ngày ${dm(date)}: cập nhật nhóm chủ đề ưu tiên`;
  const [y, m, d] = date.split('-');
  return {
    slug: `du-doan-de-thi-ngay-${Number(d)}-${Number(m)}-${y}`,
    title: title.length > 180 ? title.slice(0, 177) + '…' : title,
    excerpt: `Cập nhật dự đoán cho kỳ thi ${dm(date)} ở Reading, Listening, Writing và Speaking, kèm bộ đề luyện đúng chủ đề để bấm làm ngay. Dự đoán chỉ mang tính tham khảo.`,
    body: lines.join('\n'),
  };
}

// ---------- Chạy ----------

function previousSnapshot(date) {
  try {
    const files = readdirSync(SNAPSHOT_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${date}.json`).sort();
    return files.length ? JSON.parse(readFileSync(new URL(files.at(-1), SNAPSHOT_DIR), 'utf8')) : null;
  } catch { return null; }
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== '--apply')) throw new Error('Chỉ nhận cờ --apply.');
  const apply = flags.includes('--apply');
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`[${stamp}] aptisprep-sync ${apply ? '--apply' : '(chỉ đọc)'}`);

  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AptisPracticeSync/1.0)', Accept: 'text/html' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Tải trang nguồn lỗi HTTP ${res.status}.`);
  const prediction = extractPrediction(await res.text());
  const date = String(prediction.examDate ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Nguồn không có examDate hợp lệ.');
  if (prediction.isPublished === false) { console.log('Bản nguồn chưa công khai, bỏ qua.'); return; }

  const { items, speaking } = sourceItems(prediction);
  if (items.length < 20) throw new Error(`Nguồn chỉ có ${items.length} mục — có thể trang đổi cấu trúc, dừng để tránh ghi sai.`);
  const prevSnap = previousSnapshot(date);
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(new URL(`${date}.json`, SNAPSHOT_DIR), JSON.stringify(prediction, null, 2));
  const speakingChanged = prevSnap ? JSON.stringify(sourceItems(prevSnap).speaking) !== JSON.stringify(speaking) : false;
  console.log(`Nguồn: kỳ thi ${dmy(date)}, đăng lúc ${prediction.publishedAt}, ${items.length} mục + ${speaking.length} dòng Speaking.`);

  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis',
    charset: 'utf8mb4',
    dateStrings: true,
  });
  let locked = false;
  try {
    const [[{ prevDate }]] = await db.query('SELECT MAX(predict_date) AS prevDate FROM exam_predictions WHERE predict_date <= ?', [date]);
    if (!prevDate) throw new Error('DB chưa có bản dự đoán nào để chép tiếp.');
    if (prevDate === date) { console.log(`DB đã có bản ngày ${dmy(date)}, bỏ qua.`); return; }

    const [prevRows] = await db.query(
      `SELECT ep.topic_id AS topicId, t.name AS topicName, ep.part_id AS partId, p.code AS part,
              ep.component_id AS componentId, c.code AS comp, ep.priority, ep.label,
              ep.section_label AS sectionLabel, ep.display_order AS displayOrder, ep.created_by AS createdBy
         FROM exam_predictions ep JOIN components c ON c.id = ep.component_id
         JOIN topics t ON t.id = ep.topic_id LEFT JOIN parts p ON p.id = ep.part_id
        WHERE ep.predict_date = ? ORDER BY c.display_order, ep.display_order, ep.id`, [prevDate]);
    const [topicCandidates] = await db.query(
      `SELECT t.id AS topicId, t.name AS topicName, p.id AS partId, p.code AS part, c.id AS componentId, c.code AS comp, COUNT(*) AS sets
         FROM question_sets q JOIN topics t ON t.id = q.topic_id JOIN parts p ON p.id = q.part_id
         JOIN components c ON c.id = p.component_id
        WHERE q.status = 'PUBLISHED' AND c.code IN ('READING', 'LISTENING', 'WRITING')
        GROUP BY t.id, t.name, p.id, p.code, c.id, c.code`);

    const feed = buildFeed(prevRows, items, topicCandidates);
    const ratio = feed.unmapped.length / items.length;
    console.log(`Bản trước ${dmy(prevDate)}: ${prevRows.length} dòng → bản mới ${feed.rows.length} dòng.`);
    for (const x of feed.added) console.log(`  + ${x.kind === 'new' ? 'MỚI' : 'nâng'} ${x.row.comp} ${x.row.part ?? ''} "${x.item.label}" → ${x.row.topicName}${x.row.isNew ? ' (chủ đề mới vào bảng)' : ''}`);
    for (const x of feed.dropped) console.log(`  - lùi  ${x.row.comp} ${x.row.part ?? ''} "${x.row.label}" → ${x.row.sectionLabel}`);
    for (const x of feed.unmapped) console.log(`  ? chưa khớp ${x.comp} ${x.part ?? ''} "${x.label}" (chỉ ghi trong bài)`);
    if (speakingChanged) console.log('  ! Speaking ở nguồn đã đổi so với lần cào trước — giữ bản cũ, cần xem tay.');
    if (ratio > MAX_UNMAPPED_RATIO) throw new Error(`${feed.unmapped.length}/${items.length} mục không khớp — dừng để tránh ghi sai.`);

    if (signature(feed.rows) === signature(prevRows)) {
      console.log('Nguồn không có thay đổi so với bản trên DB, không tạo bản mới.');
      return;
    }

    const [[post]] = await db.query(
      `SELECT id, created_by AS createdBy, comments_enabled AS commentsEnabled, comments_moderated AS commentsModerated
         FROM news_posts WHERE slug LIKE 'du-doan-de-thi-%' AND status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 1`);
    if (!post) throw new Error('Không thấy bài dự đoán cũ để lấy người đăng.');
    const article = buildArticle({ date, prevDate, feed, rows: feed.rows, speakingChanged });
    const [[dup]] = await db.query('SELECT COUNT(*) AS n FROM news_posts WHERE slug = ?', [article.slug]);
    if (Number(dup.n)) { console.log(`Bài ${article.slug} đã có, bỏ qua.`); return; }

    // Gắn đề: mỗi mục một bộ PUBLISHED, ưu tiên bộ chưa từng gắn ở bài nào để học viên có đề mới.
    const [prevLinks] = await db.query('SELECT question_set_id AS id FROM news_post_question_sets');
    const linkedBefore = new Set(prevLinks.map((x) => x.id));
    const setIds = [];
    for (const comp of ['READING', 'LISTENING', 'SPEAKING']) {
      for (const part of ['PART_1', 'PART_2', 'PART_3', 'PART_4']) {
        const picks = feed.rows
          .filter((r) => r.comp === comp && r.part === part && (comp === 'SPEAKING' || r.priority === 'HOT'))
          .sort((a, b) => a.displayOrder - b.displayOrder);
        let got = 0;
        for (const r of picks) {
          if (got >= SETS_PER_PART) break;
          const [sets] = await db.query(
            "SELECT id FROM question_sets WHERE topic_id = ? AND part_id = ? AND status = 'PUBLISHED' ORDER BY created_at, id",
            [r.topicId, r.partId]);
          const ids = sets.map((s) => s.id).filter((id) => !setIds.includes(id));
          const pick = ids.find((id) => !linkedBefore.has(id)) ?? ids[0];
          if (pick) { setIds.push(pick); got++; }
        }
      }
    }
    const [mocks] = await db.query(
      "SELECT id, name FROM test_blueprints WHERE status = 'PUBLISHED' AND code LIKE 'MOCK_WRITING_CLUB_%' AND name NOT LIKE '%bảng tin%' ORDER BY code");
    const blueprints = [];
    for (const r of feed.rows.filter((x) => x.comp === 'WRITING' && x.priority === 'HOT').sort((a, b) => a.displayOrder - b.displayOrder)) {
      const mock = mocks.find((b) => !blueprints.some((x) => x.id === b.id)
        && matchScore(r.label, b.name.replace(/^Thi thử Writing\s*-\s*/, '').split(/\s+[–-]\s+/)[0]) >= ACCEPT);
      if (mock) blueprints.push({ id: mock.id, label: 'Writing · ' + mock.name.replace(/^Thi thử Writing\s*-\s*/, '') });
    }
    console.log(`Bài: "${article.title}" (${article.slug}), gắn ${setIds.length} bộ đề và ${blueprints.length} đề thi thử Writing.`);

    if (!apply) { console.log('(chỉ đọc) Chưa ghi gì. Thêm --apply để đăng.'); return; }

    const [[lock]] = await db.query('SELECT GET_LOCK(?, 0) AS acquired', ['aptis-prediction-' + date]);
    if (Number(lock.acquired) !== 1) throw new Error('Có tiến trình khác đang đăng bản này.');
    locked = true;
    const source = `${prediction.source ?? 'Aptistest.edu.vn'} qua aptisprep.com (bản ${dmy(date)})`.slice(0, 255);
    await db.beginTransaction();
    try {
      const [[again]] = await db.query('SELECT COUNT(*) AS n FROM exam_predictions WHERE predict_date = ?', [date]);
      if (Number(again.n)) throw new Error(`Ngày ${date} vừa có dữ liệu, dừng để không ghi đè.`);
      for (const r of feed.rows) {
        await db.execute(
          'INSERT INTO exam_predictions ' +
          '(id,predict_date,topic_id,part_id,component_id,priority,label,section_label,source,status,display_order,created_by,created_at,updated_at) ' +
          "VALUES (?,?,?,?,?,?,?,?,?,'PUBLISHED',?,?,NOW(),NOW())",
          [randomUUID(), date, r.topicId, r.partId, r.componentId, r.priority, r.label, r.sectionLabel,
            source, r.displayOrder, r.createdBy ?? post.createdBy]);
      }
      const postId = randomUUID();
      await db.execute(
        'INSERT INTO news_posts ' +
        '(id,slug,title,excerpt,body,status,pinned,comments_enabled,comments_moderated,view_count,published_at,created_by,created_at,updated_at) ' +
        "VALUES (?,?,?,?,?,'PUBLISHED',1,?,?,0,NOW(),?,NOW(),NOW())",
        [postId, article.slug, article.title, article.excerpt, article.body, post.commentsEnabled, post.commentsModerated, post.createdBy]);
      for (const [i, id] of setIds.entries()) {
        await db.execute('INSERT INTO news_post_question_sets (post_id,question_set_id,display_order) VALUES (?,?,?)', [postId, id, i + 1]);
      }
      for (const [i, b] of blueprints.entries()) {
        await db.execute('INSERT INTO news_post_blueprints (post_id,blueprint_id,label,display_order) VALUES (?,?,?,?)', [postId, b.id, b.label, i + 1]);
      }
      await db.execute(
        "UPDATE news_posts SET pinned = 0, updated_at = NOW() WHERE pinned = 1 AND slug LIKE 'du-doan-de-thi-%' AND slug <> ?",
        [article.slug]);
      await db.commit();
      console.log(`Đã đăng bản ${dmy(date)} và bài ${article.slug}.`);
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } finally {
    if (locked) await db.query('SELECT RELEASE_LOCK(?)', ['aptis-prediction-' + date]);
    await db.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
