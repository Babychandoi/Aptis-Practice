import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { ApiError } from '@/api/client';
import { billingApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { BankTransferInstruction } from '@/types/api';

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [transfer, setTransfer] = useState<BankTransferInstruction | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => billingApi.order(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'AWAITING_PAYMENT' ? 5000 : false;
    },
  });

  const order = orderQuery.data;

  const createTransfer = useMutation({
    mutationFn: () => billingApi.createBankTransfer(orderId!),
    onSuccess: (result) => {
      setTransfer(result);
      void orderQuery.refetch();
    },
  });

  const claimTransfer = useMutation({
    mutationFn: () => billingApi.claimBankTransfer(orderId!),
    onSuccess: setTransfer,
  });

  const refreshQr = useMutation({
    mutationFn: () => billingApi.refreshBankTransferQr(orderId!),
    onSuccess: (result) => {
      setTransfer(result);
      setQrDataUrl(null);
    },
  });

  const qrSecondsLeft = useCountdown(transfer?.qrExpiresAt ?? null);
  const qrExpired = transfer?.status === 'PENDING' && qrSecondsLeft === 0;

  useEffect(() => {
    if (
      order &&
      ['PENDING', 'AWAITING_PAYMENT'].includes(order.status) &&
      !transfer &&
      !createTransfer.isPending &&
      !createTransfer.isError
    ) {
      createTransfer.mutate();
    }
  }, [order, transfer, createTransfer]);

  useEffect(() => {
    if (!transfer?.qrContent) {
      setQrDataUrl(null);
      return;
    }

    let active = true;
    void QRCode.toDataURL(transfer.qrContent, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0d5447', light: '#ffffff' },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [transfer?.qrContent]);

  useEffect(() => {
    if (order?.status === 'PAID') void refreshUser();
  }, [order?.status, refreshUser]);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  };

  if (orderQuery.isLoading) return <LoadingBlock label="Đang tải đơn hàng…" />;

  if (orderQuery.error || !order) {
    return <ErrorBlock message="Không tải được đơn hàng" onRetry={() => void orderQuery.refetch()} />;
  }

  if (order.status === 'PAID') {
    return (
      <div className="mx-auto max-w-md">
        <div className="card text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-2 text-xl font-semibold">Thanh toán đã được xác nhận</h1>
          <p className="mt-2 text-sm text-slate-600">
            Đơn <strong>{order.orderCode}</strong> đã được duyệt. Quyền Premium đã được kích hoạt.
          </p>
          <Link to="/" className="btn-primary mt-4 w-full">Bắt đầu luyện với Premium</Link>
        </div>
      </div>
    );
  }

  if (['CANCELLED', 'EXPIRED'].includes(order.status)) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card text-center">
          <h1 className="text-lg font-semibold">Đơn hàng không còn hiệu lực</h1>
          <p className="mt-2 text-sm text-slate-600">Đơn <strong>{order.orderCode}</strong> đã hết hạn hoặc bị hủy.</p>
          <Link to="/plans" className="btn-primary mt-4 w-full">Chọn gói khác</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-stone-500" aria-label="Các bước thanh toán">
        <Link to="/plans" className="font-medium hover:text-brand-800">1. Chọn gói</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-brand-800">2. Chuyển khoản</span>
        <span aria-hidden="true">›</span>
        <span>3. Admin xác nhận</span>
      </nav>

      <header className="rounded-2xl bg-gradient-to-r from-brand-900 to-[#26715f] px-5 py-5 text-white sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-100">Thanh toán VietQR</p>
        <h1 className="mt-2 text-2xl font-semibold">Quét mã để hoàn tất đơn hàng</h1>
        <p className="mt-1 text-sm text-emerald-100">Mã có hiệu lực 10 phút. Không đổi số tiền và nội dung chuyển khoản.</p>
      </header>

      {createTransfer.isPending && <LoadingBlock label="Đang tạo mã VietQR…" />}
      {createTransfer.error && (
        <ErrorBlock
          message={createTransfer.error instanceof ApiError ? createTransfer.error.message : 'Không tạo được mã chuyển khoản'}
          onRetry={() => createTransfer.mutate()}
        />
      )}

      {transfer && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-stone-900">Thông tin chuyển khoản</h2>
                <p className="mt-0.5 text-xs text-stone-500">Mã đơn <span className="font-mono font-medium text-stone-700">{order.orderCode}</span></p>
              </div>
              <TransferStatus status={transfer.status} expired={qrExpired} />
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-x-7 gap-y-1 sm:grid-cols-2">
                <TransferRow label="Ngân hàng" value={transfer.bankName} />
                <TransferRow
                  label="Số tài khoản"
                  value={transfer.accountNumber}
                  onCopy={() => copy('account', transfer.accountNumber)}
                  copied={copied === 'account'}
                />
                <TransferRow
                  label="Chủ tài khoản"
                  value={transfer.accountHolder || 'Kiểm tra trên ứng dụng ngân hàng'}
                />
                <TransferRow
                  label="Số tiền"
                  value={formatCurrency(transfer.amount, transfer.currency)}
                  onCopy={() => copy('amount', String(transfer.amount))}
                  copied={copied === 'amount'}
                />
                <TransferRow label="Hạn chuyển khoản" value={formatDateTime(transfer.qrExpiresAt)} />
                <TransferRow
                  label="Còn lại"
                  value={qrExpired ? 'Đã hết hạn' : formatCountdown(qrSecondsLeft)}
                  danger={qrExpired}
                />
              </div>

              <div className={`mt-5 rounded-2xl border-2 p-4 ${qrExpired ? 'border-red-200 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Nội dung chuyển khoản bắt buộc</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <strong className={`font-mono text-2xl tracking-[0.12em] ${qrExpired ? 'text-red-700 line-through opacity-60' : 'text-stone-950'}`}>
                    {qrExpired ? 'ĐÃ HẾT HẠN' : transfer.transferCode}
                  </strong>
                  {!qrExpired && (
                    <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => copy('code', transfer.transferCode)}>
                      {copied === 'code' ? 'Đã sao chép ✓' : 'Sao chép'}
                    </button>
                  )}
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                <Instruction number="1" title="Quét QR bằng ứng dụng ngân hàng" text="Kiểm tra đúng MB Bank, số tài khoản và tên người nhận trước khi chuyển." />
                <Instruction number="2" title="Giữ nguyên thông tin" text="QR đã điền sẵn số tiền và mã nội dung dành riêng cho đơn này." />
                <Instruction number="3" title="Báo đã chuyển khoản" text="Bấm nút bên dưới để admin biết và kiểm tra giao dịch trên sao kê." />
              </ol>

              {transfer.transferNote && <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-xs leading-5 text-stone-600">{transfer.transferNote}</p>}
              {transfer.expiresAt && <p className="mt-3 text-xs text-stone-500">Đơn có hiệu lực đến {formatDateTime(transfer.expiresAt)}</p>}
            </div>
          </section>

          <aside className="sticky top-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_35px_rgba(30,41,35,.09)]">
            <div className="border-b border-stone-200 px-5 py-4 text-center">
              <h2 className="font-semibold text-stone-900">Quét mã VietQR</h2>
              <p className="mt-1 text-xs text-stone-500">MB Bank · {transfer.accountNumber}</p>
            </div>
            <div className="p-5">
              <div className="relative grid min-h-[300px] place-items-center overflow-hidden rounded-2xl bg-[#f5f2e9] p-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`Mã VietQR thanh toán đơn ${order.orderCode}`} className={`w-full max-w-[290px] rounded-xl bg-white p-2 shadow-sm transition ${qrExpired ? 'blur-[2px] grayscale opacity-25' : ''}`} />
                ) : (
                  <p className="text-sm text-stone-500">Đang tạo mã QR…</p>
                )}
                {qrExpired && (
                  <div className="absolute inset-0 grid place-items-center bg-white/55 text-center backdrop-blur-[1px]">
                    <div>
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-700"><LockIcon /></span>
                      <p className="mt-3 font-bold text-red-700">QR đã hết hạn</p>
                      <p className="mt-1 text-xs text-stone-600">Tạo mã mới để tiếp tục thanh toán</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-stone-500">Tổng thanh toán</p>
                <p className="mt-1 text-2xl font-bold text-brand-800">{formatCurrency(transfer.amount, transfer.currency)}</p>
              </div>

              {transfer.status === 'PENDING' && !qrExpired && (
                <button
                  type="button"
                  className="btn-primary mt-4 w-full"
                  disabled={claimTransfer.isPending}
                  onClick={() => claimTransfer.mutate()}
                >
                  {claimTransfer.isPending ? 'Đang gửi thông báo…' : 'Tôi đã chuyển khoản →'}
                </button>
              )}

              {qrExpired && (
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-stone-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
                  disabled={refreshQr.isPending}
                  onClick={() => refreshQr.mutate()}
                >
                  {refreshQr.isPending ? 'Đang tạo mã mới…' : 'Tạo mã QR mới'}
                </button>
              )}

              {transfer.status === 'CLAIMED' && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm leading-6 text-amber-900">
                  <strong>Đã báo admin kiểm tra.</strong><br />Premium sẽ được mở sau khi tiền được đối soát.
                </div>
              )}

              {claimTransfer.error && <p className="mt-3 text-center text-xs text-red-700">Không gửi được thông báo. Vui lòng thử lại.</p>}
              {refreshQr.error && <p className="mt-3 text-center text-xs text-red-700">Không tạo được mã mới. Vui lòng thử lại.</p>}
              <p className="mt-3 text-center text-[11px] leading-5 text-stone-500">Bấm “đã chuyển khoản” không tự xác nhận thanh toán.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function TransferRow({ label, value, onCopy, copied, danger }: { label: string; value: string; onCopy?: () => void; copied?: boolean; danger?: boolean }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-stone-100 py-3">
      <div><p className="text-xs text-stone-500">{label}</p><p className={`mt-1 font-semibold ${danger ? 'text-red-700' : 'text-stone-900'}`}>{value}</p></div>
      {onCopy && <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-50" onClick={onCopy}>{copied ? 'Đã chép ✓' : 'Sao chép'}</button>}
    </div>
  );
}

function Instruction({ number, title, text }: { number: string; title: string; text: string }) {
  return <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">{number}</span><div><p className="text-sm font-semibold text-stone-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-stone-500">{text}</p></div></li>;
}

function TransferStatus({ status, expired }: { status: BankTransferInstruction['status']; expired: boolean }) {
  const labels = { PENDING: 'Chờ chuyển khoản', CLAIMED: 'Chờ admin kiểm tra', CONFIRMED: 'Đã xác nhận', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${expired ? 'bg-red-100 text-red-700' : 'bg-[#fbecd1] text-[#986b20]'}`}>{expired ? 'QR hết hạn' : labels[status]}</span>;
}

function useCountdown(expiresAt: string | null) {
  const calculate = () => expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  const [seconds, setSeconds] = useState(calculate);

  useEffect(() => {
    setSeconds(calculate());
    if (!expiresAt) return;
    const timer = window.setInterval(() => setSeconds(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return seconds;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
}
