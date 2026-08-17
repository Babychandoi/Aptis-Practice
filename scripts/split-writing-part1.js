// Tách 46 đề Writing Part 1 (mỗi đề 5 câu) thành 230 đề, mỗi đề 1 câu.
//
// Chạy:
//   docker exec -i aptis-mongo mongosh --quiet < scripts/split-writing-part1.js
//       -> xem trước, không ghi gì
//   docker exec -i -e APPLY=1 aptis-mongo mongosh --quiet < scripts/split-writing-part1.js
//       -> ghi Mongo + in SQL đồng bộ MySQL
//
// LÝ DO: application.yml có `merge-item-parts` đặt Writing Part 1 gộp 5 đề mỗi
// bài test — cấu hình này viết khi Writing còn trống, giả định mỗi đề chỉ 1 câu
// như Speaking Part 1. Dữ liệu seed lại để mỗi đề 5 câu, nên backend gộp thành
// 5 × 5 = 25 câu một bài, sai format Aptis (phải đúng 5 câu).
//
// Cách xử lý: tách nhỏ dữ liệu thay vì bỏ merge, để mỗi lượt luyện random được
// 5 câu từ 230 câu khác nhau chứ không phải luôn lấy nguyên một bộ 5 câu cố định.
//
// Đề mới giữ nguyên nội dung câu hỏi, chỉ đổi: mỗi đề 1 item (sequenceNo = 1),
// maxScore = 1, code = WRITING_PART_1_<bộ>_<câu>.

// mongosh đọc file qua stdin nên không có process.argv — dùng biến môi trường.
const APPLY = process.env.APPLY === '1';

const target = db.getSiblingDB('aptis');
const PART_ID = '16000000-0000-4000-8000-000000000041';

const sources = target.question_set_documents
  .find({ partId: PART_ID })
  .sort({ _id: 1 })
  .toArray();

if (sources.length === 0) {
  throw new Error('Không tìm thấy đề Writing Part 1 nào trong Mongo');
}

// Đề đã tách rồi thì mỗi doc chỉ còn 1 item — chạy lại lần nữa là vô nghĩa.
const alreadySplit = sources.every((doc) => doc.items.length === 1);
if (alreadySplit) {
  print('Đã tách rồi (' + sources.length + ' đề, mỗi đề 1 câu). Không làm gì thêm.');
  quit(0);
}

/**
 * UUID tiền định từ id đề gốc + số thứ tự câu, để chạy lại không sinh trùng.
 *
 * Giữ nguyên 34 ký tự đầu của id cha rồi thay 2 ký tự cuối bằng số câu — id cha
 * đã là duy nhất nên phần đầu đủ phân biệt, và dạng UUID vẫn hợp lệ cho CHAR(36).
 */
function childId(parentId, index) {
  const suffix = String(index + 1).padStart(2, '0');
  return parentId.slice(0, 34) + suffix;
}

const rows = [];
let created = 0;

sources.forEach((doc) => {
  doc.items.forEach((item, index) => {
    const id = childId(doc._id, index);
    // Tiêu đề lấy chính câu hỏi để danh sách đề đọc được nội dung, không phải
    // "Bộ 1 - câu 3" như cách đánh số cũ.
    const title = item.prompt.value;

    rows.push({
      id: id,
      parentId: doc._id,
      seq: index + 1,
      title: title,
    });

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
        title: title,
        instructions: doc.instructions,
        accessLevel: doc.accessLevel,
        stimulus: doc.stimulus,
        sections: [],
        items: [Object.assign({}, item, {
          id: 'item_1',
          sequenceNo: NumberInt(1),
          maxScore: 1,
        })],
        assets: [],
        settings: doc.settings,
        scoring: { strategy: 'RUBRIC', partialCredit: true, maxScore: 1 },
        createdAt: doc.createdAt || new Date(),
        updatedAt: new Date(),
      },
      { upsert: true });
    created++;
  });
});

print('Đề gốc: ' + sources.length + ' × ' + sources[0].items.length + ' câu');
print('Đề sau khi tách: ' + rows.length);

if (!APPLY) {
  print('\n--- XEM TRƯỚC, chưa ghi gì. Thêm --apply để thực hiện. ---');
  rows.slice(0, 5).forEach((r) => print('  ' + r.id + '  ' + r.title.slice(0, 60)));
  quit(0);
}

// Xoá đề gốc SAU khi đã tạo đủ đề con, để lỗi giữa chừng không mất dữ liệu.
const parentIds = sources.map((doc) => doc._id);
const removed = target.question_set_documents.deleteMany({ _id: { $in: parentIds } });

print('Đã tạo ' + created + ' đề con, xoá ' + removed.deletedCount + ' đề gốc.');
print('Tổng đề Part 1 trong Mongo = ' +
  target.question_set_documents.countDocuments({ partId: PART_ID }));

// SQL để đồng bộ MySQL: thêm đề con, xoá đề gốc.
const esc = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "''");
const sqlRows = rows.map((r, index) => {
  const code = 'WRITING_P1_' + String(index + 1).padStart(3, '0');
  // 3 đề đầu FREE để học viên chưa mua vẫn thử được, theo quy ước các Part khác.
  const access = index < 3 ? 'FREE' : 'PREMIUM';
  return `('${r.id}', @part_id, @task_type_id, @topic_id, '${code}', '${esc(r.title)}', 3, 1.00, 'PUBLISHED', 1, 1, 60, ${access === 'FREE' ? "'FREE'" : "'PREMIUM'"}, NOW(), NOW(), NOW())`;
});

const sql = `SET NAMES utf8mb4;

SET @part_id      = '${PART_ID}';
SET @task_type_id = '12000000-0000-4000-8000-000000000009';
SET @topic_id     = (SELECT topic_id FROM question_sets WHERE part_id = @part_id LIMIT 1);

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, hotness, max_score,
     status, current_revision, item_count, estimated_seconds, access_level,
     published_at, created_at, updated_at)
VALUES
${sqlRows.join(',\n')}
ON DUPLICATE KEY UPDATE
    title = VALUES(title), item_count = VALUES(item_count),
    max_score = VALUES(max_score), access_level = VALUES(access_level),
    updated_at = NOW();

DELETE FROM question_sets WHERE id IN (${parentIds.map((id) => `'${id}'`).join(',')});

SELECT COUNT(*) AS de, SUM(item_count) AS cau, SUM(access_level='FREE') AS free_
FROM question_sets WHERE part_id = '${PART_ID}';`;

// In ra stdout; lệnh gọi hứng vào scripts/split-writing-part1.sql.
// mongosh không có fs nên không ghi file trực tiếp được.
print('--8<-- SQL BEGIN');
print(sql);
print('--8<-- SQL END');
