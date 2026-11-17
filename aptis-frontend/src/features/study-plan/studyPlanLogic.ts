import type { PlanPhase, PlanTask, SkillCode } from '@/types/studyPlan';
import { skillByCode } from '@/lib/skills';
import { warmUpDoneKey } from '@/features/daily-warm-up/warmUpLogic';

/** Tên, mô tả và màu của ba chặng lộ trình. */
export const PHASES: Record<PlanPhase, { name: string; short: string; description: string; color: string }> = {
  FOUNDATION: {
    name: 'Nền tảng',
    short: 'Nền tảng',
    description: 'Luyện theo từng Part ở kỹ năng thiếu điểm nhất, đọc mẹo làm bài.',
    color: '#2563EB',
  },
  ACCELERATE: {
    name: 'Tăng tốc',
    short: 'Tăng tốc',
    description: 'Đề trọng điểm tháng, mỗi tuần một bài test kỹ năng và một đề đủ 5 kỹ năng.',
    color: '#D97706',
  },
  SPRINT: {
    name: 'Nước rút',
    short: 'Nước rút',
    description: 'Dự đoán đề mỗi ngày, cách hai ngày một đề thi thử đủ 5 kỹ năng.',
    color: '#DC2626',
  },
};

export const TARGETS = [
  { level: 'B1', score: 26, note: 'Đủ chuẩn đầu ra phổ biến của nhiều trường' },
  { level: 'B2', score: 38, note: 'Chuẩn cho giáo viên, công chức, du học' },
  { level: 'C1', score: 46, note: 'Mức cao nhất của Aptis General' },
] as const;

export const MINUTE_OPTIONS = [30, 60, 90] as const;

/** Thứ tự kỹ năng hiển thị trong lộ trình. */
export const PLAN_SKILLS: SkillCode[] = ['GRAMMAR_VOCABULARY', 'LISTENING', 'READING', 'SPEAKING', 'WRITING'];

/** Slug trang Đề trọng điểm tháng theo Part kho (Reading của web đánh số khác). */
function focusPath(skill: SkillCode, part: number): string {
  if (skill === 'WRITING') return '/de-trong-diem/viet';
  const slug = skillByCode(skill).slug;
  if (skill === 'READING') return `/de-trong-diem/doc/${({ 1: '1', 2: '2-3', 3: '4', 4: '5' } as Record<number, string>)[part] ?? '1'}`;
  return `/de-trong-diem/${slug}/${part}`;
}

const TIPS_PATH: Partial<Record<SkillCode, string>> = {
  LISTENING: '/meo-hoc/nghe-phan-3',
  READING: '/meo-hoc/doc',
  WRITING: '/meo-hoc/viet',
  SPEAKING: '/meo-hoc/noi',
};

export interface TaskView {
  title: string;
  detail: string;
  href: string | null;
  skill: SkillCode | null;
}

