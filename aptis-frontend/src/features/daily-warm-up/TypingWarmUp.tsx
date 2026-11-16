import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { WarmUpTypingItem } from '@/types/dailyWarmUp';
import { MfIcon } from '@/features/monthly-focus/mfUi';
import {
  betterOf,
  createRun,
  isFinished,
  nextChar,
  press,
  statsOf,
  warmUpBestKey,
  type TypingRun,
  type TypingStats,
} from './warmUpLogic';

/** Câu Writing Part 2 có mã bắt đầu "writing-2"; còn lại là câu trả lời ngắn Part 1. */
const isPart2 = (item: WarmUpTypingItem) => item.id.startsWith('writing-2');

function readBest(userId: string): TypingStats | null {
  try {
    const raw = localStorage.getItem(warmUpBestKey(userId));
    return raw ? (JSON.parse(raw) as TypingStats) : null;
  } catch {
    return null;
  }
}

/** Phần gõ: gõ đúng từng câu trả lời mẫu Writing mới sang câu sau. */
export function TypingWarmUp({
  items,
  userId,
  onFinished,
  onEnter,
}: {
  items: WarmUpTypingItem[];
  userId: string;
  onFinished: () => void;
  onEnter: () => void;
}) {
  const [run, setRun] = useState<TypingRun>(() => createRun(items.map((i) => i.text)));
  const [now, setNow] = useState(() => Date.now());
  const [best, setBest] = useState<TypingStats | null>(() => readBest(userId));
  const [result, setResult] = useState<TypingStats | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const finished = isFinished(run);
  const part1 = items.filter((i) => !isPart2(i)).length;
  const part2 = items.length - part1;

  // Đồng hồ chạy khi đang gõ để ô thời gian và tốc độ cập nhật.
  useEffect(() => {
    if (finished || run.lastKeyAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [finished, run.lastKeyAt]);

  useEffect(() => {
    if (!finished || result) return;
    const final = statsOf(run, Date.now());
    setResult(final);
    const nextBest = betterOf(best, final);
    setBest(nextBest);
    try { localStorage.setItem(warmUpBestKey(userId), JSON.stringify(nextBest)); } catch { /* ẩn danh */ }
    onFinished();
  }, [finished, result, run, best, userId, onFinished]);

  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);

  const type = (text: string) => {
    if (!text) return;
    setRun((r) => [...text].reduce((acc, ch) => press(acc, ch, Date.now()), r));
    setNow(Date.now());
  };

  const stats = result ?? statsOf(run, now);
  const current = items[Math.min(run.index, items.length - 1)];
  const target = run.texts[Math.min(run.index, run.texts.length - 1)] ?? '';
  const flashing = run.lastWrongAt !== null && now - run.lastWrongAt < 350;
  const progress = run.texts.length ? Math.round(((run.index + (finished ? 0 : run.typed / Math.max(1, target.length))) / run.texts.length) * 100) : 0;

  return (
    <div>
      <h2 className="pr-10 text-xl font-bold text-slate-900 sm:text-2xl">Khởi động hôm nay</h2>
      <p className="mt-1 text-sm text-slate-500">
        Gõ đúng {part1} câu Writing Part 1{part2 ? ` và ${part2} câu Part 2` : ''} để vào học.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Tốc độ (WPM)" value={stats.wpm} />
        <Stat label="Độ chính xác" value={`${stats.accuracy}%`} />
        <Stat label="Số lỗi" value={stats.errors} />
        <Stat label="Thời gian" value={`${Math.floor(stats.seconds / 60)}:${String(stats.seconds % 60).padStart(2, '0')}`} />
        <Stat label="Tiến độ" value={`${Math.min(run.index + (finished ? 0 : 1), run.texts.length)}/${run.texts.length}`} className="col-span-2 sm:col-span-1" />
      </dl>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${finished ? 100 : progress}%` }} />
      </div>

      {finished ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-2xl font-bold text-emerald-700">Xong khởi động!</p>
          {best && (
            <p className="mt-2 text-sm text-emerald-800">
              Kỷ lục khởi động: <b>{best.wpm} WPM</b> · chính xác {best.accuracy}%
            </p>
          )}
          <button
            type="button"
            onClick={onEnter}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-md hover:bg-slate-800"
          >
            Vào học <MfIcon name="arrowRight" className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className="mt-5 cursor-text rounded-2xl border border-slate-200 bg-slate-50 p-5"
          onClick={() => input.current?.focus({ preventScroll: true })}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {current && isPart2(current) ? 'Writing Part 2' : 'Writing Part 1'} · Câu hỏi
          </p>
          <p className="mt-1 font-medium text-slate-700">{current?.prompt}</p>
          <p className={clsx('mt-4 whitespace-pre-wrap break-words font-mono text-lg leading-relaxed sm:text-xl', flashing && 'animate-[warmup-shake_0.3s]')}>
            {[...target].map((ch, i) => (
              <span
                key={i}
                className={clsx(
                  i < run.typed && 'text-slate-900',
                  i === run.typed && (flashing ? 'rounded bg-red-200 text-red-700' : 'rounded bg-amber-200 text-slate-900'),
                  i > run.typed && 'text-slate-400',
                )}
              >
                {ch}
              </span>
            ))}
          </p>
          <input
            ref={input}
            value=""
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            aria-label="Ô gõ câu trả lời"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-slate-900"
            placeholder="Bắt đầu gõ…"
          />
          <Keyboard next={nextChar(run)} />
        </div>
      )}
      <style>{'@keyframes warmup-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'}</style>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 px-3 py-2', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

const ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];
const SHIFTED: Record<string, string> = {
  '~': '`', '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  _: '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
};

/** Bàn phím gợi ý phím cần gõ tiếp; chỉ hiện trên màn hình rộng. */
function Keyboard({ next }: { next: string | null }) {
  const { key, shift } = useMemo(() => {
    if (next === null) return { key: null, shift: false };
    if (next === ' ') return { key: ' ', shift: false };
    if (SHIFTED[next]) return { key: SHIFTED[next]!, shift: true };
    return { key: next.toLowerCase(), shift: next !== next.toLowerCase() };
  }, [next]);
  const cap = (active: boolean) =>
    clsx('flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-mono text-sm uppercase transition-colors',
      active ? 'border-amber-400 bg-amber-300 font-bold text-slate-900' : 'border-slate-200 bg-white text-slate-500');
  return (
    <div className="mt-5 hidden select-none flex-col items-center gap-1.5 md:flex" aria-hidden="true">
      {ROWS.map((row, r) => (
        <div key={row} className="flex gap-1.5">
          {r === 3 && <span className={clsx(cap(shift), 'w-20')}>Shift</span>}
          {[...row].map((k) => <span key={k} className={cap(key === k)}>{k}</span>)}
          {r === 3 && <span className={clsx(cap(shift), 'w-20')}>Shift</span>}
        </div>
      ))}
      <span className={clsx(cap(key === ' '), 'w-72')}>Space</span>
    </div>
  );
}
