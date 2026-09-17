import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { teacherClassroomApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDateTime, formatPercent } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import type { AttemptStatus, ClassroomStudent } from '@/types/api';

const NHAN_TRANG_THAI: Record<AttemptStatus, string> = {
  CREATED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  SCORING: 'Đang chấm',
  COMPLETED: 'Hoàn thành',
  EXPIRED: 'Hết giờ',
  ABANDONED: 'Bỏ dở',
  CANCELLED: 'Đã hủy',
};

const NHAN_KIEU: Record<string, string> = {
  PART_PRACTICE: 'Luyện theo Part',
  CUSTOM_PRACTICE: 'Luyện tùy chọn',
  MOCK_TEST: 'Thi thử',
};

/**
 * Bài học viên đã làm, nhìn từ phía giáo viên.
 *
 * <p>Gồm cả bài các em tự luyện với đề hệ thống chứ không riêng bài được giao —
 * đó mới là chỗ thấy em nào chăm, em nào yếu phần nào.
 */
export function StudentAttemptsPanel({
  student,
  onClose,
}: {
  student: ClassroomStudent;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'student-attempts', student.userId, page],
    queryFn: () => teacherClassroomApi.studentAttempts(student.userId, page, 20),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-dark/40">
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="flex-1 cursor-default bg-transparent"
      />
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Bài đã làm</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {student.fullName || student.email}
              {query.data && ` · ${query.data.totalElements} lượt`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-surface"
          >
            Đóng
          </button>
        </div>

        {query.isPending ? (
          <LoadingBlock label="Đang tải…" />
        ) : query.error ? (
          <ErrorBlock message="Không tải được lịch sử" onRetry={() => void query.refetch()} />
        ) : query.data.content.length === 0 ? (
          <p className="card text-center text-sm text-slate-500">
            Em này chưa làm bài nào.
          </p>
        ) : (
          <div className="space-y-2">
            {query.data.content.map((attempt) => {
              // Chỉ xem bài em đã nộp. Bài đang làm dở là việc riêng của em,
              // giáo viên nhìn vào lúc chưa xong thì không công bằng.
              const xemDuoc = ['COMPLETED', 'SCORING', 'SUBMITTED', 'EXPIRED']
                .includes(attempt.status);

              const noiDung = (
                <>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {NHAN_KIEU[attempt.mode] ?? attempt.mode}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {formatDateTime(attempt.createdAt)} · {attempt.totalItems} câu
                      {attempt.correctItems > 0 && ` · đúng ${attempt.correctItems}`}
                      {!xemDuoc && ' · em chưa nộp nên chưa xem được'}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2.5">
                    {attempt.percentageScore != null && (
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {formatPercent(attempt.percentageScore)}
                      </span>
                    )}
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        attempt.status === 'COMPLETED' && 'bg-emerald-50 text-emerald-700',
                        attempt.status === 'SCORING' && 'bg-amber-50 text-amber-800',
                        attempt.status === 'IN_PROGRESS' && 'bg-brand-50 text-brand-700',
                        !['COMPLETED', 'SCORING', 'IN_PROGRESS'].includes(attempt.status) &&
                          'bg-surface-muted text-slate-600',
                      )}
                    >
                      {NHAN_TRANG_THAI[attempt.status]}
                    </span>
                  </span>
                </>
              );

              // Mở tab mới: trang kết quả dài, giáo viên hay so nhiều em một
              // lúc nên đừng bắt họ mất chỗ đang xem.
              return xemDuoc ? (
                <Link
                  key={attempt.id}
                  to={`/giang-day/hoc-vien/${student.userId}/bai-lam/${attempt.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:border-brand-300 hover:bg-surface"
                >
                  {noiDung}
                </Link>
              ) : (
                <div
                  key={attempt.id}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 opacity-60"
                >
                  {noiDung}
                </div>
              );
            })}

            {(page > 0 || query.data.hasNext) && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                >
                  Trang trước
                </button>
                <span className="text-xs text-slate-500">Trang {page + 1}</span>
                <button
                  type="button"
                  disabled={!query.data.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
