import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminBankTransferApi, type SepaySettings } from '@/api/adminEndpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { BankAccount } from '@/types/admin';

const REASONS: Record<string, string> = {
  SANDBOX_TRANSACTION: 'Giao dịch mô phỏng', NOT_INCOMING: 'Tiền ra',
  BANK_ACCOUNT_MISMATCH: 'Ngân hàng/tài khoản không khớp', ORDER_BANK_MISMATCH: 'Tài khoản nhận khác với đơn',
  MISSING_OR_AMBIGUOUS_CODE: 'Thiếu mã hoặc có nhiều mã', UNKNOWN_TRANSFER_CODE: 'Không tìm thấy mã chuyển khoản',
  AMOUNT_MISMATCH: 'Số tiền không đúng', ORDER_ALREADY_PAID: 'Đơn đã thanh toán trước đó',
  ORDER_NOT_PAYABLE: 'Đơn đã bị hủy/từ chối', TRANSACTION_OUTSIDE_ORDER_WINDOW: 'Thời điểm chuyển ngoài hạn đơn',
};

export function SepaySettingsPanel({ canConfigure, accounts }: { canConfigure: boolean; accounts: BankAccount[] }) {
  const config = useQuery({ queryKey: ['admin', 'sepay', 'settings'], queryFn: adminBankTransferApi.sepaySettings, enabled: canConfigure });
  const transactions = useQuery({ queryKey: ['admin', 'sepay', 'transactions'], queryFn: adminBankTransferApi.sepayTransactions, refetchInterval: 15000 });
  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Thanh toán tự động SePay</h2><p className="mt-1 text-xs text-slate-500">Tự cấp gói sau khi nhận giao dịch ngân hàng hợp lệ.</p></div>
        {canConfigure && config.data && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.data.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{config.data.enabled ? 'Đã bật' : 'Chưa bật'}</span>}
      </div>
      {config.error && <ErrorBlock message="Không tải được cấu hình SePay" onRetry={() => void config.refetch()} />}
      {canConfigure && config.data && <ConfigForm key={`${config.data.bankAccountId}-${config.data.authMode}-${config.data.enabled}-${config.data.maskedSecret}`} settings={config.data} accounts={accounts} />}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Giao dịch SePay gần đây {transactions.data?.some((row) => row.status === 'REVIEW') && '· Có giao dịch cần kiểm tra'}</summary>
        <div className="mt-3 overflow-x-auto">
          {transactions.error && <ErrorBlock message="Không tải được giao dịch SePay" onRetry={() => void transactions.refetch()} />}
          {transactions.data?.length === 0 && <p className="text-sm text-slate-500">Chưa có giao dịch SePay. Sau khi cấu hình webhook, giao dịch nhận được sẽ xuất hiện ở đây.</p>}
          {!!transactions.data?.length && <table className="w-full text-left text-xs">
            <thead><tr className="border-b"><th className="p-2">Giao dịch</th><th className="p-2">Thời điểm</th><th className="p-2">Mã chuyển khoản</th><th className="p-2">Số tiền</th><th className="p-2">Kết quả</th></tr></thead>
            <tbody>{transactions.data.map((row) => <tr key={row.eventId} className="border-b border-slate-100">
              <td className="p-2">#{row.eventId}<div className="text-slate-500">{row.referenceCode}</div></td>
              <td className="p-2">{formatDateTime(row.transactionAt)}</td><td className="p-2 font-mono">{row.transferCode ?? '—'}</td>
              <td className="whitespace-nowrap p-2">{formatCurrency(row.amount)}</td>
              <td className={`p-2 ${row.status === 'REVIEW' ? 'text-amber-800' : row.status === 'APPLIED' ? 'text-emerald-700' : 'text-slate-500'}`}>{row.status === 'APPLIED' ? 'Đã tự cấp gói' : row.reason ? REASONS[row.reason] ?? row.reason : row.status}</td>
            </tr>)}</tbody>
          </table>}
        </div>
      </details>
    </section>
  );
}

