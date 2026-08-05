import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminOrderApi } from '@/api/adminEndpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, Pager, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { AdminOrder, CreateRefundRequest, OrderStatus } from '@/types/admin';

const PAGE_SIZE = 20;

/** Chỉ hai trạng thái này còn tiền để hoàn. */
const REFUNDABLE_STATUSES: OrderStatus[] = ['PAID', 'PARTIALLY_REFUNDED'];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function OrderAdminPage() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const canRefund = has('refund:write');

  const [page, setPage] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', page],
    queryFn: () => adminOrderApi.list(page, PAGE_SIZE),
    // Giữ dữ liệu trang trước trong lúc tải để bảng không nháy trắng
    placeholderData: (prev) => prev,
  });

  const body = () => {
    if (ordersQuery.isPending) {
      return <LoadingBlock label="Đang tải danh sách đơn hàng…" />;
    }

    if (ordersQuery.error || !ordersQuery.data) {
      return (
        <ErrorBlock
          message={errorMessage(ordersQuery.error, 'Không tải được danh sách đơn hàng')}
          onRetry={() => void ordersQuery.refetch()}
        />
      );
    }

    const { content: orders, totalPages, totalElements } = ordersQuery.data;

    return (
      <>
        <p className="mb-2 text-xs text-slate-500">{totalElements} đơn hàng</p>

        <DataTable
          headers={[
            'Mã đơn',
            'Email người mua',
            'Trạng thái',
            'Tạm tính',
            'Giảm giá',
            'Tổng tiền',
            'Đã hoàn',
            'Thanh toán lúc',
            'Tạo lúc',
          ]}
          isEmpty={orders.length === 0}
          empty="Chưa có đơn hàng nào."
        >
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => {
                setBanner(null);
                setSelectedOrderId(order.id);
              }}
              className="cursor-pointer transition-colors hover:bg-brand-50"
            >
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                {order.orderCode}
              </td>
              <td className="px-4 py-2.5 text-slate-700">{order.userEmail ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={order.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {formatCurrency(order.subtotalAmount, order.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {order.discountAmount > 0
                  ? `− ${formatCurrency(order.discountAmount, order.currency)}`
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                {formatCurrency(order.totalAmount, order.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {order.refundedAmount > 0
                  ? formatCurrency(order.refundedAmount, order.currency)
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {formatDateTime(order.paidAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                {formatDateTime(order.createdAt)}
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
        title="Đơn hàng"
        description="Tra cứu đơn hàng và xử lý hoàn tiền. Bấm vào một dòng để xem chi tiết."
      />

      {banner && (
        <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />
      )}

      {body()}

      {selectedOrderId && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          canRefund={canRefund}
          onClose={() => setSelectedOrderId(null)}
          onRefunded={(message) => {
            // Bảng và chi tiết đều phải đọc lại: trạng thái đơn và số đã hoàn đổi
            void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
            setBanner(message);
          }}
        />
      )}
    </div>
  );
}

function OrderDetailPanel({
  orderId,
  canRefund,
  onClose,
  onRefunded,
}: {
  orderId: string;
  canRefund: boolean;
  onClose: () => void;
  onRefunded: (message: string) => void;
}) {
  const orderQuery = useQuery({
    queryKey: ['admin', 'orders', 'detail', orderId],
    queryFn: () => adminOrderApi.detail(orderId),
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <button
        type="button"
        aria-label="Đóng chi tiết đơn hàng"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Chi tiết đơn hàng</h2>
          <button type="button" className="btn-ghost !px-2 !py-1" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="flex-1 space-y-4 px-5 py-4">
          {orderQuery.isPending && <LoadingBlock label="Đang tải chi tiết đơn…" />}

          {orderQuery.error && (
            <ErrorBlock
              message={errorMessage(orderQuery.error, 'Không tải được chi tiết đơn hàng')}
              onRetry={() => void orderQuery.refetch()}
            />
          )}

          {orderQuery.data && (
            <OrderDetailBody
              order={orderQuery.data}
              canRefund={canRefund}
              onRefunded={(message) => {
                void orderQuery.refetch();
                onRefunded(message);
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function OrderDetailBody({
  order,
  canRefund,
  onRefunded,
}: {
  order: AdminOrder;
  canRefund: boolean;
  onRefunded: (message: string) => void;
}) {
  const refundableAmount = order.totalAmount - order.refundedAmount;
  const refundable = REFUNDABLE_STATUSES.includes(order.status) && refundableAmount > 0;

  return (
    <>
      <dl className="space-y-2 text-sm">
        <Row label="Mã đơn">
          <span className="font-mono text-xs">{order.orderCode}</span>
        </Row>
        <Row label="Email người mua">{order.userEmail ?? '—'}</Row>
        <Row label="Trạng thái">
          <StatusBadge status={order.status} />
        </Row>
        <Row label="Tạm tính">{formatCurrency(order.subtotalAmount, order.currency)}</Row>
        <Row label="Giảm giá">
          {order.discountAmount > 0
            ? `− ${formatCurrency(order.discountAmount, order.currency)}`
            : '—'}
        </Row>
        <Row label="Tổng tiền">
          <span className="font-semibold">
            {formatCurrency(order.totalAmount, order.currency)}
          </span>
        </Row>
        <Row label="Đã hoàn">{formatCurrency(order.refundedAmount, order.currency)}</Row>
        <Row label="Còn có thể hoàn">
          <span className="font-semibold text-brand-700">
            {formatCurrency(Math.max(0, refundableAmount), order.currency)}
          </span>
        </Row>
        <Row label="Thanh toán lúc">{formatDateTime(order.paidAt)}</Row>
        <Row label="Tạo lúc">{formatDateTime(order.createdAt)}</Row>
      </dl>

      {refundable && canRefund && (
        <RefundForm
          order={order}
          refundableAmount={refundableAmount}
          onRefunded={onRefunded}
        />
      )}

      {refundable && !canRefund && (
        <ResultBanner
          tone="info"
          message="Đơn này còn tiền có thể hoàn, nhưng bạn cần quyền refund:write để thao tác."
        />
      )}

      {!refundable && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Đơn này không hoàn tiền được: chỉ đơn ở trạng thái Đã thanh toán hoặc Hoàn một
          phần và còn số dư mới hoàn được.
        </p>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  );
}

function RefundForm({
  order,
  refundableAmount,
  onRefunded,
}: {
  order: AdminOrder;
  refundableAmount: number;
  onRefunded: (message: string) => void;
}) {
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');

  const amount = amountInput.trim() === '' ? null : Number(amountInput);
  const isFullRefund = amount === null || amount >= refundableAmount;

  const amountError = (() => {
    if (amount === null) return null;
    if (!Number.isFinite(amount) || amount <= 0) return 'Số tiền phải lớn hơn 0.';
    if (amount > refundableAmount) {
      return `Vượt quá số còn có thể hoàn (${formatCurrency(refundableAmount, order.currency)}).`;
    }
    return null;
  })();

  const refundMutation = useMutation({
    mutationFn: (body: CreateRefundRequest) => adminOrderApi.refund(order.id, body),
    onSuccess: (refund) => {
      setAmountInput('');
      setReason('');
      onRefunded(
        `Đã tạo yêu cầu hoàn ${formatCurrency(refund.amount, order.currency)} cho đơn ${order.orderCode}.` +
          ' Quyền Premium chỉ thay đổi khi cổng thanh toán xác nhận hoàn tất.',
      );
    },
  });

  return (
    <form
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amountError) return;
        refundMutation.mutate({
          amount,
          reason: reason.trim() === '' ? undefined : reason.trim(),
        });
      }}
    >
      <h3 className="font-semibold text-slate-900">Hoàn tiền</h3>

      {/* Cảnh báo nghiệp vụ: hệ quả khác nhau giữa hoàn toàn bộ và hoàn một phần */}
      <div className="space-y-1 text-sm text-amber-900">
        <p>
          <strong>Hoàn toàn bộ</strong> sẽ <strong>thu hồi quyền Premium</strong> của học
          viên khi cổng thanh toán xác nhận thành công.
        </p>
        <p>
          <strong>Hoàn một phần</strong> thì học viên <strong>giữ nguyên</strong> quyền
          Premium.
        </p>
      </div>

      <p className="text-sm text-slate-700">
        Còn có thể hoàn:{' '}
        <strong>{formatCurrency(refundableAmount, order.currency)}</strong>
      </p>

      {refundMutation.error && (
        <ResultBanner
          tone="danger"
          message={errorMessage(refundMutation.error, 'Không tạo được yêu cầu hoàn tiền')}
        />
      )}

      <div>
        <label htmlFor="refund-amount" className="label">
          Số tiền hoàn (VND)
        </label>
        <input
          id="refund-amount"
          type="number"
          min={1}
          max={refundableAmount}
          className="input"
          placeholder={`Để trống = hoàn toàn bộ ${formatCurrency(refundableAmount, order.currency)}`}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
        />
        {amountError ? (
          <p className="mt-1 text-xs text-red-700">{amountError}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-600">
            {isFullRefund
              ? 'Đây là hoàn toàn bộ phần còn lại — quyền Premium sẽ bị thu hồi.'
              : 'Đây là hoàn một phần — quyền Premium được giữ nguyên.'}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="refund-reason" className="label">
          Lý do
        </label>
        <textarea
          id="refund-reason"
          className="input"
          rows={2}
          placeholder="Ghi lý do để đối soát sau này"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={Boolean(amountError) || refundMutation.isPending}
      >
        {refundMutation.isPending
          ? 'Đang gửi yêu cầu…'
          : isFullRefund
            ? 'Hoàn toàn bộ và thu hồi Premium'
            : 'Hoàn một phần'}
      </button>
    </form>
  );
}
