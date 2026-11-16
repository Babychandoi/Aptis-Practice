/**
 * Đồng bộ "Đề trọng điểm tháng" từ aptisprep.com sang hệ thống luyện thi.
 *
 *   node scripts/aptisprep-monthly-focus.mjs            # xuất + khớp, in báo cáo, không ghi
 *   node scripts/aptisprep-monthly-focus.mjs --apply    # nhập đề còn thiếu rồi ghi bảng trọng điểm và mẹo
 *
 * 1. Xuất các trang /monthly-focus/... (cùng định dạng trang luyện, xem
 *    aptisprep-weekly.mjs) vào data/aptisprep-export/monthly-<ngày>/.
 * 2. --apply: chạy import-aptis-2026.mjs để thêm đề trọng điểm mà kho chưa có.
 * 3. Khớp từng đề trọng điểm với một question_set trong kho bằng nội dung (tập từ
 *    của câu hỏi, phương án, đoạn văn — bỏ giải thích và đáp án mẫu), rồi ghi
 *    monthly_focus_topics / monthly_focus_items. Trang nào xuất lỗi thì giữ dữ
 *    liệu cũ của trang đó.
 * 4. Lấy "Mẹo của Admin" từ /api/tips ghi vào study_part_tips.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { exportAll } from './aptisprep-weekly.mjs';

const BASE = 'https://www.aptisprep.com';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMPORTER = fileURLToPath(new URL('./import-aptis-2026.mjs', import.meta.url));
const PART = (n) => `16000000-0000-4000-8000-0000000000${n}`;

/**
 * Trang trọng điểm -> file xuất, Part kho và cách lấy chủ đề.
 * `tp` là khoá trong topic_priorities.json (số sao từng chủ đề).
 */
export const PAGES = [
  { key: 'listening-1', files: ['aptis_listenning_part1.json'], part: PART(21) },
  { key: 'listening-2', files: ['aptis_listening_part2.json'], part: PART(22), topics: true, tp: 'listening_2' },
  { key: 'listening-3', files: ['aptis_listening_part3.json'], part: PART(23), topics: true, tp: 'listening_3' },
  { key: 'listening-4', files: ['aptis_listening_part4.json'], part: PART(24), topics: true, tp: 'listening_4' },
  { key: 'reading-1', files: ['aptis_reading_part1.json'], part: PART(11) },
  { key: 'reading-2-3', files: ['aptis_reading_part2.json', 'aptis_reading_part3.json'], part: PART(12), topics: true },
  { key: 'reading-4', files: ['aptis_reading_part4.json'], part: PART(13), topics: true },
  { key: 'reading-5', files: ['aptis_reading_part5.json'], part: PART(14), topics: true },
  { key: 'speaking-1', files: ['aptis_speaking_part1.json'], part: PART(31) },
  { key: 'speaking-2', files: ['aptis_speaking_part2.json'], part: PART(32) },
  { key: 'speaking-3', files: ['aptis_speaking_part3.json'], part: PART(33) },
  { key: 'speaking-4', files: ['aptis_speaking_part4.json'], part: PART(34) },
];
export const WRITING_PARTS = { 1: PART(41), 2: PART(42), 3: PART(43), 4: PART(44) };
/** Mẹo bên website đánh số theo trang web: reading 3 là trang "Part 2-3". */
const TIP_PAGES = [
  ['listening', 1, 'listening-1'], ['listening', 2, 'listening-2'], ['listening', 3, 'listening-3'], ['listening', 4, 'listening-4'],
  ['reading', 1, 'reading-1'], ['reading', 3, 'reading-2-3'], ['reading', 4, 'reading-4'], ['reading', 5, 'reading-5'],
  ['speaking', 1, 'speaking-1'], ['speaking', 2, 'speaking-2'], ['speaking', 3, 'speaking-3'], ['speaking', 4, 'speaking-4'],
  ['writing', 1, 'writing-1'], ['writing', 2, 'writing-2'], ['writing', 3, 'writing-3'], ['writing', 4, 'writing-4'],
];

// ---------- So khớp nội dung ----------

