#!/usr/bin/env node
/**
 * Đồng bộ "Khởi động hằng ngày" từ aptisprep.com (web của chính chủ hệ thống):
 *  - bộ câu gõ của ngày (warmUp trên trang chủ) → daily_warm_ups;
 *  - ngân hàng Speaking Marathon Part 1-4 (/api/speaking-marathon) → speaking_marathon_questions.
 *
 * Chạy cùng job dự đoán đề (scripts/aptisprep-sync.cmd). Không có --apply thì chỉ in.
 */
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';

const BASE = 'https://www.aptisprep.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; AptisPracticeSync/1.0)' };

/** Ghép các mảnh RSC Flight `self.__next_f.push([1,"…"])` thành một chuỗi. */
export function flightOf(html) {
  let out = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    out += JSON.parse(`"${m[1]}"`);
  }
  return out;
}

/** Đọc một giá trị JSON bắt đầu ở vị trí `start` (mảng hoặc object), bỏ qua ngoặc trong chuỗi. */
function balancedJson(text, start) {
  const open = text[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('JSON không đóng ngoặc.');
}

/** Lấy {dayKey, items:[{id,prompt,text}]} từ HTML trang chủ. */
export function extractWarmUp(html) {
  const flight = flightOf(html);
  const m = flight.match(/"dayKey":"(\d{4}-\d{2}-\d{2})","warmUp":\[/);
  if (!m) throw new Error('Trang chủ không có warmUp — có thể trang đổi cấu trúc.');
  const raw = balancedJson(flight, m.index + m[0].length - 1);
  const items = raw
    .filter((x) => x && typeof x.word === 'string' && x.word.trim() && typeof x.prompt === 'string')
    .map((x) => ({ id: String(x.id ?? '').slice(0, 300), prompt: x.prompt.trim(), text: x.word.trim() }));
  return { dayKey: m[1], items };
}

const strings = (list) => (Array.isArray(list) ? list.filter((s) => typeof s === 'string') : []);

/** Chuẩn hoá câu Speaking Marathon của một Part. */
export function normalizeMarathon(json) {
  const list = Array.isArray(json?.questions) ? json.questions : [];
  return list
    .filter((q) => q && typeof q.id === 'string' && typeof q.question === 'string' && strings(q.sentences).length)
    .map((q, i) => ({
      id: q.id.slice(0, 64),
      groupId: typeof q.groupId === 'string' ? q.groupId.slice(0, 64) : null,
      question: q.question.trim().slice(0, 500),
      questionVi: typeof q.questionVi === 'string' ? q.questionVi.trim().slice(0, 500) : null,
      ideas: strings(q.ideas),
      ideasVi: strings(q.ideasVi),
      sentences: strings(q.sentences),
      sentencesVi: strings(q.sentencesVi),
      images: strings(q.images).filter((u) => /^https:\/\//.test(u)),
      order: i + 1,
    }));
}

async function get(path, accept) {
  const res = await fetch(BASE + path, {
    headers: { ...HEADERS, Accept: accept }, signal: AbortSignal.timeout(30_000), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return accept === 'application/json' ? res.json() : res.text();
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== '--apply')) throw new Error('Chỉ nhận cờ --apply.');
  const apply = flags.includes('--apply');
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`[${stamp}] aptisprep-warmup ${apply ? '--apply' : '(chỉ đọc)'}`);

  const warm = extractWarmUp(await get('/', 'text/html'));
  console.log(`Khởi động ngày ${warm.dayKey}: ${warm.items.length} câu gõ.`);
  const marathon = {};
  for (const part of [1, 2, 3, 4]) {
    try {
      marathon[part] = normalizeMarathon(await get(`/api/speaking-marathon?part=${part}`, 'application/json'));
      console.log(`Speaking Marathon Part ${part}: ${marathon[part].length} câu.`);
    } catch (error) {
      console.log(`Speaking Marathon Part ${part}: lỗi ${error.message} — giữ bản cũ.`);
    }
  }
  if (!apply) { console.log('(chỉ đọc) Chưa ghi gì.'); return; }

  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'root',
    database: process.env.MYSQL_DB ?? 'aptis',
    charset: 'utf8mb4',
  });
  try {
    if (warm.items.length >= 3) {
      await db.execute(
        'INSERT INTO daily_warm_ups (day_key, items, synced_at) VALUES (?, ?, NOW()) '
        + 'ON DUPLICATE KEY UPDATE items = VALUES(items), synced_at = NOW()',
        [warm.dayKey, JSON.stringify(warm.items)]);
      console.log(`Đã ghi bộ gõ ngày ${warm.dayKey}.`);
    } else {
      console.log('Bộ gõ quá ít câu, không ghi.');
    }
    for (const [part, list] of Object.entries(marathon)) {
      // Nguồn trả rỗng/quá ít thì giữ bản cũ thay vì xoá sạch.
      if (!list || list.length < 3) continue;
      await db.beginTransaction();
      try {
        await db.execute('DELETE FROM speaking_marathon_questions WHERE part = ?', [part]);
        for (const q of list) {
          await db.execute(
            'INSERT INTO speaking_marathon_questions '
            + '(id, part, group_id, question, question_vi, ideas, ideas_vi, sentences, sentences_vi, images, display_order, synced_at) '
            + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) '
            + 'ON DUPLICATE KEY UPDATE part = VALUES(part), display_order = VALUES(display_order), synced_at = NOW()',
            [q.id, part, q.groupId, q.question, q.questionVi, JSON.stringify(q.ideas), JSON.stringify(q.ideasVi),
              JSON.stringify(q.sentences), JSON.stringify(q.sentencesVi), JSON.stringify(q.images), q.order]);
        }
        await db.commit();
      } catch (error) {
        await db.rollback();
        throw error;
      }
    }
    console.log('Đã cập nhật ngân hàng Speaking Marathon.');
  } finally {
    await db.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('LỖI:', error.message); process.exitCode = 1; });
}
