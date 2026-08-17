/**
 * Chuẩn hoá rubric Speaking/Writing về TRẦN SỐ NGUYÊN.
 *
 * Vì sao: điểm hiển thị không được có phần thập phân. Chỉ dặn AI chấm số nguyên
 * là chưa đủ — trần lẻ (ví dụ TASK max 2.5) khiến AI cao nhất chỉ chấm được 2,
 * nên học viên làm hoàn hảo vẫn không đạt điểm tối đa:
 *
 *   Speaking P1 thang 5  -> cao nhất đạt 3
 *   Speaking P2 thang 10 -> cao nhất đạt 9
 *   Speaking P3 thang 15 -> cao nhất đạt 13
 *   Writing  P1 thang 5  -> cao nhất đạt 3
 *
 * Nên trần từng tiêu chí phải là số nguyên và cộng đúng bằng thang điểm của
 * part trong part_scoring_rules (Speaking/Writing đều 5/10/15/20).
 *
 * Giữ nguyên tinh thần phân bổ: Task nặng nhất; Speaking P4 (độc thoại 2 phút)
 * có Coherence cao; Writing P4 (email trang trọng + thân mật) giữ Register.
 *
 * Chạy:
 *   node scripts/seed-integer-rubrics.js
 *   docker compose exec -T mongo mongosh aptis --quiet < scripts/out/integer-rubrics.mongo.js
 */

const fs = require('fs');
const path = require('path');

/** Thang điểm mỗi part, phải trùng part_scoring_rules.max_score. */
const PART_MAX = { PART_1: 5, PART_2: 10, PART_3: 15, PART_4: 20 };

/**
 * Trần từng tiêu chí — đã là số nguyên và tổng đúng bằng thang.
 * Script tự kiểm tra tổng bên dưới, sai là dừng.
 */
const SPEAKING = {
  PART_1: [['TASK_FULFILMENT', 1], ['PRONUNCIATION', 1], ['FLUENCY', 1], ['GRAMMAR', 1], ['VOCABULARY', 1]],
  PART_2: [['TASK_FULFILMENT', 3], ['PRONUNCIATION', 2], ['FLUENCY', 2], ['GRAMMAR', 1], ['VOCABULARY', 1], ['COHERENCE', 1]],
  PART_3: [['TASK_FULFILMENT', 4], ['PRONUNCIATION', 2], ['FLUENCY', 3], ['GRAMMAR', 2], ['VOCABULARY', 2], ['COHERENCE', 2]],
  PART_4: [['TASK_FULFILMENT', 5], ['PRONUNCIATION', 3], ['FLUENCY', 3], ['GRAMMAR', 3], ['VOCABULARY', 2], ['COHERENCE', 4]],
};

const WRITING = {
  // P1 trả lời bằng từ đơn nên không đánh giá Cohesion/Register.
  PART_1: [['TASK_ACHIEVEMENT', 2], ['GRAMMAR', 1], ['VOCABULARY', 1], ['COHESION', 1]],
  PART_2: [['TASK_ACHIEVEMENT', 3], ['GRAMMAR', 3], ['VOCABULARY', 2], ['COHESION', 2]],
  PART_3: [['TASK_ACHIEVEMENT', 3], ['GRAMMAR', 3], ['VOCABULARY', 3], ['COHESION', 3], ['REGISTER', 3]],
  PART_4: [['TASK_ACHIEVEMENT', 4], ['GRAMMAR', 4], ['VOCABULARY', 4], ['COHESION', 4], ['REGISTER', 4]],
};

const NAMES = {
  TASK_FULFILMENT: 'Task fulfilment',
  TASK_ACHIEVEMENT: 'Task achievement',
  PRONUNCIATION: 'Pronunciation',
  FLUENCY: 'Fluency',
  GRAMMAR: 'Grammar',
  VOCABULARY: 'Vocabulary',
  COHERENCE: 'Coherence',
  COHESION: 'Clarity and cohesion',
  REGISTER: 'Register',
};