/** Trường không phải nội dung đề: giải thích, đáp án mẫu, link, mốc thời gian… */
const SKIP = new Set([
  'id', 'question_id', 'block_id', 'lesson_id', 'clubId', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
  'explanation', 'explanationFormats', 'generalExplanation', 'generalExplanationFormats', 'answers', 'sampleAnswer',
  'sample_answer', 'sample_answer_full', 'transcript', 'correctAnswer', 'correct_answer', 'correct_answer_text',
  'audioUrl', 'audio_url', 'imageUrl', 'imageUrl1', 'imageUrl2', 'image_url', 'url', 'highlights', 'topicSlug',
  'topic_slug', 'layout', 'instruction', 'instructions', 'title', 'recommendedTime', 'wordLimit', 'source_url',
]);
export const strings = (value, out = [], skip = SKIP) => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out, skip));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!skip.has(k)) strings(v, out, skip);
  return out;
};
/**
 * Writing Part 4: đề của hai email nằm trong `instruction` từng task (kho lưu nó làm
 * câu hỏi), thư gốc có khi nằm ở `context.title` thay vì `email.body`. Part 2-3 thì
 * `instruction` chỉ là câu dẫn chung, đưa vào lại làm lệch.
 */
const WRITING_SKIP = new Set([...SKIP].filter((k) => k !== 'instruction' && k !== 'title'));

/**
 * Writing Part 2-4: tên đề trong kho luôn mang tên câu lạc bộ ("Book Club (Version 2)"),
 * nên chỉ chọn giữa các bản của đúng câu lạc bộ đó, lấy bản giống nhất. Không có bản
 * nào mang tên câu lạc bộ thì so như các trang khác.
 */
function matchClubPiece(piece, clubName, bank, skip) {
  // Tên kho có khi lệch tên web ("Home Living" / "Home Living Club", "Beautiful homes
  // club" / "Beautiful Houses Club"): lấy các đề trùng NHIỀU từ nhất với tên câu lạc bộ.
  const clubWords = [...words(clubName)].filter((w) => w !== 'club');
  const shared = (b) => { const t = words(b.doc.title); return clubWords.filter((w) => t.has(w)).length; };
  const top = Math.max(0, ...bank.map(shared));
  const own = top ? bank.filter((b) => shared(b) === top) : [];
  if (!own.length) return matchRecord(piece, bank, skip);
  const w = words(strings(piece, [], skip).join(' '));
  let best = null;
  for (const b of own) {
    const there = cover(w, b.words);
    const score = there + cover(b.words, w);
    if (there >= 0.6 && (!best || score > best.score)) best = { id: b.id, score };
  }
  return best?.id ?? null;
}
export const words = (text) => new Set(String(text).toLowerCase().replace(/<[^>]*>/g, ' ')
  .replace(/^\s*\(\s*đề[^)]*\)\s*/giu, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length > 2));
export const cover = (a, b) => { if (!a.size) return 0; let hit = 0; for (const w of a) if (b.has(w)) hit++; return hit / a.size; };
export const norm = (text) => String(text ?? '').toLowerCase().replace(/^\s*\(\s*đề[^)]*\)\s*/iu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Chữ của một document trong kho: đoạn văn, câu hỏi, phương án, hai cột ghép. */
export const docWords = (d) => words([
  d.stimulus?.value ?? '',
  ...(d.items ?? []).flatMap((it) => [it.prompt?.value ?? '', ...(it.options ?? []).map((o) => o.content),
    ...(it.leftItems ?? []).map((o) => o.content), ...(it.rightItems ?? []).map((o) => o.content)]),
].join(' '));

/** Các câu riêng lẻ (đã chuẩn hoá) của một đoạn chữ: bỏ số thứ tự đầu dòng, bỏ câu quá ngắn. */
export const units = (text) => String(text ?? '').replace(/<[^>]*>/g, '\n').split('\n')
  .map((line) => norm(line.replace(/^\s*\d+\.\s*/, ''))).filter((u) => u.length >= 12);
export const docUnits = (d) => [
  ...units(d.stimulus?.value),
  ...(d.items ?? []).flatMap((it) => [...units(it.prompt?.value), ...(it.options ?? []).flatMap((o) => units(o.content)),
    ...(it.leftItems ?? []).flatMap((o) => units(o.content)), ...(it.rightItems ?? []).flatMap((o) => units(o.content))]),
];

