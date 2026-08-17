/**
 * Nhập đề Grammar (25 câu) và Vocabulary (25 câu) cho kỹ năng Ngữ pháp & Từ vựng.
 *
 * Sinh ra hai file:
 *   - out/gv.sql          : hàng question_sets cho MySQL
 *   - out/gv.mongo.js     : document nội dung cho MongoDB
 *
 * Cách chạy:
 *   node scripts/seed-grammar-vocabulary.js
 *   docker compose exec -T mysql mysql -uroot -proot aptis < out/gv.sql
 *   docker compose exec -T mongo mongosh aptis --quiet < out/gv.mongo.js
 *
 * Grammar: mỗi câu là một bộ riêng (ngân hàng câu rời), giống Reading Part 1 —
 * đề thi thật gộp lại qua merge-item-parts.
 *
 * Vocabulary: 5 nhóm, mỗi nhóm 5 câu dùng chung một danh sách 10 lựa chọn nên
 * phải là MATCHING, không tách rời được.
 */

const fs = require('fs');
const path = require('path');

const PART_GRAMMAR = '16000000-0000-4000-8000-000000000001';
const PART_VOCABULARY = '16000000-0000-4000-8000-000000000002';
const TASK_GAP_FILL = '12000000-0000-4000-8000-000000000003';
const TASK_MATCHING = '12000000-0000-4000-8000-000000000004';

/** UUID cố định để chạy lại script không sinh trùng bản ghi. */
const uuid = (prefix, n) => `${prefix}${String(n).padStart(12, '0')}`;
const GRAMMAR_PREFIX = 'c1000000-0000-4000-8000-';
const VOCAB_PREFIX = 'c2000000-0000-4000-8000-';

// ---------------------------------------------------------------------
// Grammar — 25 câu, mỗi câu 3 lựa chọn
// ---------------------------------------------------------------------

const GRAMMAR = [
  ['In those days, my father _______ never eat dinner after eight o’clock.', ['would', 'will', 'used to'], 'A'],
  ['He _______ finished cooking when we arrived.', ['have', 'had', 'has'], 'B'],
  ['If you were a better cook, you _______ need to eat out all the time.', ['won’t', 'wouldn’t', 'hadn’t'], 'B'],
  ['The passenger _______ a fine because he didn’t have the right ticket.', ['given', 'was given', 'didn’t give'], 'B'],
  ['There were _______ than fifty people in the audience last night.', ['fewer', 'lesser', 'few'], 'A'],
  ['I’m _______ happy with my new car. It’s brilliant!', ['so', 'quite', 'a bit'], 'A'],
  ['I’m not sure about my future. _______ I’ll start a business.', ['Sometimes', 'Perhaps', 'Always'], 'B'],
  ['Please, _______ the street if the light is red.', ['cross not', 'not cross', 'do not cross'], 'C'],
  ['Why _______ you apply for the job, you’ve got the experience.', ['are', 'don’t', 'not'], 'B'],
  ['I _______ London but it’s expensive.', ['likes', 'like', 'liking'], 'B'],
  ['We _______ through France during the summer.', ['was travelling', 'travelling', 'travelled'], 'C'],
  ['John: I love riding bikes. Paul: _______? Me too!', ['Really', 'Right', 'Anyway'], 'A'],
  ['I’m really not sure what to do at work. I need _______ advice.', ['the', 'piece of', 'some'], 'C'],
  ['I think, in the future, space travel _______ as common as plane travel is now.', ['will become', 'has become', 'is becoming'], 'A'],
  ['Please don’t come in the morning. I will _______ if you do.', ['have worked', 'be working', 'work'], 'B'],
  ['San Francisco is the most beautiful city I _______ visited.', ['ever', 'have', 'had'], 'B'],
  ['I’m sorry to let you _______, but I can’t come to your party.', ['down', 'on', 'under'], 'A'],
  ['You missed a great party on Saturday night. You _______ have come.', ['must', 'ought', 'should'], 'C'],
  ['_______ the cold weather, she went swimming.', ['Although', 'Despite', 'In spite'], 'B'],
  ['He had been working for hours when he _______ asleep.', ['has fallen', 'falls', 'fell'], 'C'],
  ['Before she got married, she _______ go out most evenings.', ['should', 'would', 'must'], 'B'],
  ['It _______ been snowing heavily, so we decided to go skiing.', ['has', 'had', 'would have'], 'B'],
  ['It is expected that two million copies of the novel _______ sold by December.', ['will have been', 'have been', 'will have being'], 'A'],
  ['If I _______ harder at school, I wouldn’t be doing this job now.', ['has worked', 'have worked', 'had worked'], 'C'],
  ['The way I see it, you _______ have sold the land then – prices are higher now.', ['mustn’t', 'shouldn’t', 'can’t'], 'B'],
];

