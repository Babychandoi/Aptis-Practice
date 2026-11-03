/**
 * Đồng bộ ngân hàng đề hằng tuần từ website aptisprep.com sang hệ thống luyện thi.
 *
 *   node scripts/aptisprep-weekly.mjs            # xuất dữ liệu + chạy bộ nhập ở chế độ --dry-run (không ghi)
 *   node scripts/aptisprep-weekly.mjs --apply    # xuất + nhập thật đề mới, ghi trang Cập nhật đề
 *
 * Bước 1 — xuất: đọc gói RSC (Next.js) trong HTML các trang luyện, ghi ra
 * data/aptisprep-export/<ngày>/ đúng tên file và định dạng mà
 * scripts/import-aptis-2026.mjs đang đọc (trước đây phải dán script vào Console
 * trình duyệt cho Listening Part 1 và Speaking; giờ cả hai cũng nằm sẵn trong HTML).
 *
 * Bước 2 — nhập: gọi import-aptis-2026.mjs lần lượt reading, writing, listening,
 * speaking rồi logs, với mã đợt = ngày chạy. Bộ nhập chỉ thêm đề CHƯA có (so theo
 * nội dung), tải audio/ảnh về MinIO, nên chạy lại bao nhiêu lần cũng không trùng.
 *
 * Số Part của website khác ngân hàng, bộ nhập tự quy đổi:
 *   Reading  web 2 + 3 (sắp xếp câu) -> Part 2;  web 4 (ghép ý kiến) -> Part 3;  web 5 (ghép tiêu đề) -> Part 4
 *   Listening, Speaking, Writing giữ nguyên số Part.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE = 'https://www.aptisprep.com';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMPORTER = fileURLToPath(new URL('./import-aptis-2026.mjs', import.meta.url));
const TARGETS = ['reading', 'writing', 'listening', 'speaking', 'logs'];

// ---------- Đọc gói RSC ----------

/** Giải mã Flight data của Next.js thành các khối dữ liệu có tên (questions, initialClubDetail…). */
export function parsePage(html) {
  const chunks = [];
  for (const match of html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)) {
    try {
      const value = JSON.parse(match[1]);
      if (value[0] === 1 && typeof value[1] === 'string') chunks.push(value[1]);
    } catch { /* khối không phải dữ liệu */ }
  }
  const bytes = new TextEncoder().encode(chunks.join(''));
  const decoder = new TextDecoder();
  const rows = new Map();
  let pos = 0;
  while (pos < bytes.length) {
    const start = pos;
    while (pos < bytes.length && bytes[pos] !== 58 && bytes[pos] !== 10) pos++;
    if (pos >= bytes.length) break;
    if (bytes[pos] !== 58) { pos++; continue; }
    const id = decoder.decode(bytes.slice(start, pos++));
    if (!/^[a-f0-9]+$/i.test(id)) { while (pos < bytes.length && bytes[pos++] !== 10); continue; }
    if (bytes[pos] === 84) {
      // Dòng "T<độ dài hex>," là chuỗi thô dài đúng số byte đó.
      pos++;
      const nstart = pos;
      while (pos < bytes.length && bytes[pos] !== 44) pos++;
      const length = parseInt(decoder.decode(bytes.slice(nstart, pos++)), 16);
      if (!Number.isFinite(length) || pos + length > bytes.length) throw new Error('Dòng Flight bị cắt dở.');
      rows.set(id, decoder.decode(bytes.slice(pos, pos + length)));
      pos += length;
    } else {
      const rstart = pos;
      while (pos < bytes.length && bytes[pos] !== 10) pos++;
      const text = decoder.decode(bytes.slice(rstart, pos++));
      try { rows.set(id, JSON.parse(text)); } catch { /* import/error/debug */ }
    }
  }
  const resolve = (value, seen = new Set()) => {
    if (typeof value === 'string') {
      if (value.startsWith('$$')) return value.slice(1);
      if (value === '$undefined') return null;
      if (/^\$[a-f0-9]+$/i.test(value)) {
        const id = value.slice(1);
        if (!rows.has(id)) throw new Error('Không giải được tham chiếu ' + value);
        if (seen.has(id)) throw new Error('Tham chiếu vòng ' + value);
        return resolve(rows.get(id), new Set([...seen, id]));
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => resolve(v, seen));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, seen)]));
    return value;
  };
  const found = [];
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    for (const [key, child] of Object.entries(value)) {
      if (['questions', 'initialClubDetail'].includes(key)) found.push({ key, value: resolve(child) });
      walk(child);
    }
  };
  for (const value of rows.values()) if (typeof value === 'object') walk(value);
  return found;
}

