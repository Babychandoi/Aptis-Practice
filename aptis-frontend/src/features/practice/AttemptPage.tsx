import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { AudioPlayer } from '@/features/practice/AudioPlayer';
import { ItemRenderer } from '@/features/practice/renderers/ItemRenderer';
import { useAttemptTimer } from '@/features/practice/useAttemptTimer';
import { useAutosave } from '@/features/practice/useAutosave';
import {
  countAnswered,
  hydrateResponses,
  toPayload,
  type ResponseDraft,
  type ResponseMap,
} from '@/features/practice/responseState';
import { formatDuration } from '@/lib/format';

export function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  // Câu trả lời của mọi bộ câu hỏi, khóa theo attemptQuestionSetId
  const [responsesBySet, setResponsesBySet] = useState<Record<string, ResponseMap>>({});
  const [startedAtMs] = useState(() => Date.now());

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => practiceApi.getAttempt(attemptId!),
    enabled: Boolean(attemptId),
    // Nội dung là snapshot bất biến, không cần refetch
    staleTime: Infinity,
  });

  const attempt = attemptQuery.data;
  const isSubmitted =
    attempt !== undefined &&
    ['SUBMITTED', 'SCORING', 'COMPLETED'].includes(attempt.status);
  const readOnly = isSubmitted || attempt?.status === 'EXPIRED';

  const autosave = useAutosave(attemptId ?? '', !readOnly);

  // Nạp câu trả lời đã lưu để tiếp tục bài đang làm dở
  useEffect(() => {
    if (!attempt) return;

    setResponsesBySet((existing) => {
      if (Object.keys(existing).length > 0) return existing;

      const hydrated: Record<string, ResponseMap> = {};
      for (const set of attempt.questionSets) {
        hydrated[set.attemptQuestionSetId] = hydrateResponses(set.savedResponse);
      }
      return hydrated;
    });
  }, [attempt]);

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
    // Hết giờ: nộp luôn để không mất bài
    if (!submitMutation.isPending && !readOnly) {
      submitMutation.mutate();
    }
  }, [submitMutation, readOnly]);

  const secondsLeft = useAttemptTimer(
    readOnly ? null : (attempt?.expiresAt ?? null),
    handleExpire,
  );

  const currentSet = attempt?.questionSets[currentIndex];
  const currentResponses = currentSet
    ? (responsesBySet[currentSet.attemptQuestionSetId] ?? {})
    : {};

  const answeredCount = useMemo(
    () =>
      currentSet ? countAnswered(currentSet.content.items, currentResponses) : 0,
    [currentSet, currentResponses],
  );

  const handleItemChange = (itemId: string, draft: ResponseDraft) => {
    if (!currentSet || readOnly) return;

    const setId = currentSet.attemptQuestionSetId;
    const nextResponses: ResponseMap = { ...currentResponses, [itemId]: draft };
    setResponsesBySet((prev) => ({ ...prev, [setId]: nextResponses }));

    autosave.schedule(
      currentSet.questionSetId,
      toPayload(currentSet.content.items, nextResponses),
      Math.round((Date.now() - startedAtMs) / 1000),
    );
  };

  const goToSet = async (index: number) => {
    // Lưu trước khi chuyển để không mất câu trả lời chưa debounce xong
    await autosave.flush();
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (attemptQuery.isLoading) {
    return <LoadingBlock label="Đang tải bài luyện…" />;
  }

  if (attemptQuery.error) {
    const error = attemptQuery.error;
    if (error instanceof ApiError && error.isPremiumRequired) {
      return <PremiumGate />;
    }
    return (
      <ErrorBlock
        message="Không tải được bài luyện"
        onRetry={() => void attemptQuery.refetch()}
      />
    );
  }

  if (!attempt || !currentSet) {
    return <ErrorBlock message="Bài luyện không có nội dung" />;
  }

  // Chưa bắt đầu: hiện màn hình hướng dẫn để học viên chủ động khởi động timer
  if (attempt.status === 'CREATED') {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card">
          <h1 className="text-xl font-semibold">Sẵn sàng làm bài</h1>
          <p className="mt-2 text-sm text-slate-600">
            {attempt.questionSets.length} bộ câu hỏi · {attempt.totalItems} câu
            {attempt.durationSeconds
              ? ` · Thời gian ${Math.round(attempt.durationSeconds / 60)} phút`
              : ' · Không giới hạn thời gian'}
          </p>
          {attempt.durationSeconds && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Đồng hồ bắt đầu chạy ngay khi bạn bấm Bắt đầu.
            </p>
          )}
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="btn-primary mt-4 w-full"
          >
            {startMutation.isPending ? 'Đang bắt đầu…' : 'Bắt đầu làm bài'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh trạng thái: timer, tiến độ, autosave */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium">
              Bộ {currentIndex + 1}/{attempt.questionSets.length}
              <span className="ml-2 font-normal text-slate-500">
                {answeredCount}/{currentSet.content.items.length} câu đã trả lời
              </span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{
                  width: `${((currentIndex + 1) / attempt.questionSets.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {secondsLeft !== null && (
            <div
              className={clsx(
                'shrink-0 rounded-lg px-3 py-1.5 text-lg font-semibold tabular-nums',
                secondsLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700',
              )}
            >
              {formatDuration(secondsLeft)}
            </div>
          )}

          <span className="w-20 shrink-0 text-right text-xs text-slate-500">
            {autosave.state === 'saving' && 'Đang lưu…'}
            {autosave.state === 'saved' && '✓ Đã lưu'}
            {autosave.state === 'error' && <span className="text-red-600">Lỗi lưu</span>}
          </span>
        </div>
      </div>

      {/* Điều hướng nhanh giữa các bộ câu hỏi */}
      {attempt.questionSets.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {attempt.questionSets.map((set, index) => {
            const setResponses = responsesBySet[set.attemptQuestionSetId] ?? {};
            const done = countAnswered(set.content.items, setResponses);
            const complete = done === set.content.items.length && done > 0;

            return (
              <button
                key={set.attemptQuestionSetId}
                type="button"
                onClick={() => void goToSet(index)}
                className={clsx(
                  'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                  index === currentIndex && 'ring-2 ring-brand-500',
                  complete
                    ? 'bg-brand-600 text-white'
                    : done > 0
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Nội dung bộ câu hỏi hiện tại */}
      <article className="card space-y-4">
        {currentSet.content.instructions && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {currentSet.content.instructions}
          </p>
        )}

        {currentSet.content.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:')).length > 0 && (
          <AudioPlayer
            assets={currentSet.content.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:'))}
            maxAudioPlays={currentSet.maxAudioPlays}
            initialPlayCount={currentSet.audioPlayCount}
            disabled={readOnly}
          />
        )}

        {currentSet.content.stimulus?.value && (
          <div
            className="question-content rounded-lg bg-slate-50 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: currentSet.content.stimulus.value }}
          />
        )}

        <div className="space-y-6">
          {currentSet.content.items.map((item) => {
            const itemAudio = currentSet.content.assets.filter((asset) => asset.role === `ITEM_AUDIO:${item.id}`);
            return <div key={item.id} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
              {itemAudio.length > 0 && (
                <AudioPlayer assets={itemAudio} maxAudioPlays={currentSet.maxAudioPlays} initialPlayCount={0} disabled={readOnly} />
              )}
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-400">
                  {item.sequenceNo}.
                </span>
                {item.prompt?.value && (
                  <div
                    className="question-content flex-1 text-sm font-medium"
                    dangerouslySetInnerHTML={{ __html: item.prompt.value }}
                  />
                )}
              </div>

              <ItemRenderer
                item={item}
                sections={currentSet.content.sections}
                attemptId={attempt.id}
                questionSetId={currentSet.questionSetId}
                draft={currentResponses[item.id] ?? {}}
                disabled={readOnly}
                showAnswer={isSubmitted}
                onChange={(draft) => handleItemChange(item.id, draft)}
              />

              {isSubmitted && item.explanation?.value && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                    Giải thích
                  </p>
                  <div
                    className="question-content text-sm"
                    dangerouslySetInnerHTML={{ __html: item.explanation.value }}
                  />
                </div>
              )}
            </div>;
          })}
        </div>
      </article>

      {/* Điều hướng và nộp bài */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void goToSet(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="btn-secondary"
        >
          ← Bộ trước
        </button>

        {currentIndex < attempt.questionSets.length - 1 ? (
          <button
            type="button"
            onClick={() => void goToSet(currentIndex + 1)}
            className="btn-primary flex-1"
          >
            Bộ tiếp theo →
          </button>
        ) : readOnly ? (
          <button
            type="button"
            onClick={() => navigate(`/attempts/${attempt.id}/result`)}
            className="btn-primary flex-1"
          >
            Xem kết quả
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="btn-primary flex-1"
          >
            {submitMutation.isPending ? 'Đang nộp…' : 'Nộp bài'}
          </button>
        )}
      </div>

      {submitMutation.error && (
        <ErrorBlock
          message={
            submitMutation.error instanceof ApiError
              ? submitMutation.error.message
              : 'Không nộp được bài'
          }
        />
      )}
    </div>
  );
}
