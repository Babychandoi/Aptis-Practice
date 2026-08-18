// Tách 13 đề Reading Part 1 cũ (mỗi đề 5 câu) thành 65 đề, mỗi đề 1 câu.
//
// Chạy:
//   docker cp scripts/split-reading-part1-legacy.js aptis-mongo:/tmp/split-r1.js
//   docker exec aptis-mongo mongosh --quiet --file /tmp/split-r1.js            # xem trước
//   docker exec -e APPLY=1 aptis-mongo mongosh --quiet --file /tmp/split-r1.js # thực hiện
//
// LÝ DO: sau khi seed 143 câu rời từ JSON nguồn, Reading Part 1 được thêm vào
// `merge-item-parts` (gộp 5 câu khi thi thử). 13 đề cũ mỗi đề đã sẵn 5 câu nên
// sẽ bị gộp thành 25 câu một bài — đúng lỗi đã gặp ở Writing Part 1.
//
// Tách xong ngân hàng đồng nhất 208 đề × 1 câu, merge hoạt động đúng.
//
// Lưu ý: 13 đề cũ đã có lượt làm bài. Snapshot của các lượt đó nằm riêng trong
// attempt_documents nên học viên vẫn xem lại được; chỉ thống kê theo questionSetId
// của 13 đề đó là mất.

const APPLY = process.env.APPLY === '1';

const target = db.getSiblingDB('aptis');
const PART_ID = '16000000-0000-4000-8000-000000000011';

// Chỉ lấy đề NHIỀU HƠN một câu: 143 đề vừa seed đã đúng dạng, bỏ qua.
const sources = target.question_set_documents
  .find({ partId: PART_ID, 'items.1': { $exists: true } })
  .sort({ _id: 1 })
  .toArray();

if (sources.length === 0) {
  print('Không còn đề nhiều câu nào ở Reading Part 1. Không làm gì thêm.');
  quit(0);
}

/** Giữ 34 ký tự đầu của id cha, thay 2 ký tự cuối bằng số câu. */
function childId(parentId, index) {
  return parentId.slice(0, 34) + String(index + 1).padStart(2, '0');
}

const rows = [];
let created = 0;

sources.forEach(function (doc) {
  doc.items.forEach(function (item, index) {
    const id = childId(doc._id, index);
    rows.push({ id: id, title: item.prompt.value });

    if (!APPLY) return;

    target.question_set_documents.replaceOne(
      { _id: id },
      {
        _id: id,
        questionSetId: id,
        revision: NumberInt(1),
        schemaVersion: NumberInt(1),
        partId: PART_ID,
        taskTypeCode: doc.taskTypeCode,
        title: item.prompt.value,
        instructions: doc.instructions,
        accessLevel: doc.accessLevel,
        stimulus: doc.stimulus,
        sections: [],
        items: [Object.assign({}, item, { id: 'item_1', sequenceNo: NumberInt(1) })],
        assets: [],
        settings: doc.settings,
        scoring: {
          strategy: doc.scoring ? doc.scoring.strategy : 'EXACT_MATCH',
          partialCredit: false,
          maxScore: item.maxScore,
        },
        createdAt: doc.createdAt || new Date(),
        updatedAt: new Date(),
      },
      { upsert: true });
    created++;
  });
});

print('Đề gốc: ' + sources.length + ' | đề sau khi tách: ' + rows.length);

if (!APPLY) {
  print('--- XEM TRƯỚC, chưa ghi gì. Chạy lại với -e APPLY=1 để thực hiện. ---');
  rows.slice(0, 5).forEach(function (r) { print('  ' + r.id + '  ' + r.title.slice(0, 56)); });
  quit(0);
}

// Xoá đề gốc SAU khi đã tạo đủ đề con, để lỗi giữa chừng không mất dữ liệu.
const parentIds = sources.map(function (doc) { return doc._id; });
const removed = target.question_set_documents.deleteMany({ _id: { $in: parentIds } });

print('Đã tạo ' + created + ' đề con, xoá ' + removed.deletedCount + ' đề gốc.');
print('Tổng đề Part 1 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));

const esc = function (value) { return value.replace(/\\/g, '\\\\').replace(/'/g, "''"); };
const sqlRows = rows.map(function (r, index) {
  const code = 'READING_P1_OLD_' + String(index + 1).padStart(3, '0');
  return "('" + r.id + "', @part_id, @task_type_id, @topic_id, '" + code + "', '"
    + esc(r.title) + "', 3, 2.00, 'PUBLISHED', 1, 1, 30, 'PREMIUM', NOW(), NOW(), NOW())";
});

print('--8<-- SQL BEGIN');
print("SET NAMES utf8mb4;\n\n"
  + "SET @part_id      = '" + PART_ID + "';\n"
  + "SET @task_type_id = '12000000-0000-4000-8000-000000000003';\n"
  + "SET @topic_id     = (SELECT topic_id FROM question_sets WHERE part_id = @part_id LIMIT 1);\n\n"
  + "INSERT INTO question_sets\n"
  + "    (id, part_id, task_type_id, topic_id, code, title, hotness, max_score,\n"
  + "     status, current_revision, item_count, estimated_seconds, access_level,\n"
  + "     published_at, created_at, updated_at)\nVALUES\n"
  + sqlRows.join(',\n') + "\n"
  + "ON DUPLICATE KEY UPDATE\n"
  + "    title = VALUES(title), item_count = VALUES(item_count),\n"
  + "    max_score = VALUES(max_score), updated_at = NOW();\n\n"
  + "DELETE FROM question_sets WHERE id IN ("
  + parentIds.map(function (id) { return "'" + id + "'"; }).join(',') + ");\n\n"
  + "SELECT COUNT(*) AS de, SUM(item_count) AS cau, SUM(item_count > 1) AS de_nhieu_cau\n"
  + "FROM question_sets WHERE part_id = '" + PART_ID + "';");
print('--8<-- SQL END');
