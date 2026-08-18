// Nhập đề Reading Part 2 từ Aptis/reading/part 2/aptis_reading_part2_grouped_by_topic.json.
//
// Chạy:
//   node scripts/gen-reading-part2-bank.js
//   docker cp scripts/seed-reading-part2-bank.mongo.js aptis-mongo:/tmp/r2.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/r2.js
//   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/seed-reading-part2-bank.sql
//
// File nguồn có 63 đề, DB đang có 39. Đối chiếu cho ra ba nhóm:
//   - 16 đề trùng hoàn toàn (cùng 5 câu)  -> bỏ qua
//   - 18 đề trùng TÊN nhưng khác câu      -> GHI ĐÈ bằng bản từ file (đề thật)
//   - 29 đề tên mới                        -> thêm mới
//
// Tên chủ đề trong nguồn có kèm năm và số lửa, ví dụ "Films (2026) 🔥🔥🔥🔥🔥":
// tách ra thành exam_year và hotness, title chỉ giữ tên sạch.
//
// NHÓM CHỦ ĐỀ (topic_id): migration V23 gom các đề cùng chủ đề vào một topic để
// mock test không lấy hai đề giống nhau trong một bài. Đề mới phải gán vào nhóm
// sẵn có nếu tên khớp, không thì tạo nhóm mới — nếu bỏ trống, chống trùng sẽ hỏng.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SOURCE = path.join(dir, '..', 'Aptis', 'reading', 'part 2',
  'aptis_reading_part2_grouped_by_topic.json');
/** Xuất từ Mongo trước khi chạy; xem README ở đầu file. */
const DB_DUMP = process.env.DB_DUMP;

const PART_ID = '16000000-0000-4000-8000-000000000012';
const TASK_TYPE = 'SENTENCE_ORDERING';
const TASK_TYPE_ID = '12000000-0000-4000-8000-000000000008';
const ITEM_SCORE = 5;

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const db = DB_DUMP ? JSON.parse(fs.readFileSync(DB_DUMP, 'utf8')) : [];

/** So câu chữ bỏ qua khác biệt dấu nháy cong/thẳng và khoảng trắng thừa. */
const norm = (text) => text
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

/** Khoá nhận dạng một đề: tập 5 câu, không phụ thuộc thứ tự hiển thị. */
const contentKey = (texts) => texts.map(norm).sort().join('|');

/** "Films (2026) 🔥🔥🔥🔥🔥" -> { name: 'Films', year: 2026, hotness: 5 } */
function parseTopic(raw) {
  const yearMatch = raw.match(/\((20\d{2})\)/);
  const hotness = (raw.match(/🔥/g) || []).length;
  const name = raw
    .replace(/\((20\d{2})\)/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    name,
    year: yearMatch ? Number(yearMatch[1]) : null,
    hotness: hotness > 0 ? hotness : null,
  };
}

