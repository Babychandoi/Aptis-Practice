import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useComponents, useExamVersions, useParts, usePartsOfComponents } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath } from '@/features/catalog/catalogRoutes';
import type { ComponentProgress } from '@/types/api';
import { AudioPlayer } from '@/features/practice/AudioPlayer';
import { ImageViewer } from '@/features/practice/ImageViewer';
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
import { confirmDialog } from '@/lib/dialog';
import { formatDuration } from '@/lib/format';
import type { AttemptQuestionSet, PartSummary, QuestionItem } from '@/types/api';

/**
 * 'single' — từng bài một màn, mặc định: một Part có thể có hàng chục bộ câu
 * hỏi, trải hết ra một màn thì học viên phải cuộn rất dài.
 * 'part'   — cả một Part.
 * 'all'    — toàn bộ lượt, để rà soát trước khi nộp.
 */
type ViewMode = 'single' | 'part' | 'all';

/**
 * Số bộ hiện cùng lúc ở chế độ "Từng bài", CHỈ áp cho Part rải từng câu.
 *
 * Part câu rời (Writing Part 1, Reading Part 1, Speaking Part 1 khi luyện riêng)
 * có hàng trăm bộ một-câu; hiện mỗi lần một bộ thì phải bấm Next hàng trăm lần.
 * Năm bộ một trang khớp số câu của một form Aptis.
 *
 * Part mà mỗi bộ đã là một đề hoàn chỉnh (Writing Part 3 có 3 lượt hội thoại,
 * Listening Part 2 có 4 người nói) thì luôn 1 bộ/trang — gộp lại sẽ thành 15-20
 * câu một màn, học viên phải cuộn rất dài và mất cảm giác "đang làm đề nào".
 */
const SETS_PER_PAGE_ITEM_BANK = 5;

interface PartGroup {
  id: string;
  number: number;
  name: string;
  label: string;
  /** Tên kỹ năng — chỉ có khi bài thi trải trên nhiều kỹ năng. */
  skill?: string;
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

  // Mock full không gắn componentId nên phải nạp Part của cả 5 kỹ năng, nếu không
  // mọi Part đều thiếu metadata và bị đánh số 1..n xuyên suốt bài thi.
  const allPartsQuery = usePartsOfComponents(
    attempt?.componentId ? [] : (componentsQuery.data ?? []).map((entry) => entry.id),
  );
  const parts = attempt?.componentId ? partsQuery.data : allPartsQuery.data;

  const isSubmitted = Boolean(attempt && ['SUBMITTED', 'SCORING', 'COMPLETED'].includes(attempt.status));
  const readOnly = isSubmitted || attempt?.status === 'EXPIRED';
  const autosave = useAutosave(attemptId ?? '', !readOnly);

