import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { billingApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order } from '@/types/api';

export function SepayGatewayCheckout({ order, plansPath }: { order: Order; plansPath: string }) {
  const [params] = useSearchParams();
  const checkout = useMutation({ mutationFn: () => billingApi.sepayCheckout(order.id) });
  const returned = params.get('sepay');
  useEffect(() => {
    if (!checkout.data && !checkout.isPending && !checkout.isError) checkout.mutate();
  }, [checkout]);
  return <div className="mx-auto max-w-xl space-y-5">
    <nav className="text-xs text-slate-500"><Link to={plansPath}>1. Chọn gói</Link> › 2. Thanh toán SePay › 3. Tự động mở gói</nav>
    <section className="card space-y-4">
      <div><p className="text-xs font-semibold uppercase text-brand-800">Cổng thanh toán SePay</p><h1 className="mt-2 text-xl font-semibold">Hoàn tất thanh toán</h1></div>
      <p className="text-sm text-slate-600">Đơn <strong>{order.orderCode}</strong></p>
      <ul className="space-y-1 text-sm">{order.items.map((item, index) => <li key={index}>{item.itemName}</li>)}</ul>
      <p className="text-3xl font-bold text-brand-800">{formatCurrency(order.totalAmount, order.currency)}</p>
      <p className="text-xs text-slate-500">Hạn thanh toán: {formatDateTime(order.expiresAt)}</p>
      {returned && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-6">{returned === 'success' ? 'Bạn đã quay lại từ SePay. Đang chờ xác nhận thanh toán từ hệ thống, không cần chuyển thêm tiền.' : returned === 'cancel' ? 'Bạn đã quay lại sau khi hủy thanh toán. Nếu đã chuyển tiền, không chuyển thêm và hãy liên hệ hỗ trợ.' : 'SePay báo chưa hoàn tất thanh toán. Nếu đã chuyển tiền, không chuyển thêm và hãy liên hệ hỗ trợ.'}</p>}
      <p className="text-sm leading-6 text-slate-600">Mở trang SePay để quét QR bằng ứng dụng ngân hàng. Gói Premium hoặc AI Voice tương ứng được mở tự động khi hệ thống xác nhận giao dịch.</p>
      {checkout.isPending && <p role="status" className="text-sm text-slate-500">Đang chuẩn bị thanh toán SePay…</p>}
      {checkout.error && <ErrorBlock message={checkout.error instanceof ApiError ? checkout.error.message : 'Chưa mở được thanh toán SePay. Vui lòng thử lại.'} onRetry={() => checkout.mutate()} />}
      {checkout.data && returned !== 'success' && <form action={checkout.data.checkoutUrl} method="POST">
        {Object.entries(checkout.data.fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <button type="submit" className="btn-primary w-full">Thanh toán qua SePay</button>
      </form>}
      <p className="text-xs leading-5 text-slate-500">Trang này tự cập nhật trạng thái. URL quay lại hoặc việc bấm nút không tự xác nhận đã thanh toán. Nếu đã chuyển mà chưa mở gói, liên hệ hỗ trợ kèm mã đơn và biên lai; không chuyển tiền lần nữa.</p>
    </section>
  </div>;
}
