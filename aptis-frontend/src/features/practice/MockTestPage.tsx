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
import { SKILLS } from '@/lib/skills';
import { Icon } from '@/components/shell/icons';

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
    <div className="flex flex-col gap-6">
      <header className="animate-in">
        <h1 className="page-title">Mô phỏng thi</h1>
        <p className="page-description">
          Làm đủ 5 kỹ năng liên tục, đúng thứ tự và thời gian của kỳ thi thật. Hết giờ bài tự nộp.
        </p>
      </header>

      {premiumBlocked && <PremiumGate message="Đề thi thử này thuộc gói Premium." />}
      {errorMessage && <ErrorBlock message={errorMessage} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockTests.map((mockTest, index) => (
          <MockTestCard
            key={mockTest.id}
            index={index}
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
  index,
  mockTest,
  starting,
  onStart,
}: {
  index: number;
  mockTest: MockTest;
  starting: boolean;
  onStart: () => void;
}) {
  // Gom số bộ câu hỏi theo kỹ năng, xếp theo thứ tự thi thật, để vẽ thanh màu:
  // mỗi đoạn dài theo đúng tỉ trọng của kỹ năng đó trong đề.
  const byComponent = new Map<string, number>();
  for (const part of mockTest.parts) {
    const key = (part.componentCode ?? 'OTHER').toUpperCase();
    byComponent.set(key, (byComponent.get(key) ?? 0) + part.questionSetCount);
  }
  const segments = SKILLS.filter((s) => byComponent.has(s.code)).map((s) => ({ skill: s, count: byComponent.get(s.code)! }));
  const free = mockTest.accessLevel === 'FREE';
  const minutes = mockTest.durationSeconds ? Math.round(mockTest.durationSeconds / 60) : null;

  return (
    <article
      className={clsx('flex animate-in flex-col gap-4 rounded-3xl border border-border bg-white p-5', !mockTest.canAccess && 'bg-surface-paper')}
      style={{ animationDelay: `${(index % 3) * 80}ms` }}
    >
      <header className="flex items-start justify-between gap-3">
        <span className={clsx('text-[44px] font-extrabold leading-none tracking-[-0.05em]', mockTest.canAccess ? 'text-ink' : 'text-brand-300')}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', free ? 'bg-skill-speaking-bg text-skill-speaking' : 'bg-ink text-white')}>
          {free ? 'Miễn phí' : 'Premium'}
        </span>
      </header>
      <div>
        <h2 className="text-lg font-bold leading-6 tracking-tight">{mockTest.name}</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {segments.length} kỹ năng · {mockTest.totalQuestionSets} bộ câu hỏi{minutes ? ` · ${minutes} phút` : ''}
        </p>
      </div>
      <div className="flex gap-1" aria-label="Tỉ trọng các kỹ năng trong đề">
        {segments.map(({ skill, count }) => (
          <span
            key={skill.code}
            title={`${skill.nameEn}: ${count} bộ`}
            className="h-2 rounded-full"
            style={{ flexGrow: count, background: mockTest.canAccess ? skill.fg : '#E2E8F0' }}
          />
        ))}
      </div>
      <footer className="mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-ink-mute">{mockTest.description || (free ? 'Làm được ngay' : 'Dành cho Premium')}</span>
        {mockTest.canAccess ? (
          <button type="button" onClick={onStart} disabled={starting} className="btn-primary min-h-[40px] shrink-0 px-4">
            {starting ? 'Đang tạo đề…' : 'Bắt đầu'}
          </button>
        ) : (
          <Link to="/plans" className="btn-secondary min-h-[40px] shrink-0 px-4">
            <Icon name="lock" className="h-4 w-4" /> Mở khoá
          </Link>
        )}
      </footer>
    </article>
  );
}

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
