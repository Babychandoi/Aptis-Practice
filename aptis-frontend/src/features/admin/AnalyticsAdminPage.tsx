import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { adminAnalyticsApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDateTime } from '@/lib/format';
import type { PageViewer } from '@/types/api';

type Tab = 'pages' | 'conversion';

const DAY_OPTIONS = [7, 30, 90] as const;

/**
 * Học viên quan tâm gì.
 *
 * <p>Trả lời hai câu: trang nào được xem nhiều nhất, và bao nhiêu người ghé
 * trang nâng cấp gói mà không mua.
 */
export function AnalyticsAdminPage() {
  const [tab, setTab] = useState<Tab>('pages');
  const [days, setDays] = useState<number>(30);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Học viên quan tâm gì</h1>
          <p className="mt-0.5 text-sm text-ink-mute">
            Lượt xem từng trang và phễu mua gói.
          </p>
        </div>

        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={clsx(
                'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                days === option
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-border bg-white text-ink-mute hover:bg-surface',
              )}
            >
              {option} ngày
            </button>
          ))}
        </div>
      </header>

      <div role="tablist" className="flex flex-wrap gap-2">
        {(
          [
            ['pages', 'Trang được xem nhiều'],
            ['conversion', 'Phễu mua gói'],
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
                : 'border-border bg-white text-ink-soft hover:bg-surface',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pages' ? <PageRanking days={days} /> : <ConversionFunnel days={days} />}
    </div>
  );
}

function PageRanking({ days }: { days: number }) {
  const [openPage, setOpenPage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'analytics', 'overview', days],
    queryFn: () => adminAnalyticsApi.overview(days),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được thống kê" onRetry={() => void query.refetch()} />;
  }
  if (query.data.pages.length === 0) {
    return (
      <p className="card text-center text-sm text-ink-mute">
        Chưa có dữ liệu. Số liệu bắt đầu được ghi từ lúc tính năng này lên, cần vài ngày để đủ nhìn ra xu hướng.
      </p>
    );
  }

  const max = query.data.pages[0]?.views ?? 1;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Tổng lượt xem" value={query.data.totalViews.toLocaleString('vi-VN')} />
        <Stat
          label="Người xem nhiều nhất một trang"
          value={`${query.data.uniqueVisitors} người`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {query.data.pages.map((page) => (
          <div key={page.pageKey} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenPage(openPage === page.pageKey ? null : page.pageKey)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{page.label}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.max(2, (page.views / max) * 100)}%` }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-ink">
                  {page.views.toLocaleString('vi-VN')}
                </span>
                <span className="block text-[11px] text-ink-mute">
                  {page.uniqueUsers} người · {page.avgSeconds}s
                </span>
              </span>
            </button>

            {openPage === page.pageKey && <PageDetail pageKey={page.pageKey} days={days} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function PageDetail({ pageKey, days }: { pageKey: string; days: number }) {
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'page', pageKey, days],
    queryFn: () => adminAnalyticsApi.pageDetail(pageKey, days),
  });

  if (query.isPending) return <div className="px-4 pb-3"><LoadingBlock label="Đang tải…" /></div>;
  if (!query.data) return null;

  return (
    <div className="space-y-3 border-t border-border bg-surface/50 px-4 py-3">
      {query.data.entryPoints.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-mute">
            Đến từ trang
          </p>
          <div className="flex flex-wrap gap-1.5">
            {query.data.entryPoints.slice(0, 6).map((entry) => (
              <span
                key={entry.pageKey}
                className="rounded-lg border border-border bg-white px-2 py-1 text-[11px] text-ink-soft"
              >
                {entry.label} · {entry.views}
              </span>
            ))}
          </div>
        </div>
      )}

      {query.data.topViewers.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-mute">
            Xem nhiều nhất
          </p>
          <ViewerTable viewers={query.data.topViewers.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}

function ConversionFunnel({ days }: { days: number }) {
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'conversion', days],
    queryFn: () => adminAnalyticsApi.conversion(days),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được phễu" onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  const steps = [
    { label: 'Xem trang giá', value: data.viewedPlans },
    { label: 'Vào thanh toán', value: data.viewedCheckout },
    { label: 'Tạo đơn', value: data.placedOrder },
    { label: 'Thanh toán xong', value: data.paidOrder },
  ];
  const max = Math.max(1, ...steps.map((step) => step.value));

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-border bg-white px-4 py-4">
        {steps.map((step, index) => {
          const previous = index === 0 ? null : steps[index - 1];
          // Tỉ lệ giữ lại so với bước trước — chỗ tụt mạnh nhất là chỗ cần sửa.
          const rate =
            previous && previous.value > 0
              ? Math.round((step.value / previous.value) * 100)
              : null;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs font-semibold text-ink-soft">
                {step.label}
              </span>
              <span className="h-6 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface">
                <span
                  className="flex h-full items-center justify-end rounded-lg bg-brand-600 px-2 text-[11px] font-bold text-white"
                  style={{ width: `${Math.max(6, (step.value / max) * 100)}%` }}
                >
                  {step.value}
                </span>
              </span>
              <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-ink-mute">
                {rate === null ? '' : `${rate}%`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          {data.viewedButNotPaid.length} người xem trang giá nhưng chưa từng mua
        </p>
        <p className="mt-0.5 text-xs text-amber-800">
          Đây là nhóm đáng chăm sóc nhất — họ đã quan tâm đủ để xem giá.
        </p>
      </div>

      {data.viewedButNotPaid.length > 0 && (
        <ViewerTable viewers={data.viewedButNotPaid} />
      )}
    </div>
  );
}

function ViewerTable({ viewers }: { viewers: PageViewer[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="bg-surface">
            {['Học viên', 'Lượt xem', 'Lần cuối', 'Trạng thái'].map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-ink-mute"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viewers.map((viewer) => (
            <tr key={viewer.userId} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold text-ink">{viewer.fullName || 'Học viên'}</p>
                <p className="font-mono text-[11px] text-ink-mute">{viewer.email}</p>
              </td>
              <td className="px-3 py-2 font-bold text-ink">{viewer.views}</td>
              <td className="px-3 py-2 text-[11px] text-ink-mute">
                {formatDateTime(viewer.lastViewedAt)}
              </td>
              <td className="px-3 py-2">
                {viewer.premiumActive ? (
                  <Badge tone="bg-emerald-50 text-emerald-700 border-emerald-200">Premium</Badge>
                ) : viewer.hasPaid ? (
                  <Badge tone="bg-slate-100 text-ink-mute border-slate-200">Đã hết hạn</Badge>
                ) : (
                  <Badge tone="bg-amber-50 text-amber-700 border-amber-200">Chưa mua</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-mute">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
