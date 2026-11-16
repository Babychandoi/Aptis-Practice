#!/usr/bin/env node
/**
 * Giữ ngân hàng đề đúng bộ đề chuẩn của aptisprep.com (web của chính chủ hệ thống).
 *
 *   node scripts/aptisprep-practice-curate.mjs                 # xuất + khớp, in báo cáo, không ghi
 *   node scripts/aptisprep-practice-curate.mjs --apply         # nhập đề còn thiếu, rồi ẩn đề không có trên web
 *   … --dir=data/aptisprep-export/2026-11-16                   # dùng bản xuất có sẵn thay vì xuất lại
 *   … --dir=today                                              # bản xuất hôm nay của job tuần
 *   … --no-import                                              # bỏ bước nhập (job tuần đã nhập rồi)
 *
 * 1. Xuất các trang luyện /listening|reading|speaking/practice/part/N và /writing
 *    (aptisprep-weekly.mjs) — trừ khi có --dir.
 * 2. --apply: chạy import-aptis-2026.mjs để thêm đề web mà kho chưa có.
 * 3. Khớp từng đề web với một question_set trong kho (cùng bộ khớp của Đề trọng điểm).
 * 4. Mỗi Part: đề PUBLISHED của hệ thống (không tính đề giáo viên tự soạn) mà không
 *    khớp đề web nào → listed = 0; đề đã ẩn mà nay khớp lại → listed = 1. Đề ẩn vẫn
 *    PUBLISHED nên lịch sử làm bài và link cũ vẫn mở, làm lại được (xem V73).
 *
 * An toàn: Part nào xuất lỗi, hoặc khớp được dưới MIN_MATCH_RATIO số đề web, thì
 * không đụng tới Part đó — tránh ẩn nhầm cả ngân hàng khi trang web đổi cấu trúc.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { exportAll } from './aptisprep-weekly.mjs';
import {
  PAGES, WRITING_PARTS, AUDIO_PAGES, attachAudioHashes, audioHashesOf, loadBank, matchPageRecord, matchWritingPiece,
  writingPieces, titleOfRecord, strings, norm,
} from './aptisprep-monthly-focus.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMPORTER = fileURLToPath(new URL('./import-aptis-2026.mjs', import.meta.url));
const MIN_MATCH_RATIO = 0.9;
const GRAMMAR_PART = '16000000-0000-4000-8000-000000000001';
const VOCAB_PART = '16000000-0000-4000-8000-000000000002';
const GV_FILE = 'aptis_grammar_vocabulary/aptis_grammar_vocabulary_all.json';
const GV_EXTRA = 'aptis_vocabulary_practice/aptis_vocabulary_new_collocations.json';

const PART_NAMES = {};
for (const p of PAGES) PART_NAMES[p.part] = p.key;
for (const [n, id] of Object.entries(WRITING_PARTS)) PART_NAMES[id] = `writing-${n}`;
PART_NAMES[GRAMMAR_PART] = 'grammar';
PART_NAMES[VOCAB_PART] = 'vocabulary';

/** Đáp án đúng (chữ) của một item kho trắc nghiệm. */
const bankAnswer = (it) => norm((it.options ?? []).find((o) => o.id === it.answerKey?.selectedOptionId)?.content);

/**
 * Grammar: kho lưu mỗi câu một đề. Khớp khi trùng câu hỏi VÀ đáp án đúng; trùng câu hỏi
 * mà khác đáp án là bản khác của web, không tính.
 */
function grammarIndex(bankDocs) {
  const byKey = new Map();
  for (const d of bankDocs) {
    const it = d.items?.[0];
    if (!it) continue;
    const key = norm(it.prompt?.value) + '|' + bankAnswer(it);
    if (!byKey.has(key)) byKey.set(key, d.questionSetId);
  }
  return (q) => byKey.get(norm(q.prompt) + '|' + norm((q.options ?? [])[q.answerIndex])) ?? null;
}

/** Vocabulary: nhóm 5 từ; khớp khi trùng ít nhất 4 từ bên trái và đáp án tương ứng. */
function vocabIndex(bankDocs) {
  const groups = bankDocs.map((d) => {
    const it = d.items?.[0] ?? {};
    const right = new Map((it.rightItems ?? []).map((r) => [r.id, norm(r.content)]));
    const pairs = new Map((it.leftItems ?? []).map((l) => [norm(l.content), right.get(it.answerKey?.matches?.[l.id])]));
    return { id: d.questionSetId, pairs };
  });
  return (g) => {
    const web = (g.matches ?? g.sentences ?? []).map((q) => [norm(q.word ?? q.text), norm(q.correct ?? q.correctAnswer)]);
    let best = null;
    for (const b of groups) {
      const same = web.filter(([w, a]) => b.pairs.has(w) && b.pairs.get(w) === a).length;
      if (same >= Math.min(4, web.length) && (!best || same > best.same)) best = { id: b.id, same };
    }
    return best?.id ?? null;
  };
}

