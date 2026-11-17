import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studyPlanApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Icon } from '@/components/shell/icons';
import { cefrFromScore50, skillByCode } from '@/lib/skills';
import type { SavePlanBody, StudyPlanView } from '@/types/studyPlan';
import { GoalForm, LockedNotice, PhaseTimeline, SkillBars, TaskList, WeekStrip } from './planParts';
import { LIKELIHOOD, PHASES, PLAN_SKILLS, dayMonth, todayProgress, withWarmUpDone } from './studyPlanLogic';

export const STUDY_PLAN_QUERY = ['study-plan'] as const;

/**
 * Lộ trình học cá nhân (/lo-trinh).
 *
 * Chưa có lộ trình: bài test năng lực (có thể làm sau) → đặt mục tiêu → xếp lộ trình.
 * Đã có: việc hôm nay, tuần này, ba chặng tới ngày thi và điểm từng kỹ năng.
 */
export function StudyPlanPage() {
  const query = useQuery({ queryKey: STUDY_PLAN_QUERY, queryFn: studyPlanApi.get, staleTime: 30_000 });
  if (query.isPending) return <LoadingBlock label="Đang tải lộ trình…" />;
  if (query.error || !query.data) return <ErrorBlock message="Không tải được lộ trình" onRetry={() => void query.refetch()} />;
  return query.data.plan ? <PlanOverview view={query.data} /> : <Onboarding view={query.data} />;
}

function useSavePlan(onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SavePlanBody) => studyPlanApi.save(body),
    onSuccess: (data) => {
      client.setQueryData(STUDY_PLAN_QUERY, data);
      void client.invalidateQueries({ queryKey: ['me'] });
      onDone?.();
    },
  });
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : e ? 'Không lưu được, thử lại sau.' : null);

// ------------------------------------------------------------------ làm quen

