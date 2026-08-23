import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useComponents, useExamVersions } from '@/features/catalog/catalogQueries';
import { practiceApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';
import type { AttemptSummary } from '@/types/api';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { componentDisplayName, componentPath } from '@/features/catalog/catalogRoutes';
import { formatPercent } from '@/lib/format';
import { ContentUpdateCard } from '@/features/learning/ContentUpdateCard';

const COMPONENT_ICONS: Record<string, IconName> = {
  GRAMMAR_VOCABULARY: 'grammar',
  READING: 'reading',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  WRITING: 'writing',
};

type IconName = 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'compass' | 'calendar' | 'trophy' | 'target' | 'clock';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const versionsQuery = useExamVersions();
  const examVersionId = versionsQuery.data?.[0]?.id;
  const componentsQuery = useComponents(examVersionId);

  // Lấy lịch sử các lượt luyện thi thực tế của học viên từ backend
  const attemptsQuery = useQuery({
    queryKey: ['user-dashboard-attempts'],
    queryFn: () => practiceApi.listAttempts(0, 50),
    enabled: Boolean(user),
    staleTime: 30 * 1000,
  });

  const rawData = attemptsQuery.data;
  const attempts: AttemptSummary[] = useMemo(() => {
    if (Array.isArray(rawData?.content)) return rawData.content;
    if (Array.isArray(rawData)) return rawData;
    return [];
  }, [rawData]);

  const completedAttempts = useMemo(
    () => attempts.filter((a: AttemptSummary) => a && a.status === 'COMPLETED'),
    [attempts],
  );
  const inProgressAttempt = useMemo(
    () => attempts.find((a: AttemptSummary) => a && a.status === 'IN_PROGRESS'),
    [attempts],
  );
  const lastAttempt = attempts[0];

  // Tính toán số liệu thống kê thật từ database
  const totalCompleted = completedAttempts.length;
  const totalItemsAnswered = useMemo(
    () => attempts.reduce((acc: number, cur: AttemptSummary) => acc + ((cur && cur.totalItems) || 0), 0),
    [attempts],
  );

  const avgPercentage = useMemo(() => {
    const scored = completedAttempts.filter((a: AttemptSummary) => a && a.percentageScore != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc: number, cur: AttemptSummary) => acc + (cur.percentageScore ?? 0), 0);
    return sum / scored.length;
  }, [completedAttempts]);

  const latestScore = useMemo(() => {
    if (!lastAttempt || lastAttempt.percentageScore == null) return null;
    return formatPercent(lastAttempt.percentageScore);
  }, [lastAttempt]);

  const lastAttemptDate = useMemo(() => {
    if (!lastAttempt?.createdAt) return null;
    const t = new Date(lastAttempt.createdAt).getTime();
    if (Number.isNaN(t)) return null;
    return new Date(t).toLocaleDateString('vi-VN');
  }, [lastAttempt]);

  // Tính toán số bài làm cho 7 ngày trong tuần hiện tại (T2 -> CN)
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7; // 0 = T2, 1 = T3, ..., 6 = CN
    
    // Tìm ngày Thứ 2 đầu tuần hiện tại
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIndex);
    monday.setHours(0, 0, 0, 0);

    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    return labels.map((label, index) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      // Đếm số bài đã nộp trong ngày này
      const count = completedAttempts.filter((a) => {
        const d = a.completedAt || a.createdAt;
        if (!d) return false;
        const time = new Date(d).getTime();
        return time >= dayStart.getTime() && time < dayEnd.getTime();
      }).length;

      const isToday = index === currentDayIndex;

      return {
        label,
        count,
        isToday,
        isCompleted: count >= 1,
        isGoalMet: count >= 3,
      };
    });
  }, [completedAttempts]);

  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayCompletedCount = weekDays[todayIndex]?.count || 0;
  const todayGoalMet = todayCompletedCount >= 3;

  if (versionsQuery.isLoading || componentsQuery.isLoading) return <LoadingBlock label="Đang tải lộ trình học…" />;
  if (versionsQuery.error || componentsQuery.error) {
    return (
      <ErrorBlock
        message="Không tải được lộ trình học"
        onRetry={() => {
          void versionsQuery.refetch();
          void componentsQuery.refetch();
        }}
      />
    );
  }

  const components = componentsQuery.data ?? [];
  const name = user?.profile?.displayName || user?.profile?.fullName || '';
  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());




  const stats = [
    {
      label: 'Bài đã hoàn thành',
      value: String(totalCompleted),
      note: totalCompleted > 0 ? `${totalCompleted} bài đã nộp` : 'Chưa có bài nộp',
      ink: totalCompleted > 0 ? 'text-brand-600' : 'text-slate-500',
    },
    {
      label: 'Tỷ lệ làm đúng TB',
      value: avgPercentage !== null ? formatPercent(avgPercentage) : '--%',
      note: avgPercentage !== null ? 'Trung bình các bài đã làm' : 'Cần làm thêm bài',
      ink: avgPercentage !== null ? 'text-brand-600' : 'text-slate-500',
    },
    {
      label: 'Tổng số câu đã làm',
      value: `${totalItemsAnswered} câu`,
      note: totalItemsAnswered > 0 ? 'Toàn bộ tiến độ' : 'Bắt đầu luyện ngay',
      ink: totalItemsAnswered > 0 ? 'text-slate-700' : 'text-slate-500',
    },
    {
      label: 'Điểm bài gần nhất',
      value: latestScore ?? '--',
      note: lastAttemptDate ? `Hoàn thành ${lastAttemptDate}` : 'Chưa có bài thi',
      ink: latestScore ? 'text-brand-600' : 'text-slate-500',
    },
  ];

  // Xác định bài để tiếp tục (Ưu tiên bài đang làm dở > bài gần nhất > mặc định)
  const resumeTarget = inProgressAttempt || lastAttempt;
  const resumeTitle = resumeTarget
    ? (resumeTarget.mode === 'MOCK_TEST' ? 'Đề thi thử đầy đủ' : 'Bài luyện Part gần nhất')
    : 'Nghe · Part 1 — Thông tin cụ thể';
  const resumeLink = resumeTarget ? `/attempts/${resumeTarget.id}` : (components[0] ? componentPath(components[0].code) : '/mock-tests');
  const resumeActionLabel = inProgressAttempt ? 'Làm tiếp bài dở →' : 'Xem lại bài gần nhất →';




  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Chào {name ? name : 'Học viên'}
          </h1>
          <p className="text-sm text-slate-500">
            {todayFormatted} · Tiếp tục kế hoạch luyện thi hôm nay
          </p>
        </div>
        <Link
          to="/mock-tests"
          className="btn-primary mt-3 inline-flex sm:mt-0"
        >
          Làm đề thi thử đầy đủ →
        </Link>
      </div>

      {/* Đề mới cập nhật; tự ẩn nếu chưa Premium hoặc chưa có đợt nào */}
      <ContentUpdateCard />

      {/* Hero Banner: Tiếp tục ở đâu bạn dừng */}
      <div className="rounded-2xl bg-dark p-6 text-white shadow-md md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Tiếp tục ở đâu bạn dừng
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {resumeTitle}
            </h2>
            <p className="text-sm text-slate-300">
              {inProgressAttempt
                ? 'Bạn có bài luyện chưa hoàn thành · Hãy tiếp tục làm để lưu kết quả'
                : 'Luyện từng câu hỏi thực tế kèm audio bản xứ · Tự lưu kết quả sau mỗi lựa chọn'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={resumeLink}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-accent px-6 text-sm font-bold text-dark shadow-sm transition-all hover:bg-accent-light"
            >
              {resumeActionLabel}
            </Link>
            <Link
              to="/mock-tests"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-700 bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Chọn đề mới
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((st) => (
          <div
            key={st.label}
            className="rounded-2xl border border-border bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          >
            <span className="block text-xs font-medium text-slate-400">{st.label}</span>
            <span className="mt-2 block font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {st.value}
            </span>
            <span className={`mt-1 block text-xs ${st.ink}`}>{st.note}</span>
          </div>
        ))}
      </div>

      {/* Main Section: 5 Kỹ năng & Mục tiêu tuần */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Five Skills List */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-baseline justify-between border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Năm kỹ năng Aptis General</h2>
              <p className="text-xs text-slate-500">Cấu trúc chuẩn kỳ thi với 600+ câu hỏi luyện tập</p>
            </div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tất cả kỹ năng
            </span>
          </div>

          <div className="mt-3 divide-y divide-border-subtle">
            {components.map((component) => (
              <Link
                key={component.id}
                to={componentPath(component.code)}
                className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface/50 rounded-xl px-2 -mx-2"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 transition-transform group-hover:scale-105">
                    <FeatureIcon name={COMPONENT_ICONS[component.code] ?? 'reading'} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {componentDisplayName(component)}
                    </h3>
                    <p className="truncate text-xs text-slate-500">
                      {component.description || 'Luyện theo cấu trúc và dạng câu hỏi Aptis.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {component.durationSeconds ? (
                    <span className="font-mono text-xs text-slate-400 hidden sm:inline">
                      {Math.round(component.durationSeconds / 60)} phút
                    </span>
                  ) : null}
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-all">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right: Weekly Goal & Study Tips */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Mục tiêu hôm nay</h2>
              <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                {todayCompletedCount} / 3 bài
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Hoàn thành đủ 3 bài mỗi ngày để duy trì thói quen</p>

            {/* 7 Days of the Week Grid */}
            <div className="mt-5 flex gap-2">
              {weekDays.map((day) => (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={clsx(
                      'relative flex h-12 w-full flex-col items-center justify-center rounded-xl text-xs transition-all',
                      day.isGoalMet
                        ? 'bg-accent text-dark font-bold shadow-sm'
                        : day.isCompleted
                        ? 'bg-brand-100 text-brand-800 font-semibold'
                        : 'bg-surface text-slate-400',
                      day.isToday && 'ring-2 ring-brand-500 ring-offset-1',
                    )}
                    title={`${day.label}: Đã làm ${day.count} bài`}
                  >
                    {day.isGoalMet ? (
                      <span className="text-sm">✓</span>
                    ) : day.count > 0 ? (
                      <span className="font-mono text-[11px]">{day.count}</span>
                    ) : (
                      <span className="text-[10px] opacity-30">•</span>
                    )}
                  </div>
                  <span
                    className={clsx(
                      'font-mono text-[10px]',
                      day.isToday ? 'font-bold text-brand-600' : 'text-slate-400',
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>

            {todayGoalMet ? (
              <div className="mt-5 flex min-h-[40px] w-full items-center justify-center rounded-xl bg-accent/30 font-semibold text-xs text-dark">
                🎉 Đã hoàn thành 3 bài hôm nay!
              </div>
            ) : (
              <Link
                to="/mock-tests"
                className="mt-5 flex min-h-[40px] w-full items-center justify-center rounded-xl bg-brand-100 font-semibold text-xs text-brand-800 transition-colors hover:bg-brand-200"
              >
                {todayCompletedCount > 0
                  ? `Làm thêm ${3 - todayCompletedCount} bài để đạt mục tiêu →`
                  : 'Làm bài ngay để đạt mục tiêu →'}
              </Link>
            )}
          </section>


          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-dark font-bold text-xs">
                TIP
              </span>
              <h2 className="text-base font-bold text-slate-900">Mẹo làm bài thi</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Khám phá chiến thuật phân bổ thời gian và mẹo tránh bẫy cho từng Part thi Aptis General.
            </p>
            <Link
              to="/meo-hoc"
              className="mt-4 inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Xem tất cả mẹo học →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    grammar: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /></>,
    reading: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
    listening: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>,
    speaking: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    writing: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m13.5 8 3 3M4 20h6" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">{paths[name]}</svg>;
}

