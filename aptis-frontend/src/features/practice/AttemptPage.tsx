import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath } from '@/features/catalog/catalogRoutes';
import { AudioPlayer } from '@/features/practice/AudioPlayer';
import { ItemRenderer } from '@/features/practice/renderers/ItemRenderer';
import {
  countAnswered,
  hydrateResponses,
  toPayload,
  type ResponseDraft,
  type ResponseMap,
} from '@/features/practice/responseState';
import { useAttemptTimer } from '@/features/practice/useAttemptTimer';
import { useAutosave } from '@/features/practice/useAutosave';
import { formatDuration } from '@/lib/format';
import type { AttemptQuestionSet, PartSummary, QuestionItem } from '@/types/api';

type ViewMode = 'part' | 'all';

interface PartGroup {
  id: string;
  number: number;
  name: string;
  label: string;
  instruction: string;
  sets: AttemptQuestionSet[];
  totalItems: number;
}

const LISTENING_PARTS = [
  { name: 'Thông tin cụ thể', label: 'TRẮC NGHIỆM', instruction: 'Nghe audio ngắn, chọn đáp án A/B/C.' },
  { name: 'Ghép người nói', label: 'GHÉP NGƯỜI NÓI', instruction: 'Nghe 4 người nói cùng chủ đề, ghép mỗi người với một ý kiến.' },
  { name: 'Nhận diện người nói', label: 'NAM/NỮ/CẢ HAI', instruction: 'Nghe 2 người trao đổi, xác định Man, Woman hoặc Both.' },
  { name: 'Suy luận bài giảng', label: 'BÀI GIẢNG', instruction: 'Nghe các đoạn dài hơn và trả lời câu hỏi suy luận.' },
] as const;

