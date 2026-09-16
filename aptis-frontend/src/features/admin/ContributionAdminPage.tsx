import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { adminContributionApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDateTime } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { usePermission } from '@/features/admin/usePermission';
import type { ContributionStatus, QuestionSetContribution } from '@/types/api';

const STATUS: Record<ContributionStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  ACCEPTED: { label: 'Đã nhận', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Đã từ chối', tone: 'bg-red-50 text-red-700 border-red-200' },
};

/**
 * Đề giáo viên đề xuất đưa vào ngân hàng chung.
 *
 * <p>Nhận thì đề rời khỏi lớp riêng và mọi học viên đều thấy — nên đây là bước
 * cần người xem, khác với đề giáo viên dùng trong lớp mình vốn không cần duyệt.
 */
export function ContributionAdminPage() {
  const canReview = usePermission().has('question_set:review');
  const canPublish = usePermission().has('question_set:publish');
  const [status, setStatus] = useState('PENDING');
  const [reviewing, setReviewing] = useState<
    { row: QuestionSetContribution; action: 'accept' | 'reject' } | null
  >(null);

  const query = useQuery({
    queryKey: ['admin', 'contributions', status],
    queryFn: () => adminContributionApi.list({ status: status || undefined }),
  });

  if (!canReview) {
    return <ErrorBlock message="Bạn không có quyền duyệt đề." />;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Đề giáo viên gửi</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Đề do giáo viên tự soạn, xin đưa vào ngân hàng đề chung. Nhận thì mọi học viên đều
          thấy và giáo viên không sửa được nữa.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          ['PENDING', 'Chờ duyệt'],
          ['ACCEPTED', 'Đã nhận'],
          ['REJECTED', 'Đã từ chối'],
          ['', 'Tất cả'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatus(value ?? '')}
            className={clsx(
              'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
              status === value
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-border bg-white text-slate-600 hover:bg-surface',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <LoadingBlock label="Đang tải…" />
      ) : query.error ? (
        <ErrorBlock message="Không tải được danh sách" onRetry={() => void query.refetch()} />
      ) : query.data.content.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">Không có đề nào.</p>
      ) : (
        <ul className="space-y-2.5">
          {query.data.content.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-white px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{row.questionSetTitle}</h3>
                    <span
                      className={clsx(
                        'rounded-full border px-2 py-0.5 text-[11px] font-bold',
                        STATUS[row.status].tone,
                      )}
                    >
                      {STATUS[row.status].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[row.componentName, row.partName].filter(Boolean).join(' · ')}
                    {' · '}
                    <span className="font-mono">{row.questionSetCode}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Gửi bởi <strong>{row.teacherName || 'Giáo viên'}</strong>{' '}
                    <span className="font-mono text-[11px] text-slate-500">
                      {row.teacherEmail}
                    </span>
                    {' · '}
                    {formatDateTime(row.createdAt)}
                  </p>
                  {row.note && (
                    <p className="mt-1.5 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
                      Lời nhắn: {row.note}
                    </p>
                  )}
                  {row.adminNote && (
                    <p className="mt-1.5 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
                      Ghi chú của quản trị: {row.adminNote}
                    </p>
                  )}
                </div>

                {row.status === 'PENDING' && (
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReviewing({ row, action: 'reject' })}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Từ chối
                    </button>
                    {canPublish && (
                      <button
                        type="button"
                        onClick={() => setReviewing({ row, action: 'accept' })}
                        className="rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        Nhận vào kho chung
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewing && (
        <ReviewDialog
          row={reviewing.row}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

function ReviewDialog({
  row,
  action,
  onClose,
}: {
  row: QuestionSetContribution;
  action: 'accept' | 'reject';
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      action === 'accept'
        ? adminContributionApi.accept(row.id, note.trim() || undefined)
        : adminContributionApi.reject(row.id, note.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contributions'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const nhan = action === 'accept';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-bold text-slate-900">
          {nhan ? 'Nhận đề vào kho chung' : 'Từ chối đề'}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{row.questionSetTitle}</p>

        <label className="mt-4 block">
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {nhan ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối'}
          </span>
          <textarea
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              nhan
                ? 'Ví dụ: đề tốt, đã vào ngân hàng chung'
                : 'Nói rõ để giáo viên biết đường sửa và gửi lại'
            }
            className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <p className="mt-2 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
          {nhan
            ? 'Đề sẽ rời khỏi lớp riêng và thành đề hệ thống. Giáo viên không sửa được nữa.'
            : 'Đề vẫn nguyên trong lớp của giáo viên. Họ sửa xong có thể gửi lại.'}
        </p>

        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submit.isPending}
            onClick={() => {
              setError(null);
              submit.mutate();
            }}
            className={clsx(
              'flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60',
              nhan ? 'bg-brand-600 hover:bg-brand-700' : 'bg-red-600 hover:bg-red-700',
            )}
          >
            {submit.isPending ? 'Đang lưu…' : nhan ? 'Nhận' : 'Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}
