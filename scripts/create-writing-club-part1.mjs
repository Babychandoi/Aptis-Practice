/**
 * Tạo bộ Writing Part 1 cho từng club, để mỗi club có đủ đề cả 4 Part.
 *
 * Vì sao cần: Part 1 trong ngân hàng đang lưu MỖI CÂU MỘT BỘ (230 bộ câu rời) và
 * không gắn chủ đề, nên không có "đề Part 1 của Music Club". Bài viết hướng dẫn
 * cả 4 phần mà chỉ gắn được đề Part 2/3/4 thì học viên hụt mất phần đầu.
 *
 * Ở đây tạo MỘT bộ chứa đủ 5 câu cho mỗi club, khác cách lưu câu rời. Làm được
 * vì Part 1 chỉ chấm theo rubric từng câu, không phụ thuộc số bộ.
 *
 * Dùng:
 *   node scripts/create-writing-club-part1.mjs [--dry-run]
 */
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const WRITING_PART_1 = '16000000-0000-4000-8000-000000000041';
const TASK_TYPE_SHORT_ANSWER = '12000000-0000-4000-8000-000000000009';
const RUBRIC = 'APTIS_WRITING_PART_1_V1';

const dryRun = process.argv.includes('--dry-run');

/** Năm câu Part 1 cho từng club — bám đúng nội dung bài viết trên bảng tin. */
const CLUBS = [
  {
    topic: 'Music Club',
    code: 'WRITING_P1_CLUB_MUSIC',
    questions: [
      'How many people are in your family?',
      'What is your hobby?',
      'What did you do last night?',
      'How do you go to work?',
      'What kind of music do you like?',
    ],
  },
  {
    topic: 'Fashion Club',
    code: 'WRITING_P1_CLUB_FASHION',
    questions: [
      'What are you wearing today?',
      'How many people are in your family?',
      'What did you do yesterday?',
      'How do you go to school?',
      'What is your hobby?',
    ],
  },
  {
    topic: 'English Club',
    code: 'WRITING_P1_CLUB_ENGLISH',
    questions: [
      'How is the weather today?',
      'What is your favourite season of the year?',
      'What do you like to do every morning?',
      'What do you like to do in your free time?',
      'What did you do last night?',
    ],
  },
  {
    topic: 'Travel Club',
    code: 'WRITING_P1_CLUB_TRAVEL',
    questions: [
      'Where do you live?',
      'How do you usually travel to work?',
      'What is your favourite season?',
      'Who do you travel with?',
      'What did you do last weekend?',
    ],
  },
  {
    topic: 'Computer Club',
    code: 'WRITING_P1_CLUB_COMPUTER',
    questions: [
      'What is your favourite website?',
      'How often do you use a computer?',
      'Where do you usually study?',
      'What is your favourite computer activity?',
      'What did you do online yesterday?',
    ],
  },
];

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DB ?? 'aptis',
});

const mongo = new MongoClient(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
await mongo.connect();
const docs = mongo.db().collection('question_set_documents');

// Tác giả: tài khoản quản trị nền tảng
const [[admin]] = await sql.query(
  "SELECT id FROM users WHERE email = 'plat-admin@test.local' LIMIT 1",
);
if (!admin) {
  throw new Error('Không tìm thấy tài khoản quản trị');
}

let created = 0;
let skipped = 0;

for (const club of CLUBS) {
  const [[topic]] = await sql.query('SELECT id FROM topics WHERE name = ? LIMIT 1', [club.topic]);
  if (!topic) {
    console.log(`  BỎ QUA ${club.topic}: không có chủ đề này`);
    skipped += 1;
    continue;
  }

  const [[existing]] = await sql.query('SELECT id FROM question_sets WHERE code = ? LIMIT 1', [
    club.code,
  ]);
  if (existing) {
    console.log(`  BỎ QUA ${club.topic}: đã có bộ ${club.code}`);
    skipped += 1;
    continue;
  }

  const setId = randomUUID();
  const title = `${club.topic} - Part 1`;

  const items = club.questions.map((question, index) => ({
    id: randomUUID(),
    sequenceNo: index + 1,
    prompt: { format: 'PLAIN_TEXT', value: question },
    responseType: 'LONG_TEXT',
    required: true,
    maxScore: 1,
    options: [],
    leftItems: [],
    rightItems: [],
    // Đề thật yêu cầu trả lời rất ngắn; nới trần lên 15 để không chặn oan người
    // viết đủ câu, còn chấm điểm vẫn theo rubric.
    constraints: { minWords: 1, maxWords: 15, inputMode: 'SHORT' },
    rubricCode: RUBRIC,
    answerKey: null,
    explanation: null,
  }));

  if (dryRun) {
    console.log(`  [dry] ${title} — ${items.length} câu`);
    for (const item of items) {
      console.log(`        ${item.prompt.value}`);
    }
    created += 1;
    continue;
  }

  await sql.query(
    `INSERT INTO question_sets
       (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year,
        access_level, status, current_revision, item_count, max_score,
        published_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 4, 2026, 'PREMIUM', 'PUBLISHED', 1, ?, ?, NOW(), ?, NOW(), NOW())`,
    [setId, WRITING_PART_1, TASK_TYPE_SHORT_ANSWER, topic.id, club.code, title,
      items.length, items.length, admin.id],
  );

  await docs.insertOne({
    _id: setId,
    questionSetId: setId,
    revision: 1,
    schemaVersion: 1,
    partId: WRITING_PART_1,
    taskTypeCode: 'LONG_TEXT',
    title,
    instructions: 'Trả lời 5 câu hỏi sau. Mỗi câu viết từ 3 đến 5 từ.',
    accessLevel: 'PREMIUM',
    sections: [],
    items,
    assets: [],
    settings: {
      shuffleOptions: false,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: items.length },
    sourceRef: { provider: 'aptis-practice', skill: 'writing', part: 1 },
    _class: 'vn.weconex.aptis.content.mongo.QuestionSetDocument',
  });

  console.log(`  ✓ ${title} (${club.code}) — ${items.length} câu`);
  created += 1;
}

console.log(`\nTạo mới: ${created} | bỏ qua: ${skipped}`);

await sql.end();
await mongo.close();