/**
 * Vòng 1 — như bộ nhập: đếm số câu trùng nguyên văn (câu hỏi, phương án, đoạn văn).
 * Câu xuất hiện ở hơn 3 đề kho ("Describe this picture") không dùng để phân biệt.
 * Vòng 2 — không có câu nào trùng: so tập từ (website sửa vài chữ).
 */
export function matchRecord(r, bank, skip = SKIP, sure = 2) {
  const mine = new Set(strings(r, [], skip).flatMap(units));
  const w = words(strings(r, [], skip).join(' '));
  let best = null;
  for (const b of bank) {
    let shared = 0;
    for (const u of b.units) if (mine.has(u) && (bank.freq.get(u) ?? 0) <= 3) shared++;
    if (!shared) continue;
    // Trùng ít câu chưa đủ: bản khác phương án/đáp án ("Where does Malik want to go?"
    // có hai bản, Listening 4 có bản giữ nguyên hai câu hỏi nhưng đổi phương án) phải
    // trùng cả tập từ, không thì khớp nhầm sang bản kia. Trùng từ `sure` câu trở lên
    // (Listening 3 — tức là trùng cả phương án; kỹ năng khác 2) thì đã chắc, website
    // sửa vài chữ vẫn nhận.
    const there = cover(w, b.words);
    const back = cover(b.words, w);
    if (shared < sure && (there < 0.8 || back < 0.6)) continue;
    const score = shared * 10 + there + back;
    if (!best || score > best.score) best = { id: b.id, score };
  }
  return best?.id ?? bestMatch(w, bank);
}

/**
 * Listening 1 và 4 — cùng luật với bộ nhập: khớp đề kho chứa ĐỦ mọi câu của bản web
 * (cùng câu hỏi, cùng đáp án đúng, lệch tối đa một phương án). Website có nhiều bản
 * cùng câu hỏi khác phương án/audio; khớp lỏng hơn là trỏ nhầm sang bản kia, sai đáp án.
 */
function listeningItemsOf(r) {
  if (r.question !== undefined) {
    const options = (r.options ?? []).map((o) => o.text ?? o);
    return [{ prompt: r.question, options, answer: options[r.answer_index] }];
  }
  return (r.items ?? []).map((it) => ({ prompt: it.prompt, options: it.options ?? [], answer: (it.options ?? [])[it.answerIndex] }));
}
function matchListening(r, bank) {
  const mine = listeningItemsOf(r).map((i) => ({ prompt: norm(i.prompt), options: i.options.map(norm), answer: norm(i.answer) }));
  let best = null;
  for (const b of bank) {
    let overlap = 0;
    const ok = mine.every((m) => (b.doc.items ?? []).some((it) => {
      if (norm(it.prompt?.value) !== m.prompt) return false;
      const theirs = (it.options ?? []).map((o) => norm(o.content));
      const answer = norm((it.options ?? []).find((o) => o.id === it.answerKey?.selectedOptionId)?.content);
      const same = m.options.filter((o) => theirs.includes(o)).length;
      if (answer !== m.answer || same < Math.max(m.options.length, theirs.length) - 1) return false;
      overlap += same;
      return true;
    }));
    if (ok && (!best || overlap > best.overlap)) best = { id: b.id, overlap };
  }
  return best?.id ?? null;
}

/** Đề kho gần nhất với tập từ `w`: phủ >= 80% từ của đề web, và đề kho phủ ngược >= 60%. */
export function bestMatch(w, bank) {
  let best = null;
  for (const b of bank) {
    const there = cover(w, b.words);
    if (there < 0.8) continue;
    const back = cover(b.words, w);
    if (back < 0.6) continue;
    if (!best || there + back > best.score) best = { id: b.id, score: there + back };
  }
  return best?.id ?? null;
}

/**
 * Vòng cuối cho kỹ năng không có nhiều bản cùng câu hỏi (Reading, Speaking, Listening
 * 2-3): website sửa câu nhiều hơn "vài chữ" nhưng đề đúng vẫn dẫn đầu rõ — nhận đề
 * đứng đầu khi phủ tối thiểu 60%/55% và hơn đề thứ hai ít nhất 0.15.
 */
