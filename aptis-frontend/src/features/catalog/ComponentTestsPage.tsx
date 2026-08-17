import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { mockTestApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useComponents, useExamVersions } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';

/** Một kỹ năng có thể có hàng chục đề (Speaking 49), tải hết một lần là thừa. */
const PAGE_SIZE = 20;

export function ComponentTestsPage() {
  const { componentSlug } = useParams<{ componentSlug: string }>();
  const [page, setPage] = useState(0);
  const versions = useExamVersions();
  const components = useComponents(versions.data?.[0]?.id);
  const component = findComponentBySlug(components.data ?? [], componentSlug);
  const tests = useQuery({
    queryKey: ['skill-tests', component?.id, page],
    queryFn: () => mockTestApi.list(component!.id, page, PAGE_SIZE),
    enabled: Boolean(component),
    // Giữ trang cũ trong lúc tải trang mới để danh sách không nháy trắng.
    placeholderData: keepPreviousData,
  });

  // Đổi kỹ năng thì về trang đầu, nếu không sẽ xin trang 3 của kỹ năng chỉ có 1 trang.
  useEffect(() => setPage(0), [component?.id]);
  const attempts = useQuery({
    queryKey: ['component-test-attempts'],
    queryFn: () => practiceApi.listAttempts(0, 100),
  });

  if (versions.isLoading || components.isLoading || tests.isLoading || attempts.isLoading) {
    return <LoadingBlock label="Đang tải thư viện bài test…" />;
  }
  if (versions.error || components.error || tests.error || attempts.error) {
    return <ErrorBlock message="Không tải được thư viện bài test." />;
  }
  if (!component) return <ErrorBlock message="Không tìm thấy kỹ năng này." />;

  const displayName = componentDisplayName(component);
  const skillTests = tests.data?.content ?? [];
  const totalTests = tests.data?.totalElements ?? 0;
  const totalPages = tests.data?.totalPages ?? 0;
  const relatedAttempts = (attempts.data?.content ?? []).filter(
    (attempt) => attempt.componentId === component.id && attempt.mode === 'MOCK_TEST',
  );
  const completed = relatedAttempts.filter((attempt) => attempt.status === 'COMPLETED');
  const average = completed.length
    ? Math.round(completed.reduce((sum, attempt) => sum + (attempt.percentageScore ?? 0), 0) / completed.length)
    : 0;

  return <div className="space-y-4">
    <nav className="flex items-center gap-2 text-xs text-stone-500">
      <Link to="/">Trang chủ</Link><span>›</span>
      <Link to={componentPath(component.code)}>Luyện {displayName}</Link><span>›</span>
      <strong className="text-stone-800">Bài test</strong>
    </nav>

    <header className="flex flex-col gap-5 rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:flex-row sm:items-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-[#f0c466]"><HeadphonesIcon /></span>
      <div className="flex-1"><h1 className="text-2xl font-semibold tracking-[-0.03em]">Bài test {displayName}</h1><p className="mt-1 text-xs text-[#c4e1d8]">Các đề hoàn chỉnh được ghép và phát hành riêng bởi quản trị viên</p></div>
      <div className="grid grid-cols-3 divide-x divide-white/10 rounded-lg bg-white/5 text-center">
        <Stat value={String(totalTests)} label="Bài test" />
        <Stat value={String(completed.length)} label="Hoàn thành" />
        <Stat value={`${average}%`} label="Điểm TB" />
      </div>
    </header>

    {skillTests.length === 0 ? <section className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <h2 className="font-semibold text-stone-800">Chưa có bài test {displayName}</h2>
      <p className="mt-2 text-sm text-stone-500">Quản trị viên chưa ghép và phát hành đề hoàn chỉnh cho kỹ năng này.</p>
      <Link to={`${componentPath(component.code)}/theo-part`} className="btn-secondary mt-5">Luyện theo Part</Link>
    </section> : <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {skillTests.map((test, index) => <article key={test.id} className="flex min-h-[235px] flex-col rounded-xl border border-[#dfc989] bg-white p-5 shadow-[0_3px_12px_rgba(83,65,25,.07)]">
        <div className="flex items-start justify-between gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${test.canAccess ? 'bg-[#e6f4ee] text-brand-800' : 'bg-[#fbf3dc] text-[#8b6415]'}`}>{test.canAccess ? 'Sẵn sàng' : 'Premium'}</span>
          <span className="text-xs font-semibold text-stone-400">TEST {page * PAGE_SIZE + index + 1}</span>
        </div>
        <h2 className="mt-4 text-lg font-semibold">{test.name}</h2>
        <p className="mt-1 text-xs text-stone-500">{test.parts.length} Part · {test.totalQuestionSets} bộ câu hỏi{test.durationSeconds ? ` · ${Math.round(test.durationSeconds / 60)} phút` : ''}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-stone-600">{test.description || `Bài test ${displayName} hoàn chỉnh theo cấu trúc đã được thiết lập.`}</p>
        <Link to={`${componentPath(component.code)}/bai-test/${test.id}/gioi-thieu`} className="mt-auto inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-800 px-4 text-xs font-semibold text-white hover:bg-brand-900">{test.canAccess ? 'Xem bài test' : 'Xem điều kiện mở khóa'}</Link>
      </article>)}
    </section>}

    {totalPages > 1 && (
      <nav className="flex items-center justify-center gap-2" aria-label="Phân trang bài test">
        <button
          type="button"
          className="btn-secondary !px-3 !py-1.5 text-xs"
          disabled={page === 0 || tests.isFetching}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          ← Trước
        </button>
        <span className="text-xs tabular-nums text-stone-600">
          Trang {page + 1}/{totalPages} · {totalTests} bài
        </span>
        <button
          type="button"
          className="btn-secondary !px-3 !py-1.5 text-xs"
          disabled={!tests.data?.hasNext || tests.isFetching}
          onClick={() => setPage((current) => current + 1)}
        >
          Sau →
        </button>
      </nav>
    )}
  </div>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="min-w-24 px-4 py-2"><strong className="block text-xl">{value}</strong><span className="text-[10px] uppercase tracking-wide text-[#b9d8ce]">{label}</span></div>; }
function HeadphonesIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></svg>; }
