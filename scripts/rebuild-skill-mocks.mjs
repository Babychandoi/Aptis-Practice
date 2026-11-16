#!/usr/bin/env node
/**
 * Cho bài test full theo kỹ năng (thi thử Listening/Reading/Speaking/Writing, chọn
 * sẵn đề — luật FIXED) chỉ dùng đề chuẩn đang hiển thị trong ngân hàng.
 *
 *   node scripts/rebuild-skill-mocks.mjs                      # in kế hoạch, không ghi
 *   node scripts/rebuild-skill-mocks.mjs --apply              # ghi
 *   … --dir=data/aptisprep-export/2026-11-16 | --dir=today    # bản xuất trang luyện (mặc định: mới nhất)
 *
 * - Listening/Reading/Speaking: giữ số bài và cấu trúc từng bài; đề đã ẩn (listed = 0)
 *   thay bằng đề chuẩn cùng Part — ưu tiên đề ít bài dùng nhất, khác chủ đề với các đề
 *   còn lại trong bài, không lặp trong một bài.
 * - Writing: mỗi câu lạc bộ trên trang /writing của aptisprep.com là một bài, gồm 5 câu
 *   Part 1 và đề Part 2-3-4 của chính câu lạc bộ đó. Có bài cùng tên thì cập nhật, chưa
 *   có thì tạo. Bài của câu lạc bộ không còn trên web thì listed = 0 (vẫn PUBLISHED để
 *   link trong bài bảng tin cũ còn làm được, xem V75).
 * Lịch sử làm bài không đổi: mỗi lượt làm đã lưu bản chụp đề riêng.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { WRITING_PARTS, loadBank, matchWritingPiece, writingPieces, norm } from './aptisprep-monthly-focus.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKILLS = ['LISTENING', 'READING', 'SPEAKING'];
const WRITING_PREFIX = 'Thi thử Writing - ';
const clubKey = (name) => norm(String(name).replace(/\([^)]*\)/g, ' ')).replace(/\bclub\b/g, '').replace(/\s+/g, ' ').trim();
const isNewsCopy = (name) => /bảng tin/i.test(name);

function exportDir(flag) {
  const base = `${ROOT}data/aptisprep-export`;
  if (flag === 'today') return `${base}/${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
  if (flag) return flag.startsWith('/') || /^[A-Za-z]:/.test(flag) ? flag : `${ROOT}${flag}`;
  const dated = readdirSync(base).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dated.length) throw new Error('Chưa có bản xuất trang luyện nào.');
  return `${base}/${dated.at(-1)}`;
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== '--apply' && !f.startsWith('--dir='))) throw new Error('Chỉ nhận cờ --apply và --dir=<thư mục>.');
  const apply = flags.includes('--apply');
  const dir = exportDir(flags.find((f) => f.startsWith('--dir='))?.slice('--dir='.length));
  console.log(`\n[${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}] rebuild-skill-mocks ${apply ? '--apply' : '(dry-run)'} · ${dir}`);

  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1', port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root', password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis', charset: 'utf8mb4',
  });
  const mongo = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
  try {
    const [[col]] = await sql.query(
      "SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'test_blueprints' AND column_name = 'listed'");
    const bpListed = Number(col.n) > 0;
    if (!bpListed && apply) throw new Error('test_blueprints chưa có cột listed — deploy migration V75 trước.');

    // Đề chuẩn đang hiển thị, theo Part.
    const [setRows] = await sql.query(
      `SELECT qs.id, qs.part_id AS partId, qs.topic_id AS topicId, qs.code, qs.listed
         FROM question_sets qs WHERE qs.status = 'PUBLISHED' AND qs.owner_teacher_id IS NULL`);
    const setById = new Map(setRows.map((s) => [s.id, s]));
    const isStandard = (id) => Number(setById.get(id)?.listed) === 1;
    const pool = new Map();
    for (const s of setRows) if (Number(s.listed) === 1) pool.set(s.partId, [...(pool.get(s.partId) ?? []), s]);

    const [bps] = await sql.query(
      `SELECT b.id, b.code, b.name, c.code AS comp, ${bpListed ? 'b.listed' : '1 AS listed'}
         FROM test_blueprints b JOIN components c ON c.id = b.component_id
        WHERE b.status = 'PUBLISHED' AND b.mode = 'MOCK_TEST' AND b.owner_teacher_id IS NULL
        ORDER BY b.code`);
    const [rules] = await sql.query(
      `SELECT r.id, r.blueprint_id AS bpId, r.part_id AS partId, r.question_set_count AS cnt, r.selection_strategy AS strategy, r.display_order AS ord
         FROM blueprint_part_rules r ORDER BY r.blueprint_id, r.display_order`);
    const [fixed] = await sql.query(
      'SELECT blueprint_rule_id AS ruleId, question_set_id AS setId FROM blueprint_fixed_question_sets ORDER BY blueprint_rule_id, display_order');
    const fixedOf = new Map();
    for (const f of fixed) fixedOf.set(f.ruleId, [...(fixedOf.get(f.ruleId) ?? []), f.setId]);
    const rulesOf = new Map();
    for (const r of rules) rulesOf.set(r.bpId, [...(rulesOf.get(r.bpId) ?? []), r]);

    const writes = [];          // { ruleId, setIds }
    const creates = [];         // { name, club, sets }
    const unlist = [];          // blueprint ids
    const relist = [];

    // ---------- Listening / Reading / Speaking ----------
    const usage = new Map();
    const target = bps.filter((b) => SKILLS.includes(b.comp));
    for (const b of target) for (const r of rulesOf.get(b.id) ?? []) for (const id of fixedOf.get(r.id) ?? []) if (isStandard(id)) usage.set(id, (usage.get(id) ?? 0) + 1);
    const report = new Map();
    for (const b of target) {
      const inBp = new Set();
      const topics = new Set();
      const plan = [];
      for (const r of (rulesOf.get(b.id) ?? []).filter((x) => x.strategy === 'FIXED')) {
        const current = fixedOf.get(r.id) ?? [];
        const keep = current.filter(isStandard);
        keep.forEach((id) => { inBp.add(id); if (setById.get(id)?.topicId) topics.add(setById.get(id).topicId); });
        plan.push({ r, current, keep });
      }
      let replaced = 0;
      for (const p of plan) {
        const out = [...p.keep];
        const need = Math.max(p.r.cnt, p.current.length) - out.length;
        for (let k = 0; k < need; k++) {
          const candidates = (pool.get(p.r.partId) ?? []).filter((s) => !inBp.has(s.id));
          if (!candidates.length) break;
          candidates.sort((x, y) => ((topics.has(x.topicId) ? 1 : 0) - (topics.has(y.topicId) ? 1 : 0))
            || ((usage.get(x.id) ?? 0) - (usage.get(y.id) ?? 0)) || x.code.localeCompare(y.code));
          const pick = candidates[0];
          out.push(pick.id);
          inBp.add(pick.id);
          if (pick.topicId) topics.add(pick.topicId);
          usage.set(pick.id, (usage.get(pick.id) ?? 0) + 1);
          replaced++;
        }
        if (out.join() !== p.current.join()) writes.push({ ruleId: p.r.id, setIds: out });
      }
      const x = report.get(b.comp) ?? { bps: 0, changed: 0, replaced: 0 };
      x.bps++; if (replaced) x.changed++; x.replaced += replaced;
      report.set(b.comp, x);
    }
    for (const [comp, x] of report) {
      const used = [...usage.keys()].filter((id) => SKILLS.includes(comp) && target.some(() => true)).length;
      console.log(`${comp.padEnd(10)} ${x.bps} bài, sửa ${x.changed} bài, thay ${x.replaced} đề đã ẩn bằng đề chuẩn`);
      void used;
    }
    const partCoverage = new Map();
    for (const [id] of usage) { const p = setById.get(id)?.partId; partCoverage.set(p, (partCoverage.get(p) ?? 0) + 1); }

    // ---------- Writing theo câu lạc bộ ----------
    const writingFiles = [1, 2, 3, 4].map((p) => `${dir}/aptis_writing_part${p}.json`);
    if (writingFiles.every(existsSync)) {
      const docs = mongo.db().collection('question_set_documents');
      const live = new Set(setRows.filter((s) => Number(s.listed) === 1).map((s) => s.id));
      const clubs = new Map(); // key -> { name, sets: {1:[],2:[],3:[],4:[]} }
      for (const [n, partId] of Object.entries(WRITING_PARTS)) {
        const part = Number(n);
        const bank = await loadBank(docs, partId, live);
        const recs = JSON.parse(readFileSync(writingFiles[part - 1], 'utf8'));
        for (const club of Array.isArray(recs) ? recs : recs.records) {
          const key = clubKey(club.name);
          if (!clubs.has(key)) clubs.set(key, { name: club.name, sets: { 1: [], 2: [], 3: [], 4: [] } });
          for (const piece of writingPieces(part, club)) {
            const id = matchWritingPiece(part, piece, club.name, bank);
            if (id && !clubs.get(key).sets[part].includes(id)) clubs.get(key).sets[part].push(id);
          }
        }
      }
      const writingBps = bps.filter((b) => b.comp === 'WRITING');
      const used = new Set();
      let updated = 0, incomplete = [];
      const complete = [];
      for (const [key, club] of clubs) {
        const ok = club.sets[1].length >= 3 && [2, 3, 4].every((p) => club.sets[p].length === 1);
        if (!ok) incomplete.push(`${club.name} (P1 ${club.sets[1].length}, P2 ${club.sets[2].length}, P3 ${club.sets[3].length}, P4 ${club.sets[4].length})`);
        else complete.push([key, club]);
      }
      // Ghép câu lạc bộ web với bài sẵn có, hai lượt: (1) cùng tên — bỏ "(Version 1)" và
      // phụ đề sau dấu gạch ("Movie Club – A Film Recommendation"); (2) tên lệch
      // ("Healthy"/"Health") thì nhận theo đề Part 2/4 bài đang gắn. Bản riêng của bài
      // bảng tin không dùng lại.
      const bpKey = (b) => clubKey(b.name.replace(WRITING_PREFIX, '').split(/\s+[–-]\s+/)[0]);
      const fixedSetsOf = (b) => new Set((rulesOf.get(b.id) ?? []).flatMap((r) => fixedOf.get(r.id) ?? []));
      const free = () => writingBps.filter((b) => !used.has(b.id) && !isNewsCopy(b.name));
      const chosen = new Map();
      for (const [key] of complete) {
        const extra = (b) => (/version|–|\s-\s/i.test(b.name.replace(WRITING_PREFIX, "")) ? 1 : 0);
        const list = free().filter((b) => bpKey(b) === key).sort((a, b) => extra(a) - extra(b) || a.code.localeCompare(b.code));
        if (list[0]) { chosen.set(key, list[0]); used.add(list[0].id); }
      }
      for (const [key, club] of complete) {
        if (chosen.has(key)) continue;
        const hit = free().find((b) => { const has = fixedSetsOf(b); return has.has(club.sets[2][0]) || has.has(club.sets[4][0]); });
        if (hit) { chosen.set(key, hit); used.add(hit.id); }
      }
      for (const [key, club] of complete) {
        const bp = chosen.get(key);
        if (!bp) { creates.push({ name: `${WRITING_PREFIX}${club.name}`, club, sets: club.sets }); continue; }

        if (Number(bp.listed) === 0) relist.push(bp.id);
        const byPart = new Map((rulesOf.get(bp.id) ?? []).map((r) => [r.partId, r]));
        let changed = false;
        for (const [n, partId] of Object.entries(WRITING_PARTS)) {
          const r = byPart.get(partId);
          if (!r) { changed = true; continue; }
          const next = club.sets[Number(n)];
          if ((fixedOf.get(r.id) ?? []).join() !== next.join() || r.cnt !== next.length) { writes.push({ ruleId: r.id, setIds: next }); changed = true; }
        }
        if (changed) updated++;
      }
      for (const b of writingBps) if (!used.has(b.id) && Number(b.listed) === 1) unlist.push(b.id);
      console.log(`WRITING    ${clubs.size} câu lạc bộ trên web: cập nhật ${updated} bài, tạo mới ${creates.length} bài, gỡ khỏi danh sách ${unlist.length} bài (câu lạc bộ không còn trên web)`);
      if (creates.length) console.log(`  tạo mới: ${creates.map((c) => c.club.name).join(', ')}`);
      if (unlist.length) console.log(`  gỡ: ${writingBps.filter((b) => unlist.includes(b.id)).map((b) => b.name.replace(WRITING_PREFIX, '')).join(', ')}`);
      if (incomplete.length) console.log(`  ! thiếu đề, bỏ qua: ${incomplete.join('; ')}`);
    } else {
      console.log('WRITING    bỏ qua: thiếu file xuất câu lạc bộ.');
    }

    if (!apply) { console.log('(dry-run) Chưa ghi gì. Thêm --apply để ghi.'); return; }

    const [[tpl]] = await sql.query(
      `SELECT exam_version_id AS ev, component_id AS comp, access_level AS access, duration_seconds AS dur
         FROM test_blueprints WHERE code LIKE 'MOCK_WRITING_CLUB_%' ORDER BY code LIMIT 1`);
    const [[{ maxCode }]] = await sql.query("SELECT MAX(code) AS maxCode FROM test_blueprints WHERE code LIKE 'MOCK_WRITING_CLUB_%'");
    let nextNo = Number(String(maxCode ?? '').match(/(\d+)$/)?.[1] ?? 0);
    await sql.beginTransaction();
    try {
      for (const w of writes) {
        await sql.query('DELETE FROM blueprint_fixed_question_sets WHERE blueprint_rule_id = ?', [w.ruleId]);
        for (const [i, id] of w.setIds.entries()) {
          await sql.query('INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order) VALUES (?, ?, ?)', [w.ruleId, id, i + 1]);
        }
        await sql.query('UPDATE blueprint_part_rules SET question_set_count = ? WHERE id = ?', [w.setIds.length, w.ruleId]);
      }
      for (const c of creates) {
        const id = randomUUID();
        const code = `MOCK_WRITING_CLUB_${String(++nextNo).padStart(3, '0')}`;
        await sql.query(
          `INSERT INTO test_blueprints (id, exam_version_id, component_id, owner_teacher_id, code, name, description, mode, access_level, duration_seconds, status, listed, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, 'MOCK_TEST', ?, ?, 'PUBLISHED', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [id, tpl.ev, tpl.comp, code, c.name, `Đủ 4 phần Writing, Part 2-3-4 cùng chủ đề ${c.club.name}`, tpl.access, tpl.dur]);
        for (const [n, partId] of Object.entries(WRITING_PARTS)) {
          const ruleId = randomUUID();
          const sets = c.sets[Number(n)];
          await sql.query(
            `INSERT INTO blueprint_part_rules (id, blueprint_id, part_id, question_set_count, selection_strategy, allow_free_content, allow_premium_content, display_order)
             VALUES (?, ?, ?, ?, 'FIXED', 1, 1, ?)`, [ruleId, id, partId, sets.length, Number(n)]);
          for (const [i, sid] of sets.entries()) {
            await sql.query('INSERT INTO blueprint_fixed_question_sets (blueprint_rule_id, question_set_id, display_order) VALUES (?, ?, ?)', [ruleId, sid, i + 1]);
          }
        }
      }
      if (unlist.length) await sql.query('UPDATE test_blueprints SET listed = 0, updated_at = UTC_TIMESTAMP() WHERE id IN (?)', [unlist]);
      if (relist.length) await sql.query('UPDATE test_blueprints SET listed = 1, updated_at = UTC_TIMESTAMP() WHERE id IN (?)', [relist]);
      const touched = [...new Set(writes.map((w) => rules.find((r) => r.id === w.ruleId)?.bpId).filter(Boolean))];
      if (touched.length) await sql.query('UPDATE test_blueprints SET updated_at = UTC_TIMESTAMP() WHERE id IN (?)', [touched]);
      await sql.commit();
    } catch (error) {
      await sql.rollback();
      throw error;
    }
    console.log(`Đã ghi: ${writes.length} luật đổi đề, ${creates.length} bài mới, ${unlist.length} bài gỡ khỏi danh sách, ${relist.length} bài hiện lại.`);
  } finally {
    await sql.end();
    await mongo.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