export function clearLeader(w, bank) {
  const ranked = bank.map((b) => ({ id: b.id, there: cover(w, b.words), back: cover(b.words, w) }))
    .map((x) => ({ ...x, score: x.there + x.back })).sort((a, b) => b.score - a.score);
  const [first, second] = ranked;
  if (!first || first.there < 0.6 || first.back < 0.55) return null;
  return !second || first.score - second.score >= 0.15 ? first.id : null;
}

/** Trang mà các phiên bản giữ nguyên câu chữ, chỉ khác audio và đáp án. */
export const AUDIO_PAGES = new Set(['listening-2', 'listening-3']);

/** Đáp án đúng của từng câu (theo thứ tự) — của đề web và của đề kho. */
const webAnswers = (r) => (r.items ?? []).map((it) => norm((it.options ?? [])[it.answerIndex]?.text ?? (it.options ?? [])[it.answerIndex]));
const bankAnswers = (d) => (d.items ?? []).map((it) => norm((it.options ?? []).find((o) => o.id === it.answerKey?.selectedOptionId)?.content));

/**
 * Listening 2-3: đề kho có cùng file audio (mã SHA-256) với đề web. Kho có hai bản
 * cùng audio thì lấy bản cùng đáp án. Không có mã băm thì null để so chữ như cũ.
 */
function matchByAudio(r, bank) {
  if (!r.__audioHash || !bank.byHash) return null;
  const same = bank.byHash.get(r.__audioHash) ?? [];
  if (!same.length) return null;
  const answers = webAnswers(r).join('|');
  return (same.find((b) => bankAnswers(b.doc).join('|') === answers) ?? same[0]).id;
}

/**
 * Speaking: website hay đổi câu mở đầu ("Describe the picture?" → "Describe these two
 * pictures") và sửa vài chữ câu hỏi phụ. Còn trùng nguyên văn ít nhất một câu hỏi
 * riêng (không phải câu chung chung) và phủ từ >= 55% hai chiều thì nhận đề có điểm
 * cao nhất; hai đề kho giống hệt nhau thì lấy đề đầu, đề kia coi là bản trùng.
 */
function looseShared(r, bank) {
  const mine = new Set(strings(r).flatMap(units));
  const w = words(strings(r).join(' '));
  let best = null;
  for (const b of bank) {
    let shared = 0;
    for (const u of b.units) if (mine.has(u) && (bank.freq.get(u) ?? 0) <= 3) shared++;
    if (!shared) continue;
    const there = cover(w, b.words);
    const back = cover(b.words, w);
    if (there < 0.55 || back < 0.55) continue;
    const score = shared * 10 + there + back;
    if (!best || score > best.score) best = { id: b.id, score };
  }
  return best?.id ?? null;
}

/** Đề kho ứng với một đề web của trang `pageKey`, hoặc null. */
export function matchPageRecord(pageKey, r, bank) {
  if (pageKey === 'listening-1' || pageKey === 'listening-4') return matchListening(r, bank);
  if (AUDIO_PAGES.has(pageKey)) {
    const byAudio = matchByAudio(r, bank);
    if (byAudio) return byAudio;
  }
  return matchRecord(r, bank) ?? clearLeader(words(strings(r).join(' ')), bank)
    ?? (pageKey.startsWith('speaking-') ? looseShared(r, bank) : null);
}

/** Gắn mã SHA-256 audio vào đề web (`__audioHash`) để khớp theo file audio. */
export async function attachAudioHashes(records) {
  for (const r of records) {
    if (!r.audioUrl || r.__audioHash !== undefined) continue;
    try {
      const res = await fetch(r.audioUrl, { signal: AbortSignal.timeout(60_000) });
      r.__audioHash = res.ok ? createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex') : null;
    } catch { r.__audioHash = null; }
  }
}

/** Mã băm audio của mọi asset trong kho: assetId -> sha256. */
export async function audioHashesOf(sql) {
  const [rows] = await sql.query("SELECT id, checksum_sha256 AS hash FROM assets WHERE asset_type = 'AUDIO' AND checksum_sha256 IS NOT NULL");
  return new Map(rows.map((row) => [row.id, row.hash]));
}

/** Writing: Part 1 khớp theo câu hỏi (kho lưu mỗi câu một đề), Part 2-4 theo câu lạc bộ. */
export function matchWritingPiece(part, piece, clubName, bank) {
  bank.byPrompt ??= new Map(bank.map((b) => [norm(b.doc.items?.[0]?.prompt?.value), b.id]));
  return part === 1
    ? bank.byPrompt.get(norm(piece)) || bestMatch(words(piece), bank)
    : matchClubPiece(piece, clubName, bank, part === 4 ? WRITING_SKIP : SKIP);
}

