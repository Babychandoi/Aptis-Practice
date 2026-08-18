// Thay toàn bộ đề Reading Part 4 bằng 24 đề từ
// Aptis/reading/part 4/aptis_reading_part4_grouped_by_topic.json.
//
// Chạy:
//   node scripts/gen-reading-part4-bank.js
//   docker cp scripts/seed-reading-part4-bank.mongo.js aptis-mongo:/tmp/r4.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/r4.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part4-bank.sql
//
// 11 đề cũ trong DB (8 PUBLISHED + 3 DRAFT thiếu passage) là bản tự tạo, không
// đoạn văn nào trùng với nguồn — nên xoá hẳn thay vì giữ lẫn lộn. Lượt làm bài
// đã được dọn sạch nên không vướng khoá ngoại.
//
// Mỗi đề: 7 đoạn văn ghép với 7 tiêu đề (HEADING_MATCHING), một item duy nhất
// chứa leftItems = đoạn, rightItems = tiêu đề, answerKey.matches = đáp án.
//
// Tên chủ đề trong nguồn kèm năm và số lửa ("Mountain (2026) 🔥🔥🔥🔥🔥") — tách ra
// thành exam_year và hotness, title chỉ giữ tên sạch.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SOURCE = path.join(dir, '..', 'Aptis', 'reading', 'part 4',
  'aptis_reading_part4_grouped_by_topic.json');

const PART_ID = '16000000-0000-4000-8000-000000000014';
const TASK_TYPE = 'HEADING_MATCHING';
const TASK_TYPE_ID = '12000000-0000-4000-8000-000000000006';
/** 7 đoạn × 2 điểm, khớp pointsPerCorrect của đề cũ. */
const POINTS_PER_CORRECT = 2;

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

/** "Mountain (2026) 🔥🔥🔥🔥🔥" -> { name, year, hotness } */
function parseTopic(raw) {
  const yearMatch = raw.match(/\((20\d{2})\)/);
  const hotness = (raw.match(/🔥/g) || []).length;
  const name = raw
    .replace(/\((20\d{2})\)/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*$/, '')
    .trim();
  return {
    name,
    year: yearMatch ? Number(yearMatch[1]) : null,
    hotness: hotness > 0 ? hotness : null,
  };
}

/** UUID tiền định theo topic_stt để chạy lại không sinh bản ghi trùng. */
const idOf = (stt) => 'b4000000-0000-4000-8000-' + String(stt).padStart(12, '0');

