/**
 * Nhập đề Writing (cả 4 part) từ các file JSON của aptisprep.
 *
 *   node scripts/import-writing.mjs <part> [--dry-run] [--limit N]
 *   node scripts/import-writing.mjs all
 *
 * Mỗi part một cấu trúc riêng, khớp đúng cách ngân hàng hiện tại đang lưu:
 *
 *   P1  mỗi CÂU một bộ (1 item, SHORT). Ngân hàng có 230 bộ dạng này và
 *       practice.merge-item-parts gộp 5 bộ thành một đề khi tạo lượt, nên nhập
 *       lẻ để khớp — không đổi sang bộ-5-câu như Reading Part 1.
 *   P2  1 bộ = 1 item PARAGRAPH.
 *   P3  1 bộ = 3 item CHAT_REPLY, mỗi item một người nói (A/B/C).
 *   P4  1 bộ = 2 item EMAIL (thân mật rồi trang trọng), email gốc nằm ở
 *       stimulus dạng HTML.
 *
 * minWords/maxWords chỉ là khuyến nghị: frontend cảnh báo màu chứ không chặn
 * nhập, backend không chặn nộp. Chúng vào công thức chấm của
 * HeuristicEvaluationEngine — viết lệch khoảng thì bị trừ phần "độ dài phù
 * hợp", giống thi thật. maxWords để rộng hơn số ghi trong đề, theo đúng cách
 * các bộ hiện có đã đặt.
 *
 * Script chạy lại được: đề đã có (so theo nội dung câu hỏi) sẽ bị bỏ qua.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const PART_ID = {
  1: '16000000-0000-4000-8000-000000000041',
  2: '16000000-0000-4000-8000-000000000042',
  3: '16000000-0000-4000-8000-000000000043',
  4: '16000000-0000-4000-8000-000000000044',
};

const RUBRIC = {
  1: 'APTIS_WRITING_PART_1_V1',
  2: 'APTIS_WRITING_PART_2_V1',
  3: 'APTIS_WRITING_PART_3_V1',
  4: 'APTIS_WRITING_PART_4_V1',
};

/** Điểm một bộ, khớp part_scoring_rules và các bộ đang có. */
const SET_MAX_SCORE = { 1: 1, 2: 10, 3: 15, 4: 20 };

/** Khoảng từ mặc định khi header không ghi số. maxWords nới rộng có chủ ý. */
const WORDS = {
  1: { min: 1, max: 15 },
  2: { min: 20, max: 40 },
  3: { min: 30, max: 60 },
  4: { informal: { min: 40, max: 75 }, formal: { min: 120, max: 225 } },
};

const INSTRUCTIONS = {
  1: 'Điền biểu mẫu bằng câu trả lời ngắn. Mỗi câu trả lời từ 1 đến 15 từ.',
  2: 'Viết câu trả lời thành câu hoàn chỉnh, từ 20 đến 40 từ.',
  3: 'Reply naturally to each group-chat message. Write 30 to 60 words for each answer.',
  4: 'Read the club notice, then write one informal email and one formal email.',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitFlag = args.indexOf('--limit');
const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : Infinity;
const target = args[0];

if (!target) {
  console.error('Dùng: node scripts/import-writing.mjs <1|2|3|4|all> [--dry-run] [--limit N]');
  process.exit(1);
}

const env = {
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3307),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? 'root',
  mysqlDb: process.env.MYSQL_DB ?? 'aptis',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis',
};

const normalize = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Tên club viết hoa toàn bộ trong file -> "Art Club". */
function titleCase(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .trim();
}

/** Số từ ghi trong header, ví dụ "Use 20-30 words" hoặc "30 - 40 words". */
function wordsFromHeader(header, fallback) {
  const m = String(header ?? '').match(/(\d+)\s*[-–]\s*(\d+)\s*(?:words|từ)/i);
  if (!m) return fallback;
  const min = Number(m[1]);
  // Nới trần ~1.5 lần như các bộ hiện có (đề ghi 120-150, DB đặt max 225).
  return { min, max: Math.round(Number(m[2]) * 1.5) };
}

function buildItem({ prompt, maxScore, words, inputMode, part, extra = {} }) {
  return {
    id: randomUUID(),
    sequenceNo: extra.sequenceNo ?? 1,
    prompt: { format: 'PLAIN_TEXT', value: prompt },
    responseType: 'LONG_TEXT',
    required: true,
    maxScore,
    options: [],
    leftItems: [],
    rightItems: [],
    constraints: {
      minWords: words.min,
      maxWords: words.max,
      inputMode,
      ...(extra.constraints ?? {}),
    },
    rubricCode: RUBRIC[part],
    answerKey: null,
    explanation: null,
  };
}