function Onboarding({ view }: { view: StudyPlanView }) {
  const navigate = useNavigate();
  const hasHistory = Object.keys(view.estimate).length > 0;
  const placement = view.placement;
  // Người mới chưa có điểm nào: mời làm test trước; người cũ hoặc đã bấm "Làm sau" thì đặt mục tiêu.
  const [step, setStep] = useState<'test' | 'goal'>(placement.status === 'NONE' && !hasHistory ? 'test' : 'goal');
  const save = useSavePlan();
  const start = useMutation({
    mutationFn: (kind: 'FULL' | 'SHORT') => studyPlanApi.startPlacement(kind),
    onSuccess: ({ attemptId }) => navigate(`/attempts/${attemptId}`),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Lộ trình học</p>
        <h1 className="mt-1 text-2xl font-bold text-balance sm:text-3xl">Học đúng việc, mỗi ngày một ít, tới ngày thi</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hệ thống đo trình độ từng kỹ năng, so với mục tiêu của bạn rồi xếp việc học từng ngày — không phải tự chọn giữa hàng nghìn đề.
        </p>
      </header>

      <ol className="flex items-center gap-2 text-xs font-semibold text-ink-mute">
        {['Test năng lực', 'Đặt mục tiêu', 'Vào học'].map((label, i) => {
          const active = (step === 'test' && i === 0) || (step === 'goal' && i === 1);
          const done = step === 'goal' && i === 0;
          return (
            <li key={label} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${active ? 'bg-ink text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-ink-mute'}`}>
                {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={active ? 'text-ink' : ''}>{label}</span>
              {i < 2 && <span className="h-px w-6 bg-slate-300" />}
            </li>
          );
        })}
      </ol>

      {placement.status === 'IN_PROGRESS' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="flex-1">Bạn đang làm dở bài test năng lực. Làm xong thì lộ trình dùng điểm thật thay cho ước lượng.</span>
          <Link to={`/attempts/${placement.attemptId}`} className="btn-primary">Làm tiếp</Link>
        </div>
      )}
      {placement.status === 'SCORING' && (
        <p className="rounded-2xl border border-border bg-slate-50 p-4 text-sm text-ink-soft">
          Bài test năng lực đang được chấm Speaking và Writing, thường chỉ vài phút. Bạn cứ đặt mục tiêu trước — điểm sẽ tự cập nhật.
        </p>
      )}

      {step === 'test' ? (
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold">Bước 1 · Bài test năng lực</h2>
          <p className="mt-1 text-sm text-ink-soft">Đủ 5 kỹ năng như đề thi thật, để biết bạn đang ở đâu.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              { kind: 'FULL', title: 'Bài đầy đủ', time: 'Khoảng 2 giờ 40 phút', note: 'Đúng cấu trúc đề thật, cho điểm chính xác nhất.', primary: true },
              { kind: 'SHORT', title: 'Bản rút gọn', time: 'Khoảng 45 phút', note: 'Mỗi kỹ năng vài Part ngắn — nhanh, kém chính xác hơn một chút.', primary: false },
            ] as const).map((o) => (
              <button
                key={o.kind}
                type="button"
                disabled={start.isPending}
                onClick={() => start.mutate(o.kind)}
                className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${o.primary ? 'border-ink bg-ink text-white hover:bg-ink/90' : 'border-border bg-white hover:border-ink/30'}`}
              >
                <span className="block text-base font-bold">{o.title}</span>
                <span className={`block text-sm ${o.primary ? 'text-white/80' : 'text-ink-mute'}`}>{o.time}</span>
                <span className={`mt-1.5 block text-xs ${o.primary ? 'text-white/70' : 'text-ink-faint'}`}>{o.note}</span>
              </button>
            ))}
          </div>
          <ul className="mt-4 flex flex-col gap-1.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-ink-mute" /> Đủ 5 kỹ năng; thoát ra vẫn lưu, quay lại làm tiếp được</li>
            <li className="flex items-center gap-2"><Icon name="speaking" className="h-4 w-4 text-ink-mute" /> Speaking và Writing được AI chấm, có nhận xét</li>
            <li className="flex items-center gap-2"><Icon name="star" className="h-4 w-4 text-ink-mute" /> Miễn phí, mỗi tài khoản làm một lần</li>
          </ul>
          {start.error && <p className="mt-3 text-sm text-rose-700">Không tạo được bài test, thử lại sau.</p>}
          {start.isPending && <p className="mt-3 text-sm text-ink-mute">Đang chuẩn bị đề…</p>}
          <div className="mt-5">
            <button type="button" className="btn-secondary" onClick={() => setStep('goal')}>Làm sau</button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold">Bước 2 · Đặt mục tiêu</h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            {placement.status === 'DONE'
              ? 'Đã có điểm bài test năng lực của bạn.'
              : hasHistory
                ? 'Điểm hiện tại ước lượng từ các bài bạn đã làm trong 60 ngày qua.'
                : 'Chưa có bài test — lộ trình tạm dựa trên trình độ bạn tự chọn.'}
          </p>
          <GoalForm view={view} submitting={save.isPending} error={errorText(save.error)} onSubmit={(b) => save.mutate(b)} />
          {placement.status === 'NONE' && (
            <button type="button" className="mt-4 text-sm font-semibold text-ink-mute underline-offset-2 hover:underline" onClick={() => setStep('test')}>
              ← Làm bài test năng lực trước
            </button>
          )}
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ lộ trình

function PlanOverview({ view }: { view: StudyPlanView }) {
  const plan = view.plan!;
  const user = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const save = useSavePlan(() => setEditing(false));
  const tasks = withWarmUpDone(plan.today.tasks, user?.id, plan.today.date);
  const { done, total } = todayProgress(tasks);
  const target = plan.targetLevel === 'C1' ? 'C' : plan.targetLevel;
  const placementPending = view.placement.status !== 'DONE' && plan.skills.some((s) => s.baselineSource !== 'PLACEMENT');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Lộ trình của bạn</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Mục tiêu {target} · thi {dayMonth(plan.examDate)}{plan.examDateEstimated ? ' (dự kiến)' : ''}</h1>
            <p className="mt-2 text-sm text-white/75">
              Chặng <b className="text-white">{PHASES[plan.phase].name}</b> · ngày {Math.min(plan.dayIndex + 1, plan.totalDays)}/{plan.totalDays} · {plan.minutesPerDay} phút mỗi ngày
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums">{plan.daysLeft}</p>
              <p className="text-xs text-white/60">ngày tới kỳ thi</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums">{plan.progressPercent}%</p>
              <p className="text-xs text-white/60">việc đã làm</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setEditing(!editing)} className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/90 hover:bg-white/10">
          <Icon name="settings" className="h-4 w-4" /> Đổi mục tiêu
        </button>
      </section>

      {editing && (
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
          <h2 className="mb-4 text-lg font-bold">Đổi mục tiêu</h2>
          <GoalForm view={view} submitting={save.isPending} error={errorText(save.error)} onSubmit={(b) => save.mutate(b)} onCancel={() => setEditing(false)} />
        </section>
      )}

      {plan.examPassed && <ExamResultCard plan={plan} onNewGoal={() => setEditing(true)} />}

      <WeeklyReport plan={plan} />

      {plan.warnings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {plan.warnings.map((w) => (
            <li key={w} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{w}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold">Hôm nay · {dayMonth(plan.today.date)}</h2>
            {!plan.today.locked && total > 0 && <span className="text-sm tabular-nums text-ink-mute">{done}/{total} việc</span>}
          </header>
          {plan.today.locked ? (
            <LockedNotice freeDays={view.freeDays} />
          ) : tasks.length ? (
            <TaskList tasks={tasks} />
          ) : (
            <p className="text-sm text-ink-faint">Lộ trình đã kết thúc. Đổi ngày thi để xếp lộ trình mới.</p>
          )}
          <h3 className="mb-2 mt-6 text-sm font-bold">Tuần này</h3>
          <WeekStrip plan={plan} />
        </section>

        <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-base font-bold">Điểm từng kỹ năng</h2>
            <p className="text-xs text-ink-faint">Thang 50 · vạch đen là mục tiêu {target} ({plan.targetScore}/50). Điểm cập nhật sau mỗi bài test kỹ năng hoặc đề thi thử.</p>
          </header>
          <SkillBars rows={PLAN_SKILLS.map((code) => plan.skills.find((s) => s.code === code)!).filter(Boolean)} />
          {placementPending && view.placement.status === 'NONE' && (
            <Link to="/lo-trinh/test" className="mt-5 flex items-center gap-2 rounded-2xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-slate-50">
              <Icon name="tests" className="h-4 w-4" /> Làm bài test năng lực để có điểm chính xác →
            </Link>
          )}
          {view.placement.status === 'IN_PROGRESS' && (
            <Link to={`/attempts/${view.placement.attemptId}`} className="mt-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900">
              <Icon name="tests" className="h-4 w-4" /> Làm tiếp bài test năng lực →
            </Link>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold">Ba chặng tới ngày thi</h2>
        <PhaseTimeline plan={plan} />
      </section>

      {view.placement.status === 'DONE' && (
        <p className="text-center text-xs text-ink-faint">
          Điểm bài test năng lực: {PLAN_SKILLS.map((c) => {
            const s = view.placement.scores[c];
            return s == null ? null : `${skillByCode(c).nameEn} ${s} (${cefrFromScore50(s)})`;
          }).filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

type Plan = NonNullable<StudyPlanView['plan']>;

function WeeklyReport({ plan }: { plan: Plan }) {
  const r = plan.report;
  const tone = LIKELIHOOD[r.likelihood];
  const change = r.scoreChange;
  return (
    <section className="grid grid-cols-2 gap-3 rounded-3xl border border-border bg-white p-5 sm:grid-cols-4 sm:p-6">
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-4">
        <h2 className="text-base font-bold">7 ngày qua</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.tone}`}>{tone.label}</span>
      </div>
      <Stat label="Việc đã làm" value={`${r.last7Done}/${r.last7Total}`} />
      <Stat label="Ngày có học" value={`${r.activeDays7}/7`} />
      <Stat
        label="Điểm thay đổi"
        value={change == null ? '—' : `${change > 0 ? '+' : ''}${change}`}
        hint={change == null ? 'Làm bài test kỹ năng để đo' : 'tổng các kỹ năng, thang 50'}
      />
      <Stat label="Còn lại" value={`${plan.daysLeft} ngày`} hint={`tới kỳ thi ${dayMonth(plan.examDate)}`} />
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

const LEVEL_RANK = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function ExamResultCard({ plan, onNewGoal }: { plan: Plan; onNewGoal: () => void }) {
  const client = useQueryClient();
  const [level, setLevel] = useState(plan.examResult?.level ?? 'B2');
  const save = useMutation({
    mutationFn: () => studyPlanApi.reportExam(level),
    onSuccess: (data) => client.setQueryData(STUDY_PLAN_QUERY, data),
  });
  const result = plan.examResult;
  const target = plan.targetLevel === 'C1' ? 'C' : plan.targetLevel;
  const reached = !!result && result.level !== 'NA' && LEVEL_RANK.indexOf(result.level) >= LEVEL_RANK.indexOf(plan.targetLevel);
  return (
    <section className="rounded-3xl border border-ink/15 bg-slate-50 p-5 sm:p-6">
      {result ? (
        <>
          <h2 className="text-base font-bold">
            {result.level === 'NA'
              ? 'Bạn chưa có kết quả thi'
              : reached
                ? `Chúc mừng! Bạn đạt ${result.level} — đúng mục tiêu ${target}`
                : `Kết quả ${result.level} — mục tiêu là ${target}`}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {reached
              ? 'Muốn lên bậc cao hơn? Đặt mục tiêu mới, lộ trình bắt đầu lại từ điểm hiện tại.'
              : 'Đặt ngày thi mới — lộ trình mới bắt đầu từ điểm hiện tại, tập trung vào kỹ năng còn thiếu.'}
          </p>
          <button type="button" className="btn-primary mt-4" onClick={onNewGoal}>Đặt mục tiêu mới</button>
        </>
      ) : (
        <>
          <h2 className="text-base font-bold">Bạn thi thế nào?</h2>
          <p className="mt-1 text-sm text-ink-soft">Báo kết quả để hệ thống gợi ý bước tiếp theo — và để chúng tôi biết lộ trình có giúp được bạn không.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-sm">
              {LEVEL_RANK.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="NA">Chưa có kết quả / chưa thi</option>
            </select>
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Đang lưu…' : 'Gửi kết quả'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** /lo-trinh/test — bắt đầu (hoặc làm tiếp) bài test năng lực rồi chuyển vào bài. */
export function PlacementStartPage() {
  const navigate = useNavigate();
  const start = useMutation({
    mutationFn: (kind: 'FULL' | 'SHORT') => studyPlanApi.startPlacement(kind),
    onSuccess: ({ attemptId }) => navigate(`/attempts/${attemptId}`, { replace: true }),
  });
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-border bg-white p-6 text-center">
      <h1 className="text-xl font-bold">Bài test năng lực</h1>
      <p className="mt-2 text-sm text-ink-soft">Đủ 5 kỹ năng. Bản đầy đủ chính xác nhất; bản rút gọn nhanh hơn. Thoát ra vẫn lưu, quay lại làm tiếp được.</p>
      {start.error && <p className="mt-3 text-sm text-rose-700">Không tạo được bài test, thử lại sau.</p>}
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className="btn-primary" disabled={start.isPending} onClick={() => start.mutate('FULL')}>
          {start.isPending ? 'Đang chuẩn bị đề…' : 'Bài đầy đủ (~2 giờ 40)'}
        </button>
        <button type="button" className="btn-secondary" disabled={start.isPending} onClick={() => start.mutate('SHORT')}>Rút gọn (~45 phút)</button>
        <Link to="/lo-trinh" className="btn-secondary">Quay lại</Link>
      </div>
    </div>
  );
}
