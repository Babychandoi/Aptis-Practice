// Seed nội dung câu hỏi mẫu để test luồng làm bài.
// Chạy: docker exec -i aptis-mongo mongosh --quiet < seed-sample-questions.js
const target = db.getSiblingDB('aptis');

function makeDoc(id, title, accessLevel, items) {
  return {
    _id: id,
    questionSetId: id,
    revision: NumberInt(1),
    schemaVersion: NumberInt(1),
    partId: '16000000-0000-4000-8000-000000000001',
    taskTypeCode: 'SINGLE_CHOICE',
    title: title,
    instructions: 'Chon dap an dung nhat.',
    accessLevel: accessLevel,
    stimulus: null,
    sections: [],
    items: items,
    assets: [],
    settings: {
      shuffleOptions: false,
      shuffleItems: false,
      maxAudioPlays: null,
      showAnswerAfterEachItem: false,
      allowReview: true,
    },
    scoring: { strategy: 'EXACT_MATCH', partialCredit: false, maxScore: 2 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function item(id, seq, prompt, opts, correct, explain) {
  return {
    id: id,
    sequenceNo: NumberInt(seq),
    prompt: { format: 'PLAIN_TEXT', value: prompt },
    responseType: 'SINGLE_CHOICE',
    required: true,
    maxScore: 1,
    options: opts,
    leftItems: [],
    rightItems: [],
    constraints: {},
    rubricCode: null,
    answerKey: {
      type: 'SINGLE_CHOICE',
      selectedOptionId: correct,
      selectedOptionIds: [],
      matches: {},
      orderedOptionIds: [],
      acceptedValues: [],
      caseSensitive: false,
    },
    explanation: { format: 'PLAIN_TEXT', value: explain },
  };
}

const free = makeDoc(
  'aa000000-0000-4000-8000-000000000001',
  'Grammar - Present Simple (free)',
  'FREE',
  [
    item('item_1', 1, 'She ___ to work every day.',
      [{ id: 'A', code: 'A', content: 'go' },
       { id: 'B', code: 'B', content: 'goes' },
       { id: 'C', code: 'C', content: 'going' }],
      'B', 'Chu ngu so 3 so it dung "goes".'),
    item('item_2', 2, 'They ___ football on Sundays.',
      [{ id: 'A', code: 'A', content: 'plays' },
       { id: 'B', code: 'B', content: 'play' },
       { id: 'C', code: 'C', content: 'playing' }],
      'B', 'Chu ngu so nhieu dung dong tu nguyen mau.'),
  ]);

const prem = makeDoc(
  'aa000000-0000-4000-8000-000000000002',
  'Grammar - Conditionals (premium)',
  'PREMIUM',
  [
    item('item_1', 1, 'If I ___ more time, I would travel.',
      [{ id: 'A', code: 'A', content: 'have' },
       { id: 'B', code: 'B', content: 'had' },
       { id: 'C', code: 'C', content: 'will have' }],
      'B', 'Cau dieu kien loai 2 dung qua khu don.'),
    item('item_2', 2, 'She would have passed if she ___ harder.',
      [{ id: 'A', code: 'A', content: 'studied' },
       { id: 'B', code: 'B', content: 'had studied' },
       { id: 'C', code: 'C', content: 'studies' }],
      'B', 'Cau dieu kien loai 3 dung qua khu hoan thanh.'),
  ]);

[free, prem].forEach(function (d) {
  target.question_set_documents.replaceOne({ _id: d._id }, d, { upsert: true });
  print('upserted ' + d._id);
});
print('count = ' + target.question_set_documents.countDocuments({}));
