import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { mockTestApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import type { MockTest } from '@/types/api';

export function MockTestPage() {
  const navigate = useNavigate();
  const [premiumBlocked, setPremiumBlocked] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const mockTestsQuery = useQuery({
    queryKey: ['mock-tests'],
    queryFn: () => mockTestApi.list(),
    staleTime: 60_000,
  });

  const createAttempt = useMutation({
    mutationFn: (blueprintId: string) => mockTestApi.createAttempt(blueprintId),
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
    onError: (error) => {
      setStartingId(null);
      if (error instanceof ApiError && error.isPremiumRequired) {
        setPremiumBlocked(true);
      }
    },
  });

  if (mockTestsQuery.isLoading) {
    return <LoadingBlock label="Đang tải đề thi thử…" />;
  }

  if (mockTestsQuery.error || !mockTestsQuery.data) {
    return (
      <ErrorBlock
        message="Không tải được danh sách đề thi thử"
        onRetry={() => void mockTestsQuery.refetch()}
      />
    );
  }

  // Đề thi cả 5 kỹ năng chỉ có vài bản nên lấy trang đầu là đủ; API vẫn trả
  // dạng phân trang chung với danh sách theo kỹ năng.
  const mockTests = mockTestsQuery.data.content;

  if (mockTests.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm text-slate-600">Chưa có đề thi thử nào được xuất bản.</p>
        <Link to="/" className="btn-primary mt-3">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const errorMessage = describeError(createAttempt.error);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Thi thử</h1>
        <p className="mt-1 text-sm text-slate-600">
          Làm bài theo đúng cấu trúc và thời gian của kỳ thi thật
        </p>
      </header>

      {premiumBlocked && <PremiumGate message="Đề thi thử này thuộc gói Premium." />}
      {errorMessage && <ErrorBlock message={errorMessage} />}

      <div className="space-y-4">
        {mockTests.map((mockTest) => (
          <MockTestCard
            key={mockTest.id}
            mockTest={mockTest}
            starting={startingId === mockTest.id && createAttempt.isPending}
            onStart={() => {
              setPremiumBlocked(false);
              setStartingId(mockTest.id);
              createAttempt.mutate(mockTest.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MockTestCard({
  mockTest,
  starting,
  onStart,
}: {
  mockTest: MockTest;
  starting: boolean;
  onStart: () => void;
}) {
  // Nhóm Part theo học phần để hiển thị cấu trúc đề dễ đọc
  const byComponent = new Map<string, number>();
  for (const part of mockTest.parts) {
    const key = part.componentCode ?? 'KHÁC';
    byComponent.set(key, (byComponent.get(key) ?? 0) + part.questionSetCount);
  }

  return (
    <div className={clsx('card', !mockTest.canAccess && 'opacity-75')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold">{mockTest.name}</h3>
          {mockTest.description && (
            <p className="mt-1 text-sm text-slate-600">{mockTest.description}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {mockTest.totalQuestionSets} bộ câu hỏi · {mockTest.parts.length} Part
            {mockTest.durationSeconds
              ? ` · ${Math.round(mockTest.durationSeconds / 60)} phút`
              : ''}
          </p>
        </div>

        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
            mockTest.accessLevel === 'FREE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-800',
          )}
        >
          {mockTest.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[...byComponent.entries()].map(([component, count]) => (
          <span
            key={component}
            className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
          >
            {COMPONENT_LABELS[component] ?? component}: {count}
          </span>
        ))}
      </div>

      {mockTest.durationSeconds && mockTest.canAccess && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Đồng hồ bắt đầu chạy khi bạn bấm Bắt đầu. Hết giờ bài sẽ tự nộp.
        </p>
      )}

      {mockTest.canAccess ? (
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="btn-primary mt-4 w-full"
        >
          {starting ? 'Đang tạo đề…' : 'Bắt đầu thi thử'}
        </button>
      ) : (
        <Link to="/plans" className="btn-secondary mt-4 w-full text-center">
          🔒 Nâng cấp Premium để làm đề này
        </Link>
      )}
    </div>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  GRAMMAR_VOCABULARY: 'Grammar & Vocab',
  READING: 'Reading',
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  WRITING: 'Writing',
};

function describeError(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;

  switch (error.code) {
    case 'PREMIUM_REQUIRED':
      return null; // đã hiển thị bằng PremiumGate
    case 'NOT_ENOUGH_QUESTION_SETS':
      return 'Ngân hàng đề chưa đủ câu hỏi để tạo đề thi thử này.';
    case 'CONTENT_NOT_PUBLISHED':
      return 'Đề thi thử này chưa được xuất bản.';
    default:
      return error.message;
  }
}
