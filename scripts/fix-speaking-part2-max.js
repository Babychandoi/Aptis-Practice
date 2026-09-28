// Đưa điểm tối đa Speaking Part 2 trong MongoDB về thang 10 (chạy bằng mongosh).
//
// V62 chỉ sửa question_sets.max_score trong MySQL. Nhưng khi tạo lượt làm,
// AttemptSnapshotFactory.resolveMaxScore lấy TỔNG maxScore các item trong Mongo
// (3 câu × 5 = 15), và admin lưu lại đề cũng tính lại MySQL từ Mongo — nên lỗi
// 15 điểm quay lại với mọi bài làm sau V62. Sửa tận gốc ở Mongo: mỗi câu 10/3.
//
// Mongo lưu số thực nên 3 × 10/3 cộng lại đúng 10.
//
//   mongosh --quiet aptis --eval 'const PART_ID="..."; const DRY_RUN=true' scripts/fix-speaking-part2-max.js
//
// PART_ID: parts.id của SPEAKING / PART_2 trong MySQL. DRY_RUN=true chỉ đếm, không ghi.

if (typeof PART_ID === 'undefined' || !PART_ID) throw new Error('Thiếu PART_ID');
const dryRun = typeof DRY_RUN === 'undefined' ? true : DRY_RUN;
const TARGET = 10;

const filter = { partId: PART_ID };
let checked = 0;
let changed = 0;
db.question_set_documents.find(filter).forEach((doc) => {
  checked++;
  const items = doc.items || [];
  if (items.length === 0) return;
  const sum = items.reduce((total, item) => total + (item.maxScore || 0), 0);
  if (Math.abs(sum - TARGET) < 1e-9) return;
  const each = TARGET / items.length;
  changed++;
  if (dryRun) return;
  const set = {};
  items.forEach((_, i) => { set[`items.${i}.maxScore`] = each; });
  if (doc.scoring && typeof doc.scoring.maxScore === 'number') set['scoring.maxScore'] = TARGET;
  db.question_set_documents.updateOne({ _id: doc._id }, { $set: set });
});

print(JSON.stringify({ partId: PART_ID, dryRun, checked, changed }));
