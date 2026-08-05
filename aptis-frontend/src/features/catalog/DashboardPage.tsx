import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useComponents, useExamVersions } from '@/features/catalog/catalogQueries';
import { useAuthStore } from '@/features/auth/authStore';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { componentDisplayName, componentPath } from '@/features/catalog/catalogRoutes';

const COMPONENT_ICONS: Record<string, IconName> = {
  GRAMMAR_VOCABULARY: 'grammar', READING: 'reading', LISTENING: 'listening', SPEAKING: 'speaking', WRITING: 'writing',
};

type IconName = 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'compass' | 'calendar' | 'trophy';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const versionsQuery = useExamVersions();
  const examVersionId = versionsQuery.data?.[0]?.id;
  const componentsQuery = useComponents(examVersionId);

  if (versionsQuery.isLoading || componentsQuery.isLoading) return <LoadingBlock label="Đang tải lộ trình học…" />;
  if (versionsQuery.error || componentsQuery.error) return <ErrorBlock message="Không tải được lộ trình học" onRetry={() => { void versionsQuery.refetch(); void componentsQuery.refetch(); }} />;

  const components = componentsQuery.data ?? [];
  const name = user?.profile.displayName || user?.profile.fullName || '';
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date());

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#20201e]">Chào{name ? ` ${name}` : ' bạn'}.</h1>
        <p className="mt-1 text-xs text-stone-500">{today} — Chọn một hoạt động để tiếp tục lộ trình</p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-[#e4f4ee] to-white p-4 shadow-[0_6px_22px_rgba(24,72,59,.06)] sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-800 text-white"><FeatureIcon name="compass" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700">Bắt đầu tại đây</p>
          <h2 className="mt-0.5 text-sm font-semibold">Mới học Aptis? Xem cấu trúc và luyện đủ 5 kỹ năng</h2>
          <p className="mt-0.5 text-xs text-stone-500">Đi theo từng học phần hoặc thử một đề hoàn chỉnh như kỳ thi thật.</p>
        </div>
        <Link to="/mock-tests" className="btn-primary shrink-0">Xem đề thi <span aria-hidden="true">→</span></Link>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.78fr_1.45fr_0.8fr]">
        <div className="relative min-h-[270px] overflow-hidden rounded-xl bg-[#063f35] p-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.16)]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#176f5d] opacity-70" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b6dbcf]">{today}</p>
          <h2 className="relative mt-2 text-2xl font-semibold tracking-[-0.03em]">Chào buổi học mới</h2>
          <p className="relative mt-1 text-sm text-[#bfe1d6]">{name || 'Học viên Aptis Practice'}</p>
          <blockquote className="absolute inset-x-4 bottom-4 rounded-lg bg-white/10 p-4 text-xs leading-5 text-[#e7f4ef]">
            “Mỗi bài luyện hoàn thành là một bước gần hơn tới mục tiêu của bạn.”
          </blockquote>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-[0_4px_18px_rgba(31,41,35,.07)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e6f3ee] text-brand-800"><FeatureIcon name="calendar" /></span><div><h2 className="text-sm font-semibold">Hành trình đều đặn</h2><p className="text-[11px] text-stone-500">Mỗi ô là một ngày bạn đã luyện tập</p></div></div>
            <div className="text-right"><strong className="block text-xl font-semibold text-[#b18122]">0</strong><span className="text-[10px] text-stone-400">ngày liên tiếp</span></div>
          </div>
          <div className="mt-7 grid grid-cols-10 gap-1.5" aria-label="Chưa có ngày luyện tập">
            {Array.from({ length: 40 }).map((_, index) => <span key={index} className="aspect-square rounded-[3px] bg-[#f0eee8]" />)}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-xs"><span className="text-stone-500">Bài làm: <strong className="text-stone-800">0</strong></span><Link to="/mock-tests" className="font-semibold text-brand-800 hover:underline">Hoàn thành bài đầu tiên →</Link></div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-[0_4px_18px_rgba(31,41,35,.07)]">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fbebef] text-[#9d5361]"><FeatureIcon name="trophy" /></span><div><h2 className="text-sm font-semibold">Mục tiêu tuần này</h2><p className="text-[11px] text-stone-500">Duy trì nhịp học của bạn</p></div></div>
          <div className="mt-6 rounded-lg bg-[#faf9f5] p-4"><div className="flex items-center justify-between text-xs"><span>Hoàn thành bài luyện</span><strong>0 / 3</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200"><span className="block h-full w-0 bg-brand-700" /></div></div>
          <Link to="/history" className="mt-4 flex min-h-10 items-center justify-between rounded-lg px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"><span>Xem tiến độ của tôi</span><span aria-hidden="true">→</span></Link>
          <Link to="/plans" className="flex min-h-10 items-center justify-between rounded-lg px-3 text-xs font-semibold text-[#8b6415] hover:bg-[#fbf3dc]"><span>Mở khóa toàn bộ bài học</span><span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section id="skills" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3"><div><h2 className="text-xl font-semibold tracking-[-0.025em]">Luyện Aptis</h2><p className="mt-1 text-xs text-stone-500">Chọn kỹ năng bạn muốn cải thiện hôm nay</p></div><Link to="/mock-tests" className="text-xs font-semibold text-brand-800 hover:underline">Thi thử đầy đủ →</Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {components.map((component, index) => (
            <Link key={component.id} to={componentPath(component.code)} className="group flex min-h-[185px] flex-col rounded-xl bg-white p-4 shadow-[0_3px_14px_rgba(31,41,35,.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(31,78,64,.12)]">
              <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-lg ${ICON_TONES[index % ICON_TONES.length]}`}><FeatureIcon name={COMPONENT_ICONS[component.code] ?? 'reading'} /></span>{component.durationSeconds ? <span className="rounded-full bg-[#f4f2ec] px-2 py-1 text-[10px] font-semibold text-stone-500">{Math.round(component.durationSeconds / 60)} phút</span> : null}</div>
              <div className="mt-auto"><h3 className="font-semibold text-stone-900">{componentDisplayName(component)}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{component.description || 'Luyện theo đúng cấu trúc và dạng câu hỏi Aptis.'}</p><span className="mt-3 inline-flex text-xs font-semibold text-brand-800">Bắt đầu luyện <span className="ml-1 transition-transform group-hover:translate-x-1">→</span></span></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const ICON_TONES = ['bg-[#e5eef9] text-[#527099]','bg-[#e2f1eb] text-[#34705f]','bg-[#fbf0d9] text-[#9a752e]','bg-[#f8e5e5] text-[#a75d5d]','bg-[#eee7f7] text-[#725a94]'];

function FeatureIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    grammar: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /></>, reading: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>, listening: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>, speaking: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>, writing: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m13.5 8 3 3M4 20h6" /></>, compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>, trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">{paths[name]}</svg>;
}
