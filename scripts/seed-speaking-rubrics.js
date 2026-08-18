/**
 * Rubric chấm Speaking cho 4 part, khớp thang điểm ở màn Cấu hình chấm điểm
 * (part_scoring_rules): Part 1 = 5, Part 2 = 10, Part 3 = 15, Part 4 = 20.
 *
 * Vì sao cần:
 *   - Mọi đề Speaking đang trỏ rubricCode = "APTIS_SPEAKING", mã KHÔNG tồn tại
 *     trong rubric_definitions → loadRubric() ném lỗi → job chấm FAILED.
 *   - Rubric Speaking duy nhất đang có (APTIS_SPEAKING_PART_2_V1) để 30 điểm,
 *     lệch hẳn thang 10 điểm của Part 2 ở admin.
 *
 * Tiêu chí theo từng part, không dùng chung một bộ:
 *   - Part 1 hỏi thông tin cá nhân, 30 giây mỗi câu → chưa đòi hỏi mạch lập luận.
 *   - Part 2/3 mô tả và so sánh ảnh → thêm Coherence.
 *   - Part 4 độc thoại 2 phút về chủ đề trừu tượng → Coherence nặng nhất.
 *
 * Chạy:
 *   node scripts/seed-speaking-rubrics.js
 *   docker compose exec -T mongo mongosh aptis --quiet < scripts/out/speaking-rubrics.mongo.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Bộ tiêu chí từng part: [mã, tên, tỉ lệ điểm].
 * Tổng tỉ lệ mỗi part phải bằng 1 — script tự kiểm tra bên dưới.
 */
const CRITERIA_BY_PART = {
  PART_1: [
    ['TASK_FULFILMENT', 'Task fulfilment', 0.30],
    ['PRONUNCIATION', 'Pronunciation', 0.25],
    ['FLUENCY', 'Fluency', 0.20],
    ['GRAMMAR', 'Grammar', 0.15],
    ['VOCABULARY', 'Vocabulary', 0.10],
  ],
  PART_2: [
    ['TASK_FULFILMENT', 'Task fulfilment', 0.25],
    ['PRONUNCIATION', 'Pronunciation', 0.20],
    ['FLUENCY', 'Fluency', 0.20],
    ['GRAMMAR', 'Grammar', 0.15],
    ['VOCABULARY', 'Vocabulary', 0.10],
    ['COHERENCE', 'Coherence', 0.10],
  ],
  PART_3: [
    ['TASK_FULFILMENT', 'Task fulfilment', 0.25],
    ['PRONUNCIATION', 'Pronunciation', 0.15],
    ['FLUENCY', 'Fluency', 0.20],
    ['GRAMMAR', 'Grammar', 0.15],
    ['VOCABULARY', 'Vocabulary', 0.10],
    ['COHERENCE', 'Coherence', 0.15],
  ],
  PART_4: [
    ['TASK_FULFILMENT', 'Task fulfilment', 0.25],
    ['PRONUNCIATION', 'Pronunciation', 0.15],
    ['FLUENCY', 'Fluency', 0.15],
    ['GRAMMAR', 'Grammar', 0.15],
    ['VOCABULARY', 'Vocabulary', 0.10],
    ['COHERENCE', 'Coherence', 0.20],
  ],
};

/** Điểm tối đa mỗi part — phải trùng part_scoring_rules.max_score. */
const MAX_SCORE_BY_PART = { PART_1: 5, PART_2: 10, PART_3: 15, PART_4: 20 };

/** Mô tả mức điểm, dùng chung vì cách hiểu tiêu chí không đổi theo part. */
const DESCRIPTORS = {
  TASK_FULFILMENT: {
    low: 'Không trả lời đúng yêu cầu của đề.',
    mid: 'Trả lời được một phần yêu cầu, còn thiếu ý.',
    high: 'Trả lời đầy đủ và đúng trọng tâm đề bài.',
  },
  PRONUNCIATION: {
    low: 'Phát âm khó nghe, người nghe phải đoán nhiều.',
    mid: 'Phát âm hiểu được nhưng còn lỗi trọng âm và ngữ điệu.',
    high: 'Phát âm rõ ràng, trọng âm và ngữ điệu tự nhiên.',
  },
  FLUENCY: {
    low: 'Ngắt quãng liên tục, không duy trì được lượt nói.',
    mid: 'Nói được liên tục nhưng còn ngập ngừng khi tìm từ.',
    high: 'Nói trôi chảy, nhịp độ tự nhiên.',
  },
  GRAMMAR: {
    low: 'Cấu trúc sai nhiều, gây khó hiểu.',
    mid: 'Dùng được cấu trúc cơ bản, còn lỗi nhưng vẫn hiểu được.',
    high: 'Ngữ pháp chính xác, có cấu trúc đa dạng.',
  },
  VOCABULARY: {
    low: 'Vốn từ quá hạn chế so với yêu cầu.',
    mid: 'Từ vựng đủ diễn đạt ý cơ bản.',
    high: 'Từ vựng phong phú và dùng đúng ngữ cảnh.',
  },
  COHERENCE: {
    low: 'Ý rời rạc, không có liên kết.',
    mid: 'Ý sắp xếp được nhưng liên kết còn đơn giản.',
    high: 'Ý mạch lạc, chuyển ý tự nhiên.',
  },
};

