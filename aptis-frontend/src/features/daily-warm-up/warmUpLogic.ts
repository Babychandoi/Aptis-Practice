/**
 * Luật chấm phần gõ của "Khởi động hôm nay".
 *
 * Gõ đúng ký tự mới đi tiếp; gõ sai chỉ đếm lỗi, con trỏ đứng yên. Tốc độ tính
 * theo chuẩn WPM (5 ký tự đúng = 1 từ) trên thời gian thực sự gõ: khoảng nghỉ giữa
 * hai phím quá 5 giây chỉ tính 5 giây, để học viên đọc câu hỏi không bị trừ tốc độ.
 */

export interface TypingRun {
  /** Câu đã chuẩn hoá cần gõ. */
  texts: string[];
  /** Câu đang gõ. */
  index: number;
  /** Số ký tự đã gõ đúng của câu đang gõ. */
  typed: number;
  correct: number;
  wrong: number;
  activeMs: number;
  lastKeyAt: number | null;
  /** Lần gõ sai gần nhất, để rung ô nhập. */
  lastWrongAt: number | null;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
  seconds: number;
}

const MAX_GAP_MS = 5_000;

/** Dấu nháy cong, gạch dài, khoảng trắng lạ → ký tự gõ được trên bàn phím. */
export function normalizeTarget(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createRun(texts: string[]): TypingRun {
  return {
    texts: texts.map(normalizeTarget).filter(Boolean),
    index: 0,
    typed: 0,
    correct: 0,
    wrong: 0,
    activeMs: 0,
    lastKeyAt: null,
    lastWrongAt: null,
  };
}

export const isFinished = (run: TypingRun) => run.texts.length > 0 && run.index >= run.texts.length;

/** Ký tự cần gõ tiếp, hoặc null khi đã xong. */
export function nextChar(run: TypingRun): string | null {
  return run.texts[run.index]?.[run.typed] ?? null;
}

function elapsed(run: TypingRun, now: number): number {
  return run.lastKeyAt === null ? run.activeMs : run.activeMs + Math.min(Math.max(0, now - run.lastKeyAt), MAX_GAP_MS);
}

/** Một ký tự học viên vừa gõ. */
export function press(run: TypingRun, ch: string, now: number): TypingRun {
  const expected = nextChar(run);
  if (expected === null) return run;
  const activeMs = elapsed(run, now);
  if (normalizeTarget(ch) !== expected && !(ch === ' ' && expected === ' ')) {
    return { ...run, wrong: run.wrong + 1, activeMs, lastKeyAt: now, lastWrongAt: now };
  }
  const typed = run.typed + 1;
  const sentenceDone = typed >= run.texts[run.index]!.length;
  return {
    ...run,
    index: sentenceDone ? run.index + 1 : run.index,
    typed: sentenceDone ? 0 : typed,
    correct: run.correct + 1,
    activeMs,
    lastKeyAt: now,
  };
}

export function statsOf(run: TypingRun, now: number): TypingStats {
  const ms = isFinished(run) ? run.activeMs : elapsed(run, now);
  const total = run.correct + run.wrong;
  return {
    // Dưới 3 giây thì con số dao động vô nghĩa.
    wpm: ms >= 3_000 ? Math.round(run.correct / 5 / (ms / 60_000)) : 0,
    accuracy: total > 0 ? Math.round((run.correct / total) * 100) : 100,
    errors: run.wrong,
    seconds: Math.floor(ms / 1000),
  };
}

/** Khoá localStorage ghi ngày đã khởi động của từng tài khoản. */
export const warmUpDoneKey = (userId: string) => `aptis:warm-up:v1:${userId}`;
/** Khoá lưu kỷ lục gõ của từng tài khoản. */
export const warmUpBestKey = (userId: string) => `aptis:warm-up-best:v1:${userId}`;

/** Kết quả tốt hơn: WPM cao hơn, bằng nhau thì chính xác hơn. */
export function betterOf(a: TypingStats | null, b: TypingStats): TypingStats {
  if (!a) return b;
  if (b.wpm !== a.wpm) return b.wpm > a.wpm ? b : a;
  return b.accuracy > a.accuracy ? b : a;
}
