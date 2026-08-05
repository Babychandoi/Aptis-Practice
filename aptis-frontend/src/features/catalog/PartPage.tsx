import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useComponents, useExamVersions, usePart, useParts } from '@/features/catalog/catalogQueries';
import { findComponentBySlug, findPartBySlug } from '@/features/catalog/catalogRoutes';

const MAX_PART_QUESTION_SETS = 50;

export function PartPage() {
  const { partId, componentSlug, partSlug } = useParams<{
    partId?: string;
    componentSlug?: string;
    partSlug?: string;
  }>();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const semanticComponent = componentSlug
    ? findComponentBySlug(componentsQuery.data ?? [], componentSlug)
    : undefined;
  const partsQuery = useParts(semanticComponent?.id);
  const semanticPart = partSlug ? findPartBySlug(partsQuery.data ?? [], partSlug) : undefined;
  const resolvedPartId = partId ?? semanticPart?.id;
  const partQuery = usePart(resolvedPartId);

  const createAttempt = useMutation({
    mutationFn: async () => {
      const attempt = await practiceApi.createPartAttempt({
        partId: resolvedPartId!,
        questionSetCount: Math.min(
          Math.max(partQuery.data?.publishedQuestionSetCount ?? 1, 1),
          MAX_PART_QUESTION_SETS,
        ),
        onlyNew: false,
        onlyIncorrect: false,
        timed: false,
      });
      await practiceApi.start(attempt.id);
      return attempt;
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`, { replace: true }),
  });

  useEffect(() => {
    if (!resolvedPartId || !partQuery.data || partQuery.data.publishedQuestionSetCount === 0 || startedRef.current) return;
    startedRef.current = true;
    createAttempt.mutate();
  }, [resolvedPartId, partQuery.data]);

  const loading = versionsQuery.isLoading
    || componentsQuery.isLoading
    || Boolean(componentSlug && partsQuery.isLoading)
    || partQuery.isLoading;
  const loadError = versionsQuery.error || componentsQuery.error || partsQuery.error || partQuery.error;

  if (loading) return <LoadingBlock label="Đang mở bài luyện…" />;

  if (loadError || !partQuery.data) {
    return <ErrorBlock message="Không tải được Part này" onRetry={() => void partQuery.refetch()} />;
  }

  if (partQuery.data.publishedQuestionSetCount === 0) {
    return (
      <div className="space-y-4">
        <ErrorBlock message="Part này chưa có bài nào được phát hành." />
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  if (createAttempt.error instanceof ApiError && createAttempt.error.isPremiumRequired) {
    return (
      <div className="space-y-4">
        <PremiumGate message="Các bài trong Part này cần gói Premium." />
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  if (createAttempt.error) {
    const message = createAttempt.error instanceof ApiError
      ? createAttempt.error.code === 'NOT_ENOUGH_QUESTION_SETS'
        ? 'Part này hiện chưa có bài phù hợp để luyện.'
        : createAttempt.error.message
      : 'Không tạo được lượt luyện.';

    return (
      <div className="space-y-4">
        <ErrorBlock
          message={message}
          onRetry={() => {
            startedRef.current = true;
            createAttempt.mutate();
          }}
        />
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <LoadingIcon />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-stone-900">Đang mở {partQuery.data.name}</h1>
      <p className="mt-2 text-sm text-stone-500">Hệ thống đang sắp xếp bài và đưa bạn vào màn làm bài…</p>
    </div>
  );
}

function LoadingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 animate-pulse" aria-hidden="true">
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="m8 12 2 2 5-5M8 18h8" />
    </svg>
  );
}