const DESCRIPTORS = {
  TASK_FULFILMENT: ['Không trả lời đúng yêu cầu của đề.', 'Trả lời được một phần yêu cầu.', 'Trả lời đầy đủ và đúng trọng tâm.'],
  TASK_ACHIEVEMENT: ['Không trả lời đúng yêu cầu của đề.', 'Trả lời được một phần yêu cầu.', 'Trả lời đầy đủ và đúng trọng tâm.'],
  PRONUNCIATION: ['Phát âm khó nghe, người nghe phải đoán.', 'Hiểu được nhưng còn lỗi trọng âm.', 'Phát âm rõ, ngữ điệu tự nhiên.'],
  FLUENCY: ['Ngắt quãng liên tục.', 'Nói liên tục nhưng còn ngập ngừng.', 'Nói trôi chảy, nhịp độ tự nhiên.'],
  GRAMMAR: ['Cấu trúc sai nhiều, gây khó hiểu.', 'Dùng được cấu trúc cơ bản, còn lỗi.', 'Ngữ pháp chính xác, đa dạng.'],
  VOCABULARY: ['Vốn từ quá hạn chế.', 'Từ vựng đủ diễn đạt ý cơ bản.', 'Từ vựng phong phú, dùng đúng ngữ cảnh.'],
  COHERENCE: ['Ý rời rạc, không liên kết.', 'Ý sắp xếp được, liên kết đơn giản.', 'Ý mạch lạc, chuyển ý tự nhiên.'],
  COHESION: ['Ý rời rạc hoặc không rõ.', 'Ý cơ bản rõ, liên kết hạn chế.', 'Rõ ràng và mạch lạc.'],
  REGISTER: ['Sai văn phong so với người nhận.', 'Văn phong chưa nhất quán.', 'Văn phong phù hợp người nhận.'],
};

const now = new Date().toISOString();
const docs = [];

function build(componentCode, table) {
  for (const [partCode, criteria] of Object.entries(table)) {
    const maxScore = PART_MAX[partCode];

    for (const [code, cap] of criteria) {
      if (!Number.isInteger(cap) || cap < 1) {
        throw new Error(`${componentCode} ${partCode}: ${code} có trần ${cap}, phải là số nguyên >= 1`);
      }
    }

    const total = criteria.reduce((sum, [, cap]) => sum + cap, 0);
    if (total !== maxScore) {
      throw new Error(`${componentCode} ${partCode}: tổng trần ${total} khác thang ${maxScore}`);
    }

    const built = criteria.map(([code, cap]) => {
      const [low, mid, high] = DESCRIPTORS[code];
      // Mốc giữa chỉ ghi khi trần đủ lớn; trần 1 thì chỉ có 0 và 1.
      const descriptors = cap >= 2
        ? { '0': low, [String(Math.floor(cap / 2))]: mid, [String(cap)]: high }
        : { '0': low, '1': high };
      return {
        code,
        name: NAMES[code],
        // Trọng số suy từ trần để hai con số không lệch nhau về sau.
        weight: Math.round((cap / maxScore) * 100) / 100,
        maxScore: cap,
        descriptors,
      };
    });

    const code = `APTIS_${componentCode}_${partCode}_V1`;
    docs.push({
      _id: code,
      code,
      componentCode,
      partCode,
      version: 1,
      maxScore,
      criteria: built,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
  }
}

build('SPEAKING', SPEAKING);
build('WRITING', WRITING);

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const lines = docs.map(
  (doc) => `db.rubric_definitions.replaceOne({_id:${JSON.stringify(doc._id)}}, ${JSON.stringify(doc)}, {upsert:true});`,
);

lines.push('');
lines.push('print("--- kiem tra ---");');
lines.push(`db.rubric_definitions.find({componentCode:{$in:["SPEAKING","WRITING"]}},{code:1,maxScore:1,"criteria.maxScore":1}).sort({code:1}).forEach(function(r){
  var s=0, lelo=0;
  r.criteria.forEach(function(c){ s+=c.maxScore; if(c.maxScore%1!==0) lelo++; });
  print("  "+r.code+" tong="+s+"/"+r.maxScore+(s===r.maxScore?" OK":" LECH")+(lelo?"  CO TRAN LE":""));
});`);

fs.writeFileSync(path.join(outDir, 'integer-rubrics.mongo.js'), lines.join('\n') + '\n', 'utf8');

for (const doc of docs) {
  const caps = doc.criteria.map((c) => `${c.code.slice(0, 4)}=${c.maxScore}`).join(' ');
  console.log(`${doc.code.padEnd(28)} ${String(doc.maxScore).padStart(2)}  ${caps}`);
}
console.log(`\nĐã ghi ${path.join(outDir, 'integer-rubrics.mongo.js')}`);