const built = source.topics.map((topic) => {
  const meta = parseTopic(topic.topic);
  const id = idOf(topic.topic_stt);

  if (topic.questions.length !== topic.options.length) {
    throw new Error(`Đề ${topic.topic_stt}: ${topic.questions.length} đoạn nhưng `
      + `${topic.options.length} tiêu đề`);
  }

  const rightItems = topic.options.map((heading, index) => ({
    id: 'h' + (index + 1),
    code: String(index + 1),
    content: heading,
  }));

  const leftItems = topic.questions.map((question, index) => ({
    id: 'para' + (index + 1),
    code: 'Paragraph ' + String.fromCharCode(65 + index),
    content: question.paragraph,
  }));

  // correct_option_index trỏ vào mảng options của topic và đánh số TỪ 1, không
  // phải từ 0 — đã đối chiếu cả 168 câu với correct_answer để xác nhận.
  const matches = {};
  topic.questions.forEach((question, index) => {
    const heading = rightItems[question.correct_option_index - 1];
    if (!heading) {
      throw new Error(`Đề ${topic.topic_stt} đoạn ${index + 1}: `
        + `correct_option_index=${question.correct_option_index} vượt số tiêu đề`);
    }
    if (heading.content !== question.correct_answer) {
      throw new Error(`Đề ${topic.topic_stt} đoạn ${index + 1}: đáp án lệch — `
        + `index trỏ "${heading.content}" nhưng correct_answer là "${question.correct_answer}"`);
    }
    matches[leftItems[index].id] = heading.id;
  });

  const maxScore = leftItems.length * POINTS_PER_CORRECT;

  return {
    meta,
    topic,
    doc: {
      _id: id,
      questionSetId: id,
      revision: 1,
      schemaVersion: 1,
      partId: PART_ID,
      taskTypeCode: TASK_TYPE,
      title: meta.name,
      instructions: 'Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.',
      accessLevel: 'PREMIUM',
      stimulus: topic.passage_intro
        ? { format: 'PLAIN_TEXT', value: topic.passage_intro }
        : { format: 'PLAIN_TEXT', value: 'Topic: ' + meta.name },
      sections: [],
      items: [{
        id: 'item_1',
        sequenceNo: 1,
        prompt: { format: 'PLAIN_TEXT', value: 'Ghép mỗi đoạn văn với tiêu đề phù hợp.' },
        responseType: 'MATCHING',
        required: true,
        maxScore,
        options: [],
        leftItems,
        rightItems,
        constraints: { pointsPerCorrect: POINTS_PER_CORRECT },
        rubricCode: null,
        answerKey: {
          type: 'MATCHING',
          selectedOptionId: null,
          selectedOptionIds: [],
          matches,
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
      scoring: { strategy: 'PARTIAL_MATCH', partialCredit: true, maxScore },
    },
  };
});

const docs = built.map((entry) => entry.doc);

const mongoScript = `// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part4-bank.js
// Đừng sửa tay — sửa nguồn JSON rồi chạy lại lệnh trên.
const target = db.getSiblingDB('aptis');
const PART_ID = '${PART_ID}';
const DOCS = ${JSON.stringify(docs, null, 1)};

// Xoá đề cũ TRƯỚC rồi ghi đề mới: 11 đề cũ là bản tự tạo, không giữ lại.
const keep = DOCS.map(function (doc) { return doc._id; });
const removed = target.question_set_documents.deleteMany(
  { partId: PART_ID, _id: { $nin: keep } });
print('Da xoa ' + removed.deletedCount + ' de cu');

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
print('Da upsert ' + n + ' de Reading Part 4');
print('Tong de Part 4 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part4-bank.mongo.js'), mongoScript, 'utf8');

// --- SQL --------------------------------------------------------------------
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

/**
 * Bảng topics có cột code UNIQUE và đã có sẵn vài code R4_* cho nhóm tiếng Việt
 * (R4_MOUNTAIN = "Leo núi"...), nên code mới đánh theo số thứ tự nguồn để chắc
 * chắn không đụng.
 */
const topicCode = (stt) => 'R4_SRC_' + String(stt).padStart(3, '0');

/** Mỗi đề một nhóm riêng: tên chủ đề trong nguồn đều khác nhau. */
const topicEntries = built.map((entry) => ({
  code: topicCode(entry.topic.topic_stt),
  name: entry.meta.name,
}));

const rows = built.map((entry, index) => {
  const { meta, topic, doc } = entry;
  const code = 'READING_P4_BANK_' + String(topic.topic_stt).padStart(3, '0');
  // 3 đề đầu FREE cho học viên chưa mua thử, theo quy ước các Part khác.
  const access = index < 3 ? 'FREE' : 'PREMIUM';
  const maxScore = doc.items[0].maxScore;
  // Tra theo code chứ không theo name: tên chủ đề nguồn có thể trùng nhóm
  // tiếng Việt đã có sẵn ("Mountain" vs "Leo núi" là hai nhóm khác nhau).
  return `('${doc._id}', @part_id, @task_type_id, `
    + `(SELECT id FROM topics WHERE code='${esc(topicCode(topic.topic_stt))}' LIMIT 1), `
    + `'${code}', '${esc(meta.name)}', ${meta.hotness ?? 'NULL'}, ${meta.year ?? 'NULL'}, `
    + `${maxScore}.00, 'PUBLISHED', 1, 1, 600, '${access}', NOW(), NOW(), NOW())`;
});

const sql = `-- Reading Part 4: thay toàn bộ bằng ${built.length} đề từ nguồn.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part4-bank.js
-- Chạy SAU khi đã seed Mongo.
--
-- 11 đề cũ (8 PUBLISHED + 3 DRAFT thiếu passage) là bản tự tạo, nội dung không
-- trùng nguồn nên xoá hẳn. Lượt làm bài đã dọn sạch nên không vướng khoá ngoại.

SET NAMES utf8mb4;

SET @part_id      = '${PART_ID}';
SET @task_type_id = '${TASK_TYPE_ID}';

-- 1. Nhóm chủ đề (bỏ qua nếu đã có).
INSERT INTO topics (id, code, name, is_active, created_at, updated_at)
SELECT UUID(), t.code, t.name, 1, NOW(), NOW() FROM (
${topicEntries.map((entry) => `  SELECT '${esc(entry.code)}' AS code, '${esc(entry.name)}' AS name`).join('\n  UNION ALL\n')}
) AS t
WHERE NOT EXISTS (SELECT 1 FROM topics x WHERE x.code = t.code);

-- 2. Xoá đề cũ (chạy trước INSERT để code cũ không chặn code mới).
DELETE FROM question_sets
WHERE part_id = @part_id AND id NOT IN (
${built.map((entry) => `  '${entry.doc._id}'`).join(',\n')}
);

-- 3. Đề mới.
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year,
     max_score, status, current_revision, item_count, estimated_seconds,
     access_level, published_at, created_at, updated_at)
VALUES
${rows.join(',\n')}
ON DUPLICATE KEY UPDATE
    title = VALUES(title), hotness = VALUES(hotness), exam_year = VALUES(exam_year),
    topic_id = VALUES(topic_id), max_score = VALUES(max_score),
    status = VALUES(status), access_level = VALUES(access_level), updated_at = NOW();

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(hotness) AS co_lua,
       COUNT(DISTINCT topic_id) AS nhom, SUM(access_level = 'FREE') AS free_
FROM question_sets WHERE part_id = '${PART_ID}' AND status = 'PUBLISHED';
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part4-bank.sql'), sql, 'utf8');

console.log(`Đã sinh ${built.length} đề (${built.reduce((sum, e) => sum + e.doc.items[0].leftItems.length, 0)} đoạn):`);
console.log('  scripts/seed-reading-part4-bank.mongo.js');
console.log('  scripts/seed-reading-part4-bank.sql');
console.log(`  có năm: ${built.filter((e) => e.meta.year).length}, có lửa: ${built.filter((e) => e.meta.hotness).length}`);
