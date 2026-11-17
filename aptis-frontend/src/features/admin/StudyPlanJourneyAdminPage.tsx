import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate, formatDateTime } from '@/lib/format';

type Stage = 'SIGNED_UP' | 'VISITED' | 'PLACEMENT_STARTED' | 'PLACEMENT_DONE' | 'PLAN_SET' | 'STUDIED' | 'RETAINED' | 'EXAM_REPORTED';

interface JourneyUser {
  userId: string;
  email: string;
  fullName?: string;
  signedUpAt: string;
  premium: boolean;
  visited: boolean;
  placementKind?: 'FULL' | 'SHORT';
  placementStatus?: string;
  targetLevel?: string;
  examDate?: string;
  planStart?: string;
  remindersEnabled: boolean;
  lastActiveAt?: string;
  activeDays: number;
  examResult?: string;
  stage: Stage;
}

interface JourneyOverview {
  days: number;
  funnel: { key: Stage; label: string; count: number; percent: number }[];
  placementByKind: Record<'FULL' | 'SHORT', number>;
  placementDoneByKind: Record<'FULL' | 'SHORT', number>;
  targets: Record<string, number>;
  examResults: Record<string, number>;
  examReached: number;
  remindersSent: number;
  users: JourneyUser[];
}

interface SyncHealth {
  ok: boolean;
  checks: { key: string; label: string; ok: boolean; detail: string }[];
}

const DAY_OPTIONS = [7, 30, 90] as const;

const STAGE_LABEL: Record<Stage, { label: string; tone: string }> = {
  SIGNED_UP: { label: 'Mới đăng ký', tone: 'bg-slate-100 text-slate-700' },
  VISITED: { label: 'Đã mở lộ trình', tone: 'bg-slate-100 text-slate-700' },
  PLACEMENT_STARTED: { label: 'Đang làm test', tone: 'bg-amber-100 text-amber-800' },
  PLACEMENT_DONE: { label: 'Xong test, chưa đặt mục tiêu', tone: 'bg-amber-100 text-amber-800' },
  PLAN_SET: { label: 'Có lộ trình, chưa học', tone: 'bg-sky-100 text-sky-800' },
  STUDIED: { label: 'Đã học', tone: 'bg-indigo-100 text-indigo-800' },
  RETAINED: { label: 'Còn học sau 7 ngày', tone: 'bg-emerald-100 text-emerald-800' },
  EXAM_REPORTED: { label: 'Đã báo kết quả thi', tone: 'bg-emerald-600 text-white' },
};

const kindLabel = (k?: string) => (k === 'SHORT' ? 'Rút gọn' : k === 'FULL' ? 'Đầy đủ' : '—');

/**
 * Hành trình người mới với lộ trình học: phễu từng bước và từng học viên đang dừng ở đâu.
 * Bước không bắt buộc theo thứ tự (bỏ qua test vẫn đặt được mục tiêu) nên mỗi bước đếm riêng.
 */
export function StudyPlanJourneyAdminPage() {
  const [days, setDays] = useState<number>(30);
  const [stage, setStage] = useState<Stage | ''>('');
  const query = useQuery({
    queryKey: ['admin-study-plan-journey', days, stage],
    queryFn: () => api.get<JourneyOverview>('/admin/study-plans', { params: { days, stage: stage || undefined } }).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Hành trình người mới</h1>
          <p className="mt-0.5 text-sm text-ink-mute">Người đăng ký trong {days} ngày qua đi tới bước nào của lộ trình học.</p>
        </div>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={clsx(
                'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                days === option ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-border bg-white text-ink-mute hover:bg-surface',
              )}
            >
              {option} ngày
            </button>
          ))}
        </div>
      </header>

      <SyncHealthCard />

      {query.isPending ? (
        <LoadingBlock label="Đang tải hành trình…" />
      ) : query.error || !query.data ? (
        <ErrorBlock message="Không tải được dữ liệu" onRetry={() => void query.refetch()} />
      ) : (
        <JourneyBody data={query.data} stage={stage} onStage={setStage} />
      )}
    </div>
  );
}