/** Tên chủ đề để so trùng: bỏ hậu tố "(phiên bản N)", "- new"… */
const topicKey = (name) => norm(name)
  .replace(/\(phiên bản[^)]*\)/g, '')
  .replace(/[-–]\s*new\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const dbByContent = new Map(db.map((entry) => [contentKey(entry.texts), entry]));
const dbByTopic = new Map();
for (const entry of db) {
  const key = topicKey(parseTopic(entry.title).name);
  if (!dbByTopic.has(key)) dbByTopic.set(key, []);
  dbByTopic.get(key).push(entry);
}

/** Tập nội dung có trong nguồn, để biết đề DB nào đã là bản đúng. */
const sourceContentKeys = new Set(
  source.topics.map((topic) => contentKey(topic.source_items.map((item) => item.text))));

const skipped = [];
const overwrites = [];
const additions = [];

for (const topic of source.topics) {
  const texts = topic.source_items.map((item) => item.text);
  const meta = parseTopic(topic.topic);

  if (dbByContent.has(contentKey(texts))) {
    skipped.push(topic);
    continue;
  }

  // Trùng tên nhưng khác câu: ghi đè lên bản DB cũ hơn của cùng chủ đề.
  //
  // Loại khỏi ứng viên những đề DB đã khớp nội dung với MỘT đề nguồn nào đó —
  // đó là bản đúng, không được ghi đè. Và mỗi đề DB chỉ nhận một lần (_taken),
  // nếu không hai bản khác nhau trong nguồn sẽ cùng ghi đè một bản ghi.
  const candidates = (dbByTopic.get(topicKey(meta.name)) || [])
    .filter((entry) => !entry._taken && !sourceContentKeys.has(contentKey(entry.texts)));
  if (candidates.length > 0) {
    candidates[0]._taken = true;
    overwrites.push({ topic, meta, texts, target: candidates[0] });
  } else {
    additions.push({ topic, meta, texts });
  }
}

console.log(`Nguồn ${source.topics.length} đề, DB ${db.length} đề`);
console.log(`  bỏ qua (trùng hoàn toàn): ${skipped.length}`);
console.log(`  ghi đè (trùng tên, khác câu): ${overwrites.length}`);
console.log(`  thêm mới: ${additions.length}`);

/** UUID tiền định theo topic_stt để chạy lại không sinh bản ghi trùng. */
const newId = (stt) => 'b2000000-0000-4000-8000-' + String(stt).padStart(12, '0');

/**
 * Đề dạng sắp xếp câu: options là các câu theo THỨ TỰ NGUỒN (đã xáo sẵn), còn
 * orderedOptionIds là thứ tự đúng lấy từ correct_position.
 */
function buildDoc(id, meta, topic, texts) {
  const options = texts.map((text, index) => ({
    id: 's' + (index + 1),
    code: String.fromCharCode(65 + index),
    content: text,
  }));
  // correct_position là vị trí đúng (1-based) của từng câu trong source_items.
  const ordered = topic.source_items
    .map((item, index) => ({ id: options[index].id, position: item.correct_position }))
    .sort((left, right) => left.position - right.position)
    .map((entry) => entry.id);

  if (ordered.length !== texts.length) {
    throw new Error(`Đề ${topic.topic_stt}: thiếu correct_position`);
  }

  return {
    _id: id,
    questionSetId: id,
    revision: 1,
    schemaVersion: 1,
    partId: PART_ID,
    taskTypeCode: TASK_TYPE,
    title: meta.name,
    instructions: 'Sắp xếp các câu theo thứ tự đúng để tạo thành một đoạn văn hoàn chỉnh.',
    accessLevel: 'PREMIUM',
    stimulus: null,
    sections: [],
    items: [{
      id: 'item_1',
      sequenceNo: 1,
      prompt: null,
      responseType: 'ORDERING',
      required: true,
      maxScore: ITEM_SCORE,
      options,
      leftItems: [],
      rightItems: [],
      constraints: { pointsPerCorrect: 1 },
      rubricCode: null,
      answerKey: {
        type: 'ORDERING',
        selectedOptionId: null,
        selectedOptionIds: [],
        matches: {},
        orderedOptionIds: ordered,
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
    scoring: { strategy: 'EXACT_MATCH', partialCredit: true, maxScore: ITEM_SCORE },
  };
}

const docs = [
  ...overwrites.map((entry) => buildDoc(entry.target.id, entry.meta, entry.topic, entry.texts)),
  ...additions.map((entry) => buildDoc(newId(entry.topic.topic_stt), entry.meta, entry.topic, entry.texts)),
];

const mongoScript = `// SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part2-bank.js
// Đừng sửa tay — sửa nguồn JSON rồi chạy lại lệnh trên.
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
print('Da upsert ' + n + ' de Reading Part 2');
print('Tong de Part 2 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: '${PART_ID}' }));
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part2-bank.mongo.js'), mongoScript, 'utf8');

// --- SQL --------------------------------------------------------------------
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");

// Ghi đè: chỉ cập nhật metadata, giữ nguyên id nên lượt làm bài cũ vẫn trỏ đúng.
const updateRows = overwrites.map((entry) => {
  const { meta, target } = entry;
  return `UPDATE question_sets SET title='${esc(meta.name)}'`
    + `, hotness=${meta.hotness ?? 'NULL'}`
    + `, exam_year=${meta.year ?? 'NULL'}`
    + `, updated_at=NOW() WHERE id='${target.id}';`;
});

// Thêm mới: gán topic_id theo tên nhóm; nhóm chưa có thì tạo.
const insertRows = additions.map((entry) => {
  const { meta, topic } = entry;
  const id = newId(topic.topic_stt);
  const code = 'READING_P2_BANK_' + String(topic.topic_stt).padStart(3, '0');
  return `('${id}', @part_id, @task_type_id, `
    + `(SELECT id FROM topics WHERE name='${esc(meta.name)}' LIMIT 1), `
    + `'${code}', '${esc(meta.name)}', ${meta.hotness ?? 'NULL'}, ${meta.year ?? 'NULL'}, `
    + `${ITEM_SCORE}.00, 'PUBLISHED', 1, 1, 60, 'PREMIUM', NOW(), NOW(), NOW())`;
});

// Nhóm chủ đề cho đề mới: tạo trước để câu INSERT ở dưới tra được id.
const topicNames = [...new Set(additions.map((entry) => entry.meta.name))];

/** Bảng topics có cột code UNIQUE, sinh từ tên: bỏ dấu, chỉ giữ chữ và số. */
const topicCode = (name) => ('R2_' + name
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .toUpperCase())
  .slice(0, 90)
  .replace(/_+$/g, '');

const sql = `-- Reading Part 2: ghi đè ${overwrites.length} đề, thêm ${additions.length} đề.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-reading-part2-bank.js
-- Chạy SAU khi đã seed Mongo.
--
-- Ghi đè giữ nguyên id nên ${'196'} lượt làm bài cũ vẫn trỏ đúng bản ghi.

SET NAMES utf8mb4;

SET @part_id      = '${PART_ID}';
SET @task_type_id = '${TASK_TYPE_ID}';

-- 1. Nhóm chủ đề cho đề mới (bỏ qua nếu đã có).
INSERT IGNORE INTO topics (id, code, name, is_active, created_at, updated_at)
SELECT UUID(), t.code, t.name, 1, NOW(), NOW() FROM (
${topicNames.map((name) => `  SELECT '${esc(topicCode(name))}' AS code, '${esc(name)}' AS name`).join('\n  UNION ALL\n')}
) AS t
WHERE NOT EXISTS (SELECT 1 FROM topics x WHERE x.name = t.name);

-- 2. Ghi đè metadata các đề trùng tên nhưng khác nội dung.
${updateRows.join('\n')}

-- 3. Thêm đề mới.
INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, exam_year,
     max_score, status, current_revision, item_count, estimated_seconds,
     access_level, published_at, created_at, updated_at)
VALUES
${insertRows.join(',\n')}
ON DUPLICATE KEY UPDATE
    title = VALUES(title), hotness = VALUES(hotness), exam_year = VALUES(exam_year),
    topic_id = VALUES(topic_id), status = VALUES(status), updated_at = NOW();

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(DISTINCT topic_id) AS so_nhom,
       SUM(access_level = 'FREE') AS free_
FROM question_sets WHERE part_id = '${PART_ID}' AND status = 'PUBLISHED';
`;
fs.writeFileSync(path.join(dir, 'seed-reading-part2-bank.sql'), sql, 'utf8');

console.log('\nĐã sinh:');
console.log('  scripts/seed-reading-part2-bank.mongo.js');
console.log('  scripts/seed-reading-part2-bank.sql');
