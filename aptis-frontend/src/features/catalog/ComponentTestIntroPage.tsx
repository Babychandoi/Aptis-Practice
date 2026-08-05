import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';

export function ComponentTestIntroPage() {
  const { componentSlug } = useParams<{ componentSlug: string }>();
  const navigate = useNavigate();
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const component = findComponentBySlug(componentsQuery.data ?? [], componentSlug);
  const partsQuery = useParts(component?.id);
  const parts = partsQuery.data ?? [];
  const questionSetCount = parts.reduce((sum, part) => sum + part.publishedQuestionSetCount, 0);

  const startTest = useMutation({
    mutationFn: async () => {
      const attempt = await practiceApi.createCustomAttempt({ componentIds: [component!.id], questionSetCount, shuffle: false, timed: true, onlyNew: false, onlyIncorrect: false });
      await practiceApi.start(attempt.id);
      return attempt;
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
  });

  if (versionsQuery.isLoading || componentsQuery.isLoading || (component && partsQuery.isLoading)) return <LoadingBlock label="Đang chuẩn bị bài test…" />;
  if (versionsQuery.error || componentsQuery.error || partsQuery.error) return <ErrorBlock message="Không tải được thông tin bài test" />;
  if (!component) return <ErrorBlock message="Không tìm thấy kỹ năng này." />;

  const displayName = componentDisplayName(component);
  const duration = component.durationSeconds ?? parts.reduce((sum, part) => sum + (part.defaultDurationSeconds ?? 0), 0);
  const premiumBlocked = startTest.error instanceof ApiError && startTest.error.isPremiumRequired;

  return (
    <div className="mx-auto max-w-xl py-4">
      {premiumBlocked && <PremiumGate message="Một số nội dung trong bài test cần gói Premium." />}
      {startTest.error && !premiumBlocked && <ErrorBlock message={startTest.error instanceof ApiError ? startTest.error.message : 'Không tạo được bài test'} />}
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(43,39,30,.08)] sm:p-6">
        <div className="text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e6f1ec] text-brand-800"><ReadyIcon /></span><h1 className="mt-3 text-xl font-semibold">Sẵn sàng làm bài {displayName}?</h1><p className="mt-1 text-xs text-stone-500">Bài test tổng hợp theo nội dung hiện có của Aptis Practice</p></div>
        <div className="mt-5 space-y-2">
          <InfoRow title="Cấu trúc bài" value={`${parts.length} Part · ${questionSetCount} bộ câu hỏi`} />
          <InfoRow title="Cách trả lời" value="Hoàn thành lần lượt các dạng câu hỏi trong từng Part" />
          <InfoRow title="Giới hạn thời gian" value={duration > 0 ? `${Math.round(duration / 60)} phút` : 'Không giới hạn'} />
        </div>
        <div className="mt-3 rounded-lg bg-[#e8f2fb] p-4"><h2 className="text-xs font-semibold uppercase text-[#386786]">Mẹo làm bài</h2><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#36566b]"><li>Đọc kỹ hướng dẫn của từng Part trước khi trả lời.</li><li>Không dừng quá lâu ở một câu; có thể quay lại trước khi nộp.</li><li>Tiến độ được lưu tự động trong khi làm bài.</li></ul></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link to={`${componentPath(component.code)}/bai-test`} className="btn-secondary">← Quay lại</Link><button type="button" className="btn-primary" disabled={questionSetCount === 0 || startTest.isPending} onClick={() => startTest.mutate()}>{startTest.isPending ? 'Đang tạo bài…' : 'Bắt đầu làm bài'}</button></div>
        <div className="mt-4 border-t border-stone-200 pt-4 text-center"><span className="text-xs text-stone-500">Hoặc </span><Link to={`${componentPath(component.code)}/theo-part`} className="text-xs font-semibold text-brand-800 hover:underline">chọn một Part để luyện</Link></div>
      </section>
    </div>
  );
}

function InfoRow({ title, value }: { title: string; value: string }) { return <div className="rounded-lg bg-[#f5f3ec] px-4 py-3"><span className="block text-[11px] font-semibold text-stone-700">{title}</span><span className="mt-0.5 block text-xs text-stone-600">{value}</span></div>; }
function ReadyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"/></svg>; }
