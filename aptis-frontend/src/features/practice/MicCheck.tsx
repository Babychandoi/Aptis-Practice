import { useEffect, useRef, useState } from 'react';
import { confirmDialog } from '@/lib/dialog';

/** Ghi âm thử tối đa 5 giây là đủ để nghe lại và đo mức âm. */
const TEST_SECONDS = 5;
/** Dưới ngưỡng này coi như micro không thu được tiếng (thang 0-100). */
const SILENT_LEVEL = 6;
const WAVE_BARS = 28;

type Phase = 'idle' | 'recording' | 'done' | 'error';

interface Props {
  /**
   * Vào làm bài. Dùng cho cả nút "Bắt đầu làm bài" và nút "Bỏ qua" — bỏ qua chỉ
   * là bỏ bước thử micro, không phải quay lại màn trước.
   */
  onContinue: () => void;
  continueLabel: string;
  continuePending: boolean;
}

/**
 * Bước kiểm tra microphone trước khi vào phần Speaking.
 *
 * Lý do tách thành một bước riêng: bài nói được AI chấm điểm, nên một lượt ghi
 * âm bị rè hoặc không thu được tiếng sẽ ra điểm thấp mà học viên không hiểu vì
 * sao. Ở đây họ nói thử, nghe lại, và thấy mức âm thực tế trước khi tính điểm.
 *
 * Không upload gì lên server — bản ghi thử chỉ nằm trong bộ nhớ trình duyệt.
 */
