import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { practiceApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { SKILLS } from '@/lib/skills';
import { Icon } from '@/components/shell/icons';
import type { AttemptStatus, AttemptSummary } from '@/types/api';
import { attemptHref, score50Of, useAttemptLabels } from './attemptLabels';

const STATUS: Record<AttemptStatus, { label: string; tone: string }> = {
  CREATED: { label: 'Chưa bắt đầu', tone: 'bg-surface-muted text-ink-soft' },
  IN_PROGRESS: { label: 'Đang làm', tone: 'bg-skill-reading-bg text-skill-reading' },
  SUBMITTED: { label: 'Đã nộp', tone: 'bg-surface-muted text-ink-soft' },
  SCORING: { label: 'Đang chấm', tone: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Đã chấm', tone: 'bg-skill-speaking-bg text-skill-speaking' },
  EXPIRED: { label: 'Hết thời gian', tone: 'bg-surface-muted text-ink-soft' },
  ABANDONED: { label: 'Bỏ dở', tone: 'bg-surface-muted text-ink-soft' },
  CANCELLED: { label: 'Đã huỷ', tone: 'bg-surface-muted text-ink-soft' },
};

const PAGE_SIZE = 20;

export function HistoryPage() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<string>('ALL');
  const { skillOf, titleOf } = useAttemptLabels();

  const historyQuery = useQuery({
    queryKey: ['attempts', page],
    queryFn: () => practiceApi.listAttempts(page, PAGE_SIZE),
  });

  if (historyQuery.isLoading) return <LoadingBlock label="Đang tải kết quả…" />;
  if (historyQuery.error || !historyQuery.data) {
    return <ErrorBlock message="Không tải được kết quả làm bài" onRetry={() => void historyQuery.refetch()} />;
  }

  const { content: attempts, hasNext, totalElements } = historyQuery.data;

  if (attempts.length === 0 && page === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="page-title">Kết quả của tôi</h1>
        <div className="rounded-3xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-ink-mute">Bạn chưa làm bài nào.</p>
          <Link to="/" className="btn-primary mt-4">Bắt đầu luyện</Link>
        </div>
      </div>
    );
  }

  // Số liệu tính trên trang đang xem (20 bài gần nhất); tổng số bài lấy từ
  // backend để không bị giới hạn bởi phân trang.
  const scored = attempts.filter((a) => a.status === 'COMPLETED' && a.percentageScore != null);
  const scores = scored.map((a) => score50Of(a)!);
  const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
  const best = scores.length ? Math.max(...scores) : null;
  const trend = [...scored].slice(0, 10).reverse().map((a) => score50Of(a)!);

  const rows = filter === 'ALL' ? attempts : attempts.filter((a) => skillOf(a).code === filter);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title animate-rise">Kết quả của tôi</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="grid grid-cols-3 gap-4 rounded-3xl border border-border bg-white p-5 animate-rise">
          <Stat label="Bài đã làm" value={String(totalElements)} />
          <Stat label="Điểm TB" value={avg != null ? avg.toFixed(1).replace('.', ',') : '—'} hint="20 bài gần nhất" />
          <Stat label="Cao nhất" value={best != null ? String(Math.round(best)) : '—'} />
        </section>
        <section className="rounded-3xl border border-border bg-white p-5 animate-rise">
          <header className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink-mute">{trend.length} bài gần nhất</span>
            {trend.length >= 2 && (
              <span className={clsx('text-xs font-bold', trend.at(-1)! >= trend[0]! ? 'text-skill-speaking' : 'text-red-600')}>
                {trend.at(-1)! >= trend[0]! ? '+' : ''}{Math.round(trend.at(-1)! - trend[0]!)} điểm
              </span>
            )}
          </header>
          <Sparkline values={trend} />
        </section>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo kỹ năng">
        {[{ code: 'ALL', label: 'Tất cả' }, ...SKILLS.map((s) => ({ code: s.code, label: s.nameEn === 'Grammar & Vocabulary' ? 'Grammar & Vocab' : s.nameEn }))].map((t) => (
          <button
            key={t.code}
            type="button"
            role="tab"
            aria-selected={filter === t.code}
            onClick={() => setFilter(t.code)}
            className={clsx(
              'min-h-[36px] rounded-full px-4 text-[13px] font-semibold transition-colors',
              filter === t.code ? 'bg-ink text-white' : 'bg-surface-muted text-ink hover:bg-brand-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="overflow-hidden rounded-3xl border border-border bg-white">
        {rows.length === 0 && <li className="p-6 text-center text-sm text-ink-mute">Trang này chưa có bài của kỹ năng này.</li>}
        {rows.map((a) => <HistoryRow key={a.id} attempt={a} title={titleOf(a)} skill={skillOf(a)} />)}
      </ul>

      {(page > 0 || hasNext) && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary">
            Trang trước
          </button>
          <span className="text-sm text-ink-mute">Trang {page + 1}</span>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className="btn-secondary">
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ attempt, title, skill }: { attempt: AttemptSummary; title: string; skill: ReturnType<ReturnType<typeof useAttemptLabels>['skillOf']> }) {
  const status = STATUS[attempt.status];
  const score = score50Of(attempt);
  return (
    <li className="border-t border-border-subtle first:border-t-0">
      <Link to={attemptHref(attempt)} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-paper">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: skill.bg, color: skill.fg }}>
          <Icon name={skill.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{title}</span>
          <span className="block text-xs text-ink-faint">
            {formatDateTime(attempt.createdAt)} · {attempt.totalItems} câu
          </span>
        </span>
        <span className={clsx('hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline', status.tone)}>{status.label}</span>
        <span className="w-16 text-right text-base font-bold tabular-nums">{score != null ? `${Math.round(score)}/50` : '—'}</span>
      </Link>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-mute">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-8 tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Đường điểm 10 bài gần nhất, trục dọc tự co theo khoảng điểm thật. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="mt-6 text-sm text-ink-faint">Làm thêm bài để thấy xu hướng điểm.</p>;
  }
  const W = 600;
  const H = 100;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - ((v - min) / (max - min)) * H] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = pts.at(-1)!;
  return (
    <svg viewBox={`0 -6 ${W} ${H + 12}`} className="mt-4 h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Xu hướng điểm">
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="#EEF2F7" />
      <polyline points={line} fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="4" fill="#0F172A" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
