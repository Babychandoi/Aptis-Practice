import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';

export function ComponentTestsPage() {
  const { componentSlug } = useParams<{ componentSlug: string }>();
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const component = findComponentBySlug(componentsQuery.data ?? [], componentSlug);
  const partsQuery = useParts(component?.id);
  const attemptsQuery = useQuery({ queryKey: ['component-test-attempts'], queryFn: () => practiceApi.listAttempts(0, 100) });

  if (versionsQuery.isLoading || componentsQuery.isLoading || (component && partsQuery.isLoading) || attemptsQuery.isLoading) return <LoadingBlock label="Đang tải thư viện bài test…" />;
  if (versionsQuery.error || componentsQuery.error || partsQuery.error || attemptsQuery.error) return <ErrorBlock message="Không tải được thư viện bài test" />;
  if (!component) return <ErrorBlock message="Không tìm thấy kỹ năng này." />;

  const parts = partsQuery.data ?? [];
  const availableSets = parts.reduce((sum, part) => sum + part.publishedQuestionSetCount, 0);
  const attempts = (attemptsQuery.data?.content ?? []).filter((attempt) => attempt.componentId === component.id && attempt.mode === 'CUSTOM_PRACTICE');
  const completed = attempts.filter((attempt) => attempt.status === 'COMPLETED');
  const average = completed.length > 0 ? Math.round(completed.reduce((sum, attempt) => sum + (attempt.percentageScore ?? 0), 0) / completed.length) : 0;
  const displayName = componentDisplayName(component);
  const duration = component.durationSeconds ?? parts.reduce((sum, part) => sum + (part.defaultDurationSeconds ?? 0), 0);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500"><Link to="/">Trang chủ</Link><span>›</span><Link to={componentPath(component.code)}>Luyện {displayName}</Link><span>›</span><strong className="text-stone-800">Bài test</strong></nav>
      <header className="flex flex-col gap-5 rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-[#f0c466]"><HeadphonesIcon /></span>
        <div className="flex-1"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Bài test {displayName}</h1><p className="mt-1 text-xs text-[#c4e1d8]">Làm liền mạch các Part và theo dõi kết quả sau mỗi lượt</p></div>
        <div className="grid grid-cols-3 divide-x divide-white/10 rounded-lg bg-white/5 text-center">
          <Stat value="1" label="Bài test" /><Stat value={String(completed.length)} label="Hoàn thành" /><Stat value={`${average}%`} label="Điểm TB" />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 shadow-[0_2px_8px_rgba(43,39,30,.05)]">
        <button type="button" className="rounded-lg bg-brand-800 px-4 py-2 text-xs font-semibold text-white">Theo bài</button>
        <span className="rounded-full bg-[#edf7f3] px-3 py-1.5 text-xs font-medium text-brand-800">Tất cả 1</span>
        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">Đang làm {attempts.filter((a) => a.status === 'IN_PROGRESS').length}</span>
        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">Hoàn thành {completed.length}</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article className="flex min-h-[220px] flex-col rounded-lg border border-[#dfc989] bg-white p-4 shadow-[0_3px_12px_rgba(83,65,25,.07)]">
          <div className="flex items-start justify-between"><span className="rounded-full bg-[#fbf3dc] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#8b6415]">Sẵn sàng</span><span className="text-[#b89139]">☆ ☆ ☆</span></div>
          <h2 className="mt-4 text-lg font-semibold">Bài test tổng hợp</h2>
          <p className="mt-1 text-xs text-stone-500">{parts.length} Part · {availableSets} bộ câu hỏi{duration > 0 ? ` · ${Math.round(duration / 60)} phút` : ''}</p>
          <p className="mt-3 text-xs leading-5 text-stone-600">Nội dung được chọn từ ngân hàng câu hỏi hiện có của kỹ năng {displayName}.</p>
          <Link to={`${componentPath(component.code)}/bai-test/gioi-thieu`} aria-disabled={availableSets === 0} className={`mt-auto inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold ${availableSets > 0 ? 'bg-brand-800 text-white hover:bg-brand-900' : 'pointer-events-none bg-stone-100 text-stone-400'}`}>Bắt đầu</Link>
        </article>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="min-w-24 px-4 py-2"><strong className="block text-xl">{value}</strong><span className="text-[10px] uppercase tracking-wide text-[#b9d8ce]">{label}</span></div>; }
function HeadphonesIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></svg>; }
