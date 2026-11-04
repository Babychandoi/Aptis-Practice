import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import type { QuestionItem } from '@/types/api';
import type { MonthlyFocusItem } from '@/types/monthlyFocus';
import { basePath, countWords, splitSamples, stripHtml } from '@/features/monthly-focus/monthlyFocusLogic';
import { MfIcon, TipsCard, ToneTile } from '@/features/monthly-focus/mfUi';
import { ProgressDrawer } from '@/features/monthly-focus/mfPlayerParts';
import { lockedMessage, usePageData, useStoredState } from '@/features/monthly-focus/mfData';
import { BarButton, BottomBar } from '@/features/monthly-focus/MonthlyFocusPlayerPage';

/** Thời gian gợi ý của từng Part, như website. */
const RECOMMENDED: Record<number, string> = { 1: '3 phút', 2: '7 phút', 3: '10 phút', 4: '20-30 phút' };

/** /de-trong-diem/viet/clb/:clubKey — bốn Part của một câu lạc bộ Writing. */
export function WritingClubPage() {
  const { clubKey } = useParams<{ clubKey: string }>();
  const navigate = useNavigate();
  const { page, byId, record, clear, progress } = usePageData('writing', clubKey);
  const [part, setPart] = useState(1);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [drawer, setDrawer] = useState(false);
  const [fontSize, setFontSize] = useStoredState('mf.fontSize', 16);

  if (!clubKey) return <Navigate to={`${basePath}/viet`} replace />;
  if (page.isPending) return <LoadingBlock label="Đang tải câu lạc bộ…" />;
  if (page.error || !page.data) return <ErrorBlock message="Không tải được câu lạc bộ" onRetry={() => void page.refetch()} />;

  const club = page.data.topics[0];
  const partItems = (p: number) => page.data!.items.filter((i) => i.clubPart === p);
  const sets = partItems(part);
  const locked = sets.some((s) => s.locked || !s.content);
  const parts = [1, 2, 3, 4].filter((p) => partItems(p).length > 0);
  const tipsOfPart = page.data.tips.filter((_, i) => i === part - 1);

  const submit = () => {
    setSubmitted((all) => ({ ...all, [part]: true }));
    for (const s of sets) record.mutate({ questionSetId: s.questionSetId, result: 'DONE' });
  };
  const cells = parts.map((p) => {
    const attempts = Math.max(0, ...partItems(p).map((s) => byId.get(s.questionSetId)?.attempts ?? 0));
    return { attempts, lastResult: attempts > 0 ? ('DONE' as const) : null };
  });

  return (
    <div className="mx-auto w-full max-w-5xl pb-4" style={{ zoom: fontSize / 16 }}>
      <div className="flex items-start gap-3">
        <ToneTile tone={club?.color ?? 'cyan'} icon={club?.iconName ?? 'pen'} size="md" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Writing club</p>
          <h1 className="text-2xl font-bold text-slate-900">{club?.title ?? 'Câu lạc bộ'}</h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">Part {part} · Question {parts.indexOf(part) + 1} of {parts.length}</p>

      {locked ? (
        <div className="mt-6"><PremiumGate message={lockedMessage(page.data)} /></div>
      ) : (
        <div className="mt-5">
          <p className="text-[15px] font-bold text-slate-900">
            {sets[0]?.content?.instructions}
            <span className="ml-2 font-normal text-slate-500">Recommended time: {RECOMMENDED[part]}</span>
          </p>
          <div className="mt-6">
            {part === 1 && <PartOne sets={sets} texts={texts} setTexts={setTexts} reveal={!!submitted[1]} />}
            {part === 2 && <LongAnswers sets={sets} texts={texts} setTexts={setTexts} reveal={!!submitted[2]} />}
            {part === 3 && <LongAnswers sets={sets} texts={texts} setTexts={setTexts} reveal={!!submitted[3]} chat />}
            {part === 4 && <PartFour sets={sets} texts={texts} setTexts={setTexts} reveal={!!submitted[4]} />}
          </div>
          {submitted[part] && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Đã lưu lần luyện Part {part}. So bài của bạn với đáp án gợi ý bên dưới mỗi câu.
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <TipsCard tips={tipsOfPart} fallbackTitle={`Mẹo làm Writing Part ${part}`} />
      </div>

      <BottomBar>
        <BarButton onClick={() => navigate(`${basePath}/viet`)} icon="logout">Thoát</BarButton>
        <BarButton onClick={() => setDrawer(true)} icon="panel">Tiến độ học</BarButton>
        <button type="button" onClick={submit} disabled={locked} className="min-w-[160px] flex-1 rounded-lg bg-emerald-600 px-6 py-3 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-60 sm:flex-none sm:px-16">
          Submit
        </button>
        <button type="button" onClick={() => setPart(parts[parts.indexOf(part) - 1] ?? part)} disabled={parts.indexOf(part) <= 0} className="rounded-lg border border-slate-100 bg-white px-8 py-3 text-sm text-slate-700 disabled:text-slate-300 sm:px-14">Trước</button>
        <button type="button" onClick={() => setPart(parts[parts.indexOf(part) + 1] ?? part)} disabled={parts.indexOf(part) >= parts.length - 1} className="rounded-lg border border-sky-400 bg-white px-8 py-3 text-sm font-medium text-slate-800 disabled:opacity-40 sm:px-14">Sau</button>
      </BottomBar>

      <ProgressDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        label={`Writing · ${club?.title ?? ''}`}
        cells={cells}
        current={parts.indexOf(part)}
        onPick={(i) => setPart(parts[i] ?? 1)}
        onClear={() => clear.mutate()}
        onSave={() => void progress.refetch()}
        saving={progress.isFetching}
        fontSize={fontSize}
        onFontSize={setFontSize}
      />
    </div>
  );
}

interface PartProps {
  sets: MonthlyFocusItem[];
  texts: Record<string, string>;
  setTexts: (fn: (all: Record<string, string>) => Record<string, string>) => void;
  reveal: boolean;
}

/** "Đáp án gợi ý & Giải thích" thu gọn dưới mỗi câu; Submit thì mở sẵn. */
function Hint({ item, reveal }: { item: QuestionItem; reveal: boolean }) {
  const [open, setOpen] = useState(false);
  const samples = splitSamples(item.explanation);
  if (samples.length === 0) return null;
  const shown = open || reveal;
  return (
    <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-sky-700">
        <MfIcon name="bulb" className="h-4 w-4 text-amber-500" /> Đáp án gợi ý &amp; Giải thích
        <MfIcon name={shown ? 'chevronUp' : 'chevronDown'} className="ml-auto h-4 w-4" />
      </button>
      {shown && (
        <div className="space-y-3 border-t border-sky-100 px-4 py-3 text-sm leading-6 text-slate-700">
          {samples.map((s) => (
            <div key={s.label}>
              {samples.length > 1 && <p className="text-xs font-semibold text-slate-500">{s.label}</p>}
              <p className="whitespace-pre-line">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WordCount({ text, item }: { text: string; item: QuestionItem }) {
  const n = countWords(text);
  const min = Number(item.constraints.minWords ?? 0) || null;
  const max = Number(item.constraints.maxWords ?? 0) || null;
  const ok = (!min || n >= min) && (!max || n <= max);
  return (
    <p className={clsx('mt-1 text-right text-xs', n === 0 ? 'text-slate-400' : ok ? 'text-emerald-600' : 'text-amber-600')}>
      {n} từ{min || max ? ` · gợi ý ${min ?? 0}–${max ?? '…'} từ` : ''}
    </p>
  );
}

/**
 * Câu của các đề trong một Part, kèm khoá riêng: đề Writing Part 1 cũ dùng chung id
 * câu ("item_1") giữa các đề, lấy id câu làm khoá thì gõ ô này hiện sang ô khác.
 */
const entriesOf = (sets: MonthlyFocusItem[]) =>
  sets.flatMap((s) => (s.content?.items ?? []).map((item) => ({ key: `${s.questionSetId}:${item.id}`, item })));

function PartOne({ sets, texts, setTexts, reveal }: PartProps) {
  const entries = entriesOf(sets);
  return (
    <div>
      <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-4 text-sm">
        <p className="font-semibold text-slate-900">Example:</p>
        <p className="mt-2 text-slate-500">Q: What is your hobby?</p>
        <p className="mt-1 text-slate-800">A: I like listening to music.</p>
      </div>
      <div className="mt-6 space-y-6">
        {entries.map(({ key, item }, i) => (
          <div key={key}>
            <p className="font-semibold text-slate-900">{i + 1}. {item.prompt?.value}</p>
            <input
              value={texts[key] ?? ''}
              onChange={(e) => setTexts((all) => ({ ...all, [key]: e.target.value }))}
              placeholder="Type your answer here"
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm"
            />
            <Hint item={item} reveal={reveal} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LongAnswers({ sets, texts, setTexts, reveal, chat }: PartProps & { chat?: boolean }) {
  return (
    <div className="space-y-8">
      {entriesOf(sets).map(({ key, item }) => {
        const prompt = item.prompt?.value ?? '';
        const speaker = chat ? String(item.constraints.speaker ?? prompt.match(/^([A-Z]):/)?.[1] ?? '') : '';
        return (
          <div key={key}>
            {chat ? (
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{speaker || '?'}</span>
                <p className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-[15px] text-slate-900">{prompt.replace(/^[A-Z]:\s*/, '')}</p>
              </div>
            ) : (
              <p className="font-semibold text-slate-900">{prompt}</p>
            )}
            <textarea
              value={texts[key] ?? ''}
              onChange={(e) => setTexts((all) => ({ ...all, [key]: e.target.value }))}
              placeholder="Type your answer here"
              rows={chat ? 4 : 5}
              className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm leading-6"
            />
            <WordCount text={texts[key] ?? ''} item={item} />
            <Hint item={item} reveal={reveal} />
          </div>
        );
      })}
    </div>
  );
}

function PartFour({ sets, texts, setTexts, reveal }: PartProps) {
  const content = sets[0]?.content;
  if (!content) return null;
  const email = content.stimulus ? (content.stimulus.format === 'HTML' ? stripHtml(content.stimulus.value) : content.stimulus.value) : '';
  return (
    <div>
      {email && <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-[15px] leading-7 text-slate-800">{email}</div>}
      <div className="mt-8">
        <LongAnswers sets={sets} texts={texts} setTexts={setTexts} reveal={reveal} />
      </div>
    </div>
  );
}
