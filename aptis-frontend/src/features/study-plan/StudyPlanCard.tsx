import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studyPlanApi } from '@/api/endpoints';
import { Icon } from '@/components/shell/icons';
import { TaskList } from './planParts';
import { STUDY_PLAN_QUERY } from './StudyPlanPage';
import { PHASES, todayProgress, withWarmUpDone } from './studyPlanLogic';

const onboardedKey = (userId: string) => `aptis:plan-onboarded:v1:${userId}`;

/**
 * Thẻ "Hôm nay học gì" đầu trang chủ.
 *
 * Người mới (chưa có lộ trình, chưa làm bài nào) được đưa sang /lo-trinh đúng một lần
 * để làm test năng lực hoặc bấm "Làm sau"; sau đó chỉ còn thẻ mời ở đây.
 */
export function StudyPlanCard({ userId, isNewUser }: { userId?: string; isNewUser: boolean }) {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: STUDY_PLAN_QUERY, queryFn: studyPlanApi.get, enabled: Boolean(userId), staleTime: 30_000 });
  const data = query.data;

  useEffect(() => {
    if (!userId || !data || data.plan || !isNewUser) return;
    let seen = false;
    try {
      seen = localStorage.getItem(onboardedKey(userId)) === '1';
      localStorage.setItem(onboardedKey(userId), '1');
    } catch { /* ẩn danh */ }
    if (!seen) navigate('/lo-trinh');
  }, [userId, data, isNewUser, navigate]);

  if (!data) return null;
  const plan = data.plan;

  if (!plan) {
    return (
      <Link to="/lo-trinh" className="group flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-white p-5 transition-colors hover:border-ink/30 sm:p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white"><Icon name="route" className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">Chưa biết bắt đầu từ đâu? Để hệ thống xếp lộ trình cho bạn</span>
          <span className="block text-sm text-ink-mute">
            {data.placement.status === 'IN_PROGRESS' ? 'Bạn đang làm dở bài test năng lực — làm tiếp rồi đặt mục tiêu.' : 'Làm bài test năng lực, đặt mục tiêu và ngày thi — mỗi ngày chỉ việc làm theo.'}
          </span>
        </span>
        <span className="text-sm font-semibold text-ink group-hover:underline">Bắt đầu →</span>
      </Link>
    );
  }

  const tasks = withWarmUpDone(plan.today.tasks, userId, plan.today.date);
  const { done, total } = todayProgress(tasks);
  return (
    <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon name="route" className="h-4 w-4" /> Hôm nay học gì
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: PHASES[plan.phase].color }}>{PHASES[plan.phase].name}</span>
        </h2>
        <span className="text-xs text-ink-mute">
          {!plan.today.locked && total > 0 && <b className="tabular-nums text-ink">{done}/{total} việc · </b>}
          còn {plan.daysLeft} ngày tới kỳ thi · <Link to="/lo-trinh" className="font-semibold text-ink hover:underline">Xem lộ trình →</Link>
        </span>
      </header>
      {plan.today.locked ? (
        <p className="text-sm text-ink-soft">
          Đã hết {data.freeDays} ngày học thử của lộ trình. <Link to="/plans" className="font-semibold text-ink underline">Nâng cấp Premium</Link> để tiếp tục.
        </p>
      ) : (
        <TaskList tasks={tasks.slice(0, 6)} compact />
      )}
      {plan.progressPercent > 0 && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${plan.progressPercent}%` }} />
        </div>
      )}
    </section>
  );
}
