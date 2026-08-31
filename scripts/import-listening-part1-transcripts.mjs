/**
 * Bổ sung transcript cho Listening Part 1 từ bản dump aptisprep_..._raw_rsc_v2.
 *
 * Vì sao cần: 332 bộ Part 1 trong DB đều KHÔNG có transcript — học viên nghe
 * xong, nộp bài, thấy sai mà không biết vì sao. File dump mang theo hội thoại
 * đầy đủ ở trường `explanation`, khớp được với bộ đã có qua nội dung câu hỏi.
 *
 * Script này CHỈ THÊM transcript, không sửa câu hỏi, phương án hay đáp án —
 * nên không ảnh hưởng bài đang làm và không cần đổi answerKey.
 *
 * Dùng:
 *   node scripts/import-listening-part1-transcripts.mjs [--dry-run] [--limit N]
 */
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const PART1 = '16000000-0000-4000-8000-000000000021';
const FILE = 'AptisPrep.com/listenning/part 1/aptisprep_listening_part1_raw_rsc_v2.json';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

const normalize = (value) =>
  String(value ?? '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Bỏ ghi chú biên tập ở đầu câu hỏi — nguồn hay chèn "(Đề cập nhật ngày
 * 24/8/2026)". Không bóc thì 23 bộ đã có sẽ bị coi là đề mới.
 */
const cleanPrompt = (text) =>
  String(text ?? '')
    .replace(/^\s*\(\s*Đề\s[^)]*\)\s*/iu, '')
    .trim();

const client = new MongoClient(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/aptis');
await client.connect();
const docs = client.db().collection('question_set_documents');

const payload = JSON.parse(readFileSync(FILE, 'utf8'));

// prompt -> transcript. Nhiều bản ghi cùng câu hỏi (các biến thể phương án)
// thì giữ bản có transcript dài nhất: bản ngắn thường là bản nháp thiếu lượt nói.
const transcripts = new Map();
for (const record of payload.rawQuestions ?? []) {
  const item = record.items?.[0];
  const text = String(item?.explanation ?? '').trim();
  if (!item || !text) continue;

  const key = normalize(cleanPrompt(item.prompt));
  if (!key) continue;
  const current = transcripts.get(key);
  if (!current || text.length > current.length) transcripts.set(key, text);
}

const existing = await docs.find({ partId: PART1 }).toArray();

const updates = [];
let already = 0;
let noMatch = 0;
for (const doc of existing) {
  for (const item of doc.items ?? []) {
    const value = item?.prompt?.value;
    if (!value) continue;

    if (item.explanation?.value) { already += 1; continue; }

    const text = transcripts.get(normalize(cleanPrompt(value)));
    if (!text) { noMatch += 1; continue; }

    updates.push({ docId: doc._id, itemId: item.id, prompt: value, text });
  }
}

console.log(
  `file: ${payload.rawQuestions?.length ?? 0} bản ghi, ${transcripts.size} transcript` +
    ` | DB Part 1: ${existing.length} bộ` +
    ` | sẽ thêm: ${updates.length} | đã có: ${already} | không khớp: ${noMatch}`,
);

const targets = updates.slice(0, limit);
if (dryRun) {
  for (const u of targets.slice(0, 5)) {
    console.log(`\n  [dry] ${u.prompt.slice(0, 70)}`);
    console.log(`        ${u.text.replace(/\n/g, ' | ').slice(0, 160)}…`);
  }
  console.log(`\n  (dry-run) sẽ cập nhật ${targets.length} câu.`);
  await client.close();
  process.exit(0);
}

let done = 0;
for (const u of targets) {
  const result = await docs.updateOne(
    { _id: u.docId, 'items.id': u.itemId },
    { $set: { 'items.$.explanation': { format: 'PLAIN_TEXT', value: u.text } } },
  );
  done += result.modifiedCount;
}

console.log(`Đã thêm transcript cho ${done}/${targets.length} câu.`);
await client.close();