/** Tiêu đề, mô tả ngắn và đường dẫn của một việc trong ngày. */
export function taskView(t: PlanTask): TaskView {
  const skill = t.skill ?? null;
  const name = skill ? skillByCode(skill).nameEn : '';
  const minutes = t.minutes > 0 ? `~${t.minutes} phút` : '';
  const join = (...parts: string[]) => parts.filter(Boolean).join(' · ');
  switch (t.type) {
    case 'WARMUP':
      return { title: 'Khởi động hôm nay', detail: join('Gõ câu Writing hoặc Speaking Marathon', minutes), href: '/', skill: null };
    case 'GRAMMAR':
      return { title: `Ngữ pháp · ${t.count} câu`, detail: join('Grammar', minutes), href: '/luyen-tap/ngu-phap-tu-vung/grammar', skill };
    case 'VOCAB':
      return { title: `Từ vựng · ${t.count} nhóm`, detail: join('Vocabulary', minutes), href: '/luyen-tap/ngu-phap-tu-vung/vocabulary', skill };
    case 'REVIEW':
      return { title: `Ôn ${t.count} đề đã làm sai`, detail: join('Làm lại cho tới khi đúng', minutes), href: '/history', skill };
    case 'PREDICTION_PRACTICE':
      return { title: `Làm ${t.count} đề dự đoán · ${name}`, detail: join('Chủ đề đang được dự đoán cho kỳ thi tới', minutes), href: '/du-doan-de', skill };
    case 'FEEDBACK':
      return { title: `Xem nhận xét AI bài ${name} vừa chấm`, detail: 'Đọc lỗi sai, sửa rồi làm lại đề điểm thấp', href: t.href ?? '/history', skill };
    case 'DAY_OFF':
      return { title: 'Hôm nay là ngày nghỉ', detail: 'Bạn đã chọn nghỉ ngày này — mai học tiếp nhé', href: null, skill: null };
    case 'PART_PRACTICE':
      return {
        title: `${name} Part ${t.part} · ${t.count} đề`,
        detail: join('Luyện theo Part', minutes),
        href: `/luyen-tap/${skillByCode(skill).slug}/part-${t.part}`,
        skill,
      };
    case 'TIPS':
      return { title: `Đọc mẹo làm bài ${name}`, detail: join('Mẹo học', minutes), href: (skill && TIPS_PATH[skill]) ?? '/meo-hoc', skill };
    case 'MONTHLY_FOCUS':
      return {
        title: `Đề trọng điểm · ${name}${skill === 'WRITING' ? '' : ` Part ${t.part}`} · ${t.count} đề`,
        detail: join('Đề trọng điểm tháng', minutes),
        href: skill ? focusPath(skill, t.part ?? 1) : '/de-trong-diem',
        skill,
      };
    case 'SKILL_TEST':
      return { title: `Bài test full ${name}`, detail: join('Đo lại điểm kỹ năng này', minutes), href: `/luyen-tap/${skillByCode(skill).slug}/bai-test`, skill };
    case 'FULL_MOCK':
      return { title: 'Thi thử đủ 5 kỹ năng', detail: join('Như thi thật', minutes), href: '/mock-tests', skill: null };
    case 'PREDICTION':
      return { title: 'Xem dự đoán đề hôm nay', detail: join('Dự đoán đề', minutes), href: '/du-doan-de', skill: null };
    case 'REST':
      return { title: 'Nghỉ ngơi, ngủ sớm', detail: 'Mai thi rồi — chỉ xem lại mẹo và dự đoán đề', href: null, skill: null };
    default:
      return { title: 'Việc học', detail: minutes, href: null, skill };
  }
}

/** Khởi động do trình duyệt ghi (localStorage), server không biết — ghép vào đây. */
export function withWarmUpDone(tasks: PlanTask[], userId: string | undefined, today: string): PlanTask[] {
  let done = false;
  try {
    done = !!userId && localStorage.getItem(warmUpDoneKey(userId)) === today;
  } catch { /* ẩn danh */ }
  return tasks.map((t) => (t.type === 'WARMUP' ? { ...t, done } : t));
}

export const WEEKDAY_OPTIONS = [
  { iso: 1, label: 'T2' }, { iso: 2, label: 'T3' }, { iso: 3, label: 'T4' }, { iso: 4, label: 'T5' },
  { iso: 5, label: 'T6' }, { iso: 6, label: 'T7' }, { iso: 7, label: 'CN' },
] as const;

export const LIKELIHOOD: Record<'NEW' | 'HIGH' | 'MEDIUM' | 'LOW', { label: string; tone: string }> = {
  NEW: { label: 'Mới bắt đầu', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  HIGH: { label: 'Đang đúng hướng', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  MEDIUM: { label: 'Cần đều hơn', tone: 'text-amber-800 bg-amber-50 border-amber-200' },
  LOW: { label: 'Đang chậm so với mục tiêu', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
};

/** Việc hôm nay đã xong — đếm như backend: bỏ khởi động và việc nghỉ ngơi. */
export function todayProgress(tasks: PlanTask[]): { done: number; total: number } {
  const counted = tasks.filter((t) => t.type !== 'WARMUP' && t.type !== 'REST' && t.type !== 'DAY_OFF');
  return { done: counted.filter((t) => t.done).length, total: counted.length };
}

/** "17/11" từ "2026-11-17". */
export function dayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function weekday(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()]!;
}
