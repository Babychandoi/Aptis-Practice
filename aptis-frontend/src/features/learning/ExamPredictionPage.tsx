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
    mutationFn: ({ item, componentId }: { item: ExamPredictionItem; componentId: string }) => {
      const parts = item.partId ? [item.partId] : item.partIds;

      // KHÔNG dùng partQuestionSetCounts ở đây: nhánh đó trong AttemptService
      // gọi selectForPart(partId) và bỏ hẳn topicIds, nên ra đề bất kỳ của part
      // — bấm "Book" từng ra Part 2 của Book Club nhưng Part 3/4 của Art Club.
      //
      // Chủ đề trải nhiều Part (Writing Part 2/3/4 cùng một club) thì xin đúng
      // số Part, không xin hết đề của chủ đề: ngân hàng có nhiều bản mỗi Part
      // nên xin hết sẽ ra Part 2 hai lần, Part 3 hai lần.
      const wanted = parts.length > 1 ? parts.length : Math.max(item.questionSetCount, 1);

      return practiceApi.createCustomAttempt({
        topicIds: [item.topicId],
        // Luôn phải giới hạn phạm vi: chỉ lọc theo topicIds thì một chủ đề dùng
        // chung tên ở nhiều kỹ năng sẽ ra đề sai hẳn — nhãn "Book" của Writing
        // từng ra đề Listening vì cùng trỏ vào topic "Work And Books".
        ...(parts.length > 0 ? { partIds: parts } : { componentIds: [componentId] }),
        questionSetCount: Math.min(wanted, 12),
      });
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không mở được đề, thử lại sau'),
  });

  // `?? []` tạo mảng MỚI mỗi lần render, nên phải bọc useMemo — nếu không,
  // mọi useMemo phụ thuộc `skills` đều tính lại dù dữ liệu không đổi.
  const skills = useMemo(() => query.data?.skills ?? [], [query.data?.skills]);

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
    <div className="flex flex-col gap-6">
      <header className="flex animate-in flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Dự đoán đề · {formatDate(feed.predictDate)}
          {/* Bản tin gốc cũ hơn ngày đang xem: nói rõ dự đoán lập từ hôm nào,
              thay vì để học viên đoán mò. */}
          {feed.sourceDate && feed.sourceDate !== feed.predictDate && ` · cập nhật ${formatDate(feed.sourceDate)}`}
        </p>
        <h1 className="max-w-[18ch] text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.045em]">
          {tab === 'today' ? 'Chủ đề có khả năng ra thi' : `Chủ đề ra nhiều nhất ${HOT_MONTHS} tháng qua`}
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-6 text-ink-mute">
          Tổng hợp từ báo cáo của học viên sau mỗi kỳ thi. Dùng để ưu tiên luyện tập — không phải đề chính thức.
          {feed.source && <> Nguồn: <strong className="text-ink-soft">{feed.source}</strong>.</>}
        </p>

        <div role="tablist" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
          {(
            [
              ['today', 'Hôm nay'],
              ['hottest', `Hot nhất ${HOT_MONTHS} tháng`],
            ] as const
          ).map(([key, title]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setSkillCode(null);
                setError(null);
              }}
              className={clsx(
                'min-h-[36px] rounded-full px-4 text-[13px] font-semibold transition-colors',
                tab === key ? 'bg-ink text-white' : 'bg-surface-muted text-ink hover:bg-brand-200',
              )}
            >
              {title}
            </button>
          ))}
        </div>
      </header>

      {feed.skills.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Chưa có dự đoán nào cho khoảng thời gian này.
        </p>
      ) : tab === 'hottest' ? (
        <>
          {error && (
            <p role="alert" className="card text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Bảng xếp hạng: cả bốn kỹ năng cạnh nhau. Tab này để so sánh chủ đề
              nào hay ra nhất, nên phải thấy hết cùng lúc — ép chọn từng kỹ năng
              như tab hôm nay thì mất đúng cái người dùng cần. */}
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
            {feed.skills.map((skill) => (
              <HeatSkillColumn
                key={skill.componentId}
                skill={skill}
                busy={startAttempt.isPending}
                onStart={(item) => {
                  setError(null);
                  startAttempt.mutate({ item, componentId: skill.componentId });
                }}
              />
            ))}
          </div>
        </>
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
                        onStart={() => {
                          setError(null);
                          startAttempt.mutate({ item, componentId: activeSkill.componentId });
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

/**
 * Một cột kỹ năng trong bảng xếp hạng "hot nhất".
 *
 * Khác chip ở tab hôm nay: danh sách dọc có số thứ tự và sao, để đọc được
 * thứ hạng ngay mà không phải so từng chip.
 */
function HeatSkillColumn({
  skill,
  busy,
  onStart,
}: {
  skill: ExamPredictionSkill;
  busy: boolean;
  onStart: (item: ExamPredictionItem) => void;
}) {
  const meta = SKILL_META[skill.componentCode];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.6)]">
      <header
        className={clsx(
          "bg-gradient-to-r px-3.5 py-3 text-white",
          meta?.accent ?? "from-slate-700 to-slate-600",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-bold uppercase tracking-wide">
            {meta?.label ?? skill.componentName}
          </h2>
          <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 font-mono text-[10px] font-bold">
            {skill.topicCount} đề
          </span>
        </div>
      </header>

      <div className="space-y-2.5 p-2.5">
        {skill.sections.map((section) => (
          <section key={section.sectionLabel} className="overflow-hidden rounded-xl border border-border">
            <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-2.5 py-2">
              <h3 className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {section.sectionLabel}
              </h3>
              <span className="shrink-0 font-mono text-[9px] font-bold uppercase text-slate-400">Độ hot</span>
            </header>

            <ul className="divide-y divide-slate-100">
              {section.items.map((item, index) => (
                <li key={item.id}>
                  <HeatRow
                    item={item}
                    rank={index + 1}
                    busy={busy}
                    onStart={() => onStart(item)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

/** Một dòng trong bảng xếp hạng. */
function HeatRow({
  item,
  rank,
  busy,
  onStart,
}: {
  item: ExamPredictionItem;
  rank: number;
  busy: boolean;
  onStart: () => void;
}) {
  // Chưa có đề thì không cho bấm: tạo lượt sẽ ra rỗng và học viên tưởng lỗi.
  const empty = item.questionSetCount === 0;

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={busy || empty}
      title={
        empty
          ? "Chủ đề này chưa có đề trong ngân hàng"
          : `Luyện ngay: ${item.label} · xuất hiện ${item.repeatCount} lần`
      }
      className={clsx(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1.5 text-left transition-colors",
        empty ? "cursor-not-allowed opacity-50" : "hover:bg-surface",
      )}
    >
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-surface font-mono text-[8px] font-bold text-slate-500">
        {rank}
      </span>
      <span className="min-w-0 break-words text-[11px] font-semibold leading-[1.35] text-slate-900">
        {item.label}
      </span>
      <HeatStars level={item.heatLevel} repeatCount={item.repeatCount} />
    </button>
  );
}

/**
 * Dải 5 sao thể hiện độ hot.
 *
 * Luôn vẽ đủ 5 ngôi: chỉ vẽ số sao đạt được thì các dòng lệch nhau và không
 * so sánh được bằng mắt.
 */
function HeatStars({ level, repeatCount }: { level: number; repeatCount: number }) {
  const filled = Math.min(5, Math.max(0, level));

  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5"
      aria-label={`Độ hot ${filled} trên 5`}
      title={`Xuất hiện trong ${repeatCount} bản dự đoán`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <HeatStar key={n} filled={n <= filled} />
      ))}
    </span>
  );
}

/**
 * Ngôi sao độ hot. Component riêng chứ không thêm prop cho StarIcon: icon đó
 * dùng ở nhãn tiêu đề, đổi chữ ký sẽ kéo theo chỗ không liên quan.
 */
function HeatStar({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx(
        "h-3 w-3",
        filled ? "fill-amber-500 text-amber-500" : "fill-slate-100 text-slate-200",
      )}
    >
      <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </svg>
  );
}

function TopicChip({
  item,
  busy,
  onStart,
}: {
  item: ExamPredictionItem;
  busy: boolean;
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
            ? 'border-border bg-white text-ink hover:-translate-y-0.5 hover:border-brand-300 disabled:opacity-60'
            : 'border-border bg-white text-slate-900 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60',
      )}
    >
      <span className="min-w-0 break-words">{item.label}</span>

      <span
        className={clsx(
          'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
          item.priority === 'HOT'
            ? 'bg-ink text-white'
            : 'bg-emerald-50 text-emerald-700',
        )}
      >
        {item.priority === 'HOT' ? 'Hot' : 'Backup'}
      </span>

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
    <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-slate-800">Dự đoán đề</span>
    </nav>
  );
}
