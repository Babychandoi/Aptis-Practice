import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { practiceApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime, formatPercent } from '@/lib/format';
import type { AttemptStatus } from '@/types/api';

const STATUS_LABELS: Record<AttemptStatus, string> = {
  CREATED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  SCORING: 'Đang chấm',
  COMPLETED: 'Hoàn thành',
  EXPIRED: 'Hết thời gian',
  ABANDONED: 'Bỏ dở',
  CANCELLED: 'Đã hủy',
};

const MODE_LABELS: Record<string, string> = {
  PART_PRACTICE: 'Luyện theo Part',
  CUSTOM_PRACTICE: 'Luyện tùy chọn',
  MOCK_TEST: 'Thi thử',
};

export function HistoryPage() {
  const [page, setPage] = useState(0);

  const historyQuery = useQuery({
    queryKey: ['attempts', page],
    queryFn: () => practiceApi.listAttempts(page, 20),
  });

  if (historyQuery.isLoading) {
    return <LoadingBlock label="Đang tải lịch sử…" />;
  }

  if (historyQuery.error || !historyQuery.data) {
    return (
      <ErrorBlock
        message="Không tải được lịch sử làm bài"
        onRetry={() => void historyQuery.refetch()}
      />
    );
  }

  const { content: attempts, hasNext, totalElements } = historyQuery.data;

  if (attempts.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm text-slate-600">Bạn chưa làm bài nào.</p>
        <Link to="/" className="btn-primary mt-3">
          Bắt đầu luyện
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Lịch sử làm bài</h1>
        <span className="text-sm text-slate-500">{totalElements} lượt</span>
      </div>

      <div className="space-y-2">
        {attempts.map((attempt) => {
          // Lượt chưa nộp thì vào lại trang làm bài, đã nộp thì vào trang kết quả
          const target = ['COMPLETED', 'SCORING', 'SUBMITTED'].includes(attempt.status)
            ? `/attempts/${attempt.id}/result`
            : `/attempts/${attempt.id}`;

          return (
            <Link
              key={attempt.id}
              to={target}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {MODE_LABELS[attempt.mode] ?? attempt.mode}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(attempt.createdAt)} · {attempt.totalItems} câu
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {attempt.percentageScore !== null && (
                  <span className="text-sm font-semibold">
                    {formatPercent(attempt.percentageScore)}
                  </span>
                )}
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    attempt.status === 'COMPLETED' && 'bg-emerald-100 text-emerald-700',
                    attempt.status === 'SCORING' && 'bg-amber-100 text-amber-700',
                    attempt.status === 'IN_PROGRESS' && 'bg-brand-100 text-brand-700',
                    !['COMPLETED', 'SCORING', 'IN_PROGRESS'].includes(attempt.status) &&
                      'bg-slate-100 text-slate-600',
                  )}
                >
                  {STATUS_LABELS[attempt.status]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {(page > 0 || hasNext) && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary"
          >
            Trang trước
          </button>
          <span className="text-sm text-slate-500">Trang {page + 1}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
            className="btn-secondary"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
