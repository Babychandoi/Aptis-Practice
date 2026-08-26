import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { examPredictionApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { formatDate } from '@/lib/format';
import type { ExamPredictionItem, ExamPredictionSkill } from '@/types/api';

type Tab = 'today' | 'hottest';

/** Số tháng cho tab "đề hot nhất". */
const HOT_MONTHS = 2;

/** Nhãn và màu theo kỹ năng, khớp cách hiển thị ở các trang khác. */
const SKILL_META: Record<string, { label: string; accent: string }> = {
  READING: { label: 'Đọc', accent: 'from-blue-600 to-cyan-500' },
  WRITING: { label: 'Viết', accent: 'from-amber-500 to-orange-500' },
  LISTENING: { label: 'Nghe', accent: 'from-emerald-600 to-teal-500' },
  SPEAKING: { label: 'Nói', accent: 'from-rose-500 to-orange-500' },
  GRAMMAR_VOCABULARY: { label: 'Ngữ pháp & Từ vựng', accent: 'from-violet-600 to-indigo-500' },
};

/**
 * Dự đoán đề: chủ đề nào có khả năng ra thi, bấm vào làm ngay đề của chủ đề đó.
 *
 * <p>Trang tự xử lý 403 để hiện PremiumGate kèm ngữ cảnh, nên không bọc
 * PremiumRoute — bọc thêm sẽ chặn trước khi gọi API và mất phần giải thích.
 */
export function ExamPredictionPage() {
  const [tab, setTab] = useState<Tab>('today');
  const [skillCode, setSkillCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['exam-predictions', tab],
    queryFn: () =>
      tab === 'today' ? examPredictionApi.today() : examPredictionApi.hottest(HOT_MONTHS),
    staleTime: 5 * 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 403) && count < 1,
  });

  const startAttempt = useMutation({
    mutationFn: (item: ExamPredictionItem) =>
      practiceApi.createCustomAttempt({
        topicIds: [item.topicId],
        // partId null = dự đoán cho cả kỹ năng, để backend tự chọn trong kỹ năng.
        ...(item.partId ? { partIds: [item.partId] } : {}),
        questionSetCount: Math.min(item.questionSetCount || 1, 10),
      }),
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không mở được đề, thử lại sau'),
  });

  const skills = query.data?.skills ?? [];
  // Chọn kỹ năng đầu khi chưa chọn, và không giữ kỹ năng đã biến mất khi đổi tab.
  const activeSkill: ExamPredictionSkill | undefined = useMemo(() => {
    if (skills.length === 0) return undefined;
    return skills.find((s) => s.componentCode === skillCode) ?? skills[0];
  }, [skills, skillCode]);

  if (query.isPending) {
    return <LoadingBlock label="Đang tải dự đoán đề…" />;
  }

  if (query.error instanceof ApiError && query.error.status === 403) {
    return (
      <div className="space-y-5">
        <Breadcrumb />
        <PremiumGate message="Dự đoán đề thuộc gói Premium. Tài khoản miễn phí làm được 3 đề thi thử đầu của mỗi kỹ năng." />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <ErrorBlock message="Không tải được dự đoán đề" onRetry={() => void query.refetch()} />
    );
  }

  const feed = query.data;

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <header className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-[0_18px_44px_-34px_rgba(234,88,12,0.5)]">
        {/* Dải nhiệt trên cùng: gợi ý "độ hot" mà không cần thêm chữ */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

        <div className="flex flex-col gap-4 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_12px_24px_-14px_rgba(234,88,12,0.85)]">
              <TrendIcon />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700">
                <StarIcon />
                Dự đoán đề Aptis
              </span>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
                {tab === 'today' ? 'Dự đoán đề hôm nay' : `Đề hot nhất ${HOT_MONTHS} tháng qua`}
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Chủ đề khả năng cao ra thi. Bấm vào một chủ đề để luyện ngay đề của chủ đề đó.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-800">
              <CalendarIcon />
              {formatDate(feed.predictDate)}
            </span>
            {feed.source && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2">
                <BookIcon />
                <span className="min-w-0">
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-amber-700">
                    Nguồn tham khảo
                  </span>
                  <span className="block truncate text-[11px] font-bold text-slate-800">
                    {feed.source}
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Tab: tin hôm nay hay thống kê nhiều tháng. Tab đang chọn dùng nền
            trắng liền với phần thân bên dưới nên nhìn ra ngay đang ở đâu. */}
        <div role="tablist" className="flex gap-1.5 border-t border-amber-200/60 bg-amber-50/50 px-2.5 pt-2.5 sm:px-4">
          {(
            [
              ['today', 'Hôm nay', 'Đề mới nhất từ admin', <ClockIcon key="c" />],
              [
                'hottest',
                `Đề hot nhất ${HOT_MONTHS} tháng qua`,
                'Xếp theo số lần lặp',
                <ListIcon key="l" />,
              ],
            ] as const
          ).map(([key, title, hint, icon]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(key);
                  setSkillCode(null);
                  setError(null);
                }}
                className={clsx(
                  'relative -mb-px flex min-w-0 flex-1 items-center gap-2.5 rounded-t-xl border border-b-0 px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-amber-300 bg-white'
                    : 'border-transparent hover:bg-white/70',
                )}
              >
                <span
                  className={clsx(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                    active
                      ? 'bg-gradient-to-br from-orange-500 to-amber-400 text-white'
                      : 'bg-white text-slate-400',
                  )}
                >
                  {icon}
                </span>
                <span className="min-w-0">
                  <span
                    className={clsx(
                      'block truncate text-xs font-bold sm:text-sm',
                      active ? 'text-slate-900' : 'text-slate-600',
                    )}
                  >
                    {title}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {feed.skills.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Chưa có dự đoán nào cho khoảng thời gian này.
        </p>
      ) : (
        <>
          {/* Chọn kỹ năng */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {feed.skills.map((skill) => {
              const meta = SKILL_META[skill.componentCode];
              const active = activeSkill?.componentCode === skill.componentCode;
              return (
                <button
                  key={skill.componentId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSkillCode(skill.componentCode)}
                  className={clsx(
                    'flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    active
                      ? `border-transparent bg-gradient-to-br text-white ${meta?.accent ?? 'from-slate-700 to-slate-600'}`
                      : 'border-border bg-white hover:bg-surface',
                  )}
                >
                  <span className="min-w-0 truncate text-sm font-bold">
                    {meta?.label ?? skill.componentName}
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
                      active ? 'bg-white/25 text-white' : 'bg-surface text-slate-600',
                    )}
                  >
                    {skill.topicCount}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="card text-sm text-red-700">
              {error}
            </p>
          )}

          {activeSkill && (
            <div className="grid gap-3 lg:grid-cols-2">
              {activeSkill.sections.map((section) => (
                <section
                  key={section.sectionLabel}
                  className="rounded-2xl border border-border bg-gradient-to-br from-surface via-white to-white p-4 transition-shadow hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-white text-slate-400">
                      <LayersIcon />
                    </span>
                    <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {section.sectionLabel}
                    </h2>
                    <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                      {section.items.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <TopicChip
                        key={item.id}
                        item={item}
                        busy={startAttempt.isPending}
                        showRepeat={tab === 'hottest'}
                        onStart={() => {
                          setError(null);
                          startAttempt.mutate(item);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TopicChip({
  item,
  busy,
  showRepeat,
  onStart,
}: {
  item: ExamPredictionItem;
  busy: boolean;
  showRepeat: boolean;
  onStart: () => void;
}) {
  // Chưa có đề thì không cho bấm: tạo lượt sẽ ra rỗng và học viên tưởng lỗi.
  const empty = item.questionSetCount === 0;

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={busy || empty}
      title={empty ? 'Chủ đề này chưa có đề trong ngân hàng' : `Luyện ngay: ${item.label}`}
      className={clsx(
        'group inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold shadow-[0_8px_18px_-16px_rgba(15,23,42,0.6)] transition-all',
        empty
          ? 'cursor-not-allowed border-dashed border-border bg-surface text-slate-400 shadow-none'
          : item.priority === 'HOT'
            ? 'border-orange-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-[0_14px_26px_-16px_rgba(234,88,12,0.45)] disabled:opacity-60'
            : 'border-border bg-white text-slate-900 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60',
      )}
    >
      <span className="min-w-0 break-words">{item.label}</span>

      <span
        className={clsx(
          'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
          item.priority === 'HOT'
            ? 'bg-gradient-to-br from-orange-500 to-amber-400 text-white'
            : 'bg-emerald-50 text-emerald-700',
        )}
      >
        {item.priority === 'HOT' ? 'Hot' : 'Backup'}
      </span>

      {showRepeat && item.repeatCount > 1 && (
        <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700">
          ×{item.repeatCount}
        </span>
      )}

      {empty ? (
        <span className="shrink-0 font-mono text-[10px]">chưa có đề</span>
      ) : (
        <span
          aria-hidden
          className="shrink-0 text-brand-700 transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </button>
  );
}

/** Icon dùng chung: nét mảnh 1.8 cho khớp phần còn lại của app. */
function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function TrendIcon() {
  return (
    <Svg size={20}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 8h4v4" />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg size={11}>
      <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg size={14}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </Svg>
  );
}

function BookIcon() {
  return (
    <Svg size={15}>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

function ListIcon() {
  return (
    <Svg>
      <path d="m3 17 2 2 4-4M3 7l2 2 4-4" />
      <path d="M13 6h8M13 12h8M13 18h8" />
    </Svg>
  );
}

function LayersIcon() {
  return (
    <Svg size={15}>
      <path d="m12 3 9 4-9 4-9-4z" />
      <path d="m5 11-2 1 9 4 9-4-2-1" />
      <path d="m5 16-2 1 9 4 9-4-2-1" />
    </Svg>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-stone-800">Dự đoán đề</span>
    </nav>
  );
}