export function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('part');
  const [flaggedItems, setFlaggedItems] = useState<Set<string>>(new Set());
  const [responsesBySet, setResponsesBySet] = useState<Record<string, ResponseMap>>({});
  const [startedAtMs] = useState(() => Date.now());

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => practiceApi.getAttempt(attemptId!),
    enabled: Boolean(attemptId),
    staleTime: Infinity,
  });

  const attempt = attemptQuery.data;
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const partsQuery = useParts(attempt?.componentId ?? undefined);
  const component = componentsQuery.data?.find((entry) => entry.id === attempt?.componentId);
  const componentName = component ? componentDisplayName(component) : 'Bài thi Aptis';
  const componentCode = component?.code?.toUpperCase() ?? '';

  const isSubmitted = Boolean(attempt && ['SUBMITTED', 'SCORING', 'COMPLETED'].includes(attempt.status));
  const readOnly = isSubmitted || attempt?.status === 'EXPIRED';
  const autosave = useAutosave(attemptId ?? '', !readOnly);

  const partGroups = useMemo(
    () => buildPartGroups(attempt?.questionSets ?? [], partsQuery.data ?? [], componentCode),
    [attempt?.questionSets, partsQuery.data, componentCode],
  );
  const currentPart = partGroups[currentPartIndex] ?? partGroups[0];
  const orderedSets = useMemo(
    () => [...(attempt?.questionSets ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [attempt?.questionSets],
  );
  const setNumberById = useMemo(
    () => new Map(orderedSets.map((set, index) => [set.attemptQuestionSetId, index + 1])),
    [orderedSets],
  );

  useEffect(() => {
    if (!attempt) return;
    setResponsesBySet((existing) => {
      if (Object.keys(existing).length > 0) return existing;
      return hydrateAttempt(attempt.questionSets);
    });
  }, [attempt]);

  useEffect(() => {
    if (currentPartIndex >= partGroups.length && partGroups.length > 0) setCurrentPartIndex(0);
  }, [currentPartIndex, partGroups.length]);

  const startMutation = useMutation({
    mutationFn: () => practiceApi.start(attemptId!),
    onSuccess: () => void attemptQuery.refetch(),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await autosave.flush();
      return practiceApi.submit(attemptId!);
    },
    onSuccess: () => navigate(`/attempts/${attemptId}/result`),
  });

  const handleExpire = useCallback(() => {
    if (!submitMutation.isPending && !readOnly) submitMutation.mutate();
  }, [submitMutation, readOnly]);

  const secondsLeft = useAttemptTimer(readOnly ? null : (attempt?.expiresAt ?? null), handleExpire);

  const answeredByPart = useMemo(
    () => new Map(partGroups.map((part) => [part.id, countPartAnswered(part, responsesBySet)])),
    [partGroups, responsesBySet],
  );
  const totalAnswered = Array.from(answeredByPart.values()).reduce((sum, value) => sum + value, 0);
  const totalItems = attempt?.totalItems ?? partGroups.reduce((sum, part) => sum + part.totalItems, 0);

  const handleItemChange = (set: AttemptQuestionSet, itemId: string, draft: ResponseDraft) => {
    if (readOnly) return;
    const setId = set.attemptQuestionSetId;
    const currentResponses = responsesBySet[setId] ?? {};
    const nextResponses = { ...currentResponses, [itemId]: draft };
    setResponsesBySet((previous) => ({ ...previous, [setId]: nextResponses }));
    autosave.schedule(
      set.questionSetId,
      toPayload(set.content.items, nextResponses),
      Math.round((Date.now() - startedAtMs) / 1000),
    );
  };

  const goToPart = async (index: number) => {
    await autosave.flush();
    setCurrentPartIndex(index);
    setViewMode('part');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitAttempt = async () => {
    await autosave.flush();
    navigate(component ? `${componentPath(component.code)}/bai-test` : '/');
  };

  const restoreSavedResponses = () => {
    if (!attempt || !window.confirm('Khôi phục câu trả lời đã lưu gần nhất? Các thay đổi chưa lưu sẽ bị bỏ.')) return;
    autosave.discard();
    setResponsesBySet(hydrateAttempt(attempt.questionSets));
  };

  const submitAttempt = () => {
    const unanswered = Math.max(0, totalItems - totalAnswered);
    if (unanswered > 0 && !window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;
    submitMutation.mutate();
  };

  if (attemptQuery.isLoading) return <LoadingBlock label="Đang tải bài thi…" />;
  if (attemptQuery.error) {
    if (attemptQuery.error instanceof ApiError && attemptQuery.error.isPremiumRequired) return <PremiumGate />;
    return <ErrorBlock message="Không tải được bài thi" onRetry={() => void attemptQuery.refetch()} />;
  }
  if (!attempt || partGroups.length === 0 || !currentPart) return <ErrorBlock message="Bài thi không có nội dung" />;

  if (attempt.status === 'CREATED') {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
        <section className="w-full rounded-2xl border border-[#e5decd] bg-white p-6 shadow-[0_12px_40px_rgba(44,38,24,.09)]">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-800 text-white"><HeadphoneIcon /></span>
          <h1 className="mt-4 text-2xl font-semibold">Sẵn sàng làm {componentName}?</h1>
          <p className="mt-2 text-sm text-stone-600">{partGroups.length} Part · {attempt.totalItems} câu{attempt.durationSeconds ? ` · ${Math.round(attempt.durationSeconds / 60)} phút` : ''}</p>
          <p className="mt-4 rounded-xl bg-[#eef6f2] px-4 py-3 text-sm text-brand-900">Đồng hồ và tiến độ lưu tự động bắt đầu khi bạn vào bài.</p>
          <button type="button" onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="btn-primary mt-5 w-full">
            {startMutation.isPending ? 'Đang bắt đầu…' : 'Bắt đầu làm bài'}
          </button>
        </section>
      </div>
    );
  }

  const visibleParts = viewMode === 'all' ? partGroups : [currentPart];

  return (
    <div className="min-h-screen bg-[#f7f4eb] pb-24">
      <header className="sticky top-0 z-30 border-b border-[#e5decd] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-800 text-white shadow-sm"><HeadphoneIcon /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">{componentName} · Bài test full</h1>
            <p className="text-[10px] text-stone-500">{totalItems} câu hỏi · đã trả lời {totalAnswered}/{totalItems}</p>
            <p className="text-[10px] text-stone-500">● Nội dung có bản quyền</p>
          </div>

          {secondsLeft !== null && (
            <span className={clsx('rounded-lg px-3 py-2 text-sm font-semibold tabular-nums', secondsLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-[#f2eee3] text-stone-800')} aria-label={`Thời gian còn lại ${formatDuration(secondsLeft)}`}>
              {formatDuration(secondsLeft)}
            </span>
          )}
          <span className="hidden min-w-16 text-right text-[10px] text-stone-500 sm:block" aria-live="polite">
            {autosave.state === 'saving' && 'Đang lưu…'}
            {autosave.state === 'saved' && '✓ Đã lưu'}
            {autosave.state === 'error' && <span className="text-red-600">Lỗi lưu</span>}
          </span>

          <div className="flex items-center gap-1.5">
            {!readOnly && <button type="button" onClick={restoreSavedResponses} className="exam-action hidden lg:inline-flex"><RestoreIcon /> Khôi phục</button>}
            <div className="flex rounded-xl border border-[#ded5c2] bg-white p-1 shadow-sm" aria-label="Chế độ hiển thị">
              <button type="button" onClick={() => setViewMode('part')} className={clsx('rounded-lg px-3 py-2 text-xs font-semibold', viewMode === 'part' ? 'bg-[#15231e] text-white' : 'text-stone-600')}>Theo phần</button>
              <button type="button" onClick={() => setViewMode('all')} className={clsx('rounded-lg px-3 py-2 text-xs font-semibold', viewMode === 'all' ? 'bg-[#15231e] text-white' : 'text-stone-600')}>Tất cả</button>
            </div>
            <button type="button" onClick={() => void exitAttempt()} className="exam-action"><span aria-hidden="true">‹</span> Quay lại</button>
            <a href="mailto:aptispractices@gmail.com?subject=Báo lỗi bài thi Aptis Practice" className="exam-action hidden border-red-200 text-red-700 sm:inline-flex"><FlagIcon /> Báo lỗi</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6">
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Các Part trong bài thi">
          {partGroups.map((part, index) => {
            const answered = answeredByPart.get(part.id) ?? 0;
            const active = viewMode === 'part' && index === currentPartIndex;
            return (
              <button key={part.id} type="button" onClick={() => void goToPart(index)} className={clsx('rounded-xl border bg-[#fffdf8] px-3 py-2.5 text-left transition', active ? 'border-brand-800 bg-[#eaf4ef] shadow-sm' : 'border-[#e3dac7] hover:border-brand-300')} aria-current={active ? 'step' : undefined}>
                <span className="block text-sm font-semibold">Phần {part.number}</span>
                <span className="block text-[9px] font-semibold uppercase text-stone-500">{part.label}</span>
                <span className="mt-2 block text-[10px] font-medium text-stone-600">{answered}/{part.totalItems}</span>
                <span className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-[#d9d0bc]"><span className="block h-full bg-brand-700 transition-all" style={{ width: `${part.totalItems ? (answered / part.totalItems) * 100 : 0}%` }} /></span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 space-y-5">
          {visibleParts.map((part) => (
            <PartSection
              key={part.id}
              part={part}
              attemptId={attempt.id}
              responsesBySet={responsesBySet}
              readOnly={readOnly}
              isSubmitted={isSubmitted}
              flaggedItems={flaggedItems}
              setNumberById={setNumberById}
              onToggleFlag={(key) => setFlaggedItems((previous) => toggleSetValue(previous, key))}
              onItemChange={handleItemChange}
            />
          ))}
        </div>

        <div className="sticky bottom-3 mt-5 flex justify-end border-t border-[#e4dccb] pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#e2dac9] bg-white/95 p-2 shadow-[0_8px_24px_rgba(43,39,30,.10)] backdrop-blur">
            <button type="button" onClick={() => void goToPart(currentPartIndex - 1)} disabled={viewMode === 'all' || currentPartIndex === 0} className="exam-footer-button">Phần trước</button>
            <button type="button" onClick={() => void goToPart(currentPartIndex + 1)} disabled={viewMode === 'all' || currentPartIndex === partGroups.length - 1} className="exam-footer-button border-emerald-300 bg-[#e7f5ef] text-brand-900">Phần tiếp</button>
            {readOnly ? (
              <button type="button" onClick={() => navigate(`/attempts/${attempt.id}/result`)} className="rounded-lg bg-brand-800 px-4 py-2.5 text-xs font-semibold text-white">Xem kết quả</button>
            ) : (
              <button type="button" onClick={submitAttempt} disabled={submitMutation.isPending} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">{submitMutation.isPending ? 'Đang nộp…' : 'Nộp bài'}</button>
            )}
          </div>
        </div>

        {submitMutation.error && <div className="mt-4"><ErrorBlock message={submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Không nộp được bài'} /></div>}
      </main>
    </div>
  );
}

function PartSection({ part, attemptId, responsesBySet, readOnly, isSubmitted, flaggedItems, setNumberById, onToggleFlag, onItemChange }: {
  part: PartGroup;
  attemptId: string;
  responsesBySet: Record<string, ResponseMap>;
  readOnly: boolean;
  isSubmitted: boolean;
  flaggedItems: Set<string>;
  setNumberById: Map<string, number>;
  onToggleFlag: (key: string) => void;
  onItemChange: (set: AttemptQuestionSet, itemId: string, draft: ResponseDraft) => void;
}) {
  const answered = countPartAnswered(part, responsesBySet);

  return (
    <section aria-labelledby={`part-title-${part.id}`}>
      <div className="flex items-center gap-3 rounded-xl border border-[#cee1d9] bg-[linear-gradient(90deg,#deeee8_0%,#fffdf9_72%)] px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-800 font-semibold text-white shadow-sm">{toRoman(part.number)}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`part-title-${part.id}`} className="text-base font-semibold sm:text-lg">Phần {part.number} – {part.name}</h2>
          <p className="text-[11px] font-medium text-brand-900 sm:text-xs">{part.instruction}</p>
        </div>
        <strong className="shrink-0 text-[11px]">{answered}/{part.totalItems} câu</strong>
      </div>

      <div className="mt-3 space-y-3 rounded-xl border-l-2 border-brand-800 bg-[#fbfaf5] p-2.5 sm:p-3">
        {part.sets.map((set) => (
          <QuestionSetBlock
            key={set.attemptQuestionSetId}
            set={set}
            setNumber={setNumberById.get(set.attemptQuestionSetId) ?? 1}
            attemptId={attemptId}
            responses={responsesBySet[set.attemptQuestionSetId] ?? {}}
            readOnly={readOnly}
            isSubmitted={isSubmitted}
            flaggedItems={flaggedItems}
            onToggleFlag={onToggleFlag}
            onItemChange={(itemId, draft) => onItemChange(set, itemId, draft)}
          />
        ))}
      </div>
    </section>
  );
}

function QuestionSetBlock({ set, setNumber, attemptId, responses, readOnly, isSubmitted, flaggedItems, onToggleFlag, onItemChange }: {
  set: AttemptQuestionSet;
  setNumber: number;
  attemptId: string;
  responses: ResponseMap;
  readOnly: boolean;
  isSubmitted: boolean;
  flaggedItems: Set<string>;
  onToggleFlag: (key: string) => void;
  onItemChange: (itemId: string, draft: ResponseDraft) => void;
}) {
  const commonAssets = set.content.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:'));
  const showTopic = Boolean(set.content.title) && (set.content.items.length > 1 || commonAssets.length > 0);

  return (
    <div className="space-y-3">
      {(showTopic || set.content.instructions || set.content.stimulus?.value || commonAssets.length > 0) && (
        <div className="rounded-xl border border-[#d9dfd7] bg-[#f7fcfa] p-3 sm:p-4">
          {showTopic && (
            <div className="mb-3 flex items-center gap-3 border-l-2 border-brand-800 pl-3">
              <span className="text-brand-800"><HeadphoneIcon /></span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-brand-800">Chủ đề · Listening phần</p>
                <h3 className="text-sm font-semibold sm:text-base">{set.content.title}</h3>
              </div>
            </div>
          )}
          {set.content.instructions && <p className="mb-3 rounded-lg bg-[#eaf4ef] px-3 py-2 text-xs text-brand-900">{set.content.instructions}</p>}
          {set.content.stimulus?.value && <div className="question-content mb-3 text-sm" dangerouslySetInnerHTML={{ __html: set.content.stimulus.value }} />}
          {commonAssets.length > 0 && <AudioPlayer assets={commonAssets} maxAudioPlays={set.maxAudioPlays} initialPlayCount={set.audioPlayCount} disabled={readOnly} />}
        </div>
      )}

      {set.content.items.map((item, itemIndex) => {
        const itemKey = `${set.attemptQuestionSetId}:${item.id}`;
        const itemAudio = set.content.assets.filter((asset) => asset.role === `ITEM_AUDIO:${item.id}`);
        const numberLabel = set.content.items.length > 1 ? `${setNumber}.${itemIndex + 1}` : String(setNumber);
        return (
          <QuestionCard
            key={item.id}
            item={item}
            numberLabel={numberLabel}
            itemAudio={itemAudio}
            set={set}
            attemptId={attemptId}
            draft={responses[item.id] ?? {}}
            readOnly={readOnly}
            isSubmitted={isSubmitted}
            flagged={flaggedItems.has(itemKey)}
            onToggleFlag={() => onToggleFlag(itemKey)}
            onChange={(draft) => onItemChange(item.id, draft)}
          />
        );
      })}
    </div>
  );
}

function QuestionCard({ item, numberLabel, itemAudio, set, attemptId, draft, readOnly, isSubmitted, flagged, onToggleFlag, onChange }: {
  item: QuestionItem;
  numberLabel: string;
  itemAudio: AttemptQuestionSet['content']['assets'];
  set: AttemptQuestionSet;
  attemptId: string;
  draft: ResponseDraft;
  readOnly: boolean;
  isSubmitted: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
  onChange: (draft: ResponseDraft) => void;
}) {
  return (
    <article className={clsx('rounded-xl border bg-[#fffdf9] p-3 shadow-[0_3px_12px_rgba(58,48,27,.05)] sm:p-4', flagged ? 'border-amber-400' : 'border-[#e5dcc8]')}>
      <div className="flex items-start gap-2.5">
        <span className="grid min-h-7 min-w-7 shrink-0 place-items-center rounded-full border border-sky-200 bg-sky-50 px-1 text-[11px] font-semibold text-sky-700 shadow-sm">{numberLabel}</span>
        {item.prompt?.value ? <div className="question-content min-w-0 flex-1 pt-1 text-xs font-medium sm:text-[13px]" dangerouslySetInnerHTML={{ __html: item.prompt.value }} /> : <span className="flex-1" />}
        <button type="button" onClick={onToggleFlag} className={clsx('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold transition sm:text-xs', flagged ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-[#d9cdb4] bg-white text-stone-600 hover:border-amber-400')} aria-pressed={flagged}><FlagIcon /> {flagged ? 'Đã đánh dấu' : 'Đánh dấu'}</button>
      </div>

      {itemAudio.length > 0 && <div className="mt-3"><AudioPlayer assets={itemAudio} maxAudioPlays={set.maxAudioPlays} initialPlayCount={0} disabled={readOnly} /></div>}

      <div className="mt-3">
        <ItemRenderer item={item} sections={set.content.sections} attemptId={attemptId} questionSetId={set.questionSetId} draft={draft} disabled={readOnly} showAnswer={isSubmitted} onChange={onChange} />
      </div>

      {isSubmitted && item.explanation?.value && <div className="question-content mt-3 rounded-lg bg-stone-100 p-3 text-xs" dangerouslySetInnerHTML={{ __html: item.explanation.value }} />}
    </article>
  );
}

function buildPartGroups(questionSets: AttemptQuestionSet[], parts: PartSummary[], componentCode: string): PartGroup[] {
  const partById = new Map(parts.map((part) => [part.id, part]));
  const grouped = new Map<string, AttemptQuestionSet[]>();
  for (const set of [...questionSets].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const partId = set.content.partId;
    grouped.set(partId, [...(grouped.get(partId) ?? []), set]);
  }

  const entries = Array.from(grouped.entries()).sort(([leftId], [rightId]) => {
    const left = partById.get(leftId)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const right = partById.get(rightId)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });

  return entries.map(([partId, sets], index) => {
    const metadata = partById.get(partId);
    const listening = componentCode.includes('LISTEN') || componentCode.includes('NGHE');
    const preset = listening ? LISTENING_PARTS[index] : undefined;
    return {
      id: partId,
      number: index + 1,
      name: preset?.name ?? metadata?.name ?? `Part ${index + 1}`,
      label: preset?.label ?? metadata?.code ?? `PART ${index + 1}`,
      instruction: preset?.instruction ?? metadata?.instructions ?? metadata?.description ?? 'Hoàn thành lần lượt các câu hỏi trong phần này.',
      sets,
      totalItems: sets.reduce((sum, set) => sum + set.content.items.length, 0),
    };
  });
}

function hydrateAttempt(questionSets: AttemptQuestionSet[]) {
  const hydrated: Record<string, ResponseMap> = {};
  for (const set of questionSets) hydrated[set.attemptQuestionSetId] = hydrateResponses(set.savedResponse);
  return hydrated;
}

function countPartAnswered(part: PartGroup, responsesBySet: Record<string, ResponseMap>) {
  return part.sets.reduce((sum, set) => sum + countAnswered(set.content.items, responsesBySet[set.attemptQuestionSetId] ?? {}), 0);
}

function toggleSetValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function toRoman(value: number) {
  return ['I', 'II', 'III', 'IV'][value - 1] ?? String(value);
}

function HeadphoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></svg>;
}

function FlagIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M5 21V4m0 1h10l-1 4 3 3H5" /></svg>;
}

function RestoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" /><path d="M4 3v5h5" /></svg>;
}
