/*
 * MongoDB init: collections, validator, index.
 *
 * Chạy tay:
 *   mongosh "mongodb://localhost:27017/aptis" 01-init-collections.js
 *
 * Hoặc tự động qua /docker-entrypoint-initdb.d khi volume còn trống.
 * Script idempotent — chạy lại nhiều lần không gây lỗi.
 *
 * Nguyên tắc:
 *  - _id = UUID do application sinh (cùng ID với MySQL), không dùng ObjectId.
 *  - MySQL là nguồn quyết định nội dung có publish hay không.
 *  - Snapshot attempt là bất biến sau khi tạo.
 */

// Chỉ định database tường minh: entrypoint của image mongo chạy script với
// database mặc định (test), không phải database trong URI.
const target = db.getSiblingDB('aptis');

const COLLECTIONS = [
  'question_set_documents',
  'question_set_revisions',
  'attempt_documents',
  'evaluation_documents',
  'rubric_definitions',
];

COLLECTIONS.forEach((name) => {
  if (!target.getCollectionNames().includes(name)) {
    target.createCollection(name);
    print(`created collection: ${name}`);
  }
});

// ---------------------------------------------------------------------
// question_set_documents — nội dung chi tiết của một bộ câu hỏi
// ---------------------------------------------------------------------
target.runCommand({
  collMod: 'question_set_documents',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'questionSetId', 'revision', 'schemaVersion', 'partId', 'taskTypeCode', 'items'],
      properties: {
        _id: { bsonType: 'string' },
        questionSetId: { bsonType: 'string' },
        revision: { bsonType: 'int', minimum: 1 },
        schemaVersion: { bsonType: 'int', minimum: 1 },
        partId: { bsonType: 'string' },
        taskTypeCode: { bsonType: 'string' },
        accessLevel: { enum: ['FREE', 'PREMIUM'] },
        items: { bsonType: 'array', minItems: 1 },
      },
    },
  },
  validationLevel: 'moderate',
});

target.question_set_documents.createIndex({ questionSetId: 1, revision: -1 }, { unique: true });
target.question_set_documents.createIndex({ partId: 1, taskTypeCode: 1 });
target.question_set_documents.createIndex({ 'assets.assetId': 1 });

// ---------------------------------------------------------------------
// question_set_revisions — lịch sử chỉnh sửa
// ---------------------------------------------------------------------
target.question_set_revisions.createIndex({ questionSetId: 1, revision: -1 }, { unique: true });
target.question_set_revisions.createIndex({ createdAt: -1 });

// ---------------------------------------------------------------------
// attempt_documents — snapshot + câu trả lời của học viên
// ---------------------------------------------------------------------
target.runCommand({
  collMod: 'attempt_documents',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'attemptId', 'userId', 'mode', 'status', 'questionSets'],
      properties: {
        _id: { bsonType: 'string' },
        attemptId: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        mode: { enum: ['PART_PRACTICE', 'CUSTOM_PRACTICE', 'MOCK_TEST'] },
        questionSets: { bsonType: 'array' },
      },
    },
  },
  validationLevel: 'moderate',
});

target.attempt_documents.createIndex({ attemptId: 1 }, { unique: true });
target.attempt_documents.createIndex({ userId: 1, createdAt: -1 });
target.attempt_documents.createIndex({ userId: 1, status: 1 });

// ---------------------------------------------------------------------
// evaluation_documents — kết quả chấm chi tiết
// ---------------------------------------------------------------------
target.evaluation_documents.createIndex({ evaluationJobId: 1 }, { unique: true });
target.evaluation_documents.createIndex({ attemptId: 1, questionSetId: 1 });
target.evaluation_documents.createIndex({ userId: 1, createdAt: -1 });

// ---------------------------------------------------------------------
// rubric_definitions — tiêu chí chấm Speaking/Writing
// ---------------------------------------------------------------------
target.rubric_definitions.createIndex({ code: 1, version: -1 }, { unique: true });
target.rubric_definitions.createIndex({ componentCode: 1, partCode: 1, status: 1 });

print('mongo init done');
