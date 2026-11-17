/** Lộ trình học cá nhân (GET/PUT /study-plan). Điểm theo thang 50 của Aptis. */
export type SkillCode = 'GRAMMAR_VOCABULARY' | 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';
export type PlanPhase = 'FOUNDATION' | 'ACCELERATE' | 'SPRINT';
export type TaskType =
  | 'WARMUP' | 'GRAMMAR' | 'VOCAB' | 'PART_PRACTICE' | 'TIPS' | 'MONTHLY_FOCUS' | 'REVIEW' | 'SKILL_TEST' | 'FULL_MOCK'
  | 'PREDICTION' | 'PREDICTION_PRACTICE' | 'FEEDBACK' | 'REST' | 'DAY_OFF';

export interface StudyPlanView {
  placement: { status: 'NONE' | 'IN_PROGRESS' | 'SCORING' | 'DONE'; attemptId?: string; scores: Partial<Record<SkillCode, number>>; kind?: 'FULL' | 'SHORT' };
  /** Điểm ước lượng (test năng lực hoặc bài đã làm 60 ngày) — dùng khi chưa có lộ trình. */
  estimate: Partial<Record<SkillCode, { score: number; source: 'PLACEMENT' | 'HISTORY'; attempts: number }>>;
  plan?: StudyPlan;
  premium: boolean;
  freeDays: number;
}

export interface StudyPlan {
  targetLevel: 'B1' | 'B2' | 'C1';
  targetScore: number;
  examDate: string;
  examDateEstimated: boolean;
  minutesPerDay: number;
  startDate: string;
  phase: PlanPhase;
  dayIndex: number;
  totalDays: number;
  daysLeft: number;
  progressPercent: number;
  phases: { phase: PlanPhase; from: string; to: string; days: number }[];
  skills: { code: SkillCode; baseline?: number; baselineSource?: 'PLACEMENT' | 'HISTORY' | 'SELF'; current?: number; target: number; gap: number }[];
  today: { date: string; locked: boolean; tasks: PlanTask[] };
  week: { date: string; phase?: PlanPhase; total: number; done: number; locked: boolean; today: boolean }[];
  warnings: string[];
  /** Ngày nghỉ trong tuần, ISO 1 = thứ Hai … 7 = Chủ nhật. */
  restDays: number[];
  remindersEnabled: boolean;
  report: { last7Done: number; last7Total: number; activeDays7: number; likelihood: 'NEW' | 'HIGH' | 'MEDIUM' | 'LOW'; scoreChange?: number };
  examPassed: boolean;
  examResult?: { examDate: string; level: string; note?: string };
}

export interface PlanTask {
  key: string;
  type: TaskType;
  skill?: SkillCode;
  part?: number;
  count: number;
  minutes: number;
  done: boolean;
  carried: boolean;
  /** Bấm vào thì mở phiên luyện với đề hệ thống chọn sẵn. */
  session: boolean;
  /** Đường dẫn riêng do server đưa (xem nhận xét một bài cụ thể). */
  href?: string;
}

export interface SavePlanBody {
  targetLevel: 'B1' | 'B2' | 'C1';
  examDate: string | null;
  minutesPerDay: number;
  selfLevel?: string | null;
  restDays?: number[];
  remindersEnabled?: boolean;
}