export function MicCheck({ onContinue, continueLabel, continuePending }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [peakLevel, setPeakLevel] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current = null;
  };

  // Nhả microphone khi rời bước này, nếu không đèn mic vẫn sáng suốt bài làm.
  useEffect(() => () => {
    cleanup();
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  }, [playbackUrl]);

  const startTest = async () => {
    setError(null);
    setLevels([]);
    setPeakLevel(0);
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Đo mức âm bằng AnalyserNode để hiện sóng và biết micro có thu được tiếng.
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        analyser.getByteTimeDomainData(buffer);
        // Biên độ RMS quanh mốc im lặng 128, quy về thang 0-100.
        let sum = 0;
        for (const value of buffer) {
          const delta = (value - 128) / 128;
          sum += delta * delta;
        }
        const level = Math.min(100, Math.round(Math.sqrt(sum / buffer.length) * 320));
        setLevels((prev) => [...prev.slice(-(WAVE_BARS - 1)), level]);
        setPeakLevel((prev) => Math.max(prev, level));
        rafRef.current = window.requestAnimationFrame(sample);
      };
      rafRef.current = window.requestAnimationFrame(sample);

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type });
        setPlaybackUrl(URL.createObjectURL(blob));
        setPhase('done');
        cleanup();
      };

      recorder.start();
      setPhase('recording');
      setSecondsLeft(TEST_SECONDS);
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      cleanup();
      setPhase('error');
      setError('Không truy cập được microphone. Hãy cho phép quyền micro trong trình duyệt rồi thử lại.');
    }
  };

  const stopEarly = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const tooQuiet = phase === 'done' && peakLevel < SILENT_LEVEL;

  /**
   * Bỏ qua vẫn vào làm bài, chỉ hỏi lại một lần: bài nói do AI chấm nên micro
   * không hoạt động sẽ ra điểm thấp mà học viên không hiểu vì sao.
   */
  const skipCheck = async () => {
    const ok = await confirmDialog({
      title: 'Bỏ qua kiểm tra micro?',
      text: 'Nếu micro không hoạt động, AI có thể không chấm được bài nói của bạn.',
      confirmText: 'Bỏ qua, vào làm bài',
      cancelText: 'Kiểm tra trước',
      danger: true,
    });
    if (ok) onContinue();
  };

  return (
    <div className="mx-auto max-w-xl py-4">
      <section className="rounded-2xl border border-stone-200 bg-gradient-to-b from-[#eef6f1] to-white p-5 shadow-[0_8px_24px_rgba(43,39,30,.08)] sm:p-7">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e0d6c2] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c2410c]" aria-hidden="true" />
            Bước 1/2 · Kiểm tra micro
          </span>
          <h1 className="mt-3 text-2xl font-semibold">Kiểm tra micro trước khi nói</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            Hãy nói thử một câu ngắn để chắc chắn micro thu âm rõ. Điều này giúp AI nghe chính xác
            và chấm điểm Speaking tốt hơn.
          </p>
        </div>

        <div className="mt-7 flex flex-col items-center">
          <button
            type="button"
            onClick={() => (phase === 'recording' ? stopEarly() : void startTest())}
            className={`grid h-24 w-24 place-items-center rounded-full border-2 transition ${
              phase === 'recording'
                ? 'animate-pulse border-[#c2410c] bg-[#fef2ec] text-[#c2410c]'
                : 'border-stone-300 bg-white text-stone-500 hover:border-brand-500 hover:text-brand-800'
            }`}
            aria-label={phase === 'recording' ? 'Dừng ghi âm thử' : 'Bấm để ghi âm thử'}
          >
            {phase === 'recording' ? <StopIcon /> : <MicIcon />}
          </button>

          <p className="mt-3 text-sm font-medium text-stone-700">
            {phase === 'recording'
              ? `Đang ghi… còn ${secondsLeft}s — bấm để dừng`
              : phase === 'done'
                ? 'Nghe lại bản ghi thử'
                : 'Bấm để ghi âm thử'}
          </p>

          {(phase === 'recording' || phase === 'done') && (
            <div className="mt-4 flex h-10 w-full max-w-xs items-center justify-center gap-[3px]">
              {Array.from({ length: WAVE_BARS }, (_, index) => {
                const level = levels[index] ?? 0;
                const height = phase === 'recording' ? Math.max(8, level) : 12;
                return (
                  <span
                    key={index}
                    className={`w-1.5 rounded-full ${phase === 'recording' ? 'bg-brand-700' : 'bg-stone-300'}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}

          {phase === 'done' && playbackUrl && (
            <audio controls src={playbackUrl} className="mt-4 w-full max-w-xs">
              <track kind="captions" />
            </audio>
          )}

          {phase === 'done' && (
            <div className="mt-3 w-full max-w-xs">
              {tooQuiet ? (
                <p className="rounded-lg bg-[#fef2ec] px-3 py-2 text-xs leading-5 text-[#8a3413]">
                  Gần như không thu được tiếng. Kiểm tra xem đã chọn đúng micro chưa, hoặc nói to hơn
                  rồi thử lại.
                </p>
              ) : (
                <p className="rounded-lg bg-[#eef6f1] px-3 py-2 text-xs leading-5 text-brand-900">
                  Micro thu tốt (mức cao nhất {peakLevel}/100). Nghe lại thấy rõ là bạn đã sẵn sàng.
                </p>
              )}
              <button
                type="button"
                onClick={() => void startTest()}
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-brand-400"
              >
                Ghi âm thử lại
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 max-w-xs rounded-lg bg-[#fef2ec] px-3 py-2 text-xs leading-5 text-[#8a3413]">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6b1f]">
            💡 Trước khi ghi âm
          </h2>
          <ul className="mt-2 space-y-1">
            {[
              'Dùng tai nghe có mic để giọng rõ và ít nhiễu hơn.',
              'Ngồi ở nơi yên tĩnh, tránh tiếng người nói phía sau.',
              'Giữ micro cách miệng khoảng 10–15cm.',
            ].map((tip) => (
              <li key={tip} className="flex gap-2 text-xs leading-5 text-[#6f5716]">
                <span aria-hidden="true">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-secondary" disabled={continuePending} onClick={() => void skipCheck()}>
            Bỏ qua
          </button>
          <button type="button" className="btn-primary" disabled={continuePending} onClick={onContinue}>
            {continuePending ? 'Đang mở bài luyện…' : `▷ ${continueLabel}`}
          </button>
        </div>
      </section>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8" aria-hidden="true">
      <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}
