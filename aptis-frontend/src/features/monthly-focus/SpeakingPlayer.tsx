import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import type { QuestionItem } from '@/types/api';
import {
  basePath,
  seededShuffle,
  SKILL_SLUG,
  splitSamples,
  type PageMeta,
} from '@/features/monthly-focus/monthlyFocusLogic';
import { MfIcon, PillButton, TipsCard } from '@/features/monthly-focus/mfUi';
import { lockedMessage, useAssetUrls, usePageData, useStoredState } from '@/features/monthly-focus/mfData';

const PART_TITLE: Record<string, string> = {
  'speaking-1': 'Part 1: Personal Questions',
  'speaking-2': 'Part 2: Describe & Give Opinions',
  'speaking-3': 'Part 3: Compare & Explain',
  'speaking-4': 'Part 4: Discuss Experiences & Opinions',
};
/** Thời gian ghi âm mỗi câu theo đề thi thật; Part 4 chuẩn bị 1 phút rồi nói 2 phút. */
const SECONDS: Record<string, number> = { 'speaking-1': 30, 'speaking-2': 45, 'speaking-3': 45, 'speaking-4': 120 };

/** Trình luyện Speaking: ghi âm để tự nghe lại, xem và nghe đáp án mẫu. Không chấm tự động. */
export function SpeakingPlayer({ meta }: { meta: PageMeta }) {
  const { page, byId, record } = usePageData(meta.key);
  const [autoShuffle, setAutoShuffle] = useStoredState('mf.autoShuffle', true);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const list = page.data?.items ?? [];
    return autoShuffle ? seededShuffle(list, seed) : list;
  }, [page.data, autoShuffle, seed]);

  if (page.isPending) return <LoadingBlock label="Đang tải đề trọng điểm…" />;
  if (page.error || !page.data) return <ErrorBlock message="Không tải được đề trọng điểm" onRetry={() => void page.refetch()} />;
  if (items.length === 0) return <ErrorBlock message="Phần này chưa có đề trọng điểm." />;

  const at = Math.min(index, items.length - 1);
  const item = items[at]!;
  const go = (i: number) => setIndex(Math.max(0, Math.min(items.length - 1, i)));
  const done = byId.get(item.questionSetId)?.attempts ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <div className="flex flex-wrap items-center gap-4">
        <Link to={`${basePath}/${SKILL_SLUG.speaking}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-950">
          <MfIcon name="arrowLeft" className="h-4 w-4" /> Quay lại
        </Link>
        <div className="border-l border-slate-200 pl-4">
          <h1 className="text-xl font-bold text-slate-900">{PART_TITLE[meta.key]}</h1>
          <p className="text-sm text-slate-500">{items.length} câu hỏi</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PillButton tone="purple" active={autoShuffle} onClick={() => { setAutoShuffle(!autoShuffle); go(0); }}>
            <MfIcon name="shuffle" className="h-4 w-4" /> Auto shuffle
          </PillButton>
          <button type="button" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Câu trước" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white disabled:text-slate-300">
            <MfIcon name="chevronLeft" className="h-4 w-4" />
          </button>
          <select value={at} onChange={(e) => go(Number(e.target.value))} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" aria-label="Chọn câu">
            {items.map((_, i) => <option key={i} value={i}>Câu {i + 1} / {items.length}</option>)}
          </select>
          <button type="button" onClick={() => go(at + 1)} disabled={at >= items.length - 1} aria-label="Câu sau" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white disabled:text-slate-300">
            <MfIcon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6">
        {item.locked || !item.content ? (
          <PremiumGate message={lockedMessage(page.data)} />
        ) : (
          <SpeakingCard
            key={item.questionSetId}
            meta={meta}
            questionSetId={item.questionSetId}
            items={item.content.items}
            assets={item.content.assets}
            number={at + 1}
            practised={done > 0}
            onRecorded={() => record.mutate({ questionSetId: item.questionSetId, result: 'DONE' })}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 disabled:text-slate-300">
          <MfIcon name="chevronLeft" className="h-4 w-4" /> Trang trước
        </button>
        <span className="text-sm font-medium text-slate-600">{at + 1} / {items.length}</span>
        <button type="button" onClick={() => go(at + 1)} disabled={at >= items.length - 1} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 disabled:text-slate-300">
          Trang sau <MfIcon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6">
        <TipsCard tips={page.data.tips} fallbackTitle={`Mẹo làm Speaking ${meta.slug}`} />
      </div>
    </div>
  );
}

function SpeakingCard({
  meta, questionSetId, items, assets, number, practised, onRecorded,
}: {
  meta: PageMeta;
  questionSetId: string;
  items: QuestionItem[];
  assets: { assetId: string; role: string; displayOrder: number }[];
  number: number;
  practised: boolean;
  onRecorded: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const images = assets.filter((a) => /IMAGE/.test(a.role)).sort((a, b) => (a.role === 'SECONDARY_IMAGE' ? 1 : 0) - (b.role === 'SECONDARY_IMAGE' ? 1 : 0));
  const urls = useAssetUrls(meta.key, questionSetId, images.length > 0);
  const item = items[current] ?? items[0]!;
  const multi = items.length > 1;
  const prompt = item.prompt?.value ?? '';
  const part4 = meta.key === 'speaking-4';
  const tone = meta.key === 'speaking-1' ? 'sky' : meta.key === 'speaking-2' ? 'green' : meta.key === 'speaking-3' ? 'orange' : 'purple';
  const frame = {
    sky: 'border-sky-200 from-sky-100/80 to-white', green: 'border-green-300 from-green-100/80 to-white',
    orange: 'border-orange-200 from-orange-100/70 to-white', purple: 'border-purple-200 from-purple-100/70 to-white',
  }[tone];
  const accent = { sky: 'bg-cyan-500', green: 'bg-green-500', orange: 'bg-orange-500', purple: 'bg-purple-500' }[tone];

  return (
    <div className={clsx('overflow-hidden rounded-3xl border bg-gradient-to-b shadow-[0_10px_30px_rgba(15,23,42,0.06)]', frame)}>
      {images.length > 0 && (
        <div className={clsx('grid gap-3 p-5 pb-0', images.length > 1 && 'sm:grid-cols-2')}>
          {images.map((img) => (
            <div key={img.assetId} className="overflow-hidden rounded-2xl bg-white">
              {urls.data?.[img.assetId]
                ? <img src={urls.data[img.assetId]} alt="Tranh của đề" className="max-h-[380px] w-full object-contain" />
                : <div className="grid h-60 place-items-center text-sm text-slate-400">Đang tải ảnh…</div>}
            </div>
          ))}
        </div>
      )}

      <div className="p-5">
        {multi && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {items.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={clsx('rounded-lg py-2 text-sm font-semibold', i === current ? `${accent} text-white` : 'bg-white text-slate-800')}
              >
                Câu {i + 1}
              </button>
            ))}
          </div>
        )}

        {multi ? (
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-bold uppercase text-green-700">Câu hỏi hiện tại:</p>
            <p className="mt-1 text-xl text-slate-900">{prompt}</p>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <span className={clsx('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl font-bold text-white shadow ring-4 ring-white', accent)}>{number}</span>
            <div className="min-w-0 flex-1 pt-2">
              {part4
                ? <ol className="space-y-1 text-lg font-medium text-slate-900">{prompt.split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}</ol>
                : <p className="text-xl font-medium text-slate-900">{prompt}</p>}
            </div>
          </div>
        )}

        <Recorder
          key={item.id}
          seconds={SECONDS[meta.key] ?? 45}
          prepSeconds={part4 ? 60 : 0}
          accent={accent}
          onRecorded={onRecorded}
        />
        {practised && <p className="mt-2 text-right text-xs font-medium text-emerald-700">✓ Bạn đã luyện đề này</p>}
      </div>

      <div className="border-t border-white/60 bg-white/60 p-5">
        <SampleAnswers key={item.id} item={item} />
      </div>
    </div>
  );
}

/** Ghi âm ngay trên trình duyệt để tự nghe lại; không tải lên, không chấm. */
function Recorder({ seconds, prepSeconds, accent, onRecorded }: { seconds: number; prepSeconds: number; accent: string; onRecorded: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'prep' | 'recording' | 'done'>('idle');
  const [left, setLeft] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  const stopTimer = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; };
  const release = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };

  useEffect(() => () => {
    stopTimer();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    release();
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const countdown = (from: number, then: () => void) => {
    setLeft(from);
    stopTimer();
    timer.current = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { stopTimer(); then(); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      stream.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream.current);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        release();
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })));
        setPhase('done');
        onRecorded();
      };
      recorder.current = rec;
      rec.start();
      setPhase('recording');
      countdown(seconds, () => rec.state === 'recording' && rec.stop());
    } catch {
      release();
      setPhase('idle');
      setError('Không mở được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.');
    }
  };

  const start = async () => {
    setError(null);
    if (url) { URL.revokeObjectURL(url); setUrl(null); }
    if (prepSeconds > 0) {
      // Xin quyền micro ngay lúc bắt đầu chuẩn bị, để hết giờ chuẩn bị là ghi luôn.
      try { stream.current ??= await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setError('Không mở được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.'); return; }
      setPhase('prep');
      countdown(prepSeconds, () => void startRecording());
      return;
    }
    await startRecording();
  };
  const stop = () => { stopTimer(); if (recorder.current?.state === 'recording') recorder.current.stop(); };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="mt-5">
      <div className="flex justify-end">
        {phase === 'recording' ? (
          <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white shadow-md hover:bg-red-600">
            <MfIcon name="square" className="h-4 w-4" /> Dừng · {mmss(left)}
          </button>
        ) : phase === 'prep' ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white">Chuẩn bị · {mmss(left)}</span>
        ) : (
          <button type="button" onClick={() => void start()} className={clsx('inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-md', accent)}>
            <MfIcon name="mic" className="h-5 w-5" /> {phase === 'done' ? 'Ghi lại' : 'Ghi âm'}
          </button>
        )}
      </div>
      {url ? (
        <audio src={url} controls className="mt-3 w-full" />
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-sm text-slate-500">
          <MfIcon name="bulb" className="mr-1 inline h-4 w-4 text-amber-500" />
          {error ?? <>Nhấn nút <b className="text-cyan-600">Ghi âm</b> để bắt đầu thu giọng của bạn (khoảng {seconds >= 60 ? `${seconds / 60} phút` : `${seconds} giây`}{prepSeconds ? `, sau ${prepSeconds / 60} phút chuẩn bị` : ''})</>}
        </p>
      )}
    </div>
  );
}

/** "Xem đáp án mẫu": tab B1 / B2-C1, đọc mẫu bằng giọng Nữ/Nam của trình duyệt. */
function SampleAnswers({ item }: { item: QuestionItem }) {
  const samples = splitSamples(item.explanation);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [voice, setVoice] = useState<'female' | 'male'>('female');
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (samples.length === 0) return null;
  const sample = samples[Math.min(tab, samples.length - 1)]!;

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(sample.text);
    const english = synth.getVoices().filter((v) => v.lang.startsWith('en'));
    const female = /female|zira|samantha|susan|hazel|karen|libby|sonia|aria|jenny/i;
    const male = /male|david|daniel|george|mark|ryan|guy|alex/i;
    const pick = english.find((v) => (voice === 'female' ? female.test(v.name) && !/\bmale\b/i.test(v.name) : male.test(v.name) && !/female/i.test(v.name)));
    if (pick) u.voice = pick;
    u.lang = pick?.lang ?? 'en-GB';
    u.pitch = voice === 'female' ? 1.1 : 0.85;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50/60 px-5 py-3 text-left font-medium text-slate-800"
      >
        <MfIcon name="volume" className="h-4 w-4 text-cyan-600" /> {open ? 'Ẩn đáp án mẫu' : 'Xem đáp án mẫu'}
        <MfIcon name={open ? 'chevronUp' : 'chevronDown'} className="ml-auto h-4 w-4 text-cyan-600" />
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {samples.length > 1 && (
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                {samples.map((s, i) => (
                  <button key={s.label} type="button" onClick={() => setTab(i)} className={clsx('rounded-md px-3 py-1 text-xs font-medium', i === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-1">
                {(['female', 'male'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVoice(v)} className={clsx('rounded-md px-2.5 py-1 text-xs font-semibold', voice === v ? (v === 'female' ? 'bg-pink-500 text-white' : 'bg-sky-500 text-white') : 'text-slate-500')}>
                    {v === 'female' ? '👩 Nữ' : '👨 Nam'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={speak} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                <MfIcon name={speaking ? 'square' : 'volume'} className="h-4 w-4" /> {speaking ? 'Dừng' : 'Nghe'}
              </button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{sample.text}</p>
        </div>
      )}
    </div>
  );
}
