// Sinh script seed Reading Part 1 từ Aptis/reading/aptis_reading_part1_grouped_shared_options.json.
//
// Chạy:
//   node scripts/gen-reading-part1-bank.js
//   docker cp scripts/seed-reading-part1-bank.mongo.js aptis-mongo:/tmp/r1.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/r1.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part1-bank.sql
//
// 143 câu, MỖI CÂU MỘT ĐỀ để luyện riêng random được từng câu. Đề thi thật là
// đoạn 5 chỗ trống, nên Reading Part 1 cần có trong `merge-item-parts` (gộp 5) —
// việc gộp chỉ xảy ra khi thi thử cả kỹ năng.
//
// KHÔNG đụng 13 đề (65 câu) seed ngày 06/08: chúng đã có lượt làm bài, xoá sẽ
// hỏng thống kê theo đề. Ngân hàng sau khi seed = 65 + 143 = 208 câu.
//
// Câu 84-88 trong nguồn dùng chung một bộ 5 lựa chọn A-E (shared_option_set);
// tách rời thì mỗi câu vẫn giữ đủ 5 lựa chọn nên trả lời độc lập được.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SOURCE = path.join(dir, '..', 'Aptis', 'reading',
  'aptis_reading_part1_grouped_shared_options.json');

const PART_ID = '16000000-0000-4000-8000-000000000011';
const TASK_TYPE = 'GAP_FILL_CHOICE';
/** Lấy từ task_types: GAP_FILL_CHOICE. */
const TASK_TYPE_ID = '12000000-0000-4000-8000-000000000003';
const ITEM_SCORE = 2;

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

/** Trải nhóm shared_option_set thành từng câu, giữ nguyên thứ tự nguồn. */
const questions = [];
for (const entry of source.items) {
  if (entry.type === 'question') {
    questions.push(entry);
  } else {
    for (const child of entry.questions) {
      questions.push({ ...child, options: entry.options });
    }
  }
}

if (questions.length !== source.question_count) {
  throw new Error(`Kỳ vọng ${source.question_count} câu, trải ra được ${questions.length}`);
}

/** Mỗi câu phải có đúng một đáp án nằm trong danh sách lựa chọn. */
for (const q of questions) {
  const letters = q.options.map((option) => option.letter);
  if (!letters.includes(q.correct_letter)) {
    throw new Error(`Câu ${q.stt}: đáp án ${q.correct_letter} không có trong ${letters}`);
  }
}

/** UUID tiền định theo số thứ tự nguồn, để chạy lại không sinh bản ghi trùng. */
const idOf = (stt) => 'b1000000-0000-4000-8000-' + String(stt).padStart(12, '0');

const docs = questions.map((q) => ({
  _id: idOf(q.stt),
  questionSetId: idOf(q.stt),
  revision: 1,
  schemaVersion: 1,
  partId: PART_ID,
  taskTypeCode: TASK_TYPE,
  // Tiêu đề là chính câu hỏi: Part này là ngân hàng câu rời, không có chủ đề.
  title: q.question,
  instructions: 'Chọn từ phù hợp để hoàn thành câu.',
  accessLevel: 'PREMIUM',
  stimulus: null,
  sections: [],
  items: [{
    id: 'item_1',
    sequenceNo: 1,
    prompt: { format: 'PLAIN_TEXT', value: q.question },
    responseType: 'SINGLE_CHOICE',
    required: true,
    maxScore: ITEM_SCORE,
    options: q.options.map((option) => ({
      id: option.letter,
      code: option.letter,
      content: option.text,
    })),
    leftItems: [],
    rightItems: [],
    constraints: {},
    answerKey: {
      type: 'SINGLE_CHOICE',
      selectedOptionId: q.correct_letter,
      selectedOptionIds: [],
      matches: {},
      orderedOptionIds: [],
      acceptedValues: [],
      caseSensitive: false,
    },
  }],
  assets: [],
  settings: {
    shuffleOptions: true,
    shuffleItems: false,
    maxAudioPlays: null,
    showAnswerAfterEachItem: false,
    allowReview: true,
  },
  scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore: ITEM_SCORE },
}));

// --- Script Mongo -----------------------------------------------------------
const mongoScript = `// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part1-bank.js
// Đừng sửa tay file này — sửa nguồn JSON rồi chạy lại lệnh trên.
const target = db.getSiblingDB('aptis');
const DOCS = ${JSON.stringify(docs, null, 1)};

let n = 0;
DOCS.forEach(function (doc) {
  doc.revision = NumberInt(doc.revision);
  doc.schemaVersion = NumberInt(doc.schemaVersion);
  doc.items.forEach(function (item) { item.sequenceNo = NumberInt(item.sequenceNo); });
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  target.question_set_documents.replaceOne({ _id: doc._id }, doc, { upsert: true });
  n++;
});
print('Da upsert ' + n + ' de Reading Part 1');
print('Tong de Part 1 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: '${PART_ID}' }));
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part1-bank.mongo.js'), mongoScript, 'utf8');

// --- SQL --------------------------------------------------------------------
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");
const rows = questions.map((q, index) => {
  const code = 'READING_P1_BANK_' + String(q.stt).padStart(3, '0');
  // 3 câu đầu FREE cho học viên chưa mua thử, theo quy ước các Part khác.
  const access = index < 3 ? 'FREE' : 'PREMIUM';
  return `('${idOf(q.stt)}', @part_id, @task_type_id, @topic_id, '${code}', '${esc(q.question)}', 3, ${ITEM_SCORE}.00, 'PUBLISHED', 1, 1, 30, '${access}', NOW(), NOW(), NOW())`;
});

const sql = `-- Metadata MySQL cho ${questions.length} câu Reading Part 1.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part1-bank.js
-- Chạy SAU khi đã seed Mongo.
--
-- Không đụng 13 đề cũ (65 câu, seed 06/08) vì chúng đã có lượt làm bài.

SET NAMES utf8mb4;

SET @part_id      = '${PART_ID}';
SET @task_type_id = '${TASK_TYPE_ID}';
SET @topic_id     = (SELECT topic_id FROM question_sets WHERE part_id = @part_id LIMIT 1);

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, max_score,
     status, current_revision, item_count, estimated_seconds, access_level,
     published_at, created_at, updated_at)
VALUES
${rows.join(',\n')}
ON DUPLICATE KEY UPDATE
    title = VALUES(title), item_count = VALUES(item_count),
    max_score = VALUES(max_score), access_level = VALUES(access_level),
    status = VALUES(status), updated_at = NOW();

SELECT COUNT(*) AS de, SUM(item_count) AS cau, SUM(access_level = 'FREE') AS free_
FROM question_sets WHERE part_id = '${PART_ID}';
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part1-bank.sql'), sql, 'utf8');

console.log(`Đã sinh ${questions.length} đề:`);
console.log('  scripts/seed-reading-part1-bank.mongo.js');
console.log('  scripts/seed-reading-part1-bank.sql');