/** Các mẩu cần khớp của một câu lạc bộ Writing: Part 1 là từng câu hỏi, Part khác là cả đề. */
export function writingPieces(part, club) {
  const content = club.content?.[0]?.content ?? {};
  return part === 1 ? (content.messages ?? []).map((m) => m.message) : [club.content];
}

/**
 * Ngân hàng đề của một Part để khớp: chỉ các đề có trong `ids`. `hashOf` (assetId ->
 * sha256) có thì dựng thêm `bank.byHash` để khớp Listening 2-3 theo file audio.
 */
export async function loadBank(docs, partId, ids, hashOf = null) {
  const list = await docs.find({ partId }, { projection: { questionSetId: 1, title: 1, stimulus: 1, items: 1, assets: 1 } }).toArray();
  const bank = list.filter((d) => ids.has(d.questionSetId))
    .map((d) => ({ id: d.questionSetId, words: docWords(d), units: [...new Set(docUnits(d))], doc: d }));
  if (hashOf) {
    bank.byHash = new Map();
    for (const b of bank) {
      for (const hash of new Set((b.doc.assets ?? []).map((a) => hashOf.get(a.assetId)).filter(Boolean))) {
        bank.byHash.set(hash, [...(bank.byHash.get(hash) ?? []), b]);
      }
    }
  }
  // Số đề chứa mỗi câu, để bỏ các câu chung chung khi đếm trùng.
  bank.freq = new Map();
  for (const b of bank) for (const u of b.units) bank.freq.set(u, (bank.freq.get(u) ?? 0) + 1);
  return bank;
}

export const titleOfRecord = (r) => titleOf(r);

const humanize = (slug) => String(slug ?? '').replace(/[-_]+/g, ' ').trim().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
const titleOf = (r) => String(r.data?.title ?? r.title ?? r.data?.article?.title ?? '')
  .replace(/\(\s*Version\s*\d+[^)]*\)/gi, '').replace(/^\s*\(\s*Đề[^)]*\)\s*/iu, '').trim();

