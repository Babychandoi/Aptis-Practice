import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { MarathonQuestion } from '@/types/dailyWarmUp';
import { MfIcon } from '@/features/monthly-focus/mfUi';
import { Recorder } from '@/features/monthly-focus/SpeakingPlayer';

/** Thời gian nói mỗi câu theo đề thi thật. */
const SECONDS: Record<number, number> = { 1: 30, 2: 45, 3: 45, 4: 120 };

/** Đọc một câu bằng giọng Anh của trình duyệt. */
function speak(text: string, onEnd: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) { onEnd(); return; }
  const u = new SpeechSynthesisUtterance(text);
  const voice = synth.getVoices().find((v) => v.lang.startsWith('en-GB')) ?? synth.getVoices().find((v) => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-GB';
  u.rate = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.speak(u);
}

/**
 * Speaking Marathon của ngày: từng câu hỏi kèm gợi ý ý, câu trả lời mẫu tách theo
 * câu để nghe và nói theo, rồi tự ghi âm câu trả lời của mình để nghe lại.
 * Không chấm tự động.
 */
export function SpeakingMarathon({
  part,
  questions,
  onFinished,
  onEnter,
}: {
  part: number;
  questions: MarathonQuestion[];
  onFinished: () => void;
  onEnter: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [vi, setVi] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const queue = useRef<number[]>([]);

  const stop = () => { queue.current = []; window.speechSynthesis?.cancel(); setPlaying(null); };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const q = questions[index]!;
  // Câu hỏi sau trong cùng nhóm (Part 2-3) thường không gửi lại ảnh: dùng ảnh của nhóm.
  const images = q.images.length ? q.images : questions.find((x) => x.groupId && x.groupId === q.groupId && x.images.length)?.images ?? [];

  const playFrom = (start: number, all: boolean) => {
    stop();
    queue.current = all ? q.sentences.map((_, i) => i).slice(start + 1) : [];
    const step = (i: number) => {
      setPlaying(i);
      speak(q.sentences[i]!, () => {
        const nextIdx = queue.current.shift();
        if (nextIdx === undefined) setPlaying(null);
        else step(nextIdx);
      });
    };
    window.speechSynthesis?.cancel();
    step(start);
  };

  const go = (i: number) => { stop(); setIndex(Math.max(0, Math.min(questions.length - 1, i))); };
  const finish = () => { stop(); setDone(true); onFinished(); };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-2xl font-bold text-emerald-700">Xong khởi động!</p>
        <p className="mt-2 text-sm text-emerald-800">Bạn đã luyện {questions.length} câu Speaking Part {part} hôm nay.</p>
        <button type="button" onClick={onEnter} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-md hover:bg-slate-800">
          Vào học <MfIcon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Đầu và cuối dính trong khung cuộn để nút chuyển câu luôn trong tầm mắt. */}
      <header className="sticky -top-5 z-10 -mx-5 -mt-5 bg-white px-5 pb-3 pt-5 sm:-top-6 sm:-mx-7 sm:-mt-6 sm:px-7 sm:pt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Speaking Marathon</h2>
          <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">Part {part}</span>
          <span className="text-sm text-slate-500">Câu {index + 1}/{questions.length}</span>
          <button
            type="button"
            onClick={() => setVi(!vi)}
            className={clsx('ml-auto rounded-lg border px-3 py-1 text-xs font-semibold', vi ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600')}
          >
            Tiếng Việt
          </button>
        </div>
        <div className="mt-2 flex gap-1" role="progressbar" aria-label="Tiến độ" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + 1}>
          {questions.map((x, i) => (
            <span key={x.id} className={clsx('h-1.5 flex-1 rounded-full', i <= index ? 'bg-cyan-500' : 'bg-slate-100')} />
          ))}
        </div>
      </header>

      <div className="mt-2 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {images.length > 0 && (
            <div className={clsx('grid gap-2', images.length > 1 && 'grid-cols-2')}>
              {images.map((src) => (
                <img key={src} src={src} alt="Tranh của câu hỏi" className="max-h-44 w-full rounded-xl border border-slate-200 object-cover" />
              ))}
            </div>
          )}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Câu hỏi</p>
            <p className="mt-1 font-semibold leading-snug text-slate-900 sm:text-lg">{q.question}</p>
            {vi && q.questionVi && <p className="mt-0.5 text-sm text-slate-500">{q.questionVi}</p>}
          </section>

          {q.ideas.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gợi ý trả lời</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.ideas.map((idea, i) => (
                  <span key={i} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-sm text-amber-900">
                    {i + 1}. {vi && q.ideasVi[i] ? q.ideasVi[i] : idea}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 pb-3 pt-3">
            <p className="text-sm font-semibold text-slate-800">Đến lượt bạn</p>
            <p className="text-xs text-slate-500">Nghe mẫu rồi tự trả lời; ghi âm để nghe lại giọng mình.</p>
            <Recorder key={q.id} seconds={SECONDS[part] ?? 45} prepSeconds={0} accent="bg-slate-900 hover:bg-slate-800" onRecorded={() => undefined} />
          </section>
        </div>

        <section className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Câu trả lời mẫu</p>
            <button
              type="button"
              onClick={() => (playing !== null ? stop() : playFrom(0, true))}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MfIcon name={playing !== null ? 'square' : 'volume'} className="h-3.5 w-3.5" /> {playing !== null ? 'Dừng' : 'Nghe cả bài'}
            </button>
          </div>
          <ol className="mt-1.5 flex flex-col">
            {q.sentences.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => playFrom(i, false)}
                  className={clsx(
                    'flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left text-sm leading-snug transition-colors',
                    playing === i ? 'bg-cyan-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <MfIcon name="volume" className={clsx('mt-0.5 h-3.5 w-3.5 shrink-0', playing === i ? 'text-cyan-600' : 'text-slate-300')} />
                  <span>
                    {s}
                    {vi && q.sentencesVi[i] && <span className="block text-xs text-slate-500">{q.sentencesVi[i]}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-4 sm:-bottom-6 flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:-mx-7 sm:-mb-6 sm:px-7">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Câu trước" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          <MfIcon name="chevronLeft" className="h-5 w-5" />
        </button>
        {index < questions.length - 1 ? (
          <button type="button" onClick={() => go(index + 1)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white hover:bg-slate-800">
            Câu tiếp theo <MfIcon name="chevronRight" className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={finish} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
            <MfIcon name="check" className="h-4 w-4" /> Hoàn thành
          </button>
        )}
      </footer>
    </div>
  );
}
