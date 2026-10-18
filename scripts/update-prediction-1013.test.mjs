import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlan, pickNewsSets, payloadUrl } from './update-prediction-1013.mjs';

const component = { id: 'reading', code: 'READING' };
const part = { id: 'reading4', name: 'Reading Part 4', componentId: 'reading' };
const catalog = {
  components: [component], parts: [part],
  topics: [{ id: 'hot', code: 'HOT_TOPIC', name: 'Actors (2026)' },
    { id: 'variant', code: 'VERSION', name: 'Actors (Version 3) (2026)' },
    { id: 'backup', code: 'OTHER', name: 'Other' }],
  sets: [{ id: 'q1', topicId: 'hot', partId: part.id, componentId: component.id },
    { id: 'q2', topicId: 'variant', partId: part.id, componentId: component.id },
    { id: 'q3', topicId: 'backup', partId: part.id, componentId: component.id }],
};
const makePayload = (items = [{ label: 'Actors', topicCode: 'HOT_TOPIC', priority: 'HOT' }]) => ({
  predictDate: '2026-10-13', skills: [{ component: 'READING', sections: [
    { sectionLabel: 'Part 5', part: 'Reading Part 4', backupRemaining: true, items },
  ] }],
});

test('giữ nhãn nguồn, map đúng Part và thêm dự phòng có đề; không hạ phiên bản HOT', () => {
  const { rows, missing } = buildPlan(makePayload(), catalog);
  assert.equal(missing.length, 0);
  assert.deepEqual(rows.map((r) => [r.label, r.priority, r.sectionLabel]),
    [['Actors', 'HOT', 'Part 5'], ['Other', 'BACKUP', 'Part 5 · Dự phòng']]);
  assert.ok(rows.every((r) => r.partId === part.id));
});
test('không tự khớp mục chưa xác nhận; không nhân đôi cùng slot', () => {
  const { rows, missing } = buildPlan(makePayload([
    { label: 'Actors', topicCode: 'HOT_TOPIC', priority: 'HOT' },
    { label: 'Actors duplicate', topicCode: 'HOT_TOPIC', priority: 'HOT' },
    { label: 'Unknown', topicCode: null, priority: 'HOT' },
  ]), catalog);
  assert.equal(rows.filter((r) => r.priority === 'HOT').length, 1);
  assert.equal(missing.length, 1);
});
test('sai mã topic / Part / ngày phải dừng', () => {
  assert.throws(() => buildPlan(makePayload([{ label: 'Wrong', topicCode: 'INVALID', priority: 'HOT' }]), catalog));
  assert.throws(() => buildPlan(makePayload(), { ...catalog, parts: [{ ...part, componentId: 'listening' }] }));
  assert.throws(() => buildPlan({ ...makePayload(), predictDate: '2026-02-30' }, catalog));
});
test('topic có đề ở kỹ năng hoặc Part khác không tạo liên kết sai', () => {
  const { missing, rows } = buildPlan(makePayload(), { ...catalog,
    sets: catalog.sets.map((s) => ({ ...s, componentId: 'listening', partId: 'other' })),
  });
  assert.equal(rows.length, 0);
  assert.equal(missing.length, 1);
});
test('chọn bài mới trước, không gắn trùng và không lấy BACKUP/Writing', () => {
  const row = { componentCode: 'READING', sectionLabel: 'Part 5', priority: 'HOT', candidates: [{ id: 'old' }, { id: 'new' }] };
  assert.deepEqual(pickNewsSets([row, row, { ...row, priority: 'BACKUP' }, { ...row, componentCode: 'WRITING' }], new Set(['old'])), ['new', 'old']);
});
test('bản 13/10 đủ bốn kỹ năng, giữ mức vừa Writing và Speaking backup riêng', () => {
  const payload = JSON.parse(readFileSync(payloadUrl, 'utf8'));
  assert.equal(payload.predictDate, '2026-10-13');
  assert.deepEqual(payload.skills.map((s) => s.component), ['READING', 'WRITING', 'LISTENING', 'SPEAKING']);
  assert.equal(payload.skills.find((s) => s.component === 'WRITING').sections[1].items.length, 10);
  const speakingBackup = payload.skills.find((s) => s.component === 'SPEAKING').sections.at(-1);
  assert.ok(speakingBackup.items.every((i) => i.priority === 'BACKUP'));
  for (const skill of payload.skills) for (const section of skill.sections) {
    assert.equal(new Set(section.items.map((i) => i.label.toLowerCase())).size, section.items.length);
  }
  const listening = payload.skills.find((s) => s.component === 'LISTENING');
  assert.ok(!listening.sections[1].items.some((i) => i.label === 'Work from home'));
  assert.ok(listening.sections[2].items.some((i) => i.label === 'Work from home'));
});