// ---------- Chạy ----------

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== '--apply' && !f.startsWith('--dump='))) throw new Error('Chỉ nhận cờ --apply và --dump=<file>.');
  const apply = flags.includes('--apply');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`\n[${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}] aptisprep-monthly-focus ${apply ? '--apply' : '(dry-run)'}`);

  const outDir = `${ROOT}data/aptisprep-export/monthly-${today}`;
  const { summary, errors } = await exportAll(outDir, 'monthly');
  console.log('Xuất:', summary.map((s) => `${s.file.replace(/^aptis_|\.json$/g, '')}=${s.records}`).join(' '));
  for (const e of errors) console.log(`  ! ${e}`);
  const have = new Set(summary.map((s) => s.file));
  const load = (file) => JSON.parse(readFileSync(`${outDir}/${file}`, 'utf8'));
  const recordsOf = (file) => { const j = load(file); return Array.isArray(j) ? j : j.records; };

  // Đề trọng điểm mà kho chưa có thì nhập trước, để bước khớp tìm thấy.
  if (apply) {
    for (const target of ['reading', 'writing', 'listening', 'speaking', 'logs']) {
      const run = spawnSync(process.execPath, [IMPORTER, target], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20,
        env: { ...process.env, DATA_DIR: outDir, IMPORT_BATCH: today, IMPORT_BATCH_START: today },
      });
      const lines = (run.stdout ?? '').split('\n').filter((l) => /cần nhập|Cập nhật đề|BỎ QUA|Error/.test(l));
      console.log(`Nhập ${target}: ${run.status === 0 ? 'xong' : `LỖI mã ${run.status}`}${lines.length ? '\n  ' + lines.join('\n  ') : ''}`);
      if (run.status !== 0 && run.stderr) console.log(run.stderr.slice(0, 2000));
    }
  }

  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis', charset: 'utf8mb4',
  });
  const mongo = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
  const docs = mongo.db().collection('question_set_documents');
  // Chỉ khớp với đề đang PUBLISHED: trang trọng điểm không được dẫn vào đề nháp/đã ẩn.
  const [published] = await sql.query(`SELECT id FROM question_sets WHERE status = 'PUBLISHED'`);
  const live = new Set(published.map((r) => r.id));
  const hashOf = await audioHashesOf(sql);
  const bankCache = new Map();
  const bankOf = async (partId) => {
    if (!bankCache.has(partId)) bankCache.set(partId, await loadBank(docs, partId, live, hashOf));
    return bankCache.get(partId);
  };

  const priorities = existsSync(`${outDir}/topic_priorities.json`) ? load('topic_priorities.json') : {};
  const topics = [];  // { page, key, title, stars, rank, icon, color, description, order }
  const items = [];   // { page, topic, setId, clubPart, version, order, sourceId }
  const report = [];
  const donePages = [];

  for (const page of PAGES) {
    if (page.files.some((f) => !have.has(f))) { report.push(`${page.key}: bỏ qua (xuất lỗi), giữ dữ liệu cũ`); continue; }
    const bank = await bankOf(page.part);
    const records = page.files.flatMap(recordsOf);
    if (AUDIO_PAGES.has(page.key)) await attachAudioHashes(records);
    const tp = page.tp ? priorities[page.tp] ?? {} : {};
    const seenTopics = new Map();
    let matched = 0;
    const missed = [];
    for (const [index, r] of records.entries()) {
      const setId = matchPageRecord(page.key, r, bank);
      if (!setId) { missed.push(titleOf(r) || strings(r).find((s) => s.length > 12)?.slice(0, 50) || r.id); continue; }
      matched++;
      let topic = '';
      if (page.topics) {
        const slug = r.topicSlug ?? r.topic_slug ?? null;
        topic = slug || norm(titleOf(r)).replace(/\s+/g, '-') || '';
        if (topic && !seenTopics.has(topic)) {
          const p = tp[slug] ?? {};
          seenTopics.set(topic, true);
          topics.push({ page: page.key, key: topic, title: titleOf(r) || humanize(slug), stars: p.stars ?? null, rank: p.rank ?? null, order: seenTopics.size });
        }
      }
      items.push({ page: page.key, topic, setId, clubPart: null, version: r.version ?? null, order: index + 1, sourceId: r.id ?? r.block_id ?? r.lesson_id ?? null });
    }
    donePages.push(page.key);
    report.push(`${page.key}: ${matched}/${records.length} khớp${seenTopics.size ? `, ${seenTopics.size} chủ đề` : ''}${missed.length ? ` — chưa khớp: ${missed.slice(0, 4).join(' | ')}${missed.length > 4 ? ' …' : ''}` : ''}`);
  }

  // Writing: mỗi câu lạc bộ là một chủ đề; Part 1 khớp từng câu (kho lưu mỗi câu một đề).
  if ([1, 2, 3, 4].every((p) => have.has(`aptis_writing_part${p}.json`)) && have.has('aptis_writing_clubs.json')) {
    const clubs = load('aptis_writing_clubs.json');
    clubs.forEach((c, i) => topics.push({ page: 'writing', key: c.id, title: c.name, icon: c.icon_name, color: c.color, description: c.description, order: i + 1 }));
    let total = 0, ok = 0;
    const missedWriting = [];
    for (const part of [1, 2, 3, 4]) {
      const bank = await bankOf(WRITING_PARTS[part]);
      for (const club of recordsOf(`aptis_writing_part${part}.json`)) {
        writingPieces(part, club).forEach((piece, k) => {
          total++;
          const setId = matchWritingPiece(part, piece, club.name, bank);
          if (!setId) { missedWriting.push(`${club.name} P${part}: ${String(typeof piece === 'string' ? piece : strings(piece)[0] ?? '').slice(0, 60)}`); return; }
          ok++;
          items.push({ page: 'writing', topic: club.id, setId, clubPart: part, version: club.content?.[0]?.version ?? null, order: k + 1, sourceId: club.content?.[0]?.id ?? null });
        });
      }
    }
    donePages.push('writing');
    report.push(`writing: ${clubs.length} câu lạc bộ, ${ok}/${total} câu/đề khớp${missedWriting.length ? ` — chưa khớp: ${missedWriting.join(' | ')}` : ''}`);
  }
  // Hai đề web cùng trỏ vào một đề kho là dấu hiệu khớp nhầm (trừ Writing: câu Part 1 lặp giữa các câu lạc bộ).
  const dupes = new Map();
  for (const it of items.filter((i) => i.page !== 'writing')) {
    const k = `${it.page}|${it.setId}`;
    dupes.set(k, (dupes.get(k) ?? 0) + 1);
  }
  const shared = [...dupes.entries()].filter(([, c]) => c > 1);
  if (shared.length) {
    report.push(`! ${shared.length} đề kho bị nhiều đề web trỏ vào: ${shared.slice(0, 6).map(([k, c]) => `${k.split('|')[0]}×${c}`).join(', ')}`);
  } else {
    report.push('writing: bỏ qua (xuất lỗi), giữ dữ liệu cũ');
  }
  console.log('\nKhớp đề:\n  ' + report.join('\n  '));

  // Mẹo của Admin (bên website là API công khai, đọc không cần đăng nhập).
  const tips = [];
  for (const [skill, part, key] of TIP_PAGES) {
    try {
      const res = await fetch(`${BASE}/api/tips?skill=${skill}&part=${part}`, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      for (const t of await res.json()) {
        if (t.isActive === false) continue;
        tips.push({ key, title: String(t.title ?? '').trim(), description: String(t.description ?? '').trim() || null,
          content: (t.content ?? []).map((s) => String(s).trim()).filter(Boolean), order: t.order ?? 0 });
      }
    } catch (error) { console.log(`  ! mẹo ${skill} ${part}: ${error.message}`); }
  }
  console.log(`Mẹo Admin: ${tips.length} mục`);

  // --dump=<file>: ghi kết quả khớp ra JSON để soi hoặc dựng dữ liệu thử giao diện, không đụng DB.
  const dump = flags.find((f) => f.startsWith('--dump='))?.slice('--dump='.length);
  if (dump) {
    writeFileSync(dump, JSON.stringify({ topics, items, tips }, null, 2));
    console.log(`Đã ghi kết quả khớp ra ${dump}`);
  }

  if (!apply) {
    console.log('\n(dry-run) Chưa ghi gì. Thêm --apply để nhập đề thiếu và ghi bảng trọng điểm.');
  } else {
    const [[{ n }]] = await sql.query(`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'monthly_focus_items'`);
    if (!Number(n)) throw new Error('Chưa có bảng monthly_focus_* — deploy backend (migration V71) trước.');
    await sql.beginTransaction();
    try {
      const pages = donePages;
      await sql.query(`DELETE FROM monthly_focus_items WHERE page_key IN (?)`, [pages]);
      await sql.query(`DELETE FROM monthly_focus_topics WHERE page_key IN (?)`, [pages]);
      for (const t of topics) {
        await sql.execute(
          `INSERT INTO monthly_focus_topics (id, page_key, topic_key, title, stars, topic_rank, icon_name, color, description, display_order, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [randomUUID(), t.page, t.key, String(t.title || t.key).slice(0, 255), t.stars ?? null, t.rank ?? null,
            t.icon ?? null, t.color ?? null, t.description ? String(t.description).slice(0, 500) : null, t.order]);
      }
      for (const it of items) {
        await sql.execute(
          `INSERT IGNORE INTO monthly_focus_items (id, page_key, topic_key, question_set_id, club_part, version_no, display_order, source_id, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [randomUUID(), it.page, it.topic, it.setId, it.clubPart, it.version, it.order, it.sourceId]);
      }
      if (tips.length) {
        await sql.query(`DELETE FROM study_part_tips WHERE page_key IN (?)`, [[...new Set(tips.map((t) => t.key))]]);
        for (const t of tips) {
          await sql.execute(
            `INSERT INTO study_part_tips (id, page_key, title, description, content, display_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [randomUUID(), t.key, t.title.slice(0, 255), t.description, JSON.stringify(t.content), t.order]);
        }
      }
      await sql.commit();
      console.log(`\nĐã ghi ${topics.length} chủ đề/câu lạc bộ, ${items.length} đề trọng điểm, ${tips.length} mẹo.`);
    } catch (error) {
      await sql.rollback();
      throw error;
    }
  }
  await sql.end();
  await mongo.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
