import { describe, expect, it } from 'vitest';
import type { QuestionItem, QuestionSetContent } from '@/types/api';
import type { MonthlyFocusItem } from '@/types/monthlyFocus';
import {
  answerLines,
  correctAnswers,
  gradeSet,
  groupByTopic,
  isComplete,
  opinionBlocks,
  passageSegments,
  seededShuffle,
  splitSamples,
} from '@/features/monthly-focus/monthlyFocusLogic';

const opt = (id: string, content = id) => ({ id, code: id, content });
const item = (over: Partial<QuestionItem>): QuestionItem => ({
  id: 'i1', sequenceNo: 1, prompt: null, responseType: 'SINGLE_CHOICE', required: true, maxScore: 2,
  options: [], leftItems: [], rightItems: [], constraints: {}, rubricCode: null, answerKey: null, ...over,
});
const content = (items: QuestionItem[], stimulus: string | null = null) =>
  ({ items, stimulus: stimulus ? { format: 'PLAIN_TEXT', value: stimulus } : null } as unknown as QuestionSetContent);

describe('chấm từng dạng', () => {
  it('trắc nghiệm: đúng khi chọn đúng phương án của mọi câu (Listening 4 có 2 câu)', () => {
    const c = content([
      item({ id: 'q1', options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'B' } }),
      item({ id: 'q2', options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } }),
    ]);
    expect(gradeSet(c, { q1: 'B', q2: 'A' }).correct).toBe(true);
    const half = gradeSet(c, { q1: 'B', q2: 'B' });
    expect(half.correct).toBe(false);
    expect(half.perItem).toEqual({ q1: true, q2: false });
  });

  it('sắp xếp câu: phải đúng nguyên thứ tự', () => {
    const c = content([item({ responseType: 'ORDERING', options: [opt('s1'), opt('s2'), opt('s3')], answerKey: { type: 'ORDERING', orderedOptionIds: ['s2', 's1', 's3'] } })]);
    expect(gradeSet(c, { i1: ['s2', 's1', 's3'] }).correct).toBe(true);
    expect(gradeSet(c, { i1: ['s1', 's2', 's3'] }).correct).toBe(false);
    expect(isComplete(c, { i1: ['s2', '', 's3'] })).toBe(false);
  });

  it('ghép: mọi dòng phải đúng, thiếu một dòng là chưa đủ để kiểm tra', () => {
    const c = content([item({
      responseType: 'MATCHING', leftItems: [opt('st1'), opt('st2')], rightItems: [opt('pA'), opt('pB')],
      answerKey: { type: 'MATCHING', matches: { st1: 'pA', st2: 'pB' } },
    })]);
    expect(isComplete(c, { i1: { st1: 'pA' } })).toBe(false);
    expect(gradeSet(c, { i1: { st1: 'pA', st2: 'pB' } }).correct).toBe(true);
    expect(gradeSet(c, { i1: { st1: 'pB', st2: 'pB' } }).correct).toBe(false);
  });

  it('Rush Mode điền sẵn đáp án đúng nên luôn chấm đúng', () => {
    const c = content([
      item({ id: 'q1', options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'B' } }),
      item({ id: 'q2', responseType: 'ORDERING', options: [opt('s1'), opt('s2')], answerKey: { type: 'ORDERING', orderedOptionIds: ['s2', 's1'] } }),
    ]);
    expect(gradeSet(c, correctAnswers(c)).correct).toBe(true);
  });

  it('hộp Đáp án: một câu thì chỉ chữ cái, nhiều câu thì đánh số', () => {
    const one = content([item({ options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } })]);
    expect(answerLines(one)).toEqual(['A']);
    const two = content([
      item({ id: 'q1', options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'B' } }),
      item({ id: 'q2', options: [opt('A'), opt('B')], answerKey: { type: 'SINGLE_CHOICE', selectedOptionId: 'A' } }),
    ]);
    expect(answerLines(two)).toEqual(['1. B', '2. A']);
  });
});

describe('văn bản', () => {
  it('tách đáp án mẫu B1 và B2–C1, bỏ chữ thừa của giao diện web cũ', () => {
    const samples = splitSamples({ format: 'PLAIN_TEXT', value: 'Đáp án mẫu B1:\nI like it.\n👩\nNữ\n\nĐáp án mẫu B2–C1:\nI am fond of it.' });
    expect(samples).toEqual([
      { label: 'Đáp án B1', text: 'I like it.' },
      { label: 'Đáp án B2-C1', text: 'I am fond of it.' },
    ]);
    expect(splitSamples({ format: 'PLAIN_TEXT', value: 'In the evening.' })).toEqual([{ label: 'Đáp án mẫu', text: 'In the evening.' }]);
    // Ô "tạo câu trả lời bằng AI" của web cũ dính vào 35 đề Speaking trong kho.
    expect(splitSamples({ format: 'PLAIN_TEXT', value: 'I played football.\nTạo câu trả lời cá nhân hóa bằng AI\nNhập thông tin cá nhân của bạn, AI sẽ tạo câu trả lời hoàn chỉnh và tự nhiên cho bạn!\nTạo câu trả lời' }))
      .toEqual([{ label: 'Đáp án mẫu', text: 'I played football.' }]);
    expect(splitSamples(null)).toEqual([]);
  });

  it('đoạn văn Reading 1: chỗ trống "___1___" và "___" đều thành ô chọn theo thứ tự', () => {
    expect(passageSegments('I ___1___ here. We ___ there.')).toEqual([
      { kind: 'text', value: 'I ' }, { kind: 'gap', index: 0 }, { kind: 'text', value: ' here. We ' },
      { kind: 'gap', index: 1 }, { kind: 'text', value: ' there.' },
    ]);
  });

  it('ý kiến Reading 4: tách chủ đề và đoạn của từng người', () => {
    const { topic, people } = opinionBlocks('Topic: Childhood\n\nPerson A:\nI liked games.\n\nPerson B:\nI played football.');
    expect(topic).toBe('Childhood');
    expect(people).toEqual([{ label: 'Person A', text: 'I liked games.' }, { label: 'Person B', text: 'I played football.' }]);
  });
});

describe('gom và trộn', () => {
  const it2 = (topicKey: string, version: number): MonthlyFocusItem => ({ questionSetId: `${topicKey}-${version}`, topicKey, version, title: topicKey, locked: false });

  it('chủ đề nhiều sao lên trước, phiên bản mới nhất đứng đầu', () => {
    const groups = groupByTopic([it2('a', 1), it2('b', 1), it2('a', 3)], [
      { topicKey: 'a', title: 'A', stars: 4 },
      { topicKey: 'b', title: 'B', stars: 5, rank: 1 },
    ]);
    expect(groups.map((g) => g.topic.topicKey)).toEqual(['b', 'a']);
    expect(groups[1]!.versions.map((v) => v.version)).toEqual([3, 1]);
  });

  it('trộn ổn định theo hạt và không mất phần tử', () => {
    const list = Array.from({ length: 20 }, (_, i) => i);
    expect(seededShuffle(list, 42)).toEqual(seededShuffle(list, 42));
    expect(seededShuffle(list, 42)).not.toEqual(list);
    expect([...seededShuffle(list, 7)].sort((a, b) => a - b)).toEqual(list);
  });
});
