import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminBankTransferApi } from '@/api/adminEndpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { confirmDialog } from '@/lib/dialog';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { BankAccount, BankTransferStatus, SaveBankAccountRequest } from '@/types/admin';
import { DataTable, PageHeader, Pager, ResultBanner } from './components/AdminUi';
import { usePermission } from './usePermission';

const PAGE_SIZE = 20;
const FILTERS: Array<{ value: BankTransferStatus | undefined; label: string }> = [
  { value: undefined, label: 'Tất cả' },
  { value: 'CLAIMED', label: 'Cần kiểm tra' },
  { value: 'PENDING', label: 'Chưa báo chuyển' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

export function BankTransferAdminPage() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const canConfirm = has('plan:write');
  const [status, setStatus] = useState<BankTransferStatus | undefined>('CLAIMED');
  const [page, setPage] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const transfersQuery = useQuery({
    queryKey: ['admin', 'bank-transfers', status, page],
    queryFn: () => adminBankTransferApi.list(status, page, PAGE_SIZE),
    placeholderData: (previous) => previous,
  });

  const accountsQuery = useQuery({
    queryKey: ['admin', 'bank-accounts'],
    queryFn: adminBankTransferApi.accounts,
    enabled: canConfirm,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      adminBankTransferApi.confirm(id, { receivedAmount: amount, note: 'Đã đối soát sao kê' }),
    onSuccess: (result) => {
      setBanner(`Đã xác nhận mã ${result.transferCode}; Premium đã được kích hoạt.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bank-transfers'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminBankTransferApi.reject(id, 'Không tìm thấy giao dịch phù hợp trên sao kê'),
    onSuccess: (result) => {
      setBanner(`Đã từ chối yêu cầu ${result.transferCode}.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bank-transfers'] });
    },
  });

  const mutationError = confirmMutation.error || rejectMutation.error;

  return (
    <div className="space-y-7">
      <PageHeader title="Đối soát chuyển khoản" description="Kiểm tra sao kê theo mã nội dung rồi xác nhận để kích hoạt Premium." />

      {banner && <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />}
      {mutationError && <ResultBanner tone="danger" message={errorMessage(mutationError, 'Không xử lý được yêu cầu')} />}

      {canConfirm && <BankAccountCard account={accountsQuery.data?.[0]} loading={accountsQuery.isPending} />}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-900">Yêu cầu chuyển khoản</h2>
            <p className="mt-1 text-xs text-stone-500">Ưu tiên các yêu cầu học viên đã báo chuyển.</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === filter.value ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
                onClick={() => { setStatus(filter.value); setPage(0); }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {transfersQuery.isPending && <LoadingBlock label="Đang tải yêu cầu chuyển khoản…" />}
        {transfersQuery.error && <ErrorBlock message={errorMessage(transfersQuery.error, 'Không tải được danh sách')} onRetry={() => void transfersQuery.refetch()} />}

        {transfersQuery.data && (
          <>
            <DataTable headers={['Mã CK', 'Mã đơn', 'Học viên', 'Số tiền', 'Trạng thái', 'Báo chuyển lúc', 'Thao tác']} isEmpty={transfersQuery.data.content.length === 0} empty="Không có yêu cầu phù hợp.">
              {transfersQuery.data.content.map((transfer) => (
                <tr key={transfer.id} className="border-b border-stone-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-brand-800">{transfer.transferCode}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">{transfer.orderCode ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-700">{transfer.userEmail ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-900">{formatCurrency(transfer.amount, transfer.currency)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><TransferStatusBadge status={transfer.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">{formatDateTime(transfer.claimedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canConfirm && ['PENDING', 'CLAIMED'].includes(transfer.status) ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-brand-800 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
                          disabled={confirmMutation.isPending || rejectMutation.isPending}
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: 'Xác nhận đã nhận tiền?',
                              text: `${formatCurrency(transfer.amount, transfer.currency)} với nội dung ${transfer.transferCode}. Người dùng sẽ được kích hoạt quyền Premium.`,
                              confirmText: 'Đã đối soát, xác nhận',
                            });
                            if (ok) confirmMutation.mutate({ id: transfer.id, amount: transfer.amount });
                          }}
                        >Xác nhận</button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          disabled={confirmMutation.isPending || rejectMutation.isPending}
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: 'Từ chối yêu cầu chuyển khoản?',
                              text: `Yêu cầu ${transfer.transferCode} sẽ bị đánh dấu từ chối và không thể hoàn tác.`,
                              confirmText: 'Từ chối',
                              danger: true,
                            });
                            if (ok) rejectMutation.mutate(transfer.id);
                          }}
                        >Từ chối</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pager page={page} totalPages={transfersQuery.data.totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}

function BankAccountCard({ account, loading }: { account?: BankAccount; loading: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SaveBankAccountRequest | null>(null);

  useEffect(() => {
    if (account && !form) {
      setForm({
        bankCode: account.bankCode,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolder: account.accountHolder,
        qrAssetId: account.qrAssetId,
        transferNote: account.transferNote ?? '',
        active: account.active,
        displayOrder: account.displayOrder,
      });
    }
  }, [account, form]);

  const saveMutation = useMutation({
    mutationFn: () => adminBankTransferApi.updateAccount(account!.id, form!),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bank-accounts'] });
    },
  });

  if (loading) return <LoadingBlock label="Đang tải tài khoản nhận tiền…" />;
  if (!account || !form) return <ResultBanner tone="danger" message="Chưa có tài khoản ngân hàng nhận tiền." />;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Tài khoản đang nhận tiền</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900">{account.bankName} · {account.accountNumber}</h2>
          <p className="mt-1 text-xs text-stone-500">{account.accountHolder || 'Chưa nhập tên chủ tài khoản'} · {account.active ? 'Đang bật' : 'Đang tắt'}</p>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => setEditing((value) => !value)}>{editing ? 'Đóng' : 'Chỉnh tài khoản'}</button>
      </div>

      {editing && (
        <form className="mt-5 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          <Field label="Mã ngân hàng" value={form.bankCode} onChange={(value) => setForm({ ...form, bankCode: value })} />
          <Field label="Tên ngân hàng" value={form.bankName} onChange={(value) => setForm({ ...form, bankName: value })} />
          <Field label="Số tài khoản" value={form.accountNumber} onChange={(value) => setForm({ ...form, accountNumber: value })} />
          <Field label="Tên chủ tài khoản" value={form.accountHolder} onChange={(value) => setForm({ ...form, accountHolder: value.toUpperCase() })} placeholder="Nhập đúng tên trên ngân hàng" />
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Cho phép nhận tiền</label>
          <div className="sm:col-span-2 lg:col-span-3"><button type="submit" className="btn-primary" disabled={!form.bankCode.trim() || !form.bankName.trim() || !form.accountNumber.trim() || !form.accountHolder.trim() || saveMutation.isPending}>{saveMutation.isPending ? 'Đang lưu…' : 'Lưu tài khoản'}</button></div>
          {saveMutation.error && <div className="sm:col-span-2 lg:col-span-4"><ResultBanner tone="danger" message={errorMessage(saveMutation.error, 'Không lưu được tài khoản')} /></div>}
        </form>
      )}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="label">{label}</span><input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TransferStatusBadge({ status }: { status: BankTransferStatus }) {
  const styles = { PENDING: 'bg-stone-100 text-stone-600', CLAIMED: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-700', EXPIRED: 'bg-stone-200 text-stone-500' };
  const labels = { PENDING: 'Chưa báo chuyển', CLAIMED: 'Cần kiểm tra', CONFIRMED: 'Đã xác nhận', REJECTED: 'Đã từ chối', EXPIRED: 'Hết hạn' };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}>{labels[status]}</span>;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