/** Mỗi part trả về danh sách bộ: {title, items, stimulus} */
const BUILDERS = {
  1: (topic, lesson) => {
    // Mỗi câu một bộ riêng để khớp 230 bộ 1-câu đang có.
    const words = wordsFromHeader(lesson.part.header, WORDS[1]);
    return (lesson.part.items ?? [])
      .filter((q) => String(q ?? '').trim())
      .map((q) => ({
        title: String(q).trim(),
        stimulus: null,
        items: [
          buildItem({
            prompt: String(q).trim(),
            maxScore: SET_MAX_SCORE[1],
            words,
            inputMode: 'SHORT',
            part: 1,
          }),
        ],
      }));
  },

  2: (topic, lesson) => {
    const q = (lesson.part.items ?? []).find((x) => String(x ?? '').trim());
    if (!q) return [];
    return [
      {
        title: titleCase(topic.topic),
        stimulus: null,
        items: [
          buildItem({
            prompt: String(q).trim(),
            maxScore: SET_MAX_SCORE[2],
            words: wordsFromHeader(lesson.part.header, WORDS[2]),
            inputMode: 'PARAGRAPH',
            part: 2,
          }),
        ],
      },
    ];
  },

  3: (topic, lesson) => {
    // items[0] thường là dòng "Use 30 - 40 words."; câu chat có tiền tố A:/B:/C:
    const chats = (lesson.part.items ?? []).filter((x) => /^\s*[ABC]\s*:/.test(String(x ?? '')));
    if (chats.length === 0) return [];
    const words = wordsFromHeader(
      (lesson.part.items ?? []).find((x) => /words|từ/i.test(String(x ?? ''))) ?? lesson.part.header,
      WORDS[3],
    );
    const per = Math.round((SET_MAX_SCORE[3] / chats.length) * 100) / 100;
    return [
      {
        title: titleCase(topic.topic),
        stimulus: null,
        items: chats.map((line, index) => {
          const text = String(line).trim();
          const speaker = text.match(/^\s*([ABC])\s*:/)?.[1] ?? null;
          return buildItem({
            prompt: text,
            maxScore:
              index === chats.length - 1
                ? Number((SET_MAX_SCORE[3] - per * (chats.length - 1)).toFixed(2))
                : per,
            words,
            inputMode: 'CHAT_REPLY',
            part: 3,
            extra: { sequenceNo: index + 1, constraints: { speaker } },
          });
        }),
      },
    ];
  },

  4: (topic, lesson) => {
    const all = (lesson.part.items ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
    // Hai dòng "1. Write an email to..." / "2. Write an email to..." là yêu cầu
    // viết; phần còn lại là email gốc của câu lạc bộ -> stimulus.
    const tasks = all.filter((x) => /^\d+\.\s*Write\b/i.test(x));
    const body = all.filter((x) => !/^\d+\.\s*Write\b/i.test(x));
    if (tasks.length === 0) return [];

    const html = `<h4>${escapeHtml(titleCase(topic.topic))} – Part 4</h4>${body
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('')}`;

    // Đề thật: email 1 thân mật (điểm thấp), email 2 trang trọng (điểm cao).
    const scores = tasks.length === 2 ? [5, 15] : tasks.map(() => SET_MAX_SCORE[4] / tasks.length);
    const registers = tasks.length === 2 ? ['informal', 'formal'] : tasks.map(() => 'formal');

    return [
      {
        title: titleCase(topic.topic),
        stimulus: { format: 'HTML', value: html },
        items: tasks.map((text, index) => {
          const register = registers[index];
          const words = WORDS[4][register] ?? WORDS[4].formal;
          const embedded = text.match(/\(?about\s*([\d\s\-–]+)\s*words?\)?/i)?.[1]?.trim();
          return buildItem({
            prompt: text.replace(/^\d+\.\s*/, ''),
            maxScore: scores[index],
            words: embedded ? wordsFromHeader(`${embedded} words`, words) : words,
            inputMode: 'EMAIL',
            part: 4,
            extra: {
              sequenceNo: index + 1,
              constraints: {
                register,
                emailType: register,
                ...(embedded ? { embeddedWordInstruction: `${embedded} words` } : {}),
              },
            },
          });
        }),
      },
    ];
  },
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function importPart(part, sql, docs) {
  const partId = PART_ID[part];
  const file = `AptisPrep.com/writting/part ${part}/writing_part${part}.json`;
  const payload = JSON.parse(readFileSync(file, 'utf8'));

  // Dựng danh sách bộ từ file
  const candidates = [];
  for (const topic of payload.topics ?? []) {
    for (const lesson of topic.lessons ?? []) {
      if (!lesson.part || !(lesson.part.items ?? []).length) continue;
      candidates.push(...BUILDERS[part](topic, lesson));
    }
  }

  // Tập câu đã có trong DB của part này
  const existing = await docs.find({ partId }).toArray();
  const known = new Set();
  for (const doc of existing) {
    for (const item of doc.items ?? []) {
      const v = item?.prompt?.value;
      if (v) known.add(normalize(v));
    }
  }

  const fresh = candidates.filter((set) => {
    const prompts = set.items.map((i) => normalize(i.prompt.value)).filter(Boolean);
    return prompts.length > 0 && !prompts.some((p) => known.has(p));
  });

  console.log(
    `\n=== Writing Part ${part} === file: ${candidates.length} bộ | DB: ${existing.length} | cần nhập: ${fresh.length}`,
  );

  const targets = fresh.slice(0, limit);
  if (dryRun) {
    for (const set of targets.slice(0, 3)) {
      console.log(`  [dry] ${set.title}`);
      if (set.stimulus) console.log(`        stimulus: ${set.stimulus.value.slice(0, 100)}…`);
      for (const item of set.items) {
        console.log(
          `        ${item.sequenceNo}. [${item.maxScore}đ ${item.constraints.minWords}-${item.constraints.maxWords} từ ${item.constraints.inputMode}] ${item.prompt.value.slice(0, 70)}`,
        );
      }
    }
    console.log(`  (dry-run) sẽ nhập ${targets.length} bộ.`);
    return 0;
  }

  const [[{ createdBy }]] = await sql.query(
    `SELECT id AS createdBy FROM users WHERE email = 'plat-admin@test.local' LIMIT 1`,
  );
  const [[{ taskTypeId }]] = await sql.query(
    `SELECT id AS taskTypeId FROM task_types WHERE code = 'LONG_TEXT' LIMIT 1`,
  );
  const prefix = `WRITING_P${part}_AP_`;
  const [[{ maxNo }]] = await sql.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code, CHAR_LENGTH(?) + 1) AS UNSIGNED)), 0) AS maxNo
       FROM question_sets WHERE part_id = ? AND code LIKE CONCAT(?, '%')`,
    [prefix, partId, prefix],
  );

  let nextNo = Number(maxNo) + 1;
  let imported = 0;

  for (const set of targets) {
    const maxScore = set.items.reduce((sum, i) => sum + i.maxScore, 0);
    const code = `${prefix}${String(nextNo).padStart(3, '0')}`;
    const questionSetId = randomUUID();
    const title = set.title.length > 200 ? `${set.title.slice(0, 197)}…` : set.title;

    await sql.execute(
      `INSERT INTO question_sets
         (id, part_id, task_type_id, code, title, hotness, exam_year,
          access_level, status, current_revision, item_count, max_score,
          published_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 3, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
      [questionSetId, partId, taskTypeId, code, title, set.items.length, maxScore, createdBy],
    );

    await docs.insertOne({
      _id: randomUUID(),
      questionSetId,
      revision: 1,
      schemaVersion: 1,
      partId,
      taskTypeCode: 'LONG_TEXT',
      title,
      instructions: INSTRUCTIONS[part],
      accessLevel: 'PREMIUM',
      stimulus: set.stimulus,
      sections: [],
      items: set.items,
      assets: [],
      settings: {
        shuffleOptions: false,
        shuffleItems: false,
        maxAudioPlays: null,
        showAnswerAfterEachItem: false,
        allowReview: true,
      },
      scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore },
      sourceRef: { provider: 'aptisprep', skill: 'writing', part },
      _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
    });

    console.log(`  + ${code} — ${title} (${set.items.length} câu, ${maxScore} điểm)`);
    nextNo += 1;
    imported += 1;
  }

  console.log(`  Đã nhập ${imported}/${targets.length} bộ.`);
  return imported;
}

async function main() {
  const sql = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDb,
  });
  const mongo = new MongoClient(env.mongoUri);
  await mongo.connect();
  const docs = mongo.db().collection('question_set_documents');

  const parts = target === 'all' ? [1, 2, 3, 4] : [Number(target)];
  let total = 0;
  for (const part of parts) {
    if (!PART_ID[part]) throw new Error(`Part không hợp lệ: ${part}`);
    total += await importPart(part, sql, docs);
  }
  console.log(`\nTổng đã nhập: ${total} bộ.`);

  await sql.end();
  await mongo.close();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
