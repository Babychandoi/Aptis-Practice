import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { affiliateApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { AffiliateCommissionStatus, AffiliatePayoutStatus } from '@/types/api';

type Tab = 'referrals' | 'commissions' | 'payouts';

/** Nhãn tiếng Việt cho trạng thái hoa hồng. */
const COMMISSION_STATUS: Record<AffiliateCommissionStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Đang chờ', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  AVAILABLE: { label: 'Rút được', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOCKED: { label: 'Đang rút', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  PAID: { label: 'Đã trả', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Đã hủy', tone: 'bg-red-50 text-red-700 border-red-200' },
};

const PAYOUT_STATUS: Record<AffiliatePayoutStatus, { label: string; tone: string }> = {
  REQUESTED: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Đã duyệt', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  REJECTED: { label: 'Từ chối', tone: 'bg-red-50 text-red-700 border-red-200' },
  PAID: { label: 'Đã chuyển', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

/**
 * Trang giới thiệu bạn bè.
 *
 * <p>Người chưa mua gói nào vẫn vào được và thấy rõ cách hoạt động — đó là lúc
 * họ có động lực mua nhất, giấu đi thì tính năng không ai biết.
 */
export function AffiliatePage() {
  const [tab, setTab] = useState<Tab>('referrals');
  const query = useQuery({ queryKey: ['affiliate', 'me'], queryFn: affiliateApi.me });

  if (query.isPending) {
    return <LoadingBlock label="Đang tải thông tin giới thiệu…" />;
  }
  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được thông tin giới thiệu" onRetry={() => void query.refetch()} />;
  }

  const data = query.data;

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5">

      <HeroCard
        code={data.code}
        eligible={data.eligible}
        commissionPercent={data.commissionPercent}
        discountPercent={data.discountPercent}
      />

      {data.eligible && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Đã giới thiệu"
              value={`${data.referralCount} người`}
              hint="Số người đã dùng mã của bạn"
            />
            <StatCard
              label="Rút được ngay"
              value={formatCurrency(data.availableAmount)}
              hint={`Tối thiểu ${formatCurrency(data.minPayoutAmount)}`}
              highlight
            />
            <StatCard
              label="Đang chờ"
              value={formatCurrency(data.pendingAmount + data.lockedAmount)}
              hint="Chờ đối soát hoặc đang rút"
            />
            <StatCard
              label="Tổng đã nhận"
              value={formatCurrency(data.totalPaid)}
              hint={`Tổng hoa hồng ${formatCurrency(data.totalEarned)}`}
            />
          </div>

          <PayoutBox
            available={data.availableAmount}
            minimum={data.minPayoutAmount}
            hasOpenPayout={data.hasOpenPayout}
          />

          <div role="tablist" className="flex flex-wrap gap-2">
            {(
              [
                ['referrals', 'Người đã giới thiệu'],
                ['commissions', 'Lịch sử hoa hồng'],
                ['payouts', 'Lịch sử rút tiền'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={clsx(
                  'min-h-[36px] rounded-full border px-4 text-[13px] font-semibold transition-colors',
                  tab === key
                    ? 'border-transparent bg-ink text-white'
                    : 'border-transparent bg-surface-muted text-ink hover:bg-brand-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'referrals' && <ReferralTable />}
          {tab === 'commissions' && <CommissionTable />}
          {tab === 'payouts' && <PayoutTable />}
        </>
      )}
    </div>
  );
}

/** Khối đầu trang: mã giới thiệu và cách hoạt động. */
function HeroCard({
  code,
  eligible,
  commissionPercent,
  discountPercent,
}: {
  code: string | null;
  eligible: boolean;
  commissionPercent: number;
  discountPercent: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền bị tắt) — mã vẫn hiện to trên
      // màn hình để người dùng tự chép, không cần báo lỗi.
    }
  };

  return (
    <>
      <section className="relative animate-rise overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white sm:px-9">
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full border border-dashed border-white/10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Giới thiệu nhận thưởng</p>
        <h1 className="mt-3 max-w-[22ch] text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.1] tracking-[-0.035em]">
          Mời bạn bè, nhận {commissionPercent}% hoa hồng mỗi đơn họ mua
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-6 text-white/70">
          Bạn bè dùng mã của bạn được giảm {discountPercent}% khi mua gói.
        </p>

        {eligible && code ? (
          <div className="mt-6 flex max-w-lg items-center gap-3 rounded-2xl bg-white/10 p-2 pl-5">
            <span className="min-w-0 flex-1 truncate font-mono text-lg font-bold tracking-[0.2em]">{code}</span>
            <button type="button" onClick={() => void copy()} className="btn min-h-[40px] bg-white px-5 text-ink hover:bg-surface-muted">
              {copied ? 'Đã chép ✓' : 'Sao chép'}
            </button>
          </div>
        ) : (
          <div className="mt-6 max-w-lg rounded-2xl bg-white/10 p-5">
            <p className="text-sm font-semibold">Bạn chưa có mã giới thiệu</p>
            <p className="mt-1 text-sm leading-6 text-white/70">
              Mua một gói bất kỳ để nhận mã. Sau đó mỗi người dùng mã của bạn, bạn nhận {commissionPercent}% giá trị đơn của họ.
            </p>
            <Link to="/plans" className="btn mt-3 min-h-[40px] bg-white px-5 text-ink hover:bg-surface-muted">Xem các gói</Link>
          </div>
        )}
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        <Step n={1} title="Gửi mã" text="Chia sẻ mã cho bạn qua Zalo, Facebook hoặc nhóm học." />
        <Step n={2} title="Bạn mua gói" text={`Họ nhập mã khi thanh toán, được giảm ${discountPercent}%.`} />
        <Step n={3} title={`Nhận ${commissionPercent}%`} text="Hoa hồng cộng vào số dư sau khi đối soát, rút về tài khoản." />
      </ol>
    </>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="animate-rise rounded-3xl bg-surface-paper p-5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-bold text-white">{n}</span>
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-mute">{text}</p>
    </li>
  );
}

function StatCard({
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
    <div className={clsx('rounded-3xl border bg-white px-5 py-4', highlight ? 'border-ink' : 'border-border')}>
      <p className="text-xs text-ink-mute">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-8 tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-4 text-ink-faint">{hint}</p>}
    </div>
  );
}

function PayoutBox({
  available,
  minimum,
  hasOpenPayout,
}: {
  available: number;
  minimum: number;
  hasOpenPayout: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      affiliateApi.requestPayout({
        bankName: bankName.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankAccountName: accountName.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['affiliate'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu, thử lại sau'),
  });

  if (hasOpenPayout) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3.5 text-sm text-blue-900">
        Bạn có một yêu cầu rút đang được xử lý. Xem trạng thái ở tab{' '}
        <strong>Lịch sử rút tiền</strong>.
      </div>
    );
  }

  const canRequest = available >= minimum;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3.5">
        <p className="text-sm text-slate-600">
          {canRequest
            ? `Bạn có ${formatCurrency(available)} sẵn sàng rút về tài khoản ngân hàng.`
            : `Cần tối thiểu ${formatCurrency(minimum)} để rút. Hiện có ${formatCurrency(available)}.`}
        </p>
        <button
          type="button"
          disabled={!canRequest}
          onClick={() => setOpen(true)}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Yêu cầu rút tiền
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-border bg-white px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        submit.mutate();
      }}
    >
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Rút {formatCurrency(available)}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Rút toàn bộ số dư đang có. Admin duyệt rồi chuyển khoản, thường trong 1–2 ngày làm việc.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ngân hàng" value={bankName} onChange={setBankName} placeholder="Vietcombank" />
        <Field
          label="Số tài khoản"
          value={accountNumber}
          onChange={setAccountNumber}
          placeholder="0123456789"
        />
      </div>
      <Field
        label="Tên chủ tài khoản"
        value={accountName}
        onChange={setAccountName}
        placeholder="NGUYEN VAN A"
      />
      <Field label="Ghi chú (không bắt buộc)" value={note} onChange={setNote} required={false} />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submit.isPending}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {submit.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-surface"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
    </label>
  );
}