// ---------------------------------------------------------------------
// Vocabulary — 5 nhóm, mỗi nhóm 5 câu / 10 lựa chọn
//
// Ba đáp án đã sửa so với bản gốc, lý do ghi ngay tại chỗ.
// ---------------------------------------------------------------------

const VOCABULARY = [
  {
    title: 'Từ đồng nghĩa (1)',
    instructions: 'Chọn từ có nghĩa gần nhất với từ bên trái. Mỗi từ chỉ dùng một lần.',
    left: ['oppose', 'unite', 'complete', 'say', 'vote'],
    options: ['doubt', 'tell', 'accept', 'join', 'realise', 'assume', 'choose', 'finish', 'disagree', 'touch'],
    answers: ['J', 'D', 'H', 'B', 'G'],
  },
  {
    title: 'Định nghĩa hành động',
    instructions: 'Hoàn thành mỗi câu bằng một từ trong danh sách. Mỗi từ chỉ dùng một lần.',
    left: [
      'To say no is to...',
      'To look at something is to...',
      'To wrap something is to...',
      'To give orders is to...',
      'To guess something is to...',
    ],
    options: ['instruct', 'improve', 'follow', 'share', 'cover', 'refuse', 'measure', 'link', 'observe', 'estimate'],
    // Câu cuối: bản gốc ghi D (share) — sai nghĩa. "Guess" = estimate (K).
    answers: ['F', 'J', 'E', 'A', 'K'],
  },
  {
    title: 'Từ đồng nghĩa (2)',
    instructions: 'Chọn từ có nghĩa gần nhất với từ bên trái. Mỗi từ chỉ dùng một lần.',
    left: ['whack', 'tread', 'arrest', 'mend', 'thrill'],
    options: ['catch', 'dance', 'chase', 'hit', 'step', 'stand', 'excite', 'laugh', 'mix', 'fix'],
    answers: ['D', 'E', 'A', 'K', 'G'],
  },
  {
    title: 'Từ đi kèm',
    instructions: 'Chọn từ thường đi kèm với từ bên trái. Mỗi từ chỉ dùng một lần.',
    left: ['millionaire', 'epidemic', 'diploma', 'windscreen', 'bargain'],
    options: ['hunters', 'subject', 'employee', 'programme', 'shoppers', 'joint', 'proportions', 'wipers', 'size', 'businessmen'],
    // windscreen: bản gốc ghi D (programme), trùng với câu diploma và vô nghĩa.
    // Cụm chuẩn là "windscreen wipers" (H).
    answers: ['K', 'G', 'D', 'H', 'A'],
  },
  {
    title: 'Điền từ vào câu',
    instructions: 'Hoàn thành mỗi câu bằng một từ trong danh sách. Mỗi từ chỉ dùng một lần.',
    left: [
      'I don’t buy _______ food because it’s expensive and I think it’s a waste of money.',
      'He was an excitable man and was very _______ about being unhappy.',
      'It was one of the ugliest things I’ve ever seen. It was absolutely _______.',
      'They’d spent a huge amount of money on the wedding. It was very _______.',
      'When the player found out he’d lost the point, he was absolutely _______.',
    ],
    options: ['catch', 'vicious', 'swift', 'organic', 'ripe', 'extravagant', 'secret', 'furious', 'vocal', 'calm'],
    // Câu "ugliest": bản gốc ghi A (catch) — không phải tính từ, không ghép được
    // với "absolutely". Đáp án đúng là vicious (B).
    answers: ['D', 'J', 'B', 'F', 'H'],
  },
];

/** Mã lựa chọn theo quy ước Aptis: bỏ chữ I để không nhầm với số 1. */
const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];

const now = new Date().toISOString();
const sql = [];
const mongo = [];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function pushQuestionSet(id, partId, taskTypeId, code, title, itemCount, maxScore) {
  sql.push(
    `INSERT INTO question_sets (id, part_id, task_type_id, code, title, status, access_level, `
    + `current_revision, item_count, max_score, published_at, created_at, updated_at) VALUES (`
    + `${sqlString(id)}, ${sqlString(partId)}, ${sqlString(taskTypeId)}, ${sqlString(code)}, `
    + `${sqlString(title)}, 'PUBLISHED', 'FREE', 1, ${itemCount}, ${maxScore}, NOW(), NOW(), NOW())`
    + ` ON DUPLICATE KEY UPDATE title = VALUES(title), item_count = VALUES(item_count), `
    + `max_score = VALUES(max_score), status = VALUES(status), updated_at = NOW();`,
  );
}

// --- Grammar: mỗi câu một bộ ---------------------------------------------

