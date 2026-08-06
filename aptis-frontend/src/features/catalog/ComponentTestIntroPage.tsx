import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { mockTestApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useComponents, useExamVersions } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';

export function ComponentTestIntroPage() {
  const { componentSlug, blueprintId } = useParams<{ componentSlug: string; blueprintId: string }>();
  const navigate = useNavigate();
  const versions = useExamVersions();
  const components = useComponents(versions.data?.[0]?.id);
  const component = findComponentBySlug(components.data ?? [], componentSlug);
  const test = useQuery({
    queryKey: ['mock-test', blueprintId],
    queryFn: () => mockTestApi.detail(blueprintId!),
    enabled: Boolean(blueprintId),
  });
  const startTest = useMutation({
    mutationFn: async () => {
      const attempt = await mockTestApi.createAttempt(blueprintId!);
      await practiceApi.start(attempt.id);
      return attempt;
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
  });

  if (versions.isLoading || components.isLoading || test.isLoading) return <LoadingBlock label="Đang chuẩn bị bài test…" />;
  if (versions.error || components.error || test.error) return <ErrorBlock message="Không tải được thông tin bài test." />;
  if (!component || !test.data || test.data.componentId !== component.id) return <ErrorBlock message="Không tìm thấy bài test này." />;

  const data = test.data;
  const displayName = componentDisplayName(component);
  const premiumBlocked = !data.canAccess || (startTest.error instanceof ApiError && startTest.error.isPremiumRequired);

  return <div className="mx-auto max-w-2xl py-4">
    {premiumBlocked && <PremiumGate message="Bài test này thuộc gói Premium." />}
    {startTest.error && !premiumBlocked && <ErrorBlock message={startTest.error instanceof ApiError ? startTest.error.message : 'Không tạo được lượt thi.'} />}
    <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(43,39,30,.08)] sm:p-7">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e6f1ec] text-brand-800"><ReadyIcon /></span>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">Bài test {displayName}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
        {data.description && <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{data.description}</p>}
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <InfoRow title="Cấu trúc" value={`${data.parts.length} Part`} />
        <InfoRow title="Nội dung" value={`${data.totalQuestionSets} bộ câu hỏi`} />
        <InfoRow title="Thời gian" value={data.durationSeconds ? `${Math.round(data.durationSeconds / 60)} phút` : 'Không giới hạn'} />
      </div>
      <div className="mt-4 rounded-xl border border-stone-200">
        {data.parts.map((part, index) => <div key={part.partId} className="flex items-center justify-between border-b border-stone-100 px-4 py-3 last:border-0"><span className="text-sm font-semibold">{index + 1}. {part.partName || `Part ${index + 1}`}</span><span className="text-xs text-stone-500">{part.questionSetCount} bộ câu hỏi</span></div>)}
      </div>
      <div className="mt-4 rounded-lg bg-[#e8f2fb] p-4"><h2 className="text-xs font-semibold uppercase text-[#386786]">Lưu ý</h2><p className="mt-2 text-xs leading-5 text-[#36566b]">Làm lần lượt các Part. Tiến độ được lưu tự động và chỉ chấm điểm sau khi bạn nộp bài.</p></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link to={`${componentPath(component.code)}/bai-test`} className="btn-secondary">← Quay lại</Link>
        <button type="button" className="btn-primary" disabled={!data.canAccess || startTest.isPending} onClick={() => startTest.mutate()}>{startTest.isPending ? 'Đang tạo lượt thi…' : 'Bắt đầu làm bài'}</button>
      </div>
    </section>
  </div>;
}

function InfoRow({ title, value }: { title: string; value: string }) { return <div className="rounded-lg bg-[#f5f3ec] px-4 py-3"><span className="block text-[11px] font-semibold text-stone-700">{title}</span><span className="mt-0.5 block text-xs text-stone-600">{value}</span></div>; }
function ReadyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></svg>; }