async function main() {
  const flags = process.argv.slice(2);
  const known = (f) => f === '--apply' || f === '--no-import' || f.startsWith('--dir=');
  if (flags.some((f) => !known(f))) throw new Error('Chỉ nhận cờ --apply, --no-import, --dir=<thư mục xuất>.');
  const apply = flags.includes('--apply');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`\n[${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}] aptisprep-practice-curate ${apply ? '--apply' : '(dry-run)'}`);

  const dirRaw = flags.find((f) => f.startsWith('--dir='))?.slice('--dir='.length);
  const dirFlag = dirRaw === 'today' ? `data/aptisprep-export/${today}` : dirRaw;
  const outDir = dirFlag ? (dirFlag.startsWith('/') || /^[A-Za-z]:/.test(dirFlag) ? dirFlag : `${ROOT}${dirFlag}`) : `${ROOT}data/aptisprep-export/${today}`;
  let have;
  if (dirFlag) {
    if (!existsSync(outDir)) throw new Error(`Không thấy thư mục ${outDir}.`);
    have = new Set(['aptis_listenning_part1.json', ...[2, 3, 4].map((p) => `aptis_listening_part${p}.json`),
      ...[1, 2, 3, 4, 5].map((p) => `aptis_reading_part${p}.json`), ...[1, 2, 3, 4].map((p) => `aptis_speaking_part${p}.json`),
      ...[1, 2, 3, 4].map((p) => `aptis_writing_part${p}.json`), 'aptis_writing_clubs.json', GV_FILE, GV_EXTRA].filter((f) => existsSync(`${outDir}/${f}`)));
    console.log(`Dùng bản xuất có sẵn ${outDir} (${have.size} file).`);
  } else {
    const { summary, errors } = await exportAll(outDir, 'practice');
    console.log('Xuất:', summary.map((s) => `${s.file.replace(/^aptis_|\.json$/g, '')}=${s.records}`).join(' '));
    for (const e of errors) console.log(`  ! ${e}`);
    have = new Set(summary.map((s) => s.file));
  }
  const load = (file) => JSON.parse(readFileSync(`${outDir}/${file}`, 'utf8'));
  const recordsOf = (file) => { const j = load(file); return Array.isArray(j) ? j : j.records; };

  if (apply && !flags.includes('--no-import')) {
    for (const target of ['reading', 'writing', 'grammar', 'vocab', 'listening', 'speaking', 'logs']) {
      const run = spawnSync(process.execPath, [IMPORTER, target], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20,
        env: { ...process.env, DATA_DIR: outDir, IMPORT_BATCH: today, IMPORT_BATCH_START: today },
      });
      const lines = (run.stdout ?? '').split('\n').filter((l) => /cần nhập|Cập nhật đề|BỎ QUA|Error/.test(l));
      console.log(`Nhập ${target}: ${run.status === 0 ? 'xong' : `LỖI mã ${run.status}`}${lines.length ? '\n  ' + lines.join('\n  ') : ''}`);
      if (run.status !== 0) throw new Error(`Nhập ${target} lỗi — dừng, chưa ẩn đề nào.${run.stderr ? '\n' + run.stderr.slice(0, 2000) : ''}`);
    }
  }

  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis', charset: 'utf8mb4',
  });
  const mongo = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
  try {
    const [[col]] = await sql.query(
      "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'question_sets' AND column_name = 'listed'");
    const hasListed = Number(col.n) > 0;
    if (!hasListed && apply) throw new Error('Bảng question_sets chưa có cột listed — deploy migration V73 trước.');

    // Đề của hệ thống đang PUBLISHED (cả đề đã ẩn); đề giáo viên tự soạn không đụng tới.
    const [rows] = await sql.query(
      `SELECT id, part_id AS partId, code, title, ${hasListed ? 'listed' : '1 AS listed'}
         FROM question_sets WHERE status = 'PUBLISHED' AND owner_teacher_id IS NULL`);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const live = new Set(byId.keys());
    const docs = mongo.db().collection('question_set_documents');
    const hashOf = await audioHashesOf(sql);

    const keep = new Map();   // partId -> Set(id)
    const stats = new Map();  // partId -> { web, matched, missed[] }
    const add = (partId, id) => { if (!keep.has(partId)) keep.set(partId, new Set()); keep.get(partId).add(id); };
    const stat = (partId) => { if (!stats.has(partId)) stats.set(partId, { web: 0, matched: 0, missed: [], skipped: false }); return stats.get(partId); };

    for (const page of PAGES) {
      const s = stat(page.part);
      if (page.files.some((f) => !have.has(f))) { s.skipped = true; continue; }
      const bank = await loadBank(docs, page.part, live, hashOf);
      const records = page.files.flatMap(recordsOf);
      if (AUDIO_PAGES.has(page.key)) await attachAudioHashes(records);
      for (const r of records) {
        s.web++;
        const id = matchPageRecord(page.key, r, bank);
        if (id) { s.matched++; add(page.part, id); } else {
          s.missed.push(titleOfRecord(r) || strings(r).find((x) => x.length > 12)?.slice(0, 60) || r.id);
        }
      }
    }
    const writingReady = [1, 2, 3, 4].every((p) => have.has(`aptis_writing_part${p}.json`));
    for (const [n, partId] of Object.entries(WRITING_PARTS)) {
      const part = Number(n);
      const s = stat(partId);
      if (!writingReady) { s.skipped = true; continue; }
      const bank = await loadBank(docs, partId, live);
      for (const club of recordsOf(`aptis_writing_part${part}.json`)) {
        for (const piece of writingPieces(part, club)) {
          s.web++;
          const id = matchWritingPiece(part, piece, club.name, bank);
          if (id) { s.matched++; add(partId, id); } else {
            s.missed.push(`${club.name}: ${String(typeof piece === 'string' ? piece : strings(piece)[0] ?? '').slice(0, 50)}`);
          }
        }
      }
    }

    // Grammar & Vocabulary: các Bộ đề + nhóm từ vựng bổ sung của trang luyện.
    for (const partId of [GRAMMAR_PART, VOCAB_PART]) {
      const s = stat(partId);
      if (!have.has(GV_FILE) || (partId === VOCAB_PART && !have.has(GV_EXTRA))) { s.skipped = true; continue; }
      const bankDocs = (await docs.find({ partId }, { projection: { questionSetId: 1, items: 1 } }).toArray())
        .filter((d) => live.has(d.questionSetId));
      const gv = load(GV_FILE).sets;
      if (partId === GRAMMAR_PART) {
        const find = grammarIndex(bankDocs);
        for (const q of gv.flatMap((x) => x.grammar)) {
          s.web++;
          const id = find(q);
          if (id) { s.matched++; add(partId, id); } else s.missed.push(String(q.prompt).slice(0, 60));
        }
      } else {
        const find = vocabIndex(bankDocs);
        for (const g of [...gv.flatMap((x) => x.vocabulary), ...load(GV_EXTRA).records]) {
          s.web++;
          const id = find(g);
          if (id) { s.matched++; add(partId, id); } else s.missed.push(g.id);
        }
      }
    }

    const hide = [];
    const unhide = [];
    const report = [];
    console.log('\nPart            web  khớp  kho  giữ  ẩn mới  hiện lại  ghi chú');
    for (const [partId, s] of stats) {
      const name = PART_NAMES[partId] ?? partId;
      const inPart = rows.filter((r) => r.partId === partId);
      const kept = keep.get(partId) ?? new Set();
      const ratio = s.web ? s.matched / s.web : 0;
      const safe = !s.skipped && s.web > 0 && ratio >= MIN_MATCH_RATIO;
      const toHide = safe ? inPart.filter((r) => !kept.has(r.id) && Number(r.listed) === 1) : [];
      const toShow = safe ? inPart.filter((r) => kept.has(r.id) && Number(r.listed) === 0) : [];
      hide.push(...toHide);
      unhide.push(...toShow);
      const note = s.skipped ? 'BỎ QUA: xuất lỗi' : !safe ? `BỎ QUA: chỉ khớp ${(ratio * 100).toFixed(0)}%` : '';
      console.log(`${name.padEnd(14)} ${String(s.web).padStart(4)} ${String(s.matched).padStart(5)} ${String(inPart.length).padStart(4)} ${String(kept.size).padStart(4)} ${String(toHide.length).padStart(7)} ${String(toShow.length).padStart(9)}  ${note}`);
      if (s.missed.length) console.log(`    chưa khớp ${s.missed.length}: ${s.missed.slice(0, 5).join(' | ')}${s.missed.length > 5 ? ' …' : ''}`);
      report.push({ part: name, partId, web: s.web, matched: s.matched, bank: inPart.length, keep: kept.size, safe,
        missed: s.missed, hide: toHide.map((r) => ({ id: r.id, code: r.code, title: r.title })), unhide: toShow.map((r) => r.id) });
    }
    console.log(`\nTổng: ẩn ${hide.length} đề, hiện lại ${unhide.length} đề.`);
    const reportFile = `${outDir}/curate-report.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
    console.log(`Báo cáo chi tiết: ${reportFile}`);

    if (!apply) { console.log('(dry-run) Chưa ghi gì. Thêm --apply để ẩn/hiện đề.'); return; }
    await sql.beginTransaction();
    try {
      for (let i = 0; i < hide.length; i += 500) {
        await sql.query('UPDATE question_sets SET listed = 0 WHERE id IN (?)', [hide.slice(i, i + 500).map((r) => r.id)]);
      }
      for (let i = 0; i < unhide.length; i += 500) {
        await sql.query('UPDATE question_sets SET listed = 1 WHERE id IN (?)', [unhide.slice(i, i + 500).map((r) => r.id)]);
      }
      await sql.commit();
    } catch (error) {
      await sql.rollback();
      throw error;
    }
    console.log(`Đã ẩn ${hide.length} đề và hiện lại ${unhide.length} đề.`);
  } finally {
    await sql.end();
    await mongo.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
