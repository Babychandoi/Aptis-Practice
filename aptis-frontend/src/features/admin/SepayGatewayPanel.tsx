import { useQuery } from '@tanstack/react-query';
import { adminBankTransferApi } from '@/api/adminEndpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';

export function SepayGatewayPanel() {
  const status = useQuery({ queryKey: ['admin', 'sepay-gateway', 'status'], queryFn: adminBankTransferApi.gatewayStatus });
  const events = useQuery({ queryKey: ['admin', 'sepay-gateway', 'events'], queryFn: adminBankTransferApi.gatewayEvents, refetchInterval: 10000 });
  return <section className="card space-y-3 border-emerald-200">
    <h2 className="font-semibold">Cổng thanh toán SePay · Production</h2>
    {status.data && <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-6">
      <p>{status.data.enabled ? 'Đã bật cho đơn mới' : 'Đang tắt'} · {status.data.configured ? 'Đã cấu hình khóa production' : 'Cấu hình chưa hợp lệ'} · Merchant: <strong>{status.data.merchantId || 'Chưa cấu hình'}</strong></p>
      <p>IPN production: <code className="break-all">{status.data.ipnUrl}</code></p>
      <p>SePay: tắt Test Mode, Auth Type Secret Key, khóa khớp SEPAY_IPN_SECRET (mặc định dùng SEPAY_SECRET_KEY), Content Type application/json, bật IPN.</p>
      <p>Khóa lấy từ .env trên server, không hiển thị ở đây. Đơn có QR cũ giữ luồng cũ. Chỉ sử dụng thanh toán production.</p>
    </div>}
    {(status.error || events.error) && <p role="alert" className="text-sm text-red-700">Chưa tải được trạng thái SePay production. Vui lòng tải lại trang.</p>}
    {!!events.data?.length && <div className="overflow-x-auto"><table className="w-full text-left text-xs">
      <thead><tr className="border-b"><th className="p-2">Đơn SePay</th><th className="p-2">Số tiền</th><th className="p-2">Kết quả IPN</th><th className="p-2">Thời gian</th></tr></thead>
      <tbody>{events.data.map((event) => <tr key={`${event.invoice}-${event.transactionId}-${event.receivedAt}`} className="border-b border-slate-100">
        <td className="max-w-48 break-all p-2 font-mono">{event.invoice}</td><td className="p-2">{formatCurrency(event.amount)}</td>
        <td className="p-2">{event.status === 'APPLIED' ? 'Đã xác nhận và cấp gói' : event.status === 'REVIEW' ? 'Cần đối soát' : event.status}<p className="text-slate-500">{event.reason}</p></td><td className="whitespace-nowrap p-2">{formatDateTime(event.receivedAt)}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
