import { Link, useParams } from 'react-router-dom';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug, partPath } from '@/features/catalog/catalogRoutes';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useIsPremium } from '@/features/auth/authStore';

export function ComponentPartsPage() {
  const { componentSlug } = useParams<{ componentSlug: string }>();
  const isPremium = useIsPremium();
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const component = findComponentBySlug(componentsQuery.data ?? [], componentSlug);
  const partsQuery = useParts(component?.id);

  if (versionsQuery.isLoading || componentsQuery.isLoading || (component && partsQuery.isLoading)) {
    return <LoadingBlock label="Đang tải danh sách Part…" />;
  }

  if (versionsQuery.error || componentsQuery.error || partsQuery.error) {
    return <ErrorBlock message="Không tải được danh sách Part" onRetry={() => { void versionsQuery.refetch(); void componentsQuery.refetch(); void partsQuery.refetch(); }} />;
  }

  if (!component) return <ErrorBlock message="Không tìm thấy kỹ năng này." />;

  // Chặn ở đây nữa vì ô "Luyện theo Part" bị khóa không ngăn được người vào
  // thẳng bằng URL. Backend vẫn chặn thật khi tạo lượt, nhưng để hiện danh sách
  // Part rồi mới báo lỗi ở bước cuối thì gây hiểu nhầm là còn làm được.
  if (!isPremium) {
    return (
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
          <Link to="/" className="hover:text-brand-800">Trang chủ</Link>
          <span aria-hidden="true">›</span>
          <Link to={componentPath(component.code)} className="hover:text-brand-800">
            Luyện {componentDisplayName(component)}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="font-semibold text-stone-800">Theo Part</span>
        </nav>
        <PremiumGate message="Luyện theo Part thuộc gói Premium. Tài khoản miễn phí làm được 3 đề thi thử đầu của mỗi kỹ năng." />
      </div>
    );
  }

  const parts = partsQuery.data ?? [];
  const displayName = componentDisplayName(component);
  const totalQuestionSets = parts.reduce((sum, part) => sum + part.publishedQuestionSetCount, 0);

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
        <Link to="/" className="hover:text-brand-800">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <Link to={componentPath(component.code)} className="hover:text-brand-800">Luyện {displayName}</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-stone-800">Theo Part</span>
      </nav>

      <header className="flex flex-col gap-4 rounded-lg bg-brand-900 px-5 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:flex-row sm:items-center sm:px-7">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f0c466] ring-1 ring-white/20"><PartListIcon /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Luyện {displayName} theo Part</h1>
          <p className="mt-1 text-xs font-medium text-[#c4e1d8]">Chọn Part bạn muốn tập trung cải thiện</p>
        </div>
        <Link to={componentPath(component.code)} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white/10 px-4 text-xs font-semibold hover:bg-white/15">← Đổi cách luyện</Link>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3">
          <div><h2 className="text-xl font-semibold tracking-[-0.025em]">Danh sách Part</h2><p className="mt-1 text-xs text-stone-500">Mỗi Part tập trung vào một dạng câu hỏi riêng</p></div>
          <span className="text-xs text-stone-500">{parts.length} Part · {totalQuestionSets} bộ câu hỏi</span>
        </div>

        {parts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {parts.map((part) => (
              <Link key={part.id} to={partPath(component.code, part)} className="group flex min-h-24 items-center gap-4 rounded-lg border border-[#ddd6c6] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(43,39,30,.05)] transition-colors hover:border-brand-400 hover:bg-brand-50/40">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f4f1e8] text-[#80662e]"><PartIcon /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-900">{part.name}</span>
                  {part.description && <span className="mt-0.5 block truncate text-xs text-stone-500">{part.description}</span>}
                  <span className="mt-1.5 block text-[11px] text-stone-500">Part {part.displayOrder} · {part.publishedQuestionSetCount} bộ câu hỏi{part.defaultDurationSeconds ? ` · ${Math.round(part.defaultDurationSeconds / 60)} phút` : ''}</span>
                </span>
                <span className="text-brand-800 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : <p className="rounded-lg bg-white p-4 text-sm text-stone-600">Kỹ năng này chưa có Part nào được phát hành.</p>}
      </section>
    </div>
  );
}

function PartListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="7" cy="5" r="1" fill="currentColor" /><circle cx="7" cy="12" r="1" fill="currentColor" /><circle cx="7" cy="19" r="1" fill="currentColor" /></svg>;
}

function PartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="m8 12 2 2 5-5M8 18h8" /></svg>;
}