async function get(route) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(BASE + route, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AptisPracticeSync/1.0)', Accept: 'text/html' },
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (error) {
      if (attempt >= 2) throw new Error(`${route}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/** Mảng "questions" lớn nhất của trang mà mọi phần tử đều thoả `accept`. */
async function questionsOf(route, accept) {
  const list = parsePage(await get(route))
    .filter((f) => f.key === 'questions' && Array.isArray(f.value) && f.value.length && f.value.every(accept))
    .sort((a, b) => b.value.length - a.value.length);
  if (!list.length) throw new Error(`${route}: không thấy dữ liệu đề — có thể trang đã đổi cấu trúc.`);
  return list[0].value;
}

// ---------- Chuyển sang định dạng file của bộ nhập ----------

const text = (s) => (typeof s === 'string' ? s.replace(/ /g, ' ').trim() : s ?? null);
const LETTERS = 'ABCDEFGH';

/** Listening Part 1: mỗi câu một dòng như file aptis_listenning_part1.json cũ. */
function listeningPart1Rows(records) {
  const rows = [];
  for (const r of records) {
    for (const it of r.items ?? []) {
      const options = (it.options ?? []).map((o, i) => ({ label: LETTERS[i], text: text(o?.text ?? o) }));
      rows.push({
        number: rows.length + 1, question_id: it.id, block_id: r.id, part: 1, layout: r.layout,
        question: text(it.prompt), options, answer_index: it.answerIndex,
        correct_answer: LETTERS[it.answerIndex] ?? null, correct_answer_text: options[it.answerIndex]?.text ?? null,
        transcript: text(it.explanation), audio_url: r.audioUrl, has_no_audio: r.hasNoAudio,
        created_at: r.createdAt, updated_at: r.updatedAt,
      });
    }
  }
  return rows;
}

/** Reading web Part 5 (ghép tiêu đề): đoạn văn + tiêu đề kèm số đoạn đúng. */
function readingPart5Rows(records) {
  return records.map((r, index) => {
    const paragraphs = (r.data?.article?.paragraphs ?? []).map((p, i) => ({ number: i + 1, id: p.id, content: text(p.content) }));
    const numberOf = new Map(paragraphs.map((p) => [p.id, p.number]));
    return {
      set: index + 1, id: r.id, part: 5, type: r.type, topic_slug: r.topicSlug ?? null, version: r.version ?? null,
      force_key: r.isForceKey ?? null, title: text(r.data?.article?.title),
      paragraphs,
      headings: (r.data?.questions ?? []).map((q, i) => ({
        number: i + 1, id: q.id, text: text(q.text),
        correct_paragraph_id: q.correctParagraphId, correct_paragraph_number: numberOf.get(q.correctParagraphId) ?? null,
      })),
      explanation: r.data?.explanation ?? null,
    };
  });
}

const answersOf = (list) => (list ?? []).map((a, i) => ({ number: i + 1, id: a.id, text: text(a.text) }));
const subQuestions = (list) => (list ?? []).map((q, i) => ({ number: i + 1, id: q.id, question: text(q.question), answers: answersOf(q.answers) }));

const speakingRows = {
  1: (records) => records.map((r, i) => ({
    number: i + 1, id: r.id, question: text(r.question), answers: answersOf(r.answers),
    topic_slug: r.topicSlug ?? null, version: r.version ?? null, force_key: r.isForceKey ?? null,
  })),
  2: (records) => records.map((r, i) => ({
    lesson: i + 1, lesson_id: r.id, image_url: r.imageUrl, image_description: text(r.imageDescription),
    questions: subQuestions(r.subQuestions),
  })),
  3: (records) => records.map((r, i) => ({
    lesson: i + 1, lesson_id: r.id,
    images: [r.imageUrl1, r.imageUrl2].filter(Boolean).map((url, k) => ({ number: k + 1, url, description: text(r[`imageDescription${k + 1}`]) || null })),
    questions: subQuestions(r.subQuestions),
  })),
  4: (records) => records.map((r, i) => {
    const questions = (r.subQuestions ?? []).map((q, k) => ({ number: k + 1, question: text(q.question), sample_answer: text(q.sampleAnswer) }));
    return {
      set: i + 1, id: r.id, questions,
      // Bộ nhập lấy đáp án mẫu từ trường gộp này: câu hỏi rồi câu trả lời, lần lượt từng câu.
      sample_answer_full: questions.filter((q) => q.sample_answer).map((q) => `${q.question}\n${q.sample_answer}`).join('\n\n'),
    };
  }),
};
const speakingShape = {
  1: (q) => typeof q.question === 'string' && Array.isArray(q.answers),
  2: (q) => typeof q.imageUrl === 'string' && Array.isArray(q.subQuestions),
  3: (q) => typeof q.imageUrl1 === 'string' && Array.isArray(q.subQuestions),
  4: (q) => Array.isArray(q.subQuestions) && 'mainTopic' in q,
};

async function writingClubs(fetchedAt) {
  const html = await get('/writing');
  const routes = [...new Set([...html.matchAll(/\/writing\/club\/([a-f0-9]{24})/g)].map((m) => '/writing/club/' + m[1]))];
  if (!routes.length) throw new Error('/writing: không thấy câu lạc bộ nào.');
  const byPart = { 1: [], 2: [], 3: [], 4: [] };
  for (let offset = 0; offset < routes.length; offset += 4) {
    await Promise.all(routes.slice(offset, offset + 4).map(async (route) => {
      const club = parsePage(await get(route)).find((f) => f.key === 'initialClubDetail' && f.value && !Array.isArray(f.value))?.value;
      if (!club) throw new Error(`${route}: không thấy dữ liệu câu lạc bộ.`);
      for (let part = 1; part <= 4; part++) {
        const content = club.parts?.filter((p) => Number(p.part) === part);
        if (!content?.length) throw new Error(`${route}: thiếu Writing Part ${part}.`);
        byPart[part].push({ id: club.id || route.split('/').pop(), name: club.name || club.title || null, source_url: BASE + route, part, content, order: routes.indexOf(route) });
      }
    }));
  }
  return Object.entries(byPart).map(([part, list]) => ({
    file: `aptis_writing_part${part}.json`,
    data: { skill: 'writing', part: Number(part), source_url: BASE + '/writing', fetched_at: fetchedAt, record_count: list.length,
      records: list.sort((a, b) => a.order - b.order).map(({ order, ...rest }) => rest) },
  }));
}

export async function exportAll(outDir) {
  const fetchedAt = new Date().toISOString();
  const jobs = [];
  const wrap = (skill, part, route, records) => ({ skill, part, source_url: BASE + route, fetched_at: fetchedAt, record_count: records.length, records });
  for (const part of [2, 3, 4]) {
    const route = `/listening/practice/part/${part}`;
    jobs.push([`aptis_listening_part${part}.json`, async () => wrap('listening', part, route, await questionsOf(route, (q) => Number(q.part) === part && q.id))]);
  }
  for (const part of [1, 2, 3, 4]) {
    const route = `/reading/practice/part/${part}`;
    jobs.push([`aptis_reading_part${part}.json`, async () => wrap('reading', part, route, await questionsOf(route, (q) => Number(q.part) === part && q.id))]);
  }
  jobs.push(['aptis_reading_part5.json', async () => readingPart5Rows(await questionsOf('/reading/practice/part/5', (q) => Number(q.part) === 5 && q.data?.article))]);
  jobs.push(['aptis_listenning_part1.json', async () => listeningPart1Rows(await questionsOf('/listening/practice/part/1', (q) => Number(q.part) === 1 && Array.isArray(q.items)))]);
  for (const part of [1, 2, 3, 4]) {
    jobs.push([`aptis_speaking_part${part}.json`, async () => speakingRows[part](await questionsOf(`/speaking/practice/part/${part}`, speakingShape[part]))]);
  }

  mkdirSync(outDir, { recursive: true });
  const summary = [];
  const errors = [];
  const save = (file, data) => {
    writeFileSync(`${outDir}/${file}`, JSON.stringify(data, null, 2) + '\n');
    summary.push({ file, records: Array.isArray(data) ? data.length : data.record_count });
  };
  for (const [file, job] of jobs) {
    try {
      const data = await job();
      if (!(Array.isArray(data) ? data.length : data.record_count)) throw new Error(`${file}: rỗng.`);
      save(file, data);
    } catch (error) { errors.push(error.message); }
  }
  try {
    for (const { file, data } of await writingClubs(fetchedAt)) save(file, data);
  } catch (error) { errors.push(error.message); }
  return { summary, errors };
}

// ---------- Chạy ----------

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== '--apply')) throw new Error('Chỉ nhận cờ --apply.');
  const apply = flags.includes('--apply');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`\n[${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}] aptisprep-weekly ${apply ? '--apply' : '(dry-run)'}`);

  const outDir = `${ROOT}data/aptisprep-export/${today}`;
  const { summary, errors } = await exportAll(outDir);
  console.log(`Xuất vào data/aptisprep-export/${today}:`);
  for (const s of summary) console.log(`  ${s.file.padEnd(32)} ${s.records}`);
  for (const e of errors) console.log(`  ! ${e}`);

  // File của kỹ năng nào lỗi thì bỏ qua kỹ năng đó: bộ nhập đọc thiếu file sẽ dừng giữa chừng.
  const have = new Set(summary.map((s) => s.file));
  const needs = {
    reading: [1, 2, 3, 4, 5].map((p) => `aptis_reading_part${p}.json`),
    writing: [1, 2, 3, 4].map((p) => `aptis_writing_part${p}.json`),
    listening: ['aptis_listenning_part1.json', ...[2, 3, 4].map((p) => `aptis_listening_part${p}.json`)],
    speaking: [1, 2, 3, 4].map((p) => `aptis_speaking_part${p}.json`),
    logs: [],
  };
  let failed = errors.length > 0;
  for (const target of TARGETS) {
    const missing = needs[target].filter((f) => !have.has(f));
    if (missing.length) { console.log(`\n=== ${target}: bỏ qua vì thiếu ${missing.join(', ')}`); failed = true; continue; }
    console.log(`\n=== Nhập ${target} ===`);
    const run = spawnSync(process.execPath, [IMPORTER, target, ...(apply ? [] : ['--dry-run'])], {
      cwd: ROOT,
      env: { ...process.env, DATA_DIR: outDir, IMPORT_BATCH: today, IMPORT_BATCH_START: today },
      encoding: 'utf8',
      maxBuffer: 64 << 20,
    });
    process.stdout.write(run.stdout ?? '');
    if (run.stderr) process.stdout.write(run.stderr);
    if (run.status !== 0) { console.log(`  ! bộ nhập ${target} thoát mã ${run.status}`); failed = true; }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
