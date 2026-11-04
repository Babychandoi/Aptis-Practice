import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import type { MonthlyFocusItem, MonthlyFocusPage } from '@/types/monthlyFocus';
import { lockedMessage, usePageData, useStoredState } from '@/features/monthly-focus/mfData';
import {
  answerLines,
  basePath,
  clip,
  correctAnswers,
  gradeSet,
  groupByTopic,
  isComplete,
  pageBySlug,
  seededShuffle,
  SKILL_OF_SLUG,
  SKILL_SLUG,
  type Answer,
  type Answers,
  type PageMeta,
} from '@/features/monthly-focus/monthlyFocusLogic';
import { MfIcon, Modal, PillButton, TipsCard } from '@/features/monthly-focus/mfUi';
import { ListenBar, ProgressDrawer } from '@/features/monthly-focus/mfPlayerParts';
import {
  ChoiceCardsBody,
  GapPassageBody,
  HeadingBody,
  OpinionBody,
  OrderingBody,
  SpeakerSelectBody,
  StatementSelectBody,
  type BodyProps,
} from '@/features/monthly-focus/mfBodies';
import { SpeakingPlayer } from '@/features/monthly-focus/SpeakingPlayer';

/** Một "câu" của trình luyện: một đề, hoặc một chủ đề gồm nhiều phiên bản (Listening 2-4, Reading 2-5). */
interface Unit {
  key: string;
  title: string;
  stars: number | null;
  versions: MonthlyFocusItem[];
}

/** /de-trong-diem/:skill/:part */
export function MonthlyFocusPlayerPage() {
  const { skillSlug, partSlug } = useParams<{ skillSlug: string; partSlug: string }>();
  const skill = SKILL_OF_SLUG[skillSlug ?? ''];
  const meta = skill ? pageBySlug(skill, partSlug ?? '') : undefined;
  if (!meta) return <Navigate to={basePath} replace />;
  return meta.skill === 'speaking' ? <SpeakingPlayer meta={meta} /> : <ObjectivePlayer key={meta.key} meta={meta} />;
}

function buildUnits(page: MonthlyFocusPage, meta: PageMeta): Unit[] {
  const grouped = ['listening-2', 'listening-3', 'listening-4', 'reading-2-3', 'reading-4', 'reading-5'].includes(meta.key);
  if (!grouped) {
    return page.items.map((item) => ({
      key: item.questionSetId,
      title: item.content?.items[0]?.prompt?.value ?? item.title ?? '',
      stars: null,
      versions: [item],
    }));
  }
  return groupByTopic(page.items, page.topics).map((g) => ({
    key: g.topic.topicKey,
    title: g.topic.title,
    stars: g.topic.stars ?? null,
    versions: g.versions,
  }));
}

function Body(props: BodyProps & { pageKey: string }) {
  switch (props.pageKey) {
    case 'listening-2': return <SpeakerSelectBody {...props} />;
    case 'listening-3': return <StatementSelectBody {...props} />;
    case 'reading-1': return <GapPassageBody {...props} />;
    case 'reading-2-3': return <OrderingBody {...props} />;
    case 'reading-4': return <OpinionBody {...props} />;
    case 'reading-5': return <HeadingBody {...props} />;
    default: return <ChoiceCardsBody {...props} />;
  }
}

