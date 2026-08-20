import { Link, Navigate, useParams } from 'react-router-dom';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { useIsPremium } from '@/features/auth/authStore';

export function ComponentPage() {
  const { componentSlug, componentId } = useParams<{ componentSlug?: string; componentId?: string }>();
  const isPremium = useIsPremium();
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const components = componentsQuery.data ?? [];
  const component = componentId
    ? components.find((item) => item.id === componentId)
    : findComponentBySlug(components, componentSlug);
  const partsQuery = useParts(component?.id);

  if (versionsQuery.isLoading || componentsQuery.isLoading || (component && partsQuery.isLoading)) {
    return <LoadingBlock label="Đang tải nội dung luyện tập…" />;
  }

  if (versionsQuery.error || componentsQuery.error || partsQuery.error) {
    return (
      <ErrorBlock
        message="Không tải được nội dung kỹ năng"
        onRetry={() => {
          void versionsQuery.refetch();
          void componentsQuery.refetch();
          void partsQuery.refetch();
        }}
      />
    );
  }

  if (!component) {
    return <ErrorBlock message="Không tìm thấy kỹ năng này. Hãy chọn lại từ menu Luyện Aptis." />;
  }

  if (componentId) return <Navigate to={componentPath(component.code)} replace />;

  const tipsPath = {
    LISTENING: '/meo-hoc/nghe-phan-3',
    READING: '/meo-hoc/doc',
    WRITING: '/meo-hoc/viet',
    SPEAKING: '/meo-hoc/noi',
  }[component.code.toUpperCase()];
  const hasTipsPage = Boolean(tipsPath);

  const parts = partsQuery.data ?? [];
  const displayName = componentDisplayName(component);
  const totalQuestionSets = parts.reduce((sum, part) => sum + part.publishedQuestionSetCount, 0);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            to="/"
            className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-brand-600"
          >
            ← Bảng điều khiển / {displayName}
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {parts.length} Part · {totalQuestionSets} bộ câu hỏi đang có sẵn
          </p>
        </div>

        {component.durationSeconds ? (
          <span className="inline-flex items-center rounded-full bg-brand-100 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-brand-800 self-start sm:self-auto">
            {Math.round(component.durationSeconds / 60)} PHÚT / ĐỀ FULL
          </span>
        ) : null}
      </div>

      {/* 3 Main Modes */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Mode 1: Theo Part — chỉ dành cho Premium */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700">
              Linh hoạt · {parts.length} Part
            </span>
            <h2 className="text-xl font-bold text-slate-900">Luyện theo Part</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Chọn đúng dạng bài cần cải thiện. Tập trung rèn luyện từng Part với giải thích chi tiết.
            </p>
          </div>
          {isPremium ? (
            <Link
              to={`${componentPath(component.code)}/theo-part`}
              className="mt-6 flex min-h-[44px] items-center justify-center rounded-xl bg-surface-paper border border-border font-semibold text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800 transition-colors"
            >
              Chọn Part để luyện →
            </Link>
          ) : (
            // Dẫn sang trang gói thay vì chặn im lặng: học viên cần biết mở
            // bằng cách nào. Backend vẫn là nơi chặn thật (PREMIUM_REQUIRED),
            // đây chỉ để không cho bấm vào rồi mới báo lỗi.
            <Link
              to="/plans"
              className="mt-6 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 font-semibold text-xs text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
            >
              <span aria-hidden="true">🔒</span>
              Nâng cấp Premium để luyện theo Part
            </Link>
          )}
        </div>

        {/* Mode 2: Bài test full kỹ năng */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-200 bg-white p-6 shadow-sm transition-all hover:border-brand-400 hover:shadow-md">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-dark">
              Chuẩn thi · Bấm giờ
            </span>
            <h2 className="text-xl font-bold text-slate-900">Bài test đầy đủ</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Làm liền mạch toàn bộ các Part của kỹ năng này với đồng hồ đếm ngược như kỳ thi thật.
            </p>
          </div>
          <Link
            to={`${componentPath(component.code)}/bai-test`}
            className="mt-6 flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 font-semibold text-xs text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            Bắt đầu bài test →
          </Link>
        </div>

        {/* Mode 3: Mẹo học & Lịch sử */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-surface px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Chiến thuật
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {hasTipsPage ? 'Mẹo làm bài' : 'Lưu ý trước khi thi'}
            </h2>
            <p className="text-xs leading-relaxed text-slate-500">
              {hasTipsPage
                ? 'Chiến thuật làm bài, từ khóa bẫy paraphrase và mẹo đạt band điểm cao.'
                : 'Cách phân bổ thời gian và các lưu ý quan trọng để không bị mất điểm oan.'}
            </p>
          </div>
          {hasTipsPage && !isPremium ? (
            <Link
              to="/plans"
              className="mt-6 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 font-semibold text-xs text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
            >
              <span aria-hidden="true">🔒</span>
              Nâng cấp Premium để xem mẹo
            </Link>
          ) : hasTipsPage ? (
            <Link
              to={tipsPath!}
              className="mt-6 flex min-h-[44px] items-center justify-center rounded-xl bg-surface-paper border border-border font-semibold text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800 transition-colors"
            >
              Xem mẹo làm bài →
            </Link>
          ) : (
            <Link
              to="/history"
              className="mt-6 flex min-h-[44px] items-center justify-center rounded-xl bg-surface-paper border border-border font-semibold text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800 transition-colors"
            >
              Xem kết quả bài đã làm →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