/** Job cập nhật đề (dự đoán, khởi động, nhập đề tuần) — lộ trình chọn đề từ các dữ liệu này. */
function SyncHealthCard() {
  const health = useQuery({
    queryKey: ['admin-sync-health'],
    queryFn: () => api.get<SyncHealth>('/admin/sync-health').then((r) => r.data),
    staleTime: 60_000,
  });
  if (!health.data) return null;
  const data = health.data;
  return (
    <section className={clsx('rounded-2xl border p-4', data.ok ? 'border-border bg-white' : 'border-rose-300 bg-rose-50')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">Nguồn đề cho lộ trình</h2>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', data.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-600 text-white')}>
          {data.ok ? 'Job chạy bình thường' : 'Có job đang lỗi'}
        </span>
      </div>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {data.checks.map((c) => (
          <li key={c.key} className="rounded-xl bg-slate-50 px-3 py-2">
            <span className={clsx('mr-1.5 font-bold', c.ok ? 'text-emerald-600' : 'text-rose-600')}>{c.ok ? '✓' : '✕'}</span>
            <span className="font-medium text-ink">{c.label}</span>
            <span className="block text-xs text-ink-mute">{c.detail}</span>
          </li>
        ))}
      </ul>
      {!data.ok && <p className="mt-2 text-xs text-rose-700">Hệ thống tự kiểm và gửi mail cảnh báo tới hộp thư vận hành lúc 8h và 22h. Log ở logs/aptisprep-sync.log và logs/aptisprep-weekly.log trên máy chủ.</p>}
    </section>
  );
}

function JourneyBody({ data, stage, onStage }: { data: JourneyOverview; stage: Stage | ''; onStage: (s: Stage | '') => void }) {
  const max = Math.max(1, data.funnel[0]?.count ?? 1);
  const doneRate = (k: 'FULL' | 'SHORT') => (data.placementByKind[k] ? Math.round((data.placementDoneByKind[k] / data.placementByKind[k]) * 100) : null);
  const resultsTotal = Object.values(data.examResults).reduce((a, b) => a + b, 0);

  return (
    <>
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-ink">Phễu hành trình</h2>
        <ol className="flex flex-col gap-2.5">
          {data.funnel.map((step, i) => {
            const prev = i > 0 ? data.funnel[i - 1]!.count : null;
            const drop = prev != null && prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : null;
            return (
              <li key={step.key} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate font-medium text-ink">{step.label}</span>
                <span className="relative h-6 overflow-hidden rounded-md bg-slate-100">
                  <span className="absolute inset-y-0 left-0 rounded-md bg-brand-600/80" style={{ width: `${(step.count / max) * 100}%` }} />
                </span>
                <span className="w-32 text-right tabular-nums text-ink-mute">
                  <b className="text-ink">{step.count}</b> · {step.percent}%
                  {drop != null && drop > 0 && <span className="ml-1 text-xs text-rose-600">−{drop}%</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-ink-faint">% tính trên số người đăng ký. Số đỏ là phần rơi so với bước ngay trên.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">Test năng lực</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {(['FULL', 'SHORT'] as const).map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-ink-mute">{kindLabel(k)}</dt>
                <dd className="tabular-nums">
                  <b>{data.placementDoneByKind[k]}</b>/{data.placementByKind[k]} làm xong
                  {doneRate(k) != null && <span className="ml-1 text-ink-faint">({doneRate(k)}%)</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">Mục tiêu đang đặt (mọi lộ trình)</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {Object.keys(data.targets).length === 0 && <p className="text-ink-faint">Chưa có lộ trình nào.</p>}
            {Object.entries(data.targets).map(([level, n]) => (
              <div key={level} className="flex justify-between"><dt className="text-ink-mute">{level === 'C1' ? 'C' : level}</dt><dd className="tabular-nums font-semibold">{n}</dd></div>
            ))}
            <div className="flex justify-between border-t border-border pt-2"><dt className="text-ink-mute">Mail nhắc học đã gửi ({data.days} ngày)</dt><dd className="tabular-nums font-semibold">{data.remindersSent}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">Kết quả thi học viên báo</h2>
          {resultsTotal === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">Chưa có ai báo kết quả.</p>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold tabular-nums">{Math.round((data.examReached / resultsTotal) * 100)}%</p>
              <p className="text-xs text-ink-faint">đạt hoặc vượt mục tiêu ({data.examReached}/{resultsTotal})</p>
              <p className="mt-2 text-xs text-ink-mute">{Object.entries(data.examResults).map(([l, n]) => `${l === 'NA' ? 'Chưa có KQ' : l}: ${n}`).join(' · ')}</p>
            </>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <h2 className="mr-auto text-sm font-bold text-ink">Từng học viên ({data.users.length})</h2>
          <select value={stage} onChange={(e) => onStage(e.target.value as Stage | '')} className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs">
            <option value="">Mọi bước</option>
            {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s].label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-mute">
              <tr>
                <th className="px-4 py-2.5">Học viên</th>
                <th className="px-4 py-2.5">Đăng ký</th>
                <th className="px-4 py-2.5">Đang ở</th>
                <th className="px-4 py-2.5">Test năng lực</th>
                <th className="px-4 py-2.5">Mục tiêu · ngày thi</th>
                <th className="px-4 py-2.5 text-right">Ngày học</th>
                <th className="px-4 py-2.5">Học gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-faint">Không có học viên nào ở bước này.</td></tr>
              )}
              {data.users.map((u) => (
                <tr key={u.userId} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <span className="block font-medium text-ink">{u.fullName || u.email}</span>
                    {u.fullName && <span className="block text-xs text-ink-faint">{u.email}</span>}
                    {u.premium && <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">Premium</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-mute">{formatDate(u.signedUpAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', STAGE_LABEL[u.stage].tone)}>{STAGE_LABEL[u.stage].label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-mute">
                    {u.placementKind ? `${kindLabel(u.placementKind)} · ${u.placementStatus === 'COMPLETED' ? 'xong' : 'đang làm'}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-ink-mute">
                    {u.targetLevel ? `${u.targetLevel === 'C1' ? 'C' : u.targetLevel} · ${formatDate(u.examDate)}` : '—'}
                    {u.examResult && <span className="ml-1 font-semibold text-ink">→ thi {u.examResult === 'NA' ? 'chưa có KQ' : u.examResult}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{u.targetLevel ? u.activeDays : '—'}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-mute">{u.lastActiveAt ? formatDateTime(u.lastActiveAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
