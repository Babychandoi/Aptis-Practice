/*
 * Seed rubric_definitions.
 *
 * Chạy sau 01-init-collections.js:
 *   mongosh "mongodb://localhost:27017/aptis" 02-seed-rubrics.js
 *
 * Tiền tố số bảo đảm thứ tự: entrypoint của image mongo chạy script theo
 * alphabet, nên 01- luôn chạy trước 02-.
 */

// Chỉ định database tường minh — xem chú thích trong init-collections.js
const target = db.getSiblingDB('aptis');

const now = new Date();

const rubrics = [
  {
    _id: 'APTIS_WRITING_PART_4_V1',
    code: 'APTIS_WRITING_PART_4_V1',
    componentCode: 'WRITING',
    partCode: 'PART_4',
    version: 1,
    maxScore: 20,
    criteria: [
      {
        code: 'TASK_ACHIEVEMENT',
        name: 'Task achievement',
        weight: 0.2,
        maxScore: 4,
        descriptors: {
          0: 'Không đáp ứng yêu cầu đề bài, thiếu nội dung chính.',
          2: 'Đáp ứng phần lớn yêu cầu, còn thiếu một vài điểm.',
          4: 'Đáp ứng đầy đủ mọi yêu cầu của đề bài.',
        },
      },
      {
        code: 'GRAMMAR',
        name: 'Grammar',
        weight: 0.2,
        maxScore: 4,
        descriptors: {
          0: 'Nhiều lỗi ngữ pháp cơ bản gây khó hiểu.',
          2: 'Cấu trúc đúng ở mức cơ bản, còn lỗi khi dùng câu phức.',
          4: 'Ngữ pháp chính xác, đa dạng cấu trúc.',
        },
      },
      {
        code: 'VOCABULARY',
        name: 'Vocabulary',
        weight: 0.2,
        maxScore: 4,
        descriptors: {
          0: 'Từ vựng rất hạn chế, dùng sai nghĩa.',
          2: 'Từ vựng đủ dùng, ít linh hoạt.',
          4: 'Từ vựng phong phú, dùng chính xác và tự nhiên.',
        },
      },
      {
        code: 'COHESION',
        name: 'Cohesion & coherence',
        weight: 0.2,
        maxScore: 4,
        descriptors: {
          0: 'Ý rời rạc, không có liên kết.',
          2: 'Có liên kết nhưng còn máy móc.',
          4: 'Bố cục rõ ràng, liên kết mạch lạc.',
        },
      },
      {
        code: 'REGISTER',
        name: 'Register & tone',
        weight: 0.2,
        maxScore: 4,
        descriptors: {
          0: 'Sai hoàn toàn văn phong yêu cầu.',
          2: 'Văn phong phù hợp phần lớn nhưng không nhất quán.',
          4: 'Văn phong đúng và nhất quán với đối tượng nhận.',
        },
      },
    ],
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: 'APTIS_WRITING_PART_2_V1',
    code: 'APTIS_WRITING_PART_2_V1',
    componentCode: 'WRITING',
    partCode: 'PART_2',
    version: 1,
    maxScore: 10,
    criteria: [
      { code: 'TASK_ACHIEVEMENT', name: 'Task achievement', weight: 0.3, maxScore: 3,
        descriptors: { 0: 'Không đáp ứng yêu cầu.', 1.5: 'Đáp ứng một phần yêu cầu.', 3: 'Đáp ứng đầy đủ yêu cầu.' } },
      { code: 'GRAMMAR', name: 'Grammar', weight: 0.25, maxScore: 2.5,
        descriptors: { 0: 'Cấu trúc không rõ nghĩa.', 1.25: 'Dùng cấu trúc cơ bản nhưng còn lỗi.', 2.5: 'Ngữ pháp phù hợp và chính xác.' } },
      { code: 'VOCABULARY', name: 'Vocabulary', weight: 0.25, maxScore: 2.5,
        descriptors: { 0: 'Từ vựng không phù hợp.', 1.25: 'Từ vựng đủ diễn đạt ý cơ bản.', 2.5: 'Từ vựng phù hợp và tự nhiên.' } },
      { code: 'COHESION', name: 'Clarity and cohesion', weight: 0.2, maxScore: 2,
        descriptors: { 0: 'Ý không rõ hoặc rời rạc.', 1: 'Ý cơ bản rõ nhưng liên kết hạn chế.', 2: 'Câu trả lời rõ ràng và mạch lạc.' } },
    ],
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: 'APTIS_WRITING_PART_3_V1',
    code: 'APTIS_WRITING_PART_3_V1',
    componentCode: 'WRITING',
    partCode: 'PART_3',
    version: 1,
    maxScore: 15,
    criteria: [
      { code: 'TASK_ACHIEVEMENT', name: 'Task achievement', weight: 0.2, maxScore: 3,
        descriptors: { 0: 'Không đáp ứng các tin nhắn.', 1.5: 'Đáp ứng một phần nội dung.', 3: 'Đáp ứng đầy đủ cả ba tin nhắn.' } },
      { code: 'GRAMMAR', name: 'Grammar', weight: 0.2, maxScore: 3,
        descriptors: { 0: 'Cấu trúc không rõ nghĩa.', 1.5: 'Dùng cấu trúc cơ bản nhưng còn lỗi.', 3: 'Ngữ pháp phù hợp và chính xác.' } },
      { code: 'VOCABULARY', name: 'Vocabulary', weight: 0.2, maxScore: 3,
        descriptors: { 0: 'Từ vựng không phù hợp.', 1.5: 'Từ vựng đủ diễn đạt ý cơ bản.', 3: 'Từ vựng đa dạng và tự nhiên.' } },
      { code: 'COHESION', name: 'Clarity and cohesion', weight: 0.2, maxScore: 3,
        descriptors: { 0: 'Ý không rõ hoặc rời rạc.', 1.5: 'Ý khá rõ nhưng liên kết hạn chế.', 3: 'Câu trả lời rõ ràng và mạch lạc.' } },
      { code: 'REGISTER', name: 'Interaction and register', weight: 0.2, maxScore: 3,
        descriptors: { 0: 'Cách trả lời không phù hợp group chat.', 1.5: 'Văn phong phù hợp một phần.', 3: 'Văn phong tự nhiên và phù hợp xuyên suốt.' } },
    ],
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: 'APTIS_SPEAKING_PART_2_V1',
    code: 'APTIS_SPEAKING_PART_2_V1',
    componentCode: 'SPEAKING',
    partCode: 'PART_2',
    version: 1,
    maxScore: 30,
    criteria: [
      { code: 'TASK_FULFILMENT', name: 'Task fulfilment', weight: 0.2,  maxScore: 5,
        descriptors: { 1: 'Không trả lời đúng yêu cầu.', 3: 'Trả lời được phần lớn.', 5: 'Trả lời đầy đủ, chi tiết.' } },
      { code: 'PRONUNCIATION',   name: 'Pronunciation',   weight: 0.2,  maxScore: 5,
        descriptors: { 1: 'Rất khó nghe.', 3: 'Nghe được, còn lỗi trọng âm.', 5: 'Rõ ràng, trọng âm và ngữ điệu tự nhiên.' } },
      { code: 'FLUENCY',         name: 'Fluency',         weight: 0.2,  maxScore: 5,
        descriptors: { 1: 'Ngắt nghỉ nhiều, không nói trôi.', 3: 'Nói được liên tục nhưng còn do dự.', 5: 'Nói trôi chảy, tự nhiên.' } },
      { code: 'GRAMMAR',         name: 'Grammar',         weight: 0.15, maxScore: 5,
        descriptors: { 1: 'Nhiều lỗi cơ bản.', 3: 'Đúng ở cấu trúc đơn giản.', 5: 'Chính xác và đa dạng.' } },
      { code: 'VOCABULARY',      name: 'Vocabulary',      weight: 0.15, maxScore: 5,
        descriptors: { 1: 'Từ vựng rất hạn chế.', 3: 'Đủ để diễn đạt ý cơ bản.', 5: 'Phong phú, chính xác.' } },
      { code: 'COHERENCE',       name: 'Coherence',       weight: 0.1,  maxScore: 5,
        descriptors: { 1: 'Ý rời rạc.', 3: 'Có mạch nhưng chưa rõ.', 5: 'Ý tưởng liên kết rõ ràng.' } },
    ],
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  },
];

rubrics.forEach((r) => {
  target.rubric_definitions.replaceOne({ _id: r._id }, r, { upsert: true });
  print(`upserted rubric: ${r._id}`);
});

print('rubric seed done');