function ConfigForm({ settings, accounts }: { settings: SepaySettings; accounts: BankAccount[] }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [bankAccountId, setBankAccountId] = useState(settings.bankAccountId ?? '');
  const [authMode, setAuthMode] = useState(settings.authMode);
  const [secret, setSecret] = useState('');
  const [notice, setNotice] = useState('');
  const save = useMutation({ mutationFn: () => adminBankTransferApi.saveSepaySettings({ enabled, bankAccountId: bankAccountId || null, authMode, ...(secret ? { secret } : {}) }),
    onSuccess: () => { setNotice('Đã lưu cấu hình SePay.'); void queryClient.invalidateQueries({ queryKey: ['admin', 'sepay', 'settings'] }); },
  });
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('Đã sao chép.'); }
    catch { setNotice('Không sao chép được. Hãy chọn và sao chép nội dung trực tiếp.'); }
  };
  const generate = () => setSecret(Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, '0')).join(''));
  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="rounded-xl bg-slate-50 p-3 text-xs leading-6">
        <p>Trên SePay → Tích hợp → Webhooks: chọn <strong>Tiền vào</strong>, đúng ngân hàng nhận tiền, JSON và bật tự gửi lại khi lỗi.</p>
        <p>URL webhook: <code className="break-all">{settings.webhookUrl}</code> <button type="button" className="font-semibold text-brand-800" onClick={() => void copy(settings.webhookUrl)}>Sao chép URL</button></p>
        <p>Chọn cùng kiểu xác thực và cùng khóa ở hai bên. Lưu khóa trước, dùng “Gửi thử” trên SePay, rồi bật tự động xác nhận.</p>
        <p>Mã thanh toán mới: tiền tố <strong>AP</strong>, hậu tố <strong>8 chữ số</strong>. Trong thời gian chuyển đổi, cho phép webhook gửi cả giao dịch không nhận diện mã để xử lý các mã số cũ.</p>
        <p>Dùng webhook <strong>Live</strong> cho thanh toán thật.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Ngân hàng đã liên kết SePay
          <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="input mt-1 w-full" required={enabled}>
            <option value="">Chọn ngân hàng nhận tiền</option>{accounts.filter((account) => account.active || account.id === bankAccountId).map((account) => <option key={account.id} value={account.id}>{account.bankName} · {account.accountNumber}{account.active ? '' : ' (đang tắt)'}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Xác thực webhook
          <select value={authMode} onChange={(event) => setAuthMode(event.target.value as SepaySettings['authMode'])} className="input mt-1 w-full"><option value="HMAC">HMAC-SHA256 (khuyến nghị)</option><option value="API_KEY">API Key</option></select>
        </label>
      </div>
      <label className="block text-xs font-semibold">{authMode === 'HMAC' ? 'Secret Key của webhook' : 'API Key của webhook'} {settings.secretConfigured && <span className="font-normal text-slate-500">· Đã lưu {settings.maskedSecret}</span>}
        <input type="password" autoComplete="new-password" value={secret} minLength={32} maxLength={256} onChange={(event) => setSecret(event.target.value)} placeholder={settings.secretConfigured ? 'Để trống để giữ khóa đang dùng' : 'Nhập khóa hoặc tạo khóa mới'} className="input mt-1 w-full" />
      </label>
      <div className="flex flex-wrap gap-3 text-xs"><button type="button" className="btn-secondary" onClick={generate}>Tạo khóa mới</button>{secret && <button type="button" className="btn-secondary" onClick={() => void copy(secret)}>Sao chép khóa</button>}<p className="self-center text-slate-500">Sao chép khóa sang SePay trước khi lưu; khóa đầy đủ không được đọc lại.</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Bật tự động xác nhận chuyển khoản</label>
      {save.error && <p role="alert" className="text-sm text-red-700">{save.error instanceof ApiError ? save.error.message : 'Không lưu được cấu hình SePay'}</p>}
      {notice && <p role="status" className="text-sm text-brand-800">{notice}</p>}
      <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu cấu hình SePay'}</button>
    </form>
  );
}