  const partGroups = useMemo(
    () => buildPartGroups(attempt?.questionSets ?? [], parts ?? [], componentCode),
    [attempt?.questionSets, parts, componentCode],
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

  /**
   * Nộp một kỹ năng: khóa kỹ năng đó, mở kỹ năng kế. Backend tự nộp cả lượt khi
   * đây là kỹ năng cuối — cũng là lúc mới có điểm.
   */
  const submitComponentMutation = useMutation({
    mutationFn: async (componentId: string) => {
      await autosave.flush();
      return practiceApi.submitComponent(attemptId!, componentId);
    },
    onSuccess: () => void attemptQuery.refetch(),
  });

  /**
   * Kỹ năng đang được phép làm: dòng đầu tiên đã mở mà chưa nộp.
   *
   * Bài thi đủ 5 kỹ năng đếm giờ theo TỪNG kỹ năng, không dùng một mốc chung —
   * nếu không thí sinh có thể dồn hết thời gian vào một kỹ năng.
   */
  const openProgress = attempt?.componentProgress?.find(
    (row) => row.startedAt && !row.submittedAt,
  );

  /**
   * Kỹ năng kế tiếp chưa bắt đầu. Khi có giá trị mà không kỹ năng nào đang mở,
   * trang hiện màn chuẩn bị — đồng hồ chưa chạy cho tới khi bấm vào làm.
   */
  const pendingProgress = attempt?.componentProgress?.find(
    (row) => !row.startedAt && !row.submittedAt,
  );

  const beginComponentMutation = useMutation({
    mutationFn: (componentId: string) => practiceApi.beginComponent(attemptId!, componentId),
    onSuccess: () => void attemptQuery.refetch(),
  });
  const timerDeadline = openProgress
    ? openProgress.expiresAt
    : (attempt?.expiresAt ?? null);

  const handleExpire = useCallback(() => {
    if (readOnly) return;
    // Hết giờ một kỹ năng thì chỉ nộp kỹ năng đó, không nộp cả bài.
    if (openProgress) {
      if (!submitComponentMutation.isPending) {
        submitComponentMutation.mutate(openProgress.componentId);
      }
      return;
    }
    if (!submitMutation.isPending) submitMutation.mutate();
  }, [submitMutation, submitComponentMutation, readOnly, openProgress]);

  const secondsLeft = useAttemptTimer(readOnly ? null : timerDeadline, handleExpire);

  const isFullMock = attempt?.mode === 'MOCK_TEST' && !attempt.componentId;

  /** partId -> componentId, để biết một Part thuộc kỹ năng nào. */
  const componentIdByPart = useMemo(() => {
    const map = new Map<string, string>();
    for (const part of parts ?? []) map.set(part.id, part.componentId);
    return map;
  }, [parts]);

  /**
   * Vào đúng Part đầu của kỹ năng đang mở.
   *
   * Nộp xong một kỹ năng, con trỏ vẫn nằm ở Part cũ; nếu không nhảy thì học viên
   * thấy màn kỹ năng trước trong khi đồng hồ kỹ năng mới đã chạy.
   */
  useEffect(() => {
    if (!isFullMock || !openProgress || partGroups.length === 0) return;
    const currentComponentId = currentPart
      ? componentIdByPart.get(currentPart.id)
      : undefined;
    if (currentComponentId === openProgress.componentId) return;

    const target = partGroups.findIndex(
      (part) => componentIdByPart.get(part.id) === openProgress.componentId,
    );
    if (target >= 0 && target !== currentPartIndex) {
      setCurrentPartIndex(target);
      setCurrentSetIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullMock, openProgress?.componentId, partGroups.length, componentIdByPart]);

  const answeredByPart = useMemo(
    () => new Map(partGroups.map((part) => [part.id, countPartAnswered(part, responsesBySet)])),
    [partGroups, responsesBySet],
  );
  const totalAnswered = Array.from(answeredByPart.values()).reduce((sum, value) => sum + value, 0);
  const totalItems = attempt?.totalItems ?? partGroups.reduce((sum, part) => sum + part.totalItems, 0);

  /**
   * Bản mới nhất của state cho callback chạy trễ (tự chuyển câu Speaking).
   *
   * RecordingRenderer gọi onExamFinished trong setTimeout, nên nếu đọc thẳng
   * biến của render lúc đó thì vị trí đã cũ: vừa nhảy sang Part sau mà vẫn tưởng
   * đang ở Part trước, dẫn tới nộp cả kỹ năng quá sớm.
   */
  const responsesRef = useRef(responsesBySet);
  responsesRef.current = responsesBySet;
  const positionRef = useRef({ partIndex: currentPartIndex, setIndex: currentSetIndex });
  positionRef.current = { partIndex: currentPartIndex, setIndex: currentSetIndex };

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
   * Part câu rời: ngân hàng lưu từng câu, đề thi thật gộp nhiều câu lại (Writing
   * Part 1, Reading Part 1, Speaking Part 1). Backend đánh dấu theo cấu hình
   * merge-item-parts, không suy từ số câu mỗi bộ — Writing Part 2 cũng một câu
   * một bộ nhưng mỗi bộ là một đề riêng (Travel Club, Fashion Club…), phải làm
   * từng đề một.
   */
  const isItemBank = Boolean(attempt?.itemBankPart);

  /** Chỉ ngân hàng câu rời mới gộp nhiều bộ một trang. */
  const setsPerPage = isItemBank ? SETS_PER_PAGE_ITEM_BANK : 1;

  /**
   * Speaking trong bài thi đủ 5 kỹ năng chạy một chiều như đề thật: từng phần tự
   * hiện ra, ghi âm tự dừng, không quay lại câu đã qua ("Each part of the test
   * will appear automatically" — Aptis ESOL General Guide for Teachers).
   *
   * Luyện riêng Speaking (attempt gắn componentId) vẫn cho tua tới lui thoải mái
   * để học viên nghe lại và ghi lại.
   */

  const progressByComponent = useMemo(() => {
    const map = new Map<string, ComponentProgress>();
    for (const row of attempt?.componentProgress ?? []) map.set(row.componentId, row);
    return map;
  }, [attempt?.componentProgress]);

  const progressOfPart = (part: PartGroup | undefined) => {
    const componentId = part ? componentIdByPart.get(part.id) : undefined;
    return componentId ? progressByComponent.get(componentId) : undefined;
  };

  const currentProgress = progressOfPart(currentPart);

  /** Kỹ năng đang làm đã nộp thì mọi Part của nó chỉ đọc. */
  const currentComponentSubmitted = Boolean(currentProgress?.submittedAt);

  /**
   * Lượt này có câu cần AI chấm không (ghi âm hoặc bài viết dài).
   *
   * Grammar, Vocabulary, Reading, Listening chấm tự động ngay nên nhãn "AI chấm"
   * là sai — chỉ Speaking và Writing mới qua AI.
   */
  const needsAiScoring = (attempt?.questionSets ?? []).some((set) =>
    set.content.items.some(
      (item) => item.responseType === 'AUDIO_RECORDING' || item.responseType === 'LONG_TEXT',
    ),
  );

  /** Kỹ năng chứa Part này đã nộp / đang làm / chưa tới lượt. */
  const partStateOf = (part: PartGroup): 'submitted' | 'open' | 'pending' => {
    const row = progressOfPart(part);
    if (!row) return 'open';
    if (row.submittedAt) return 'submitted';
    return row.startedAt ? 'open' : 'pending';
  };

  /** Nộp kỹ năng đang làm, có xác nhận vì không quay lại được. */
  const submitCurrentComponent = async () => {
    if (!openProgress) return;
    const name = skillNameOf(openProgress.componentCode);
    const remaining = partGroups
      .filter((part) => componentIdByPart.get(part.id) === openProgress.componentId)
      .reduce(
        (sum, part) => sum + part.totalItems - (answeredByPart.get(part.id) ?? 0),
        0,
      );

    const ok = await confirmDialog({
      title: `Nộp kỹ năng ${name}?`,
      text: remaining > 0
        ? `Còn ${remaining} câu chưa trả lời. Nộp rồi sẽ không sửa hay xem lại được kỹ năng này.`
        : `Nộp rồi sẽ không sửa hay xem lại được kỹ năng ${name}.`,
      confirmText: 'Nộp kỹ năng này',
      cancelText: 'Làm tiếp',
      danger: remaining > 0,
    });
    if (ok) submitComponentMutation.mutate(openProgress.componentId);
  };

  const speakingStartIndex = partGroups.findIndex(
    (part) => (part.skill ?? '').toLowerCase().includes('nói'),
  );
  const speakingLocked = isFullMock
    && speakingStartIndex >= 0
    && currentPartIndex >= speakingStartIndex
    && !currentComponentSubmitted;

  /**
   * Ghi âm xong một câu ở chế độ thi thì tự sang câu kế, hết câu thì sang Part
   * kế — học viên không phải bấm gì trong suốt phần Nói.
   *
   * Một bộ Speaking có thể chứa nhiều câu (Part 1 gộp 3 câu, Part 2/3 mỗi bộ 3
   * câu) nên chỉ chuyển bộ khi mọi câu trong bộ đã có bản ghi.
   */
  const handleExamAutoAdvance = () => {
    // Đọc vị trí qua ref: callback chạy trễ nên biến của render cũ đã lỗi thời.
    const { partIndex, setIndex } = positionRef.current;
    const part = partGroups[partIndex];
    const sets = part?.sets ?? [];
    const index = Math.min(setIndex, Math.max(0, sets.length - 1));
    const set = sets[index];
    if (!set) return;

    // Đọc qua ref: callback chạy trong setTimeout của renderer nên closure có
    // thể giữ state cũ, làm mất câu vừa ghi.
    const responses = responsesRef.current[set.attemptQuestionSetId] ?? {};
    const allRecorded = set.content.items.every(
      (item) => responses[item.id]?.recordingAssetId,
    );
    if (!allRecorded) return;

    if (index < sets.length - 1) {
      void goToSetIndex(index + 1);
      return;
    }

    // Hết Part. Nếu Part kế vẫn thuộc kỹ năng Nói thì đi tiếp; hết kỹ năng Nói
    // thì tự nộp luôn — phần này chạy một chiều nên không chờ bấm nút.
    const nextPart = partGroups[partIndex + 1];
    const currentComponentId = componentIdByPart.get(part!.id);
    const nextComponentId = nextPart ? componentIdByPart.get(nextPart.id) : undefined;

    if (nextPart && nextComponentId === currentComponentId) {
      void goToPart(partIndex + 1);
      return;
    }
    if (currentComponentId && !submitComponentMutation.isPending) {
      submitComponentMutation.mutate(currentComponentId);
    }
  };

  /**
   * Sang trang kế/trước trong chế độ từng bài; hết bài của Part hiện tại thì
   * nhảy sang Part liền kề để học viên không phải tự bấm đổi Part.
   */
  const goToSet = async (direction: -1 | 1) => {
    await autosave.flush();

    const setCount = currentPart?.sets.length ?? 0;
    const currentPageStart = Math.floor(currentSetIndex / setsPerPage) * setsPerPage;
    const next = currentPageStart + direction * setsPerPage;

    if (next >= 0 && next < setCount) {
      setCurrentSetIndex(next);
    } else if (direction === 1 && currentPartIndex < partGroups.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1);
      setCurrentSetIndex(0);
    } else if (direction === -1 && currentPartIndex > 0) {
      const previousPart = partGroups[currentPartIndex - 1];
      const previousCount = previousPart?.sets.length ?? 1;
      setCurrentPartIndex(currentPartIndex - 1);
      // Về trang CUỐI của Part trước, không phải bộ cuối.
      setCurrentSetIndex(
        Math.max(0, Math.floor((previousCount - 1) / setsPerPage) * setsPerPage));
    } else {
      return; // đã ở đầu/cuối toàn lượt
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitAttempt = async () => {
    await autosave.flush();
    navigate(component ? `${componentPath(component.code)}/bai-test` : '/');
  };

  const restoreSavedResponses = async () => {
    if (!attempt) return;
    const ok = await confirmDialog({
      title: 'Khôi phục câu trả lời đã lưu?',
      text: 'Bản lưu gần nhất sẽ được nạp lại. Các thay đổi chưa lưu sẽ bị bỏ.',
      confirmText: 'Khôi phục',
    });
    if (!ok) return;
    autosave.discard();
    setResponsesBySet(hydrateAttempt(attempt.questionSets));
  };

  const submitAttempt = async () => {
    const unanswered = Math.max(0, totalItems - totalAnswered);
    if (unanswered > 0) {
      const ok = await confirmDialog({
        title: `Còn ${unanswered} câu chưa trả lời`,
        text: 'Nộp bài rồi sẽ không sửa được nữa. Bạn vẫn muốn nộp?',
        confirmText: 'Vẫn nộp bài',
        cancelText: 'Làm tiếp',
        danger: true,
      });
      if (!ok) return;
    }
    submitMutation.mutate();
  };

  if (attemptQuery.isLoading) return <LoadingBlock label="Đang tải bài thi…" />;
  if (attemptQuery.error) {
    // Nội dung Premium: mời mua gói thay vì báo lỗi, vì đây không phải sự cố.
    if (attemptQuery.error instanceof ApiError && attemptQuery.error.isPremiumRequired) {
      return <PremiumGate />;
    }
    // Trang làm bài chiếm trọn màn hình (không có sidebar), nên lỗi ở đây phải
    // tự mang theo lối đi tiếp — nếu không người dùng mắc kẹt.
    return (
      <ErrorState
        fullPage
        error={attemptQuery.error}
        fallbackTitle="Không tải được bài thi"
        onRetry={() => void attemptQuery.refetch()}
      />
    );
  }
  if (!attempt || partGroups.length === 0 || !currentPart) {
    return (
      <ErrorState
        fullPage
        presentation={{
          title: 'Bài thi không có nội dung',
          description: 'Đề này bị thiếu dữ liệu nên không hiển thị được. Bạn chọn đề khác giúp nhé.',
          tone: 'error',
          canRetry: false,
          action: { label: 'Về trang chủ', to: '/' },
        }}
      />
    );
  }

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

  /*
    Màn chuyển tiếp giữa hai kỹ năng.

    Đồng hồ kỹ năng chỉ chạy sau khi bấm "Bắt đầu", nên thời gian đọc hướng dẫn
    hoặc nghỉ giữa hai kỹ năng không bị tính vào. Trước đây kỹ năng kế mở ngay
    lúc nộp kỹ năng trước, khiến giờ trôi trong khi học viên vẫn ở màn cũ.
  */
  if (isFullMock && !openProgress && pendingProgress && !isSubmitted) {
    const skill = skillNameOf(pendingProgress.componentCode);
    const doneCount = (attempt.componentProgress ?? []).filter((row) => row.submittedAt).length;
    const total = (attempt.componentProgress ?? []).length;

    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
        <section className="w-full rounded-2xl border border-[#e5decd] bg-white p-6 shadow-[0_12px_40px_rgba(44,38,24,.09)]">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            Bài thi Aptis · {doneCount}/{total} kỹ năng đã nộp
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Tiếp theo: {skill}</h1>
          <p className="mt-2 text-sm text-stone-600">
            Phần này làm trong{' '}
            <strong>{Math.round(pendingProgress.durationSeconds / 60)} phút</strong>. Đồng hồ bắt
            đầu chạy khi bạn bấm nút bên dưới.
          </p>
          <p className="mt-4 rounded-xl bg-[#fdf9ef] px-4 py-3 text-sm text-[#6f5716]">
            Nộp xong kỹ năng này sẽ không sửa hay xem lại được. Điểm của cả bài chỉ hiện sau khi
            hoàn thành đủ {total} kỹ năng.
          </p>
          <button
            type="button"
            onClick={() => beginComponentMutation.mutate(pendingProgress.componentId)}
            disabled={beginComponentMutation.isPending}
            className="btn-primary mt-5 w-full"
          >
            {beginComponentMutation.isPending ? 'Đang mở…' : `Bắt đầu ${skill}`}
          </button>
        </section>
      </div>
    );
  }

  const visibleParts = viewMode === 'all' ? partGroups : [currentPart];

  /** Luyện theo Part: lượt chỉ có một Part nên không cần lưới chọn Part. */
  const isSinglePartAttempt = partGroups.length === 1;
  // Ở chế độ từng bài, hiện một trang gồm tối đa SETS_PER_PAGE bộ của Part hiện
  // tại. currentSetIndex vẫn là chỉ số bộ (không phải chỉ số trang) để nút
  // "Chuyển nhanh" và dropdown chọn đề nhảy được tới đúng bộ.
  const setCount = currentPart.sets.length;
  const safeSetIndex = Math.min(currentSetIndex, Math.max(0, setCount - 1));
  const pageStart = Math.floor(safeSetIndex / setsPerPage) * setsPerPage;
  const pageSets = viewMode === 'single'
    ? currentPart.sets.slice(pageStart, pageStart + setsPerPage)
    : [];
  // Nút nộp riêng chỉ dùng được khi trang chỉ có một bộ; nhiều bộ thì mỗi bộ có
  // nút riêng bên trong thẻ của nó.
  const visibleSetOnly = pageSets.length === 1 ? pageSets[0] : undefined;
  const isFirstSetOverall = currentPartIndex === 0 && pageStart === 0;
  const isLastSetOverall =
    currentPartIndex === partGroups.length - 1 && pageStart + setsPerPage >= setCount;

  /**
   * Đang ở bộ cuối của Part cuối trong kỹ năng hiện tại (bài thi đủ 5 kỹ năng).
   * Lúc này hành động duy nhất là nộp kỹ năng.
   */
  const nextPartSameComponent = isFullMock
    && partGroups[currentPartIndex + 1] !== undefined
    && componentIdByPart.get(partGroups[currentPartIndex + 1]!.id)
      === componentIdByPart.get(currentPart.id);
  const atLastSetOfComponent = isFullMock
    && !nextPartSameComponent
    && pageStart + setsPerPage >= setCount;

  return (
    <div className="min-h-screen bg-[#f7f4eb] pb-24">
      <header className="sticky top-0 z-30 border-b border-[#e5decd] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-800 text-white shadow-sm"><HeadphoneIcon /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {componentName} · {isSinglePartAttempt ? currentPart.name : 'Bài test full'}
            </h1>
            <p className="text-[10px] text-stone-500">
              {totalItems} câu hỏi · đã trả lời {totalAnswered}/{totalItems}
              {isSinglePartAttempt && ` · sẵn sàng chấm ${currentPart.sets.filter((set) => set.status === 'SCORED').length}/${currentPart.sets.length}`}
            </p>
            <p className="text-[10px] text-stone-500">● Nội dung có bản quyền</p>
          </div>

          {secondsLeft !== null && (
            <span className={clsx('rounded-lg px-3 py-2 text-sm font-semibold tabular-nums', secondsLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-[#f2eee3] text-stone-800')} aria-label={`Thời gian còn lại ${formatDuration(secondsLeft)}`}>
              {openProgress && (
                <span className="mr-1.5 text-[10px] font-medium opacity-70">
                  {skillNameOf(openProgress.componentCode)}
                </span>
              )}
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

      <main className="mx-auto flex max-w-[1600px] items-start gap-4 px-3 py-4 sm:px-6">
        {!isSinglePartAttempt && (
          <ExamSidebar
            partGroups={partGroups}
            answeredByPart={answeredByPart}
            currentPartIndex={currentPartIndex}
            lockedFrom={isFullMock ? speakingStartIndex : undefined}
            partStateOf={isFullMock ? partStateOf : undefined}
            onPick={(index) => void goToPart(index)}
          />
        )}

        <div className="min-w-0 flex-1">
        {/*
          Luyện một Part: thẻ "Phần 1" không cho thêm thông tin gì (chỉ có đúng
          một Part), nên thay bằng danh sách đề để học viên chọn bài muốn làm.
          Bài test nhiều Part vẫn dùng lưới Part như cũ.
        */}
        {isSinglePartAttempt && isItemBank ? (
          // Part câu rời: không có chủ đề để chọn, chỉ cần biết đang ở câu nào.
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#cee1d9] bg-[linear-gradient(90deg,#e8f4ef_0%,#fffdf9_70%)] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-800 shadow-sm">
              <MicIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-brand-800">
                {currentPart.name}
              </p>
              <h3 className="text-sm font-semibold sm:text-base">
                Câu {pageStart + 1}
                {pageSets.length > 1 && `–${pageStart + pageSets.length}`}
                {' / '}{setCount}
              </h3>
              <p className="text-[10px] text-stone-500">
                Đã trả lời {answeredByPart.get(currentPart.id) ?? 0}/{currentPart.totalItems} câu
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-stone-600">
              Tới câu
              <input
                type="number"
                min={1}
                max={setCount}
                defaultValue={pageStart + 1}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  const value = Number((event.target as HTMLInputElement).value);
                  if (value >= 1 && value <= setCount) void goToSetIndex(value - 1);
                }}
                className="w-16 rounded-lg border border-[#ded5c2] px-2 py-1 text-xs tabular-nums"
                aria-label={`Nhảy tới câu, từ 1 đến ${setCount}`}
              />
            </label>
          </div>
        ) : isSinglePartAttempt ? (
          <SetPicker
            sets={currentPart.sets}
            currentIndex={safeSetIndex}
            partName={currentPart.name}
            setNumberById={setNumberById}
            responsesBySet={responsesBySet}
            flaggedItems={flaggedItems}
            onPick={(index) => void goToSetIndex(index)}
          />
        ) : (
          <nav className="grid gap-2 sm:grid-cols-2 lg:hidden" aria-label="Các Part trong bài thi">
            {partGroups.map((part, index) => {
              const answered = answeredByPart.get(part.id) ?? 0;
              const active = viewMode === 'part' && index === currentPartIndex;
              const locked = speakingLocked && index !== currentPartIndex;
              return (
                <button key={part.id} type="button" onClick={() => void goToPart(index)} disabled={locked} className={clsx('rounded-xl border bg-[#fffdf8] px-3 py-2.5 text-left transition', active ? 'border-brand-800 bg-[#eaf4ef] shadow-sm' : locked ? 'border-[#e3dac7] opacity-40' : 'border-[#e3dac7] hover:border-brand-300')} aria-current={active ? 'step' : undefined}>
                  <span className="block text-sm font-semibold">
                    {part.skill ? `${part.skill} · Phần ${part.number}` : `Phần ${part.number}`}
                  </span>
                  <span className="block text-[9px] font-semibold uppercase text-stone-500">{part.label}</span>
                  <span className="mt-2 block text-[10px] font-medium text-stone-600">{answered}/{part.totalItems}</span>
                  <span className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-[#d9d0bc]"><span className="block h-full bg-brand-700 transition-all" style={{ width: `${part.totalItems ? (answered / part.totalItems) * 100 : 0}%` }} /></span>
                </button>
              );
            })}
          </nav>
        )}

        {speakingLocked && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-900">
            <strong>Phần Nói tự chạy như đề thật.</strong> Máy tự bắt đầu ghi âm, hết giờ tự dừng
            rồi tự sang câu tiếp — bạn không cần bấm gì. Mỗi câu chỉ ghi một lần và không quay lại
            được.
          </p>
        )}

        <div className="mt-4 space-y-5">
          {visibleParts.map((part) => (
            <PartSection
              key={part.id}
              part={part}
              hideHeader={isSinglePartAttempt}
              visibleSetIds={viewMode === 'single'
                ? pageSets.map((set) => set.attemptQuestionSetId)
                : undefined}
              attemptId={attempt.id}
              responsesBySet={responsesBySet}
              // Kỹ năng đã nộp thì khóa hẳn, kể cả khi cả lượt chưa nộp.
              readOnly={readOnly || Boolean(progressOfPart(part)?.submittedAt)}
              isSubmitted={isSubmitted}
              flaggedItems={flaggedItems}
              setNumberById={setNumberById}
              examMode={speakingLocked}
              onExamFinished={handleExamAutoAdvance}
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
                  Bài {pageStart + 1}
                  {pageSets.length > 1 && `–${pageStart + pageSets.length}`}
                  /{setCount} · {currentPart.skill ? `${currentPart.skill} · ` : ''}Phần {currentPart.number}
                </span>
                {/*
                  Speaking tự chạy: máy tự ghi âm rồi tự sang câu — mọi nút điều
                  hướng đều thừa và gây hiểu nhầm là bấm được.

                  Kỹ năng khác: ở câu cuối chỉ còn một hành động là nộp kỹ năng,
                  nên bỏ "Chủ đề tiếp theo" (nó sẽ nhảy sang kỹ năng chưa mở).
                */}
                {!speakingLocked && (
                  <>
                    <button type="button" onClick={() => void goToSet(-1)} disabled={isFirstSetOverall} className="exam-footer-button">Chủ đề trước</button>
                    {!atLastSetOfComponent && (
                      <button type="button" onClick={() => void goToSet(1)} disabled={isLastSetOverall} className="exam-footer-button border-emerald-300 bg-[#e7f5ef] text-brand-900">Chủ đề tiếp theo</button>
                    )}
                  </>
                )}
                {/* Bài thi đủ 5 kỹ năng không chấm lẻ: điểm chỉ có khi nộp hết. */}
                {!readOnly && !isFullMock && visibleSetOnly && (
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
                      {scoreSetMutation.isPending ? 'Đang chấm…' : 'Nộp bài chủ đề này'}
                    </button>
                  )
                )}
              </>
            ) : (
              /* Speaking tự chạy: không có nút chuyển Part. */
              !speakingLocked && (
                <>
                  <button type="button" onClick={() => void goToPart(currentPartIndex - 1)} disabled={viewMode === 'all' || currentPartIndex === 0} className="exam-footer-button">Phần trước</button>
                  <button type="button" onClick={() => void goToPart(currentPartIndex + 1)} disabled={viewMode === 'all' || currentPartIndex === partGroups.length - 1} className="exam-footer-button border-emerald-300 bg-[#e7f5ef] text-brand-900">Phần tiếp</button>
                </>
              )
            )}
            {readOnly ? (
              <button type="button" onClick={() => navigate(`/attempts/${attempt.id}/result`)} className="rounded-lg bg-brand-800 px-4 py-2.5 text-xs font-semibold text-white">Xem kết quả</button>
            ) : isFullMock ? (
              /*
                Thi đủ 5 kỹ năng: nộp theo TỪNG kỹ năng, không nộp cả bài giữa
                chừng. Nói tự nộp khi ghi xong câu cuối nên không có nút.
              */
              openProgress && !speakingLocked && !currentComponentSubmitted && (
                <button
                  type="button"
                  onClick={submitCurrentComponent}
                  disabled={submitComponentMutation.isPending}
                  className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {submitComponentMutation.isPending
                    ? 'Đang nộp…'
                    : `Nộp kỹ năng ${skillNameOf(openProgress.componentCode)}`}
                </button>
              )
            ) : (
              <button type="button" onClick={submitAttempt} disabled={submitMutation.isPending} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">{submitMutation.isPending
                  ? 'Đang nộp…'
                  : needsAiScoring ? 'Nộp toàn bộ · AI chấm' : 'Nộp toàn bộ'}</button>
            )}
          </div>
        </div>

        {scoreSetMutation.error && <div className="mt-4"><ErrorBlock message={scoreSetMutation.error instanceof ApiError ? scoreSetMutation.error.message : 'Không chấm được bài này'} /></div>}
        {submitMutation.error && <div className="mt-4"><ErrorBlock message={submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Không nộp được bài'} /></div>}
        </div>
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

/** Đề được coi là "nhiều lửa" khi biên tập viên đặt độ hot từ mức này trở lên. */
const HOT_THRESHOLD = 4;

function SetPicker({ sets, currentIndex, partName, setNumberById, responsesBySet, flaggedItems, onPick }: {
  sets: AttemptQuestionSet[];
  currentIndex: number;
  partName: string;
  setNumberById: Map<string, number>;
  responsesBySet: Record<string, ResponseMap>;
  flaggedItems: Set<string>;
  onPick: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  /** 'all' | 'hot' | năm (ví dụ '2026') */
  const [filter, setFilter] = useState<string>('all');
  const [jumpTo, setJumpTo] = useState('');
  const current = sets[currentIndex];

  /**
   * Nhãn của một bộ trong danh sách chọn đề: ưu tiên tên chủ đề thật, chỉ đánh
   * số khi title không nói lên nội dung gì (xem isMeaningfulTitle).
   */
  const labelOf = (set: AttemptQuestionSet, index: number) => {
    const title = set.content.title?.trim();
    return title && isMeaningfulTitle(title) ? title : `Đề ${index + 1}`;
  };

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
  const flaggedCount = sets.filter((set) =>
    set.content.items.some((item) => flaggedItems.has(`${set.attemptQuestionSetId}:${item.id}`)),
  ).length;

  // Năm ra thi lấy từ cột exam_year của bộ đề. Trước đây dò chuỗi "(2026)" trong
  // tiêu đề, nên chỉ chạy nếu biên tập viên nhớ gõ năm vào tên đề.
  const yearOf = (set: AttemptQuestionSet) =>
    set.examYear == null ? undefined : String(set.examYear);
  const years = Array.from(new Set(sets.map(yearOf).filter(Boolean) as string[])).sort();
  const hotCount = sets.filter((set) => (set.hotness ?? 0) >= HOT_THRESHOLD).length;

  const matchesFilter = (set: AttemptQuestionSet) => {
    if (filter === 'all') return true;
    if (filter === 'hot') return (set.hotness ?? 0) >= HOT_THRESHOLD;
    return yearOf(set) === filter;
  };

  // Giữ index gốc khi lọc, nếu không "Đề N/M" sẽ lệch so với danh sách thật.
  const visibleSets = sets
    .map((set, index) => ({ set, index }))
    .filter(({ set }) => matchesFilter(set));

  const currentProgress = current
    ? countAnswered(current.content.items, responsesBySet[current.attemptQuestionSetId] ?? {})
    : 0;
  const currentTotal = current?.content.items.length ?? 0;

  const jump = () => {
    const target = Number(jumpTo);
    if (!Number.isInteger(target) || target < 1 || target > sets.length) return;
    onPick(target - 1);
    setJumpTo('');
  };

  return (
    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
      {/* Thẻ chủ đề đang mở: tên, vị trí, tiến độ, số lửa */}
      {current && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#cee1d9] bg-[linear-gradient(90deg,#e8f4ef_0%,#fffdf9_70%)] px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-800 shadow-sm">
            <MicIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Chủ đề · {partName}
            </p>
            <h3 className="truncate text-sm font-semibold sm:text-base">
              {labelOf(current, currentIndex)}
              {(current.hotness ?? 0) >= HOT_THRESHOLD && (
                <span className="ml-1.5">{'🔥'.repeat(current.hotness ?? 0)}</span>
              )}
            </h3>
            <p className="text-[10px] text-stone-500">
              Chủ đề {currentIndex + 1} / {sets.length} · {currentTotal} câu nói
            </p>
          </div>

          <div className="min-w-40 flex-1">
            <div className="flex items-center justify-between text-[10px] text-stone-500">
              <span>Tiến độ chủ đề</span>
              <span className="font-semibold tabular-nums">{currentProgress} / {currentTotal} câu</span>
            </div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#d9d0bc]">
              <span
                className="block h-full bg-brand-700 transition-all"
                style={{ width: `${currentTotal ? (currentProgress / currentTotal) * 100 : 0}%` }}
              />
            </span>
          </div>

          <span className="shrink-0 rounded-lg border border-[#cee1d9] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase text-brand-800">
            {doneCount} sẵn sàng
          </span>
          <span className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase text-amber-700">
            {flaggedCount} đánh dấu
          </span>
        </div>
      )}

      {/* Hàng lọc + chuyển nhanh */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#e3dac7] bg-[#fffdf8] px-3 py-2.5">
        <span className="text-[10px] font-medium text-stone-500">Lọc chủ đề</span>
        <FilterChip label="Tất cả" count={sets.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {years.map((year) => (
          <FilterChip
            key={year}
            label={year}
            count={sets.filter((set) => yearOf(set) === year).length}
            active={filter === year}
            onClick={() => setFilter(year)}
          />
        ))}
        {hotCount > 0 && (
          <FilterChip label="Nhiều lửa" count={hotCount} active={filter === 'hot'} onClick={() => setFilter('hot')} />
        )}

        <div className="ml-auto flex items-end gap-2">
          <label className="text-[10px] font-medium text-stone-500">
            <span className="mb-1 block">Chuyển nhanh</span>
            <input
              type="number"
              min={1}
              max={sets.length}
              value={jumpTo}
              onChange={(event) => setJumpTo(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') jump(); }}
              placeholder={String(currentIndex + 1)}
              className="input w-24 py-1.5 text-xs"
              aria-label={`Nhảy tới chủ đề, từ 1 đến ${sets.length}`}
            />
          </label>
          <button type="button" onClick={jump} disabled={!jumpTo} className="rounded-lg bg-brand-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
            Đi
          </button>
        </div>
      </div>

      <div className="relative">
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
            {(current?.hotness ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] leading-none" title={`Độ hot ${current?.hotness}/5`}>
                {'🔥'.repeat(current?.hotness ?? 0)}
              </span>
            )}
          </span>
          <span className="block text-[10px] text-stone-500">
            Chủ đề đang mở · {currentIndex + 1}/{sets.length}
            {filter !== 'all' && ` · đang lọc: ${visibleSets.length} đề`}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-brand-800">
          Chọn chủ đề <span aria-hidden="true">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-[#ded5c2] bg-white p-1 shadow-[0_12px_32px_rgba(43,39,30,.16)]"
        >
          {visibleSets.map(({ set, index }) => {
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
                  {(set.hotness ?? 0) > 0 && (
                    <span
                      className="shrink-0 text-[10px] leading-none"
                      title={`Độ hot ${set.hotness}/5`}
                    >
                      {'🔥'.repeat(set.hotness ?? 0)}
                    </span>
                  )}
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
    </div>
  );
}

/**
 * Badge thời lượng và số từ yêu cầu, đọc từ constraints của câu hỏi.
 * Chỉ hiện với dạng có giới hạn thời gian nói/viết (Speaking, Writing).
 */
function ItemMetaBadge({ item }: { item: QuestionItem }) {
  const seconds = item.constraints?.responseSeconds;
  const minWords = item.constraints?.minWords;
  const maxWords = item.constraints?.maxWords;

  if (typeof seconds !== 'number') return null;

  return (
    <span className="shrink-0 rounded-full bg-[#eef6f2] px-2 py-1 font-mono text-[10px] text-brand-800">
      ● {formatDuration(seconds)}
      {typeof minWords === 'number' && typeof maxWords === 'number' && ` · ${minWords}–${maxWords} từ`}
    </span>
  );
}

/** Chip lọc chủ đề, hiện kèm số lượng đề khớp. */
function FilterChip({ label, count, active, onClick }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand-800 bg-brand-800 text-white'
          : 'border-[#ded5c2] bg-white text-stone-600 hover:border-brand-300',
      )}
    >
      {active && <span aria-hidden="true">✓</span>}
      {label}
      <span className={clsx('tabular-nums', active ? 'text-white/70' : 'text-stone-400')}>{count}</span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </svg>
  );
}

function PartSection({ part, hideHeader, visibleSetIds, attemptId, responsesBySet, readOnly, isSubmitted, flaggedItems, setNumberById, examMode, onExamFinished, onToggleFlag, onItemChange }: {
  part: PartGroup;
  /** Speaking bài full: tự chạy, ghi một lần, không nghe lại. */
  examMode?: boolean;
  onExamFinished?: () => void;
  /** Ẩn tiêu đề Part: khi luyện một Part, dropdown chọn đề đã nói đủ. */
  hideHeader?: boolean;
  /** Chỉ render bộ này (chế độ từng bài); bỏ trống thì render cả Part. */
  /** undefined = hiện hết; mảng = chỉ hiện các bộ có id trong đó. */
  visibleSetIds?: string[];
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
  const visibleSets = visibleSetIds
    ? part.sets.filter((set) => visibleSetIds.includes(set.attemptQuestionSetId))
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
            <h2 id={`part-title-${part.id}`} className="text-base font-semibold sm:text-lg">
              {part.skill ? `${part.skill} · ` : ''}Phần {part.number} – {part.name}
            </h2>
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
            examMode={examMode}
            onExamFinished={onExamFinished}
            onToggleFlag={onToggleFlag}
            onItemChange={(itemId, draft) => onItemChange(set, itemId, draft)}
          />
        ))}
      </div>
    </section>
  );
}

function QuestionSetBlock({ set, setNumber, attemptId, responses, readOnly, isSubmitted, flaggedItems, examMode, onExamFinished, onToggleFlag, onItemChange }: {
  set: AttemptQuestionSet;
  examMode?: boolean;
  onExamFinished?: () => void;
  setNumber: number;
  attemptId: string;
  responses: ResponseMap;
  readOnly: boolean;
  isSubmitted: boolean;
  flaggedItems: Set<string>;
  onToggleFlag: (key: string) => void;
  onItemChange: (itemId: string, draft: ResponseDraft) => void;
}) {
  // Ảnh và audio dùng chung phải tách riêng: Speaking Part 2 đưa một ẢNH rồi hỏi
  // 3 câu, còn Listening đưa audio. Trước đây mọi asset không phải ITEM_AUDIO
  // đều bị đẩy vào AudioPlayer, nên ảnh không hiện ra.
  const sharedAssets = set.content.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:'));
  const sharedImages = sharedAssets.filter((asset) => asset.role.endsWith('IMAGE'));
  const commonAssets = sharedAssets.filter((asset) => !asset.role.endsWith('IMAGE'));

  // Chỉ hiện tiêu đề chung khi các câu thực sự dùng chung một ngữ liệu (audio,
  // ảnh hoặc đoạn đọc). Speaking Part 1 gộp nhiều câu độc lập, title của bộ chỉ
  // là câu hỏi đầu tiên nên hiện lên sẽ gây hiểu nhầm đó là chủ đề chung.
  const hasSharedStimulus =
    sharedAssets.length > 0 || Boolean(set.content.stimulus?.value);
  const showTopic = Boolean(set.content.title) && hasSharedStimulus;
  const topicLabel = commonAssets.length > 0
    ? 'Chủ đề · Bài nghe'
    : sharedImages.length > 0 ? 'Chủ đề · Ảnh' : 'Chủ đề';

  /**
   * Chế độ thi Speaking: mỗi lúc chỉ một câu.
   *
   * Một bộ Speaking chứa nhiều câu (Part 1 gộp 3 câu, Part 2/3 mỗi bộ 3 câu).
   * Render cả bộ thì ba micro cùng bật một lúc — sai hoàn toàn so với đề thật,
   * ở đó đọc xong câu nào mới hiện câu đó rồi mới ghi âm.
   *
   * Câu đang tới lượt = câu đầu tiên chưa có bản ghi. Các câu trước đã xong nên
   * ẩn đi, câu sau chưa được thấy trước.
   */
  const visibleItems = (() => {
    if (!examMode) return set.content.items;
    const pending = set.content.items.find(
      (item) => !responses[item.id]?.recordingAssetId,
    );
    // Ghi xong hết thì giữ câu cuối trên màn hình cho tới khi chuyển bộ.
    return [pending ?? set.content.items[set.content.items.length - 1]].filter(
      (item): item is QuestionItem => Boolean(item),
    );
  })();

  return (
    <div className="space-y-3">
      {(showTopic || set.content.instructions || set.content.stimulus?.value || sharedAssets.length > 0) && (
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
          {sharedImages.length > 0 && <div className="mb-3"><ImageViewer assets={sharedImages} /></div>}
          {commonAssets.length > 0 && <AudioPlayer assets={commonAssets} maxAudioPlays={set.maxAudioPlays} initialPlayCount={set.audioPlayCount} disabled={readOnly} />}
        </div>
      )}

      {visibleItems.map((item) => {
        const itemIndex = set.content.items.indexOf(item);
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
            examMode={examMode}
            onExamFinished={onExamFinished}
            onToggleFlag={() => onToggleFlag(itemKey)}
            onChange={(draft) => onItemChange(item.id, draft)}
          />
        );
      })}
    </div>
  );
}

function QuestionCard({ item, numberLabel, itemAudio, set, attemptId, draft, readOnly, isSubmitted, flagged, examMode, onExamFinished, onToggleFlag, onChange }: {
  item: QuestionItem;
  examMode?: boolean;
  onExamFinished?: () => void;
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
        <ItemMetaBadge item={item} />
        {item.prompt?.value ? <div className="question-content min-w-0 flex-1 pt-1 text-xs font-medium sm:text-[13px]" dangerouslySetInnerHTML={{ __html: item.prompt.value }} /> : <span className="flex-1" />}
        <button type="button" onClick={onToggleFlag} className={clsx('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold transition sm:text-xs', flagged ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-[#d9cdb4] bg-white text-stone-600 hover:border-amber-400')} aria-pressed={flagged}><FlagIcon /> {flagged ? 'Đã đánh dấu' : 'Đánh dấu'}</button>
      </div>

      {itemAudio.length > 0 && <div className="mt-3"><AudioPlayer assets={itemAudio} maxAudioPlays={set.maxAudioPlays} initialPlayCount={0} disabled={readOnly} /></div>}

      <div className="mt-3">
        <ItemRenderer
          item={item}
          sections={set.content.sections}
          attemptId={attemptId}
          questionSetId={set.questionSetId}
          draft={draft}
          disabled={readOnly || revealed}
          showAnswer={revealed}
          choiceMode={set.content.taskTypeCode === 'SPEAKER_MATCHING' ? 'select' : 'cards'}
          examMode={examMode}
          onExamFinished={onExamFinished}
          onChange={onChange}
        />
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

/**
 * Title có phải tên chủ đề đọc được không.
 *
 * Một số Part seed title chỉ là số thứ tự — Reading Part 1 dùng "001", Listening
 * Part 1 dùng "Listening Part 1 - 001". Hiện nguyên những chuỗi đó trong danh
 * sách chọn đề thì vô nghĩa, nên rơi về "Đề N" cho thống nhất.
 */
function isMeaningfulTitle(title: string) {
  const withoutOrdinal = title.replace(/^.*?[-–]\s*/, '').trim();
  // Chỉ còn chữ số (001, 12) hoặc rỗng => là số thứ tự, không phải tên chủ đề.
  return !/^\d+$/.test(withoutOrdinal) && !/^\d+$/.test(title);
}

/**
 * Thứ tự thi thật trên máy: Speaking → Listening → Core → Reading → Writing.
 * Speaking làm trước tiên (cần micro), sau đó mới tới các phần còn lại.
 *
 * Thời lượng: Speaking 12', Listening 40', Core 25', Reading 35', Writing 50'.
 */
const COMPONENT_ORDER = ['SPEAKING', 'LISTENING', 'GRAMMAR_VOCABULARY', 'READING', 'WRITING'];

const COMPONENT_LABEL_VI: Record<string, string> = {
  GRAMMAR_VOCABULARY: 'Ngữ pháp & Từ vựng',
  READING: 'Đọc',
  LISTENING: 'Nghe',
  SPEAKING: 'Nói',
  WRITING: 'Viết',
};

function buildPartGroups(questionSets: AttemptQuestionSet[], parts: PartSummary[], componentCode: string): PartGroup[] {
  const partById = new Map(parts.map((part) => [part.id, part]));
  const grouped = new Map<string, AttemptQuestionSet[]>();
  for (const set of [...questionSets].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const partId = set.content.partId;
    grouped.set(partId, [...(grouped.get(partId) ?? []), set]);
  }

  // displayOrder của Part chỉ là thứ tự TRONG kỹ năng, nên Reading Part 1 và
  // Listening Part 1 đều bằng 1. Phải xếp theo kỹ năng trước, Part sau.
  const entries = Array.from(grouped.entries()).sort(([leftId], [rightId]) => {
    const left = partById.get(leftId);
    const right = partById.get(rightId);
    const byComponent = componentRank(left) - componentRank(right);
    if (byComponent !== 0) return byComponent;
    return (left?.displayOrder ?? Number.MAX_SAFE_INTEGER)
      - (right?.displayOrder ?? Number.MAX_SAFE_INTEGER);
  });

  const singleComponent = new Set(
    entries.map(([partId]) => partById.get(partId)?.componentCode).filter(Boolean),
  ).size <= 1;

  return entries.map(([partId, sets], index) => {
    const metadata = partById.get(partId);
    const listening = (metadata?.componentCode ?? componentCode).toUpperCase().includes('LISTEN');
    // Lượt luyện riêng một Part chỉ tạo một group nên `index` luôn bằng 0.
    // Dùng displayOrder thật của Part để Listening Part 2 không bị gắn nhãn Part 1.
    const presetIndex = metadata == null ? index : metadata.displayOrder - 1;
    const preset = listening ? LISTENING_PARTS[presetIndex] : undefined;
    // Bài thi nhiều kỹ năng phải đánh số lại theo từng kỹ năng, nếu không sẽ ra
    // "Phần 16" — Aptis không có Part 16.
    const number = singleComponent || metadata == null ? index + 1 : metadata.displayOrder;
    const skill = metadata?.componentCode
      ? COMPONENT_LABEL_VI[metadata.componentCode.toUpperCase()] ?? metadata.componentCode
      : undefined;
    return {
      id: partId,
      number,
      name: preset?.name ?? metadata?.name ?? `Part ${index + 1}`,
      label: singleComponent || !skill
        ? preset?.label ?? metadata?.code ?? `PART ${index + 1}`
        : `${skill.toUpperCase()} · PHẦN ${metadata!.displayOrder}`,
      skill: singleComponent ? undefined : skill,
      instruction: preset?.instruction ?? metadata?.instructions ?? metadata?.description ?? 'Hoàn thành lần lượt các câu hỏi trong phần này.',
      sets,
      totalItems: sets.reduce((sum, set) => sum + set.content.items.length, 0),
    };
  });
}

/**
 * Cột điều hướng của bài thi nhiều kỹ năng.
 *
 * Lưới thẻ ngang chiếm gần hết màn khi có 18 Part, nên gom theo kỹ năng và đặt
 * dọc bên trái để luôn thấy mình đang ở đâu và còn phần nào chưa làm.
 */
function ExamSidebar({
  partGroups,
  answeredByPart,
  currentPartIndex,
  lockedFrom,
  partStateOf,
  onPick,
}: {
  partGroups: PartGroup[];
  answeredByPart: Map<string, number>;
  currentPartIndex: number;
  /** Từ chỉ số này trở đi không cho quay lại phần trước (Speaking bài full). */
  lockedFrom?: number;
  /**
   * Trạng thái kỹ năng chứa Part này trong bài thi đủ 5 kỹ năng:
   * đã nộp / đang làm / chưa tới lượt. Bỏ trống = không giới hạn.
   */
  partStateOf?: (part: PartGroup) => 'submitted' | 'open' | 'pending';
  onPick: (index: number) => void;
}) {
  // Giữ nguyên thứ tự đã sắp ở buildPartGroups — chỉ chèn tiêu đề khi đổi kỹ năng.
  const skills: { skill: string; parts: { part: PartGroup; index: number }[] }[] = [];
  partGroups.forEach((part, index) => {
    const skill = part.skill ?? 'Bài thi';
    const last = skills[skills.length - 1];
    if (last && last.skill === skill) last.parts.push({ part, index });
    else skills.push({ skill, parts: [{ part, index }] });
  });

  const doneCount = partGroups.filter(
    (part) => (answeredByPart.get(part.id) ?? 0) >= part.totalItems && part.totalItems > 0,
  ).length;

  return (
    <nav
      aria-label="Các phần trong bài thi"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-60 shrink-0 overflow-y-auto rounded-xl border border-[#e3dac7] bg-[#fffdf8] p-3 lg:block"
    >
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-stone-500">
        Tiến độ · {doneCount}/{partGroups.length} phần
      </p>

      {skills.map((group) => (
        <div key={group.skill} className="mb-3 last:mb-0">
          <p className="px-1 pb-1 text-[11px] font-semibold text-brand-800">{group.skill}</p>
          <ul className="space-y-0.5">
            {group.parts.map(({ part, index }) => {
              const answered = answeredByPart.get(part.id) ?? 0;
              const done = part.totalItems > 0 && answered >= part.totalItems;
              const active = index === currentPartIndex;
              // Đã vào Speaking của bài full thì mọi phần trước đó bị khoá.
              const speakingLock = lockedFrom !== undefined
                && currentPartIndex >= lockedFrom
                && index !== currentPartIndex;
              // Kỹ năng đã nộp hoặc chưa tới lượt: không bấm vào được.
              const state = partStateOf?.(part) ?? 'open';
              const locked = speakingLock || state !== 'open';
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => onPick(index)}
                    disabled={locked}
                    title={locked ? 'Phần Nói chạy một chiều, không quay lại được' : undefined}
                    aria-current={active ? 'step' : undefined}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition',
                      active
                        ? 'bg-[#eaf4ef] font-semibold text-brand-900'
                        : locked
                          ? 'cursor-not-allowed text-stone-400'
                          : 'text-stone-700 hover:bg-[#f3efe4]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold',
                        done
                          ? 'bg-brand-700 text-white'
                          : answered > 0
                            ? 'border-2 border-brand-600 bg-white text-brand-800'
                            : 'border border-[#cfc6b2] bg-white text-transparent',
                      )}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      Phần {part.number}
                      {state === 'submitted' && (
                        <span className="ml-1 text-[9px] font-semibold text-brand-700">đã nộp</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-stone-500">
                      {answered}/{part.totalItems}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Mã kỹ năng -> tên tiếng Việt để hiện trên nút và thông báo. */
function skillNameOf(componentCode: string): string {
  return COMPONENT_LABEL_VI[componentCode.toUpperCase()] ?? componentCode;
}

function componentRank(part: PartSummary | undefined): number {
  if (!part) return Number.MAX_SAFE_INTEGER;
  const rank = COMPONENT_ORDER.indexOf(part.componentCode.toUpperCase());
  return rank === -1 ? COMPONENT_ORDER.length : rank;
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
