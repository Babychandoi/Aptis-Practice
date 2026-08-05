import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminRefundApi } from '@/api/adminEndpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, Pager, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { Refund, RefundStatus } from '@/types/admin';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: RefundStatus; label: string }[] = [
  { value: 'REQUESTED', label: 'Đã yêu cầu' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'REJECTED', label: 'Từ chối' },
];

/** Đã chốt kết quả thì không từ chối được nữa. */
const TERMINAL_STATUSES: RefundStatus[] = ['SUCCESS', 'FAILED', 'REJECTED'];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function RefundAdminPage() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const canWrite = has('refund:write');

  const [status, setStatus] = useState<RefundStatus | ''>('');
  const [page, setPage] = useState(0);
  const [rejectingRefund, setRejectingRefund] = useState<Refund | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const refundsQuery = useQuery({
    queryKey: ['admin', 'refunds', { status, page }],
    queryFn: () => adminRefundApi.list(status === '' ? undefined : status, page, PAGE_SIZE),
    // Giữ dữ liệu trang trước trong lúc tải để bảng không nháy trắng
    placeholderData: (prev) => prev,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ refundId, reason }: { refundId: string; reason: string }) =>
      adminRefundApi.reject(refundId, reason),
    onSuccess: () => {
      // Đơn hàng cũng đổi theo khi yêu cầu hoàn bị từ chối
      void queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setRejectingRefund(null);
      setBanner('Đã từ chối yêu cầu hoàn tiền.');
    },
  });

  const body = () => {
    if (refundsQuery.isPending) {
      return <LoadingBlock label="Đang tải danh sách hoàn tiền…" />;
    }

    if (refundsQuery.error || !refundsQuery.data) {
      return (
        <ErrorBlock
          message={errorMessage(refundsQuery.error, 'Không tải được danh sách hoàn tiền')}
          onRetry={() => void refundsQuery.refetch()}
        />
      );
    }

    const { content: refunds, totalPages, totalElements } = refundsQuery.data;

    return (
      <>
        <p className="mb-2 text-xs text-slate-500">{totalElements} yêu cầu hoàn tiền</p>

        <DataTable
          headers={[
            'Mã hoàn',
            'Mã đơn',
            'Số tiền',
            'Trạng thái',
            'Lý do',
            'Mã cổng thanh toán',
            'Yêu cầu lúc',
            'Hoàn tất lúc',
            '',
          ]}
          isEmpty={refunds.length === 0}
          empty="Không có yêu cầu hoàn tiền nào khớp bộ lọc."
        >
          {refunds.map((refund) => (
            <tr key={refund.id} className="transition-colors hover:bg-brand-50">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                {refund.id}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                {refund.orderId}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                {formatCurrency(refund.amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={refund.status} />
              </td>
              <td className="px-4 py-2.5 text-slate-600">{refund.reason ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                {refund.providerRefundId ?? '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {formatDateTime(refund.requestedAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {formatDateTime(refund.completedAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                {canWrite && !TERMINAL_STATUSES.includes(refund.status) && (
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1 text-sm text-red-700"
                    onClick={() => {
                      setBanner(null);
                      rejectMutation.reset();
                      setRejectingRefund(refund);
                    }}
                  >
                    Từ chối
                  </button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      </>
    );
  };

  return (
    <div>
      <PageHeader
        title="Hoàn tiền"
        description="Theo dõi và xử lý các yêu cầu hoàn tiền gửi sang cổng thanh toán."
      />

      <ResultBanner
        tone="info"
        message={
          'Trạng thái "Đang xử lý" nghĩa là yêu cầu đã gửi sang cổng thanh toán và đang chờ cổng' +
          ' xác nhận qua webhook. Quyền Premium của học viên CHƯA bị thu hồi cho tới khi cổng xác' +
          ' nhận thành công.'
        }
      />

      {banner && (
        <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label htmlFor="refund-status-filter" className="label">
            Trạng thái
          </label>
          <select
            id="refund-status-filter"
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RefundStatus | '');
              // Bộ lọc đổi thì bắt đầu lại từ trang đầu
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {body()}

      {rejectingRefund && (
        <RejectDialog
          refund={rejectingRefund}
          submitting={rejectMutation.isPending}
          error={
            rejectMutation.error
              ? errorMessage(rejectMutation.error, 'Không từ chối được yêu cầu')
              : null
          }
          onCancel={() => setRejectingRefund(null)}
          onConfirm={(reason) =>
            rejectMutation.mutate({ refundId: rejectingRefund.id, reason })
          }
        />
      )}
    </div>
  );
}

function RejectDialog({
  refund,
  submitting,
  error,
  onCancel,
  onConfirm,
}: {
  refund: Refund;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const valid = reason.trim() !== '';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onConfirm(reason.trim());
        }}
      >
        <div>
          <h2 className="font-semibold text-slate-900">Từ chối yêu cầu hoàn tiền</h2>
          <p className="mt-1 text-sm text-slate-600">
            Yêu cầu hoàn {formatCurrency(refund.amount)} cho đơn{' '}
            <span className="font-mono text-xs">{refund.orderId}</span> sẽ chuyển sang
            trạng thái Từ chối và không xử lý tiếp.
          </p>
        </div>

        {error && <ResultBanner tone="danger" message={error} />}

        <div>
          <label htmlFor="reject-reason" className="label">
            Lý do từ chối
          </label>
          <textarea
            id="reject-reason"
            className="input"
            rows={3}
            placeholder="Bắt buộc — lý do được lưu lại để đối soát"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={!valid || submitting}>
            {submitting ? 'Đang gửi…' : 'Xác nhận từ chối'}
          </button>
        </div>
      </form>
    </div>
  );
}
