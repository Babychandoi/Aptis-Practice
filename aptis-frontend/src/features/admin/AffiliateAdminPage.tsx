import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { adminAffiliateApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { usePermission } from '@/features/admin/usePermission';
import type {
  AdminAffiliateRow,
  AffiliatePayoutStatus,
  AffiliateSettings,
} from '@/types/api';

type Tab = 'payouts' | 'accounts' | 'settings';

const PAYOUT_STATUS: Record<AffiliatePayoutStatus, { label: string; tone: string }> = {
  REQUESTED: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Đã duyệt, chờ chuyển', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  REJECTED: { label: 'Từ chối', tone: 'bg-red-50 text-red-700 border-red-200' },
  PAID: { label: 'Đã chuyển', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

/** Theo dõi và duyệt chương trình giới thiệu. */
export function AffiliateAdminPage() {
  const [tab, setTab] = useState<Tab>('payouts');
  const canManage = usePermission().has('affiliate:manage');

  const overview = useQuery({
    queryKey: ['admin', 'affiliate', 'overview'],
    queryFn: adminAffiliateApi.overview,
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Giới thiệu &amp; hoa hồng</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Duyệt yêu cầu rút tiền và theo dõi hiệu quả chương trình giới thiệu.
        </p>
      </header>

      {overview.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Chờ duyệt rút"
            value={`${overview.data.pendingPayoutCount} yêu cầu`}
            hint={formatCurrency(overview.data.pendingPayoutAmount)}
            highlight={overview.data.pendingPayoutCount > 0}
          />
          <Stat
            label="Người giới thiệu"
            value={String(overview.data.totalAffiliates)}
            hint={`${overview.data.totalReferrals} lượt giới thiệu`}
          />
          <Stat
            label="Tổng hoa hồng"
            value={formatCurrency(overview.data.totalCommission)}
            hint="Đã ghi nhận từ trước tới nay"
          />
          <Stat
            label="Đã chi trả"
            value={formatCurrency(overview.data.totalPaid)}
            hint={`Còn nợ ${formatCurrency(
              overview.data.totalCommission - overview.data.totalPaid,
            )}`}
          />
        </div>
      )}

      <div role="tablist" className="flex flex-wrap gap-2">
        {(
          [
            ['payouts', 'Yêu cầu rút tiền'],
            ['accounts', 'Người giới thiệu'],
            ['settings', 'Cấu hình'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
              tab === key
                ? 'border-transparent bg-brand-700 text-white'
                : 'border-border bg-white text-slate-700 hover:bg-surface',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'payouts' && <PayoutQueue canManage={canManage} />}
      {tab === 'accounts' && <AccountTable canManage={canManage} />}
      {tab === 'settings' && <SettingsForm canManage={canManage} />}
    </div>
  );
}

/** Hàng đợi duyệt rút tiền. */
function PayoutQueue({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('REQUESTED');
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'affiliate', 'payouts', status],
    queryFn: () => adminAffiliateApi.payouts({ status: status || undefined }),
  });

  const act = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: string; note?: string }) => {
      if (action === 'approve') return adminAffiliateApi.approve(id, note);
      if (action === 'reject') return adminAffiliateApi.reject(id, note);
      return adminAffiliateApi.markPaid(id, note);
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không thực hiện được, thử lại sau'),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          ['REQUESTED', 'Chờ duyệt'],
          ['APPROVED', 'Đã duyệt'],
          ['PAID', 'Đã chuyển'],
          ['REJECTED', 'Từ chối'],
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

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {query.isPending ? (
        <LoadingBlock label="Đang tải…" />
      ) : query.error ? (
        <ErrorBlock message="Không tải được danh sách" onRetry={() => void query.refetch()} />
      ) : query.data.content.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">Không có yêu cầu nào.</p>
      ) : (
        <div className="space-y-2.5">
          {query.data.content.map((payout) => {
            const meta = PAYOUT_STATUS[payout.status];
            return (
              <article
                key={payout.id}
                className="rounded-2xl border border-border bg-white px-4 py-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(payout.amount)}
                      </span>
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-[11px] font-bold',
                          meta.tone,
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {payout.commissionCount} khoản
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {payout.userName || 'Học viên'}{' '}
                      <span className="font-mono text-xs font-normal text-slate-500">
                        {payout.userEmail}
                      </span>
                    </p>
                    <p className="mt-1.5 rounded-lg bg-surface px-2.5 py-1.5 font-mono text-xs text-slate-700">
                      {payout.bankName} · {payout.bankAccountNumber} · {payout.bankAccountName}
                    </p>
                    {payout.note && (
                      <p className="mt-1 text-xs text-slate-500">Ghi chú: {payout.note}</p>
                    )}
                    {payout.adminNote && (
                      <p className="mt-1 text-xs text-slate-500">Admin: {payout.adminNote}</p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      Gửi {formatDateTime(payout.createdAt)}
                      {payout.reviewedAt && ` · Duyệt ${formatDateTime(payout.reviewedAt)}`}
                      {payout.paidAt && ` · Chuyển ${formatDateTime(payout.paidAt)}`}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {payout.status === 'REQUESTED' && (
                        <>
                          <ActionButton
                            tone="primary"
                            busy={act.isPending}
                            onClick={(note) =>
                              act.mutate({ id: payout.id, action: 'approve', note })
                            }
                          >
                            Duyệt
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            busy={act.isPending}
                            promptText="Lý do từ chối:"
                            onClick={(note) =>
                              act.mutate({ id: payout.id, action: 'reject', note })
                            }
                          >
                            Từ chối
                          </ActionButton>
                        </>
                      )}
                      {payout.status === 'APPROVED' && (
                        <ActionButton
                          tone="primary"
                          busy={act.isPending}
                          promptText="Mã giao dịch chuyển khoản (không bắt buộc):"
                          onClick={(note) => act.mutate({ id: payout.id, action: 'paid', note })}
                        >
                          Đã chuyển khoản
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Nút hành động có thể kèm ghi chú.
 *
 * <p>Dùng {@code window.prompt} thay vì dựng modal: đây là thao tác nội bộ của
 * admin, mỗi lần một yêu cầu, không đáng để thêm một lớp giao diện.
 */
function ActionButton({
  tone,
  busy,
  promptText,
  onClick,
  children,
}: {
  tone: 'primary' | 'danger';
  busy: boolean;
  promptText?: string;
  onClick: (note?: string) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!promptText) {
          onClick(undefined);
          return;
        }
        const note = window.prompt(promptText);
        // Bấm Cancel trả null — đừng coi đó là xác nhận.
        if (note === null) return;
        onClick(note.trim() || undefined);
      }}
      className={clsx(
        'rounded-xl px-3.5 py-2 text-sm font-bold text-white transition-colors disabled:opacity-60',
        tone === 'primary' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
      )}
    >
      {children}
    </button>
  );
}

function AccountTable({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminAffiliateRow | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'affiliate', 'accounts'],
    queryFn: () => adminAffiliateApi.accounts(),
  });

  // Job định kỳ cũng cấp mã, nhưng có nút để không phải chờ 30 phút sau khi
  // vừa cấp Premium tay cho ai đó.
  const backfill = useMutation({
    mutationFn: adminAffiliateApi.backfill,
    onSuccess: (result) => {
      setMessage(
        result.granted > 0
          ? `Đã cấp ${result.granted} mã mới`
          : 'Mọi người đủ điều kiện đều đã có mã',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: () => setMessage('Không cấp được mã, thử lại sau'),
  });

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        Người đã mua hoặc được cấp Premium tay đều được cấp mã; tài khoản dùng thử thì không.
      </p>
      <div className="flex items-center gap-2">
        {message && <span className="text-xs font-semibold text-emerald-700">{message}</span>}
        <button
          type="button"
          disabled={backfill.isPending}
          onClick={() => backfill.mutate()}
          className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface disabled:opacity-60"
        >
          {backfill.isPending ? 'Đang cấp…' : 'Cấp mã cho người đủ điều kiện'}
        </button>
      </div>
    </div>
  );

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được danh sách" onRetry={() => void query.refetch()} />;
  }
  if (query.data.content.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar}
        <p className="card text-center text-sm text-slate-500">Chưa có ai được cấp mã.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    {toolbar}
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="bg-surface">
            {['Người giới thiệu', 'Mã', 'Hoa hồng / Giảm', 'Đã giới thiệu', 'Đơn thành công', 'Tổng hoa hồng', 'Đã trả', 'Còn lại', ''].map(
              (header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {query.data.content.map((row) => (
            <tr key={row.userId} className="border-t border-border">
              <td className="px-3 py-2.5">
                <p className="font-semibold text-slate-900">{row.userName || 'Học viên'}</p>
                <p className="font-mono text-[11px] text-slate-500">{row.userEmail}</p>
              </td>
              <td className="px-3 py-2.5 font-mono text-xs font-bold tracking-wider text-slate-800">
                {row.code}
              </td>
              <td className="px-3 py-2.5">
                <span className="font-semibold text-slate-900">
                  {row.effectiveCommissionPercent}% / {row.effectiveDiscountPercent}%
                </span>
                {/* Chỉ đánh dấu dòng có thoả thuận riêng — dòng theo mức chung
                    để trống cho bảng đỡ nhiễu. */}
                {(row.commissionPercent != null || row.discountPercent != null) && (
                  <span
                    className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-800"
                    title={row.rateNote || 'Có mức riêng, khác tỉ lệ chung'}
                  >
                    riêng
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-slate-700">{row.referralCount}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.paidOrderCount}</td>
              <td className="px-3 py-2.5 font-semibold text-slate-900">
                {formatCurrency(row.totalEarned)}
              </td>
              <td className="px-3 py-2.5 text-slate-600">{formatCurrency(row.totalPaid)}</td>
              <td className="px-3 py-2.5 font-bold text-emerald-700">
                {formatCurrency(row.availableAmount)}
              </td>
              <td className="px-3 py-2.5 text-right">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Đặt mức
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {editing && <RateDialog row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/**
 * Đặt mức hoa hồng / giảm giá riêng cho một người giới thiệu.
 *
 * <p>Để trống ô nào là người đó theo tỉ lệ chung ở ô đó — khác hẳn với điền 0,
 * nên form dùng chuỗi rỗng chứ không quy về số.
 */
function RateDialog({ row, onClose }: { row: AdminAffiliateRow; onClose: () => void }) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [commission, setCommission] = useState(
    row.commissionPercent != null ? String(row.commissionPercent) : '',
  );
  const [discount, setDiscount] = useState(
    row.discountPercent != null ? String(row.discountPercent) : '',
  );
  const [note, setNote] = useState(row.rateNote ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      adminAffiliateApi.setRates(row.userId, {
        commissionPercent: commission.trim() === '' ? null : Number(commission),
        discountPercent: discount.trim() === '' ? null : Number(discount),
        rateNote: note.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const hopLe = (giaTri: string) => {
    if (giaTri.trim() === '') return true;
    const so = Number(giaTri);
    return Number.isInteger(so) && so >= 0 && so <= 100;
  };

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
        <h2 className="text-base font-bold text-slate-900">Mức riêng cho người này</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {row.userName || 'Học viên'} · <span className="font-mono">{row.userEmail}</span>
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (!hopLe(commission) || !hopLe(discount)) {
              setError('Tỉ lệ phải là số nguyên từ 0 đến 100');
              return;
            }
            save.mutate();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Hoa hồng người này nhận (%)
            </span>
            <input
              value={commission}
              inputMode="numeric"
              onChange={(event) => setCommission(event.target.value)}
              placeholder="Để trống = theo mức chung"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Giảm giá cho người nhập mã (%)
            </span>
            <input
              value={discount}
              inputMode="numeric"
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="Để trống = theo mức chung"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Ghi chú
            </span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Vì sao đặt mức này — ví dụ: giáo viên liên kết"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <p className="rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
            Để trống một ô là người này theo tỉ lệ chung ở ô đó. Điền 0 thì đúng là 0% — khác với
            để trống. Mức mới chỉ áp cho đơn phát sinh sau khi lưu; hoa hồng đã ghi nhận giữ
            nguyên tỉ lệ cũ.
          </p>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu mức'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Chỉnh tỉ lệ hoa hồng và điều kiện rút. */
function SettingsForm({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AffiliateSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'affiliate', 'settings'],
    queryFn: adminAffiliateApi.settings,
  });

  const save = useMutation({
    mutationFn: (body: AffiliateSettings) => adminAffiliateApi.updateSettings(body),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không lưu được, thử lại sau'),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được cấu hình" onRetry={() => void query.refetch()} />;
  }

  const config = draft ?? query.data;
  const update = (patch: Partial<AffiliateSettings>) => setDraft({ ...config, ...patch });

  return (
    <form
      className="max-w-2xl space-y-4 rounded-2xl border border-border bg-white px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(config);
      }}
    >
      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
        Thay đổi chỉ áp dụng cho đơn phát sinh sau khi lưu. Hoa hồng đã ghi nhận giữ nguyên tỉ lệ cũ.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Hoa hồng người giới thiệu (%)"
          value={config.commissionPercent}
          onChange={(value) => update({ commissionPercent: value })}
          disabled={!canManage}
        />
        <NumberField
          label="Giảm giá người mua (%)"
          value={config.discountPercent}
          onChange={(value) => update({ discountPercent: value })}
          disabled={!canManage}
        />
        <NumberField
          label="Rút tối thiểu (đ)"
          value={config.minPayoutAmount}
          step={10000}
          onChange={(value) => update({ minPayoutAmount: value })}
          disabled={!canManage}
        />
        <NumberField
          label="Giữ hoa hồng (ngày)"
          value={config.holdDays}
          onChange={(value) => update({ holdDays: value })}
          hint="0 = rút được ngay khi đơn xác nhận"
          disabled={!canManage}
        />
      </div>

      <div className="space-y-2.5 border-t border-border pt-3.5">
        <Toggle
          label="Ăn hoa hồng mọi đơn về sau"
          hint="Tắt: chỉ tính đơn đầu tiên của mỗi người được giới thiệu"
          checked={config.recurring}
          onChange={(checked) => update({ recurring: checked })}
          disabled={!canManage}
        />
        <Toggle
          label="Tính hoa hồng trên giá gốc"
          hint="Tắt: tính trên số tiền thực thu sau giảm giá"
          checked={config.commissionOnGross}
          onChange={(checked) => update({ commissionOnGross: checked })}
          disabled={!canManage}
        />
        <Toggle
          label="Bật chương trình giới thiệu"
          hint="Tắt: mã hiện có ngừng dùng được, hoa hồng đã ghi nhận vẫn giữ"
          checked={config.enabled}
          onChange={(checked) => update({ enabled: checked })}
          disabled={!canManage}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {save.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-700">Đã lưu</span>}
        </div>
      )}
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  step = 1,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-surface"
      />
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-[11px] leading-4 text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border px-4 py-3.5',
        highlight ? 'border-amber-300 bg-amber-50/70' : 'border-border bg-white',
      )}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={clsx(
          'mt-1 text-xl font-bold',
          highlight ? 'text-amber-800' : 'text-slate-900',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{hint}</p>}
    </div>
  );
}