GRAMMAR.forEach(([prompt, choices, answer], index) => {
  const id = uuid(GRAMMAR_PREFIX, index + 1);
  const code = `GRAMMAR_${String(index + 1).padStart(3, '0')}`;
  pushQuestionSet(id, PART_GRAMMAR, TASK_GAP_FILL, code, prompt, 1, 1);

  mongo.push({
    _id: id,
    questionSetId: id,
    revision: 1,
    schemaVersion: 1,
    partId: PART_GRAMMAR,
    taskTypeCode: 'GAP_FILL_CHOICE',
    title: prompt,
    instructions: 'Chọn từ phù hợp để hoàn thành câu.',
    accessLevel: 'FREE',
    stimulus: null,
    sections: [],
    assets: [],
    settings: {
      // Không xáo: A/B/C gắn với đáp án cố định của đề gốc.
      shuffleOptions: false,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore: 1 },
    items: [{
      id: 'item_1',
      displayOrder: 1,
      responseType: 'SINGLE_CHOICE',
      prompt: { format: 'PLAIN_TEXT', value: prompt },
      maxScore: 1,
      options: choices.map((content, i) => ({
        id: OPTION_CODES[i], code: OPTION_CODES[i], content,
      })),
      leftItems: [],
      rightItems: [],
      constraints: {},
      answerKey: {
        type: 'SINGLE_CHOICE',
        selectedOptionId: answer,
        selectedOptionIds: [],
        matches: {},
        orderedOptionIds: [],
        acceptedValues: [],
        caseSensitive: false,
      },
      explanation: null,
    }],
    createdAt: now,
    updatedAt: now,
  });
});

// --- Vocabulary: 5 nhóm matching -----------------------------------------

VOCABULARY.forEach((group, index) => {
  const id = uuid(VOCAB_PREFIX, index + 1);
  const code = `VOCAB_${String(index + 1).padStart(3, '0')}`;
  pushQuestionSet(id, PART_VOCABULARY, TASK_MATCHING, code, group.title, 1, group.left.length);

  const rightItems = group.options.map((content, i) => ({
    id: OPTION_CODES[i], code: OPTION_CODES[i], content,
  }));
  const leftItems = group.left.map((content, i) => ({
    id: `left_${i + 1}`, code: String(i + 1), content,
  }));
  const matches = {};
  group.answers.forEach((answer, i) => { matches[`left_${i + 1}`] = answer; });

  mongo.push({
    _id: id,
    questionSetId: id,
    revision: 1,
    schemaVersion: 1,
    partId: PART_VOCABULARY,
    taskTypeCode: 'MATCHING',
    title: group.title,
    instructions: group.instructions,
    accessLevel: 'FREE',
    stimulus: null,
    sections: [],
    assets: [],
    settings: {
      shuffleOptions: false,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: { strategy: 'EXACT_MATCH', partialCredit: true, maxScore: group.left.length },
    items: [{
      id: 'item_1',
      displayOrder: 1,
      responseType: 'MATCHING',
      prompt: { format: 'PLAIN_TEXT', value: group.instructions },
      maxScore: group.left.length,
      options: [],
      leftItems,
      rightItems,
      constraints: {},
      answerKey: {
        type: 'MATCHING',
        selectedOptionId: null,
        selectedOptionIds: [],
        matches,
        orderedOptionIds: [],
        acceptedValues: [],
        caseSensitive: false,
      },
      explanation: null,
    }],
    createdAt: now,
    updatedAt: now,
  });
});

// --- Kiểm tra trước khi ghi ----------------------------------------------

VOCABULARY.forEach((group) => {
  const unique = new Set(group.answers);
  if (unique.size !== group.answers.length) {
    throw new Error(`Nhóm "${group.title}" có đáp án trùng — sai luật "mỗi từ dùng một lần"`);
  }
  group.answers.forEach((answer) => {
    if (!OPTION_CODES.slice(0, group.options.length).includes(answer)) {
      throw new Error(`Nhóm "${group.title}" có đáp án ${answer} ngoài danh sách lựa chọn`);
    }
  });
});

GRAMMAR.forEach(([prompt, choices, answer], index) => {
  if (!['A', 'B', 'C'].slice(0, choices.length).includes(answer)) {
    throw new Error(`Grammar câu ${index + 1} có đáp án ${answer} ngoài A/B/C`);
  }
});

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'gv.sql'), sql.join('\n') + '\n', 'utf8');

const mongoScript = mongo
  .map((doc) => `db.question_set_documents.replaceOne({_id:${JSON.stringify(doc._id)}}, ${JSON.stringify(doc)}, {upsert:true});`)
  .join('\n');
fs.writeFileSync(path.join(outDir, 'gv.mongo.js'), mongoScript + '\nprint("done");\n', 'utf8');

console.log(`Grammar: ${GRAMMAR.length} bộ`);
console.log(`Vocabulary: ${VOCABULARY.length} nhóm x 5 câu = ${VOCABULARY.length * 5} câu`);
console.log(`Đã ghi ${path.join(outDir, 'gv.sql')} và gv.mongo.js`);
