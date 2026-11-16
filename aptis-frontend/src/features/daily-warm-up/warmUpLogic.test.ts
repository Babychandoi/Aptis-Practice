import { describe, expect, it } from 'vitest';
import { betterOf, createRun, isFinished, nextChar, normalizeTarget, press, statsOf } from './warmUpLogic';

const typeAll = (texts: string[], input: string, step = 200) => {
  let run = createRun(texts);
  let t = 0;
  for (const ch of input) { t += step; run = press(run, ch, t); }
  return { run, t };
};

describe('normalizeTarget', () => {
  it('đổi dấu nháy cong và gộp khoảng trắng', () => {
    expect(normalizeTarget('  It’s   “great”… ')).toBe('It\'s "great"...');
  });
});

describe('press', () => {
  it('gõ đúng thì đi tiếp, hết câu sang câu sau', () => {
    const { run } = typeAll(['Hi.', 'Ok'], 'Hi.O');
    expect(run.index).toBe(1);
    expect(nextChar(run)).toBe('k');
    expect(run.correct).toBe(4);
  });

  it('gõ sai chỉ đếm lỗi, con trỏ đứng yên', () => {
    const { run } = typeAll(['Hi'], 'Hx');
    expect(run.typed).toBe(1);
    expect(run.wrong).toBe(1);
    expect(run.lastWrongAt).not.toBeNull();
  });

  it('phân biệt chữ hoa thường', () => {
    const { run } = typeAll(['I'], 'i');
    expect(run.wrong).toBe(1);
  });

  it('gõ xong hết thì kết thúc và bỏ qua phím thừa', () => {
    const { run } = typeAll(['ab'], 'abc');
    expect(isFinished(run)).toBe(true);
    expect(run.correct).toBe(2);
    expect(run.wrong).toBe(0);
  });
});

describe('statsOf', () => {
  it('tính WPM theo 5 ký tự/từ và độ chính xác', () => {
    // 50 ký tự đúng, 49 khoảng 0,2 giây (tính từ phím đầu) = 9,8 giây, 10 từ → 61 WPM.
    const text = 'a'.repeat(50);
    const { run, t } = typeAll([text], text);
    const s = statsOf(run, t);
    expect(s.wpm).toBe(61);
    expect(s.accuracy).toBe(100);
    expect(s.seconds).toBe(9);
  });

  it('khoảng nghỉ dài chỉ tính 5 giây', () => {
    let run = createRun(['abc']);
    run = press(run, 'a', 0);
    run = press(run, 'b', 60_000);
    expect(run.activeMs).toBe(5_000);
  });
});

describe('betterOf', () => {
  it('ưu tiên WPM rồi đến độ chính xác', () => {
    const a = { wpm: 30, accuracy: 90, errors: 1, seconds: 10 };
    expect(betterOf(null, a)).toBe(a);
    expect(betterOf(a, { ...a, wpm: 31 }).wpm).toBe(31);
    expect(betterOf(a, { ...a, accuracy: 95 }).accuracy).toBe(95);
    expect(betterOf(a, { ...a, wpm: 20 })).toBe(a);
  });
});
