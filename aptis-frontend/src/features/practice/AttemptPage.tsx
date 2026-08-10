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

/**
 * 'single' — từng bài một màn, mặc định: một Part có thể có hàng chục bộ câu
 * hỏi, trải hết ra một màn thì học viên phải cuộn rất dài.
 * 'part'   — cả một Part.
 * 'all'    — toàn bộ lượt, để rà soát trước khi nộp.
 */
type ViewMode = 'single' | 'part' | 'all';

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
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
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

  /**
   * Nộp riêng bài đang làm. Phải flush autosave trước, nếu không server chấm
   * theo câu trả lời cũ.
   */
  const scoreSetMutation = useMutation({
    mutationFn: async (questionSetId: string) => {
      await autosave.flush();
      return practiceApi.scoreQuestionSet(attemptId!, questionSetId);
    },
    // Nạp lại lượt để bộ vừa chấm hiện điểm và đáp án
    onSuccess: () => void attemptQuery.refetch(),
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
    setCurrentSetIndex(0);
    setViewMode((mode) => (mode === 'all' ? 'part' : mode));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Nhảy thẳng tới một bài trong Part hiện tại (dùng cho dropdown chọn đề). */
  const goToSetIndex = async (index: number) => {
    await autosave.flush();
    setCurrentSetIndex(index);
    setViewMode('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Đi tới bài kế/trước trong chế độ từng bài; hết bài của Part hiện tại thì
   * nhảy sang Part liền kề để học viên không phải tự bấm đổi Part.
   */
  const goToSet = async (direction: -1 | 1) => {
    await autosave.flush();

    const setCount = currentPart?.sets.length ?? 0;
    const next = currentSetIndex + direction;

    if (next >= 0 && next < setCount) {
      setCurrentSetIndex(next);
    } else if (direction === 1 && currentPartIndex < partGroups.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1);
      setCurrentSetIndex(0);
    } else if (direction === -1 && currentPartIndex > 0) {
      const previousPart = partGroups[currentPartIndex - 1];
      setCurrentPartIndex(currentPartIndex - 1);
      setCurrentSetIndex(Math.max(0, (previousPart?.sets.length ?? 1) - 1));
    } else {
      return; // đã ở đầu/cuối toàn lượt
    }
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

  /** Luyện theo Part: lượt chỉ có một Part nên không cần lưới chọn Part. */
  const isSinglePartAttempt = partGroups.length === 1;

  // Ở chế độ từng bài, chỉ hiện đúng một bộ của Part hiện tại.
  const setCount = currentPart.sets.length;
  const safeSetIndex = Math.min(currentSetIndex, Math.max(0, setCount - 1));
  const visibleSetOnly = viewMode === 'single' ? currentPart.sets[safeSetIndex] : undefined;
  const isFirstSetOverall = currentPartIndex === 0 && safeSetIndex === 0;
  const isLastSetOverall =
    currentPartIndex === partGroups.length - 1 && safeSetIndex === setCount - 1;

  return (
    <div className="min-h-screen bg-[#f7f4eb] pb-24">
      <header className="sticky top-0 z-30 border-b border-[#e5decd] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-800 text-white shadow-sm"><HeadphoneIcon /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {componentName} · {isSinglePartAttempt ? currentPart.name : 'Bài test full'}
            </h1>
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
              <button type="button" onClick={() => setViewMode('single')} className={clsx('rounded-lg px-3 py-2 text-xs font-semibold', viewMode === 'single' ? 'bg-[#15231e] text-white' : 'text-stone-600')}>Từng bài</button>
              <button type="button" onClick={() => setViewMode('part')} className={clsx('rounded-lg px-3 py-2 text-xs font-semibold', viewMode === 'part' ? 'bg-[#15231e] text-white' : 'text-stone-600')}>Theo phần</button>
              <button type="button" onClick={() => setViewMode('all')} className={clsx('rounded-lg px-3 py-2 text-xs font-semibold', viewMode === 'all' ? 'bg-[#15231e] text-white' : 'text-stone-600')}>Tất cả</button>
            </div>
            <button type="button" onClick={() => void exitAttempt()} className="exam-action"><span aria-hidden="true">‹</span> Quay lại</button>
            <a href="mailto:aptispractices@gmail.com?subject=Báo lỗi bài thi Aptis Practice" className="exam-action hidden border-red-200 text-red-700 sm:inline-flex"><FlagIcon /> Báo lỗi</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6">
        {/*
          Luyện một Part: thẻ "Phần 1" không cho thêm thông tin gì (chỉ có đúng
          một Part), nên thay bằng danh sách đề để học viên chọn bài muốn làm.
          Bài test nhiều Part vẫn dùng lưới Part như cũ.
        */}
        {isSinglePartAttempt ? (
          <SetPicker
            sets={currentPart.sets}
            currentIndex={safeSetIndex}
            partName={currentPart.name}
            setNumberById={setNumberById}
            responsesBySet={responsesBySet}
            onPick={(index) => void goToSetIndex(index)}
          />
        ) : (
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
        )}

        <div className="mt-4 space-y-5">
          {visibleParts.map((part) => (
            <PartSection
              key={part.id}
              part={part}
              hideHeader={isSinglePartAttempt}
              onlySetId={visibleSetOnly?.attemptQuestionSetId}
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
            {viewMode === 'single' ? (
              <>
                <span className="px-2 text-[11px] font-medium tabular-nums text-stone-500">
                  Bài {safeSetIndex + 1}/{setCount} · Phần {currentPart.number}
                </span>
                <button type="button" onClick={() => void goToSet(-1)} disabled={isFirstSetOverall} className="exam-footer-button">Bài trước</button>
                <button type="button" onClick={() => void goToSet(1)} disabled={isLastSetOverall} className="exam-footer-button border-emerald-300 bg-[#e7f5ef] text-brand-900">Bài tiếp</button>
                {!readOnly && visibleSetOnly && (
                  visibleSetOnly.status === 'SCORED' ? (
                    <span className="rounded-lg bg-[#eef6f2] px-3 py-2.5 text-xs font-semibold text-brand-900">
                      ✓ {visibleSetOnly.awardedScore ?? 0}/{visibleSetOnly.maxScore} điểm
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => scoreSetMutation.mutate(visibleSetOnly.questionSetId)}
                      disabled={scoreSetMutation.isPending}
                      className="rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
                    >
                      {scoreSetMutation.isPending ? 'Đang chấm…' : 'Nộp bài này'}
                    </button>
                  )
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={() => void goToPart(currentPartIndex - 1)} disabled={viewMode === 'all' || currentPartIndex === 0} className="exam-footer-button">Phần trước</button>
                <button type="button" onClick={() => void goToPart(currentPartIndex + 1)} disabled={viewMode === 'all' || currentPartIndex === partGroups.length - 1} className="exam-footer-button border-emerald-300 bg-[#e7f5ef] text-brand-900">Phần tiếp</button>
              </>
            )}
            {readOnly ? (
              <button type="button" onClick={() => navigate(`/attempts/${attempt.id}/result`)} className="rounded-lg bg-brand-800 px-4 py-2.5 text-xs font-semibold text-white">Xem kết quả</button>
            ) : (
              <button type="button" onClick={submitAttempt} disabled={submitMutation.isPending} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">{submitMutation.isPending ? 'Đang nộp…' : 'Nộp bài'}</button>
            )}
          </div>
        </div>

        {scoreSetMutation.error && <div className="mt-4"><ErrorBlock message={scoreSetMutation.error instanceof ApiError ? scoreSetMutation.error.message : 'Không chấm được bài này'} /></div>}
        {submitMutation.error && <div className="mt-4"><ErrorBlock message={submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Không nộp được bài'} /></div>}
      </main>
    </div>
  );
}

/**
 * Danh sách đề của một Part, dạng menu bung xuống để chọn bài muốn làm.
 *
 * <p>Dùng khi lượt chỉ có một Part (luyện theo Part): lúc đó điều hướng theo
 * Part vô nghĩa, học viên cần chọn theo ĐỀ.
 */
/**
 * Câu trả lời mẫu, mặc định ẩn để học viên tự nói trước rồi mới đối chiếu.
 * Chỉ render khi backend trả explanation (luyện tập, chưa nộp).
 */
function SampleAnswer({ html }: { html: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-50"
        >
          {open ? '🙈 Ẩn câu mẫu' : '👁 Xem câu mẫu'}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Câu trả lời tham khảo
          </p>
          <div className="mt-2 flex gap-2 rounded-lg border-l-4 border-amber-400 bg-white/70 p-2.5">
            <span className="h-fit shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              SAMPLE
            </span>
            <div className="question-content flex-1 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SetPicker({ sets, currentIndex, partName, setNumberById, responsesBySet, onPick }: {
  sets: AttemptQuestionSet[];
  currentIndex: number;
  partName: string;
  setNumberById: Map<string, number>;
  responsesBySet: Record<string, ResponseMap>;
  onPick: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = sets[currentIndex];

  /**
   * Nhãn của một bộ trong danh sách chọn đề.
   *
   * <p>Bộ gộp nhiều câu (Speaking/Writing Part 1) có title là câu hỏi ĐẦU TIÊN,
   * không đại diện cho cả đề — hiện nó lên sẽ khiến học viên tưởng đó là chủ đề
   * chung. Những bộ như vậy chỉ đánh số.
   */
  const labelOf = (set: AttemptQuestionSet, index: number) =>
    set.content.items.length > 1
      ? `Đề ${index + 1}`
      : set.content.title ?? `Đề ${index + 1}`;

  // Đóng menu khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const doneCount = sets.filter((set) => set.status === 'SCORED').length;

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-3 rounded-xl border border-[#e3dac7] bg-[#fffdf8] px-4 py-3 text-left transition hover:border-brand-300"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-800 text-xs font-semibold text-white">
          {currentIndex + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {current ? labelOf(current, currentIndex) : `Đề ${currentIndex + 1}`}
          </span>
          <span className="block text-[10px] text-stone-500">
            {partName} · Đề {currentIndex + 1}/{sets.length}
            {doneCount > 0 && ` · đã nộp ${doneCount}`}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-brand-800">
          Chọn đề <span aria-hidden="true">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-[#ded5c2] bg-white p-1 shadow-[0_12px_32px_rgba(43,39,30,.16)]"
        >
          {sets.map((set, index) => {
            const answered = countAnswered(set.content.items, responsesBySet[set.attemptQuestionSetId] ?? {});
            const scored = set.status === 'SCORED';
            return (
              <li key={set.attemptQuestionSetId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === currentIndex}
                  onClick={() => {
                    onPick(index);
                    setOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition',
                    index === currentIndex ? 'bg-[#eaf4ef] font-semibold' : 'hover:bg-stone-50',
                  )}
                >
                  <span className="w-6 shrink-0 text-[11px] tabular-nums text-stone-500">
                    {setNumberById.get(set.attemptQuestionSetId) ?? index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate">{labelOf(set, index)}</span>
                  {scored ? (
                    <span className="shrink-0 rounded-full bg-[#eef6f2] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                      ✓ {set.awardedScore ?? 0}/{set.maxScore}
                    </span>
                  ) : answered > 0 ? (
                    <span className="shrink-0 text-[10px] text-amber-700">đang làm</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PartSection({ part, hideHeader, onlySetId, attemptId, responsesBySet, readOnly, isSubmitted, flaggedItems, setNumberById, onToggleFlag, onItemChange }: {
  part: PartGroup;
  /** Ẩn tiêu đề Part: khi luyện một Part, dropdown chọn đề đã nói đủ. */
  hideHeader?: boolean;
  /** Chỉ render bộ này (chế độ từng bài); bỏ trống thì render cả Part. */
  onlySetId?: string;
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
  const visibleSets = onlySetId
    ? part.sets.filter((set) => set.attemptQuestionSetId === onlySetId)
    : part.sets;

  return (
    <section aria-labelledby={hideHeader ? undefined : `part-title-${part.id}`} aria-label={hideHeader ? part.name : undefined}>
      {hideHeader ? (
        // Vẫn giữ hướng dẫn làm bài; chỉ bỏ dòng "Phần N – ..." vì đã có ở dropdown
        <p className="rounded-xl border border-[#cee1d9] bg-[#f2f9f6] px-4 py-2.5 text-[11px] font-medium text-brand-900 sm:text-xs">
          {part.instruction}
        </p>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-[#cee1d9] bg-[linear-gradient(90deg,#deeee8_0%,#fffdf9_72%)] px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-800 font-semibold text-white shadow-sm">{toRoman(part.number)}</span>
          <div className="min-w-0 flex-1">
            <h2 id={`part-title-${part.id}`} className="text-base font-semibold sm:text-lg">Phần {part.number} – {part.name}</h2>
            <p className="text-[11px] font-medium text-brand-900 sm:text-xs">{part.instruction}</p>
          </div>
          <strong className="shrink-0 text-[11px]">{answered}/{part.totalItems} câu</strong>
        </div>
      )}

      <div className="mt-3 space-y-3 rounded-xl border-l-2 border-brand-800 bg-[#fbfaf5] p-2.5 sm:p-3">
        {visibleSets.map((set) => (
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

  // Chỉ hiện tiêu đề chung khi các câu thực sự dùng chung một ngữ liệu (audio
  // hoặc đoạn đọc). Speaking Part 1 gộp nhiều câu độc lập, title của bộ chỉ là
  // câu hỏi đầu tiên nên hiện lên sẽ gây hiểu nhầm đó là chủ đề chung.
  const hasSharedStimulus = commonAssets.length > 0 || Boolean(set.content.stimulus?.value);
  const showTopic = Boolean(set.content.title) && hasSharedStimulus;
  const topicLabel = commonAssets.length > 0 ? 'Chủ đề · Bài nghe' : 'Chủ đề';

  return (
    <div className="space-y-3">
      {(showTopic || set.content.instructions || set.content.stimulus?.value || commonAssets.length > 0) && (
        <div className="rounded-xl border border-[#d9dfd7] bg-[#f7fcfa] p-3 sm:p-4">
          {showTopic && (
            <div className="mb-3 flex items-center gap-3 border-l-2 border-brand-800 pl-3">
              {commonAssets.length > 0 && <span className="text-brand-800"><HeadphoneIcon /></span>}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-brand-800">{topicLabel}</p>
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
  // Bộ đã nộp riêng giữa lượt cũng phải hiện đáp án, không chỉ khi nộp cả lượt.
  const revealed = isSubmitted || set.status === 'SCORED';

  return (
    <article className={clsx('rounded-xl border bg-[#fffdf9] p-3 shadow-[0_3px_12px_rgba(58,48,27,.05)] sm:p-4', flagged ? 'border-amber-400' : 'border-[#e5dcc8]')}>
      <div className="flex items-start gap-2.5">
        <span className="grid min-h-7 min-w-7 shrink-0 place-items-center rounded-full border border-sky-200 bg-sky-50 px-1 text-[11px] font-semibold text-sky-700 shadow-sm">{numberLabel}</span>
        {item.prompt?.value ? <div className="question-content min-w-0 flex-1 pt-1 text-xs font-medium sm:text-[13px]" dangerouslySetInnerHTML={{ __html: item.prompt.value }} /> : <span className="flex-1" />}
        <button type="button" onClick={onToggleFlag} className={clsx('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold transition sm:text-xs', flagged ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-[#d9cdb4] bg-white text-stone-600 hover:border-amber-400')} aria-pressed={flagged}><FlagIcon /> {flagged ? 'Đã đánh dấu' : 'Đánh dấu'}</button>
      </div>

      {itemAudio.length > 0 && <div className="mt-3"><AudioPlayer assets={itemAudio} maxAudioPlays={set.maxAudioPlays} initialPlayCount={0} disabled={readOnly} /></div>}

      <div className="mt-3">
        <ItemRenderer item={item} sections={set.content.sections} attemptId={attemptId} questionSetId={set.questionSetId} draft={draft} disabled={readOnly || revealed} showAnswer={revealed} onChange={onChange} />
      </div>

      {/*
        Đã nộp: hiện luôn phần giải thích.
        Đang làm: backend chỉ trả explanation khi LUYỆN TẬP — đó là câu trả lời
        mẫu, để học viên tự bấm xem khi cần chứ không hiện sẵn làm mất tác dụng
        luyện tập.
      */}
      {item.explanation?.value && (revealed
        ? <div className="question-content mt-3 rounded-lg bg-stone-100 p-3 text-xs" dangerouslySetInnerHTML={{ __html: item.explanation.value }} />
        : <SampleAnswer html={item.explanation.value} />)}
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
