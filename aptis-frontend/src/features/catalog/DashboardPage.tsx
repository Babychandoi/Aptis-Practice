import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useComponents, useExamVersions, usePartsOfComponents } from '@/features/catalog/catalogQueries';
import { aiConversationApi, dashboardApi, practiceApi, studentClassroomApi, studentWorkspaceApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';
import type { AttemptSummary, StudentAssignment } from '@/types/api';
import { componentPath } from '@/features/catalog/catalogRoutes';
import { SKILLS, cefrFromScore50, skillByCode } from '@/lib/skills';
import { Icon } from '@/components/shell/icons';

/**
 * Ngưỡng điểm trên thang 50 cho từng bậc CEFR mục tiêu.
 *
 * Khớp cefrFromScore50 để vòng điểm và nhãn bậc ở danh sách kỹ năng không nói
 * hai điều khác nhau.
 */
const LEVEL_FLOOR: Record<string, number> = { A1: 0, A2: 16, B1: 26, B2: 38, C1: 46, C2: 46, C: 46 };
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C'];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const components = componentsQuery.data ?? [];
  const partsQuery = usePartsOfComponents(components.map((c) => c.id));

  const statsQuery = useQuery({ queryKey: ['me-dashboard'], queryFn: dashboardApi.stats, staleTime: 30_000 });
  const attemptsQuery = useQuery({
    queryKey: ['user-dashboard-attempts'],
    queryFn: () => practiceApi.listAttempts(0, 20),
    staleTime: 30_000,
  });
  const loungeQuery = useQuery({ queryKey: ['ai-conversation-access'], queryFn: aiConversationApi.access, staleTime: 60_000 });
  const classroomsQuery = useQuery({ queryKey: ['my-classrooms'], queryFn: studentClassroomApi.mine, staleTime: 60_000 });

  // Bài giao của mọi lớp đang học, để lấy ra bài chưa làm gần hạn nhất.
  const usableClassrooms = (classroomsQuery.data ?? []).filter((c) => !c.locked);
  const assignmentQueries = useQueries({
    queries: usableClassrooms.map((c) => ({
      queryKey: ['classroom-assignments', c.classroomId],
      queryFn: () => studentWorkspaceApi.assignments(c.classroomId),
      staleTime: 60_000,
    })),
  });

  const attempts: AttemptSummary[] = useMemo(() => {
    const data = attemptsQuery.data as unknown;
    if (Array.isArray(data)) return data as AttemptSummary[];
    const content = (data as { content?: AttemptSummary[] } | undefined)?.content;
    return Array.isArray(content) ? content : [];
  }, [attemptsQuery.data]);

  const componentById = new Map(components.map((c) => [c.id, c]));
  const partById = new Map((partsQuery.data ?? []).map((p) => [p.id, p]));

  const attemptTitle = (a: AttemptSummary) => {
    const skill = a.componentId ? skillByCode(componentById.get(a.componentId)?.code) : null;
    const part = a.partId ? partById.get(a.partId) : undefined;
    if (a.mode === 'MOCK_TEST' && !a.componentId) return 'Đề thi thử đủ 5 kỹ năng';
    if (part) return `${skill?.nameEn ?? ''} Part ${part.displayOrder}`.trim();
    if (skill) return a.mode === 'MOCK_TEST' ? `${skill.nameEn} · bài test đầy đủ` : `${skill.nameEn} · luyện tập`;
    return 'Bài luyện tập';
  };
  const attemptSkill = (a: AttemptSummary) =>
    skillByCode(a.componentId ? componentById.get(a.componentId)?.code : partById.get(a.partId ?? '')?.componentCode);

  const inProgress = attempts.find((a) => a.status === 'IN_PROGRESS');
  const recent = attempts.filter((a) => a.status === 'COMPLETED').slice(0, 3);

  const pendingAssignment: StudentAssignment | undefined = assignmentQueries
    .flatMap((q) => q.data ?? [])
    .filter((a) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS')
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))[0];
  const pendingClassroom = usableClassrooms.find((c) => c.classroomId === pendingAssignment?.classroomId);

  // Điểm kỹ năng: đủ 5 dòng theo thứ tự cố định, kỹ năng chưa làm để trống thay
  // vì biến mất — học viên cần thấy mình còn bỏ sót kỹ năng nào.
  const scoreByCode = new Map((statsQuery.data?.skills ?? []).map((s) => [s.componentCode, s]));
  const skillRows = SKILLS.map((skill) => ({ skill, stat: scoreByCode.get(skill.code) }));
  const scored = skillRows.filter((r) => r.stat);
  const average = scored.length ? scored.reduce((sum, r) => sum + r.stat!.score50, 0) / scored.length : null;
  // Kỹ năng thấp nhất là gợi ý luyện hôm nay; chưa làm kỹ năng nào thì gợi ý Writing
  // vì đó là phần học viên mới hay bỏ qua nhất.
  const weakest = scored.length
    ? [...scored].sort((a, b) => a.stat!.score50 - b.stat!.score50)[0]!.skill
    : skillByCode('WRITING');

  const name = user?.profile?.displayName || user?.profile?.fullName?.split(' ').pop() || 'bạn';
  const examDate = user?.profile?.targetExamDate ? new Date(user.profile.targetExamDate) : null;
  const daysToExam = examDate ? Math.ceil((examDate.getTime() - Date.now()) / 86_400_000) : null;

  const currentLevel = average != null ? cefrFromScore50(average) : null;
  const targetLevel = normalizeLevel(user?.profile?.targetCefrLevel)
    ?? LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, LEVEL_ORDER.indexOf(currentLevel ?? 'A2') + 1)]!;
  const gap = average != null ? Math.max(0, (LEVEL_FLOOR[targetLevel] ?? 38) - average) : null;

  const activity = statsQuery.data?.activity ?? [];
  const maxMinutes = Math.max(30, ...activity.map((d) => d.minutes));
  const totalMinutes = activity.reduce((sum, d) => sum + d.minutes, 0);
  const loungeLeft = loungeQuery.data ? Math.floor(loungeQuery.data.dailyRemainingSeconds / 60) : null;
  const loungeLimit = loungeQuery.data ? Math.floor(loungeQuery.data.dailyLimitSeconds / 60) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Lời chào + gợi ý hôm nay */}
        <section className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white animate-rise sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-10 h-56 w-56 rounded-full border border-dashed border-white/10" />
          {(statsQuery.data?.streakDays ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {statsQuery.data!.streakDays} ngày liên tiếp
            </span>
          )}
          <h1 className="mt-4 max-w-[18ch] text-[clamp(28px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.035em]">
            {daysToExam != null && daysToExam > 0
              ? `Chào ${name}, còn ${daysToExam} ngày tới kỳ thi.`
              : `Chào ${name}, hôm nay luyện gì?`}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-6 text-white/70">
            {scored.length ? (
              <>
                Hôm nay nên làm 1 đề <strong className="text-white">{weakest.nameEn}</strong> — kỹ năng đang kéo điểm tổng của bạn xuống.
              </>
            ) : (
              <>Làm bài đầu tiên để hệ thống tính điểm từng kỹ năng và gợi ý bạn nên luyện gì mỗi ngày.</>
            )}
          </p>
          {daysToExam == null && (
            <p className="mt-2 text-xs text-white/50">
              <Link to="/profile" className="underline underline-offset-2 hover:text-white">Đặt ngày thi</Link> để hiện số ngày còn lại.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to={componentPath(weakest.code)} className="btn bg-white text-ink hover:bg-surface-muted">
              Làm bài gợi ý <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link to="/mock-tests" className="btn bg-white/10 text-white hover:bg-white/15">Mô phỏng thi</Link>
          </div>
        </section>

        {/* Điểm trung bình tới mục tiêu */}
        <section className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-white p-6 animate-rise sm:flex-row sm:p-7">
          <ScoreRing value={average} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Tiến độ tới mục tiêu</p>
            <div className="mt-3 flex items-center gap-2.5">
              <LevelChip>{currentLevel ?? '—'}</LevelChip>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-ink transition-[width] duration-700"
                  style={{ width: `${average != null ? Math.min(100, (average / (LEVEL_FLOOR[targetLevel] || 50)) * 100) : 0}%` }}
                />
              </span>
              <LevelChip dark>{targetLevel}</LevelChip>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              {average == null
                ? 'Chưa có bài nào được chấm trong 30 ngày qua.'
                : gap && gap > 0
                  ? <>Cần thêm <strong className="text-ink">{gap.toFixed(1)} điểm</strong> trung bình để chắc {targetLevel}.</>
                  : <>Bạn đang ở mức {targetLevel}. Giữ nhịp để điểm ổn định trước ngày thi.</>}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MiniCard title="Đang làm dở" tag={inProgress ? attemptSkill(inProgress).nameEn : undefined} tagColor={inProgress ? attemptSkill(inProgress) : undefined}>
          {inProgress ? (
            <>
              <p className="text-lg font-bold tracking-tight">{attemptTitle(inProgress)}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${inProgress.totalItems ? ((inProgress.answeredItems ?? 0) / inProgress.totalItems) * 100 : 0}%`,
                      background: attemptSkill(inProgress).fg,
                    }}
                  />
                </span>
                <span className="text-xs font-semibold tabular-nums text-ink-mute">
                  {inProgress.answeredItems ?? 0}/{inProgress.totalItems} câu
                </span>
              </div>
              <Link to={`/attempts/${inProgress.id}`} className="btn-primary mt-5 self-start">
                Tiếp tục <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-ink-mute">Không có bài nào đang dở. Bắt đầu một bài mới để giữ chuỗi ngày học.</p>
              <Link to="/mock-tests" className="btn-secondary mt-5 self-start">Chọn đề</Link>
            </>
          )}
        </MiniCard>

        <MiniCard
          title="Bài tập lớp"
          tag={pendingAssignment?.dueAt ? `Hạn ${formatDue(pendingAssignment.dueAt)}` : undefined}
          tagWarn={pendingAssignment?.overdue || isToday(pendingAssignment?.dueAt)}
        >
          {pendingAssignment ? (
            <>
              <p className="text-lg font-bold tracking-tight">{pendingAssignment.title}</p>
              <p className="mt-2 text-sm text-ink-mute">
                {pendingClassroom?.teacherName ? `${pendingClassroom.teacherName} · ` : ''}{pendingAssignment.classroomName}
              </p>
              <Link to={`/lop-hoc/${pendingAssignment.classroomId}`} className="btn-secondary mt-5 self-start">Xem lớp học</Link>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-ink-mute">
                {usableClassrooms.length ? 'Bạn đã làm hết bài giáo viên giao.' : 'Bạn chưa tham gia lớp nào. Nhập mã lớp giáo viên gửi để nhận bài tập.'}
              </p>
              <Link to="/lop-hoc" className="btn-secondary mt-5 self-start">
                {usableClassrooms.length ? 'Vào lớp học' : 'Tham gia lớp'}
              </Link>
            </>
          )}
        </MiniCard>

        <MiniCard
          title="AI English Lounge"
          tag={loungeLeft != null && loungeLimit != null ? `Còn ${loungeLeft}/${loungeLimit} phút` : undefined}
          plainTag
        >
          <span className="flex h-8 items-center gap-[3px]" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-ink"
                style={{ height: `${[45, 80, 100, 60, 90, 35, 70, 55][i % 8]}%` }}
              />
            ))}
          </span>
          <p className="mt-4 text-sm text-ink-mute">Luyện phản xạ nói với AI, chọn giọng nam hoặc nữ.</p>
          <Link to="/ai-english-lounge" className="btn-primary mt-5 self-start">
            <Icon name="mic" className="h-4 w-4" /> Gọi luyện nói
          </Link>
        </MiniCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold">Điểm theo kỹ năng</h2>
            <span className="text-xs text-ink-faint">30 ngày gần nhất</span>
          </header>
          <ul className="mt-2 divide-y divide-border-subtle">
            {skillRows.map(({ skill, stat }) => (
              <li key={skill.code}>
                <Link to={componentPath(skill.code)} className="flex items-center gap-3.5 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: skill.bg, color: skill.fg }}>
                    <Icon name={skill.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{skill.nameEn}</span>
                      <span className="text-sm font-bold tabular-nums">{stat ? `${Math.round(stat.score50)}/50` : '—'}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${stat ? (stat.score50 / 50) * 100 : 0}%`, background: skill.fg }}
                      />
                    </span>
                  </span>
                  <span className="w-9 shrink-0 text-center">
                    {stat ? <LevelChip>{cefrFromScore50(stat.score50)}</LevelChip> : <span className="text-[11px] text-ink-faint">Chưa làm</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col rounded-3xl border border-border bg-white p-5 sm:p-6">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold">Hoạt động 14 ngày</h2>
            <span className="text-xs text-ink-mute">
              <strong className="text-ink">{formatMinutes(totalMinutes)}</strong> luyện tập
            </span>
          </header>
          <div className="mt-5 flex min-h-[180px] flex-1 items-end gap-1.5">
            {activity.map((day, i) => {
              const last = i === activity.length - 1;
              return (
                <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span
                    title={`${formatDayMonth(day.date)}: ${day.minutes} phút`}
                    className={clsx('w-full rounded-md transition-[height] duration-700', last ? 'bg-ink' : 'bg-brand-300')}
                    style={{ height: `${Math.max(3, (day.minutes / maxMinutes) * 100)}%` }}
                  />
                  <span className="text-[10px] text-ink-faint">{weekdayShort(day.date)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold">Kết quả gần đây</h2>
          <Link to="/history" className="text-xs font-semibold text-ink-mute hover:text-ink">Xem tất cả →</Link>
        </header>
        {recent.length ? (
          <ul className="mt-2 divide-y divide-border-subtle">
            {recent.map((a) => {
              const skill = attemptSkill(a);
              const score50 = a.percentageScore != null ? a.percentageScore / 2 : null;
              return (
                <li key={a.id}>
                  <Link to={`/attempts/${a.id}/result`} className="flex items-center gap-3 py-3.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: skill.fg }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{attemptTitle(a)}</span>
                      <span className="block text-xs text-ink-faint">{formatDayMonth(a.completedAt ?? a.createdAt)}</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{score50 != null ? `${Math.round(score50)}/50` : '—'}</span>
                    {score50 != null && <LevelChip>{cefrFromScore50(score50)}</LevelChip>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">Chưa có bài nào hoàn thành.</p>
        )}
      </section>
    </div>
  );
}

function ScoreRing({ value }: { value: number | null }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const ratio = value != null ? Math.min(1, value / 50) : 0;
  return (
    <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0" role="img" aria-label={value != null ? `Điểm trung bình ${value.toFixed(0)} trên 50` : 'Chưa có điểm'}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="#F1F5F9" strokeWidth="12" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="#0F172A"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        transform="rotate(-90 80 80)"
        style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }}
      />
      <text x="80" y="84" textAnchor="middle" fontSize="40" fontWeight="800" fill="#0F172A" style={{ letterSpacing: '-0.04em' }}>
        {value != null ? Math.round(value) : '—'}
      </text>
      <text x="80" y="106" textAnchor="middle" fontSize="11" fill="#94A3B8">điểm TB / 50</text>
    </svg>
  );
}

function MiniCard({
  title,
  tag,
  tagColor,
  tagWarn,
  plainTag,
  children,
}: {
  title: string;
  tag?: string;
  tagColor?: { fg: string; bg: string };
  tagWarn?: boolean;
  plainTag?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-white p-5 animate-rise">
      <header className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{title}</span>
        {tag && (
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              plainTag ? 'text-ink' : tagWarn ? 'bg-amber-50 text-amber-700' : !tagColor && 'bg-surface-muted text-ink-soft',
            )}
            style={tagColor && !tagWarn && !plainTag ? { background: tagColor.bg, color: tagColor.fg } : undefined}
          >
            {tag}
          </span>
        )}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function LevelChip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-grid h-6 min-w-[30px] place-items-center rounded-md px-1.5 text-[11px] font-bold',
        dark ? 'bg-ink text-white' : 'bg-surface-muted text-ink',
      )}
    >
      {children}
    </span>
  );
}

function normalizeLevel(level: string | null | undefined) {
  if (!level) return null;
  return level === 'C1' || level === 'C2' ? 'C' : level;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  return h ? `${h} giờ ${minutes % 60} phút` : `${minutes} phút`;
}

function formatDayMonth(value: string) {
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function weekdayShort(value: string) {
  const day = new Date(`${value}T00:00:00`).getDay();
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day]!;
}

function isToday(value: string | null | undefined) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

function formatDue(value: string) {
  const d = new Date(value);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return isToday(value) ? `${time} hôm nay` : formatDayMonth(value);
}
