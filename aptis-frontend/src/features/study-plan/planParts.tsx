import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { studyPlanApi } from '@/api/endpoints';
import clsx from 'clsx';
import { Icon, type IconName } from '@/components/shell/icons';
import { cefrFromScore50, skillByCode } from '@/lib/skills';
import type { PlanTask, SavePlanBody, SkillCode, StudyPlan, StudyPlanView } from '@/types/studyPlan';
import { MINUTE_OPTIONS, PHASES, PLAN_SKILLS, TARGETS, WEEKDAY_OPTIONS, dayMonth, taskView, weekday } from './studyPlanLogic';

// ------------------------------------------------------------------ việc hôm nay

export function TaskList({ tasks, compact = false }: { tasks: PlanTask[]; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => <TaskItem key={t.key} task={t} compact={compact} />)}
    </ul>
  );
}

const TYPE_ICON: Partial<Record<PlanTask['type'], IconName>> = {
  FULL_MOCK: 'doc', PREDICTION: 'trend', PREDICTION_PRACTICE: 'trend', REST: 'clock', DAY_OFF: 'clock', REVIEW: 'scoring', FEEDBACK: 'chat',
};

function TaskItem({ task: t, compact }: { task: PlanTask; compact: boolean }) {
  const navigate = useNavigate();
  const v = taskView(t);
  const skill = v.skill ? skillByCode(v.skill) : null;
  // Việc luyện: hệ thống chọn sẵn đề rồi mở lượt làm bài, không đưa học viên vào cả kho.
  const start = useMutation({
    mutationFn: () => studyPlanApi.startTask(t.key),
    onSuccess: ({ attemptId }) => navigate(`/attempts/${attemptId}`),
  });
  const actionable = !t.done && (t.session || v.href);
  const body = (
    <>
      <span
        className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', t.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-ink-soft')}
        style={!t.done && skill ? { background: skill.bg, color: skill.fg } : undefined}
      >
        <Icon name={t.done ? 'check' : TYPE_ICON[t.type] ?? skill?.icon ?? 'spark'} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={clsx('block text-sm font-semibold', t.done && 'text-ink-faint line-through decoration-1')}>
          {v.title}
          {t.carried && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 no-underline">Hôm qua còn</span>}
          {t.key.startsWith('remind:') && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 no-underline">Lâu chưa test</span>}
        </span>
        {!compact && <span className="block text-xs text-ink-faint">{start.error ? 'Không mở được phiên luyện, thử lại sau.' : v.detail}</span>}
      </span>
      {actionable && <span className="text-xs font-semibold text-ink-mute">{start.isPending ? 'Đang chọn đề…' : 'Làm →'}</span>}
      {t.done && <span className="text-xs font-semibold text-emerald-700">Xong</span>}
    </>
  );
  const box = 'flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-3 py-2.5';
  return (
    <li>
      {actionable && t.session ? (
        <button type="button" disabled={start.isPending} onClick={() => start.mutate()} className={clsx(box, 'transition-colors hover:border-ink/30 hover:bg-slate-50 disabled:opacity-70')}>
          {body}
        </button>
      ) : actionable && v.href ? (
        <Link to={v.href} className={clsx(box, 'transition-colors hover:border-ink/30 hover:bg-slate-50')}>{body}</Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}

export function LockedNotice({ freeDays }: { freeDays: number }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Bạn đã đi hết {freeDays} ngày đầu của lộ trình</p>
      <p className="mt-1">Nâng cấp Premium để mở việc học từng ngày tới hết ngày thi, cùng toàn bộ đề luyện và bài test.</p>
      <Link to="/plans" className="btn-primary mt-3 inline-flex">Nâng cấp Premium</Link>
    </div>
  );
}

// ------------------------------------------------------------------ chặng + tuần

export function PhaseTimeline({ plan }: { plan: StudyPlan }) {
  const total = plan.phases.reduce((s, p) => s + p.days, 0) || 1;
  const at = Math.min(1, Math.max(0, plan.dayIndex / total));
  return (
    <div>
      <div className="relative flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {plan.phases.map((p) => (
          <span key={p.phase} style={{ width: `${(p.days / total) * 100}%`, background: PHASES[p.phase].color, opacity: p.phase === plan.phase ? 1 : 0.35 }} />
        ))}
      </div>
      <div className="relative h-0">
        <span className="absolute -top-[15px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-ink shadow" style={{ left: `${at * 100}%` }} aria-hidden="true" />
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {plan.phases.map((p) => (
          <li key={p.phase} className={clsx('rounded-2xl border p-3', p.phase === plan.phase ? 'border-ink/20 bg-slate-50' : 'border-border')}>
            <p className="flex items-center gap-2 text-sm font-bold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PHASES[p.phase].color }} />
              {PHASES[p.phase].name}
              {p.phase === plan.phase && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">Đang ở đây</span>}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-ink-faint">{dayMonth(p.from)} – {dayMonth(p.to)} · {p.days} ngày</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{PHASES[p.phase].description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WeekStrip({ plan }: { plan: StudyPlan }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {plan.week.map((d) => {
        const past = !d.today && d.date < plan.today.date;
        const full = d.total > 0 && d.done >= d.total;
        return (
          <div
            key={d.date}
            className={clsx(
              'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center',
              d.today ? 'border-ink bg-ink text-white' : 'border-border bg-white',
              !d.phase && 'opacity-40',
            )}
          >
            <span className={clsx('text-[10px] font-semibold uppercase', d.today ? 'text-white/70' : 'text-ink-faint')}>{weekday(d.date)}</span>
            <span className="text-sm font-bold tabular-nums">{dayMonth(d.date).split('/')[0]}</span>
            {d.locked ? (
              <Icon name="lock" className="h-3.5 w-3.5 opacity-60" />
            ) : d.total > 0 ? (
              <span
                className={clsx(
                  'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                  full ? 'bg-emerald-500 text-white' : past && d.done < d.total ? 'bg-rose-100 text-rose-700' : d.today ? 'bg-white/15' : 'bg-slate-100 text-ink-mute',
                )}
              >
                {past || d.today ? `${d.done}/${d.total}` : d.total}
              </span>
            ) : (
              <span className="text-[10px] text-ink-faint">–</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ điểm kỹ năng

export function SkillBars({ rows }: { rows: { code: SkillCode; baseline?: number; current?: number; target: number }[] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => {
        const skill = skillByCode(r.code);
        const cur = r.current ?? r.baseline;
        const reached = cur != null && cur >= r.target;
        return (
          <li key={r.code}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: skill.fg }} />
                {skill.nameEn}
              </span>
              <span className="tabular-nums text-ink-mute">
                {cur == null ? <span className="text-ink-faint">chưa rõ</span> : (
                  <>
                    <b className="text-ink">{cur}</b>/50 · {cefrFromScore50(cur)}
                    {r.baseline != null && r.current != null && r.current !== r.baseline && (
                      <span className={clsx('ml-1.5 text-xs font-semibold', r.current > r.baseline ? 'text-emerald-600' : 'text-rose-600')}>
                        {r.current > r.baseline ? '+' : ''}{Math.round((r.current - r.baseline) * 10) / 10}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-slate-100">
              {cur != null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(Math.min(50, cur) / 50) * 100}%`, background: reached ? '#16A34A' : skill.fg }} />}
              <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `${(r.target / 50) * 100}%` }} title={`Mục tiêu ${r.target}/50`} />
            </div>
            {cur != null && !reached && <p className="mt-1 text-xs text-ink-faint">Còn thiếu {Math.round((r.target - cur) * 10) / 10} điểm</p>}
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ form mục tiêu

export function GoalForm({
  view,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  view: StudyPlanView;
  submitting: boolean;
  error?: string | null;
  onSubmit: (body: SavePlanBody) => void;
  onCancel?: () => void;
}) {
  const plan = view.plan;
  const [target, setTarget] = useState<SavePlanBody['targetLevel']>(plan?.targetLevel ?? 'B2');
  const [unknownDate, setUnknownDate] = useState(plan ? plan.examDateEstimated : false);
  const [examDate, setExamDate] = useState(plan && !plan.examDateEstimated ? plan.examDate : '');
  const [minutes, setMinutes] = useState(plan?.minutesPerDay ?? 60);
  const [selfLevel, setSelfLevel] = useState('B1');
  const [restDays, setRestDays] = useState<number[]>(plan?.restDays ?? []);
  const [reminders, setReminders] = useState(plan ? plan.remindersEnabled : true);
  const tomorrow = useMemo(() => {
    const d = new Date(Date.now() + 86_400_000);
    return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  }, []);

  const known = PLAN_SKILLS.filter((c) => view.estimate[c] || plan?.skills.find((s) => s.code === c)?.current != null);
  const needsSelf = !plan && known.length === 0;
  const targetScore = TARGETS.find((t) => t.level === target)!.score;
  const rows = PLAN_SKILLS.map((code) => {
    const fromPlan = plan?.skills.find((s) => s.code === code);
    return { code, current: fromPlan?.current ?? view.estimate[code]?.score, target: targetScore };
  });
  const canSubmit = (unknownDate || examDate >= tomorrow) && !submitting;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          targetLevel: target, examDate: unknownDate ? null : examDate, minutesPerDay: minutes,
          selfLevel: needsSelf ? selfLevel : null, restDays, remindersEnabled: reminders,
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-bold">Mục tiêu của bạn</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TARGETS.map((t) => (
            <label key={t.level} className={clsx('cursor-pointer rounded-2xl border p-3 transition-colors', target === t.level ? 'border-ink bg-ink text-white' : 'border-border bg-white hover:border-ink/30')}>
              <input type="radio" name="target" value={t.level} checked={target === t.level} onChange={() => setTarget(t.level)} className="sr-only" />
              <span className="block text-lg font-bold">{t.level === 'C1' ? 'C' : t.level}</span>
              <span className={clsx('block text-xs tabular-nums', target === t.level ? 'text-white/70' : 'text-ink-faint')}>từ {t.score}/50 mỗi kỹ năng</span>
              <span className={clsx('mt-1 block text-xs', target === t.level ? 'text-white/85' : 'text-ink-soft')}>{t.note}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-bold">Ngày thi</legend>
          <input
            type="date"
            min={tomorrow}
            value={examDate}
            disabled={unknownDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-ink-faint"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={unknownDate} onChange={(e) => setUnknownDate(e.target.checked)} />
            Chưa biết ngày thi (lộ trình 8 tuần)
          </label>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold">Mỗi ngày học được</legend>
          <div className="mt-2 inline-flex rounded-xl border border-border bg-white p-1">
            {MINUTE_OPTIONS.map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={clsx('rounded-lg px-4 py-1.5 text-sm font-semibold tabular-nums', minutes === m ? 'bg-ink text-white' : 'text-ink-mute')}>
                {m} phút
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-bold">Ngày nghỉ trong tuần</legend>
          <p className="text-xs text-ink-faint">Tối đa 3 ngày. Ngày nghỉ không giao việc, không dồn việc.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAY_OPTIONS.map((d) => {
              const on = restDays.includes(d.iso);
              return (
                <button
                  key={d.iso}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && restDays.length >= 3}
                  onClick={() => setRestDays(on ? restDays.filter((x) => x !== d.iso) : [...restDays, d.iso].sort())}
                  className={clsx('h-9 w-11 rounded-lg border text-sm font-semibold disabled:opacity-40', on ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink-mute')}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold">Nhắc học</legend>
          <label className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="mt-0.5" checked={reminders} onChange={(e) => setReminders(e.target.checked)} />
            <span>Gửi email nhắc khi tôi bỏ học từ 2 ngày (tối đa 3 ngày một lần)</span>
          </label>
        </fieldset>
      </div>

      {needsSelf && (
        <fieldset>
          <legend className="text-sm font-bold">Trình độ hiện tại (tự đánh giá)</legend>
          <p className="text-xs text-ink-faint">Chưa có bài test nên tạm dùng mức bạn tự chọn. Làm bài test năng lực sau để lộ trình chính xác hơn.</p>
          <select value={selfLevel} onChange={(e) => setSelfLevel(e.target.value)} className="mt-2 rounded-xl border border-border bg-white px-3 py-2 text-sm">
            {['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </fieldset>
      )}

      {known.length > 0 && (
        <div className="rounded-2xl border border-border bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold">Khoảng cách tới mục tiêu {target === 'C1' ? 'C' : target}</p>
          <SkillBars rows={rows} />
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!canSubmit} className="btn-primary min-w-[180px]">
          {submitting ? 'Đang xếp lộ trình…' : plan ? 'Cập nhật lộ trình' : 'Xếp lộ trình cho tôi'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Huỷ</button>}
      </div>
    </form>
  );
}
