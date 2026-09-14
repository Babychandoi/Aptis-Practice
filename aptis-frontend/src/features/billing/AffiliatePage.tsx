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
    <div className="space-y-5">
      <Breadcrumb />

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
    <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-[0_18px_44px_-34px_rgba(5,150,105,0.5)]">
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

      <div className="space-y-4 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 px-5 py-5 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <GiftIcon />
            Giới thiệu bạn bè
          </span>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
            Giới thiệu bạn — cả hai cùng có lợi
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Bạn bè dùng mã của bạn được <strong className="text-emerald-700">giảm {discountPercent}%</strong>,
            còn bạn nhận <strong className="text-emerald-700">{commissionPercent}% hoa hồng</strong> mỗi đơn
            họ mua.
          </p>
        </div>

        {eligible && code ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-dashed border-emerald-400 bg-white px-4 py-3">
              <span className="font-mono text-xl font-bold tracking-[0.2em] text-slate-900">
                {code}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {copied ? 'Đã chép!' : 'Chép mã'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
            <p className="text-sm font-semibold text-amber-900">
              Bạn chưa có mã giới thiệu
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Mua một gói bất kỳ để nhận mã. Sau đó mỗi người dùng mã của bạn, bạn nhận{' '}
              {commissionPercent}% giá trị đơn của họ.
            </p>
            <Link
              to="/plans"
              className="mt-2.5 inline-flex rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700"
            >
              Xem các gói →
            </Link>
          </div>
        )}

        <ol className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
          <Step n={1} text="Gửi mã cho bạn bè" />
          <Step n={2} text={`Họ nhập mã khi mua, được giảm ${discountPercent}%`} />
          <Step n={3} text={`Bạn nhận ${commissionPercent}% vào số dư, rút về tài khoản`} />
        </ol>
      </div>
    </section>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-white px-3 py-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 font-mono text-[10px] font-bold text-white">
        {n}
      </span>
      <span className="leading-5">{text}</span>
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
    <div
      className={clsx(
        'rounded-2xl border px-4 py-3.5',
        highlight ? 'border-emerald-300 bg-emerald-50/60' : 'border-border bg-white',
      )}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={clsx(
          'mt-1 text-xl font-bold',
          highlight ? 'text-emerald-700' : 'text-slate-900',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{hint}</p>}
    </div>
  );
}

/** Ô gửi yêu cầu rút tiền. */
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

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 11, height: 11 }}
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13M3 12h18M12 8S9 3 6.5 4.5 8 8 12 8zM12 8s3-5 5.5-3.5S16 8 12 8z" />
    </svg>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-stone-800">Giới thiệu bạn bè</span>
    </nav>
  );
}