/** Trình luyện Listening/Reading: chấm ngay từng câu trên trình duyệt. */
function ObjectivePlayer({ meta }: { meta: PageMeta }) {
  const navigate = useNavigate();
  const { page, byId, record, clear, progress } = usePageData(meta.key);
  const listening = meta.skill === 'listening';

  const [autoShuffle, setAutoShuffle] = useStoredState('mf.autoShuffle', true);
  const [rush, setRush] = useStoredState('mf.rush', false);
  const [fontSize, setFontSize] = useStoredState('mf.fontSize', 16);
  const [seenDrawer, setSeenDrawer] = useStoredState('mf.drawerSeen', false);
  // Website mở sẵn ngăn tiến độ ở lần đầu; các lần sau để người học tự mở.
  const [drawer, setDrawer] = useState(!seenDrawer);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [index, setIndex] = useState(0);
  const [versionOf, setVersionOf] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [rushHelp, setRushHelp] = useState(false);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const units = useMemo(() => {
    if (!page.data) return [];
    const list = buildUnits(page.data, meta);
    return autoShuffle ? seededShuffle(list, seed) : list;
  }, [page.data, meta, autoShuffle, seed]);

  if (page.isPending) return <LoadingBlock label="Đang tải đề trọng điểm…" />;
  if (page.error || !page.data) return <ErrorBlock message="Không tải được đề trọng điểm" onRetry={() => void page.refetch()} />;
  if (units.length === 0) return <ErrorBlock message="Phần này chưa có đề trọng điểm." />;

  const at = Math.min(index, units.length - 1);
  const unit = units[at]!;
  const item = unit.versions.find((v) => v.questionSetId === versionOf[unit.key]) ?? unit.versions[0]!;
  const content = item.content ?? null;
  const setId = item.questionSetId;
  const mine = answers[setId] ?? {};
  const result = rush && content ? gradeSet(content, correctAnswers(content)).perItem : checked[setId] ?? null;
  const shownAnswers = rush && content ? correctAnswers(content) : mine;
  // Trang gom theo chủ đề: ô chọn câu hiện "★★★★★ Tên chủ đề (số phiên bản)" và tiêu đề lớn.
  const grouped = meta.key !== 'listening-1' && meta.key !== 'reading-1';

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(units.length - 1, i)));
    setShowTranscript(false);
  };
  const onAnswer = (itemId: string, answer: Answer) =>
    setAnswers((all) => ({ ...all, [setId]: { ...(all[setId] ?? {}), [itemId]: answer } }));
  const check = () => {
    if (!content || result) return;
    const graded = gradeSet(content, mine);
    setChecked((all) => ({ ...all, [setId]: graded.perItem }));
    record.mutate({ questionSetId: setId, result: graded.correct ? 'CORRECT' : 'WRONG' });
  };
  const retry = () => {
    setAnswers((all) => ({ ...all, [setId]: {} }));
    setChecked((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== setId)));
  };
  const jumpToSearch = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const found = units.findIndex((u) => u.title.toLowerCase().includes(q)
      || u.versions.some((v) => v.content?.items.some((i) => (i.prompt?.value ?? '').toLowerCase().includes(q))));
    if (found >= 0) go(found);
  };

  const cells = units.map((u) => {
    const v = u.versions.find((x) => x.questionSetId === versionOf[u.key]) ?? u.versions[0]!;
    const p = byId.get(v.questionSetId);
    return { attempts: p?.attempts ?? 0, lastResult: p?.lastResult ?? null };
  });
  const transcripts = (content?.items ?? []).map((i) => i.explanation?.value).filter(Boolean) as string[];
  const complete = content ? isComplete(content, mine) : false;

  const versionPicker = unit.versions.length > 1 && (
    <select
      value={item.questionSetId}
      onChange={(e) => setVersionOf((all) => ({ ...all, [unit.key]: e.target.value }))}
      className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800"
      aria-label="Phiên bản"
    >
      {unit.versions.map((v) => <option key={v.questionSetId} value={v.questionSetId}>Phiên bản {v.version ?? 1}</option>)}
    </select>
  );

  return (
    <div className="mx-auto w-full max-w-5xl pb-4">
      <h1 className="text-2xl font-bold text-slate-900">{listening ? 'Luyện nghe' : 'Luyện đọc'}</h1>

      {/* Hàng chọn câu */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">{listening ? `Question ${at + 1} of ${units.length}` : `Câu hỏi ${at + 1} / ${units.length}`}</span>
        {listening && (
          <label className="relative flex min-w-0 max-w-full flex-1 items-center sm:max-w-[450px]">
            <MfIcon name="filter" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
            <select
              value={at}
              onChange={(e) => go(Number(e.target.value))}
              className="w-full appearance-none truncate rounded-md border border-slate-300 bg-slate-50 py-1.5 pl-9 pr-8 text-sm text-slate-800"
            >
              {units.map((u, i) => (
                <option key={u.key} value={i}>
                  {grouped ? `${u.stars ? '★'.repeat(u.stars) + ' ' : ''}${u.title} (${u.versions.length})` : `Câu ${i + 1}: ${clip(u.title, 70)}`}
                </option>
              ))}
            </select>
            <MfIcon name="chevronDown" className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500" />
          </label>
        )}
      </div>

      {/* Thanh công cụ */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!listening && (
          <PillButton tone="purple" active={autoShuffle} onClick={() => { setAutoShuffle(!autoShuffle); go(0); }}>
            <MfIcon name="shuffle" className="h-4 w-4" /> Auto shuffle
          </PillButton>
        )}
        {listening && versionPicker}
        <PillButton active={showAnswer} onClick={() => setShowAnswer(true)}>
          <MfIcon name={showAnswer ? 'eyeOff' : 'eye'} className="h-4 w-4" /> {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
        </PillButton>
        <span className="relative inline-flex">
          <PillButton tone="green" active={rush} onClick={() => setRush(!rush)}>
            <MfIcon name="rush" className="h-4 w-4" /> Rush Mode
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setRushHelp(!rushHelp); }} onKeyDown={() => undefined} aria-label="Rush Mode là gì">
              <MfIcon name="help" className="h-4 w-4" />
            </span>
          </PillButton>
          {rushHelp && (
            <span className="absolute left-0 top-full z-20 mt-2 w-60 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
              Chế độ học chỉ hiển thị đáp án: đáp án đúng được điền sẵn để bạn đọc nhanh, không tính vào tiến độ.
            </span>
          )}
        </span>
        {listening && (
          <PillButton tone="purple" active={autoShuffle} onClick={() => { setAutoShuffle(!autoShuffle); go(0); }}>
            <MfIcon name="shuffle" className="h-4 w-4" /> Auto shuffle
          </PillButton>
        )}
        {!listening && versionPicker}
        <label className="relative ml-auto hidden w-64 items-center md:flex">
          <MfIcon name="search" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') jumpToSearch(); }}
            placeholder="Tìm kiếm câu hỏi..."
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-5" style={{ zoom: fontSize / 16 }}>
        {grouped && listening && <h2 className="mb-4 text-2xl font-bold text-slate-900">{unit.title}</h2>}
        {item.locked || !content ? (
          <PremiumGate message={lockedMessage(page.data)} />
        ) : (
          <div className="space-y-6">
            {listening && <ListenBar key={setId} pageKey={meta.key} questionSetId={setId} assets={content.assets} />}
            {content.instructions && listening && <p className="px-6 text-sm text-slate-500">{content.instructions}</p>}
            {!listening && meta.key === 'reading-1' && content.instructions && <p className="text-lg font-bold text-slate-900">{content.instructions}</p>}
            <Body pageKey={meta.key} content={content} answers={shownAnswers} onAnswer={onAnswer} checked={result} />

            {result && !rush && (
              <p className={clsx('rounded-lg px-4 py-3 text-sm font-semibold', Object.values(result).every(Boolean) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                {Object.values(result).every(Boolean)
                  ? 'Chính xác! Bạn làm đúng hết câu này.'
                  : `Đúng ${Object.values(result).filter(Boolean).length}/${Object.values(result).length} — xem đáp án đúng được tô xanh.`}
              </p>
            )}

            {transcripts.length > 0 && (listening || result) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  <MfIcon name="file" className="h-4 w-4" /> {showTranscript ? 'Ẩn' : 'Hiện'} {listening ? 'Transcript' : 'Giải thích'}
                </button>
                {showTranscript && (
                  <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {transcripts.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <TipsCard tips={page.data.tips} fallbackTitle={`Mẹo làm ${meta.progressLabel.replace(' · ', ' ')}`} />
      </div>

      {/* Thanh dưới */}
      <BottomBar>
        <BarButton onClick={() => navigate(`${basePath}/${SKILL_SLUG[meta.skill]}`)} icon="logout">Thoát</BarButton>
        <BarButton onClick={() => setDrawer(true)} icon="panel">Tiến độ học</BarButton>
        <BarButton onClick={retry} icon="rotate" disabled={!result || rush}>{listening ? 'Làm lại câu này' : 'Làm lại'}</BarButton>
        <button
          type="button"
          onClick={check}
          disabled={!content || !!result || !complete}
          className="min-w-[160px] flex-1 rounded-lg bg-emerald-700 px-6 py-3 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60 sm:flex-none sm:px-16"
        >
          {listening ? 'Kiểm tra' : 'Nộp bài'}
        </button>
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className="rounded-lg border border-red-100 bg-white px-8 py-3 text-sm text-slate-700 disabled:text-slate-300 sm:px-14">Trước</button>
        <button type="button" onClick={() => go(at + 1)} disabled={at >= units.length - 1} className="rounded-lg border border-sky-400 bg-white px-8 py-3 text-sm font-medium text-slate-800 disabled:opacity-40 sm:px-14">Sau</button>
      </BottomBar>

      <Modal open={showAnswer} onClose={() => setShowAnswer(false)}>
        <h2 className="text-xl font-bold text-slate-900">Đáp án</h2>
        <p className="mt-1 text-sm text-slate-500">{listening ? `Question ${at + 1} of ${units.length}` : `Câu hỏi ${at + 1} / ${units.length}`}</p>
        <div className="mt-5 rounded-lg border-2 border-slate-300 bg-slate-100 p-6">
          <span className="rounded bg-slate-300 px-2 py-1 text-xs font-semibold uppercase text-slate-700">{meta.progressLabel.split(' · ')[1]}</span>
          {content && !item.locked ? (
            <div className={clsx('mt-4 space-y-1.5', answerLines(content).length === 1 ? 'text-4xl font-black text-slate-900' : 'text-sm text-slate-800')}>
              {answerLines(content).map((line, i) => <p key={i}>{line}</p>)}
            </div>
          ) : <p className="mt-4 text-sm text-slate-600">{lockedMessage(page.data)}</p>}
        </div>
      </Modal>

      <ProgressDrawer
        open={drawer}
        onClose={() => { setDrawer(false); setSeenDrawer(true); }}
        label={meta.progressLabel}
        cells={cells}
        current={at}
        onPick={go}
        onClear={() => clear.mutate()}
        onSave={() => { void progress.refetch().then(() => { setSaved(true); window.setTimeout(() => setSaved(false), 2000); }); }}
        saving={progress.isFetching}
        fontSize={fontSize}
        onFontSize={setFontSize}
      />
      {saved && <p className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">Đã lưu tiến độ học</p>}
    </div>
  );
}

/**
 * Thanh nút dưới cùng: dính đáy vùng nội dung (sticky) chứ không đè lên menu bên
 * trái như fixed theo cả màn hình.
 */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-3 z-30 mt-8 flex justify-center">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)] sm:flex-nowrap sm:gap-4 sm:p-4">
        {children}
      </div>
    </div>
  );
}

export function BarButton({ onClick, icon, disabled, children }: { onClick: () => void; icon: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:text-slate-300"
    >
      <MfIcon name={icon} className="h-4 w-4" /> <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