function ReferralTable() {
  const query = useQuery({
    queryKey: ['affiliate', 'referrals'],
    queryFn: () => affiliateApi.referrals(),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.content.length === 0) {
    return <EmptyBox text="Chưa có ai dùng mã của bạn. Gửi mã cho bạn bè để bắt đầu." />;
  }

  return (
    <TableShell headers={['Người dùng', 'Tham gia', 'Hoa hồng']}>
      {query.data.content.map((row) => (
        <tr key={row.id} className="border-t border-border">
          <td className="px-3 py-2.5">
            <p className="font-semibold text-slate-900">{row.referredName || 'Học viên'}</p>
            <p className="font-mono text-[11px] text-slate-500">{row.referredEmail}</p>
          </td>
          <td className="px-3 py-2.5 text-slate-600">{formatDateTime(row.joinedAt)}</td>
          <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
            {formatCurrency(row.totalCommission)}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

function CommissionTable() {
  const query = useQuery({
    queryKey: ['affiliate', 'commissions'],
    queryFn: () => affiliateApi.commissions(),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.content.length === 0) {
    return <EmptyBox text="Chưa có hoa hồng nào. Hoa hồng được ghi nhận khi đơn của người bạn giới thiệu được xác nhận." />;
  }

  return (
    <TableShell headers={['Đơn hàng', 'Giá trị đơn', 'Hoa hồng', 'Trạng thái']}>
      {query.data.content.map((row) => {
        const status = COMMISSION_STATUS[row.status];
        return (
          <tr key={row.id} className="border-t border-border">
            <td className="px-3 py-2.5">
              <p className="font-mono text-xs font-semibold text-slate-900">{row.orderCode}</p>
              <p className="text-[11px] text-slate-500">
                {row.referredEmail} · {formatDateTime(row.createdAt)}
              </p>
            </td>
            <td className="px-3 py-2.5 text-slate-600">{formatCurrency(row.baseAmount)}</td>
            <td className="px-3 py-2.5 font-bold text-emerald-700">
              {formatCurrency(row.amount)}
              <span className="ml-1 font-mono text-[10px] font-normal text-slate-400">
                {row.commissionPercent}%
              </span>
            </td>
            <td className="px-3 py-2.5">
              <Badge tone={status.tone}>{status.label}</Badge>
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

function PayoutTable() {
  const query = useQuery({
    queryKey: ['affiliate', 'payouts'],
    queryFn: () => affiliateApi.payouts(),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.content.length === 0) {
    return <EmptyBox text="Chưa có yêu cầu rút tiền nào." />;
  }

  return (
    <TableShell headers={['Số tiền', 'Tài khoản nhận', 'Trạng thái', 'Thời gian']}>
      {query.data.content.map((row) => {
        const status = PAYOUT_STATUS[row.status];
        return (
          <tr key={row.id} className="border-t border-border">
            <td className="px-3 py-2.5 font-bold text-slate-900">{formatCurrency(row.amount)}</td>
            <td className="px-3 py-2.5">
              <p className="text-slate-700">{row.bankName}</p>
              <p className="font-mono text-[11px] text-slate-500">
                {row.bankAccountNumber} · {row.bankAccountName}
              </p>
            </td>
            <td className="px-3 py-2.5">
              <Badge tone={status.tone}>{status.label}</Badge>
              {row.adminNote && (
                <p className="mt-1 text-[11px] text-slate-500">{row.adminNote}</p>
              )}
            </td>
            <td className="px-3 py-2.5 text-[11px] text-slate-500">
              <p>Gửi: {formatDateTime(row.createdAt)}</p>
              {row.paidAt && <p>Chuyển: {formatDateTime(row.paidAt)}</p>}
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

function TableShell({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-surface">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold', tone)}>
      {children}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <p className="card text-center text-sm text-slate-500">{text}</p>;
}