/** Làm tròn 2 chữ số — thang 5 điểm sinh ra mức lẻ như 1.25. */
const round2 = (value) => Math.round(value * 100) / 100;

const now = new Date().toISOString();
const docs = [];

for (const [partCode, criteria] of Object.entries(CRITERIA_BY_PART)) {
  const maxScore = MAX_SCORE_BY_PART[partCode];

  const weightSum = criteria.reduce((sum, [, , weight]) => sum + weight, 0);
  if (Math.abs(weightSum - 1) > 0.001) {
    throw new Error(`${partCode}: tổng tỉ lệ = ${weightSum}, phải bằng 1`);
  }

  const built = criteria.map(([code, name, weight]) => {
    const criterionMax = round2(maxScore * weight);
    const descriptor = DESCRIPTORS[code];
    return {
      code,
      name,
      weight,
      maxScore: criterionMax,
      descriptors: {
        '0': descriptor.low,
        [String(round2(criterionMax / 2))]: descriptor.mid,
        [String(criterionMax)]: descriptor.high,
      },
    };
  });

  // Làm tròn từng tiêu chí có thể lệch tổng vài phần trăm; bù vào tiêu chí
  // nặng nhất để tổng luôn đúng bằng thang điểm của part.
  const total = round2(built.reduce((sum, item) => sum + item.maxScore, 0));
  if (Math.abs(total - maxScore) > 0.001) {
    const diff = round2(maxScore - total);
    built[0].maxScore = round2(built[0].maxScore + diff);
    console.log(`  ${partCode}: bù ${diff} vào ${built[0].code} cho khớp ${maxScore}`);
  }

  const code = `APTIS_SPEAKING_${partCode}_V1`;
  docs.push({
    _id: code,
    code,
    componentCode: 'SPEAKING',
    partCode,
    version: 1,
    maxScore,
    criteria: built,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
}

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const lines = docs.map(
  (doc) => `db.rubric_definitions.replaceOne({_id:${JSON.stringify(doc._id)}}, ${JSON.stringify(doc)}, {upsert:true});`,
);

// Trỏ đề Speaking sang rubric đúng part. Mã cũ "APTIS_SPEAKING" không tồn tại
// nên mọi lượt chấm Speaking đều FAILED.
const PART_IDS = {
  PART_1: '16000000-0000-4000-8000-000000000031',
  PART_2: '16000000-0000-4000-8000-000000000032',
  PART_3: '16000000-0000-4000-8000-000000000033',
  PART_4: '16000000-0000-4000-8000-000000000034',
};
for (const [partCode, partId] of Object.entries(PART_IDS)) {
  lines.push(
    `db.question_set_documents.updateMany(`
    + `{partId:${JSON.stringify(partId)}, "items.rubricCode":{$exists:true}}, `
    + `{$set:{"items.$[el].rubricCode":${JSON.stringify(`APTIS_SPEAKING_${partCode}_V1`)}}}, `
    + `{arrayFilters:[{"el.rubricCode":{$exists:true}}]});`,
  );
}

lines.push('print("rubric Speaking: " + db.rubric_definitions.countDocuments({componentCode:"SPEAKING"}));');
lines.push('print("de con tro rubric cu: " + db.question_set_documents.countDocuments({"items.rubricCode":"APTIS_SPEAKING"}));');

fs.writeFileSync(path.join(outDir, 'speaking-rubrics.mongo.js'), lines.join('\n') + '\n', 'utf8');

for (const doc of docs) {
  const sum = round2(doc.criteria.reduce((total, item) => total + item.maxScore, 0));
  console.log(`${doc.code}  max=${doc.maxScore}  tổng tiêu chí=${sum}  ${sum === doc.maxScore ? 'khớp' : 'LỆCH'}`);
}
console.log(`\nĐã ghi ${path.join(outDir, 'speaking-rubrics.mongo.js')}`);
