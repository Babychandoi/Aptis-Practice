import { Link, Navigate, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';

export function ComponentPage() {
  const { componentSlug, componentId } = useParams<{ componentSlug?: string; componentId?: string }>();
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
    return <ErrorBlock message="Không tải được nội dung kỹ năng" onRetry={() => { void versionsQuery.refetch(); void componentsQuery.refetch(); void partsQuery.refetch(); }} />;
  }

  if (!component) {
    return <ErrorBlock message="Không tìm thấy kỹ năng này. Hãy chọn lại từ menu Luyện Aptis." />;
  }

  if (componentId) return <Navigate to={componentPath(component.code)} replace />;

  // Bốn kỹ năng chính đã có trang mẹo riêng; Ngữ pháp & Từ vựng vẫn dùng khối lưu
  // ý ngay trong trang cho tới khi có nội dung riêng.
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
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
        <Link to="/" className="hover:text-brand-800">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <Link to="/" className="hover:text-brand-800">Luyện tập Aptis</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-stone-800">{displayName}</span>
      </nav>

      <header className="relative overflow-hidden rounded-lg bg-brand-900 px-5 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:px-7 sm:py-6">
        <span className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-brand-700/45" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f0c466] ring-1 ring-white/20">
            <SkillIcon code={component.code} />
          </span>
          <div>
            <span className="inline-flex rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c9e1d9]">Luyện Aptis</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">Luyện {displayName}</h1>
            <p className="mt-1 text-xs font-medium text-[#c4e1d8]">Chọn cách bạn muốn luyện · tiến độ được lưu tự động</p>
          </div>
        </div>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-[#ddd8ca] pb-2">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Chọn cách luyện</h2>
          <span className="text-xs italic text-stone-500">4 chế độ · chọn để bắt đầu</span>
        </div>

        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#ebc96f] bg-[#fbefc9] px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#dda43e] text-white"><LibraryIcon /></span>
          <div>
            <h3 className="text-sm font-semibold">Kho luyện tập {displayName}</h3>
            <p className="mt-0.5 text-xs text-[#745b2f]">{parts.length} Part · {totalQuestionSets} bộ câu hỏi đang có sẵn</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ModeCard
            tone="blue"
            icon={<LayersIcon />}
            badge={`${parts.length} Part`}
            title="Theo Part"
            description="Chọn đúng dạng bài cần cải thiện và luyện tập trung theo từng Part."
            action={<Link to={`${componentPath(component.code)}/theo-part`} className="mode-button mode-button-secondary">Chọn Part <ArrowIcon /></Link>}
          />

          <ModeCard
            tone="green"
            icon={<GridIcon />}
            badge="Bài test"
            title="Bài test full"
            description="Làm liền mạch như một bài thi, có tính giờ và đủ các Part của kỹ năng."
            action={<Link to={`${componentPath(component.code)}/bai-test`} className="mode-button mode-button-primary">Đi tới bài test <ArrowIcon /></Link>}
          />

          <ModeCard
            tone="amber"
            icon={<TipIcon />}
            badge="Mẹo"
            title={hasTipsPage ? 'Mẹo trước khi làm' : 'Lưu ý trước khi làm'}
            description={hasTipsPage
              ? 'Bảng chống paraphrase và chuỗi đáp án cần nhớ trước khi vào phòng thi.'
              : 'Nắm cách phân bổ thời gian và những điểm cần chú ý trước khi bắt đầu.'}
            action={hasTipsPage
              ? <Link to={tipsPath!} className="mode-button mode-button-secondary">Xem mẹo <ArrowIcon /></Link>
              // Kỹ năng chưa có trang mẹo riêng: cuộn xuống khối lưu ý ngay dưới.
              : <a href="#meo-lam-bai" className="mode-button mode-button-secondary">Xem lưu ý <ArrowIcon /></a>}
          />

          <ModeCard
            tone="rose"
            icon={<HistoryIcon />}
            badge="Kết quả"
            title="Bài đã làm"
            description="Xem lại kết quả gần đây để nhận ra Part còn yếu và tiếp tục ôn tập."
            action={<Link to="/history" className="mode-button mode-button-secondary">Xem kết quả <ArrowIcon /></Link>}
          />
        </div>

        <div id="meo-lam-bai" className="mt-3 flex items-start gap-3 rounded-lg border border-[#ebc96f] bg-[#fbefc9] px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dda43e] text-white"><TipIcon /></span>
          <div>
            <h3 className="text-sm font-semibold">Lưu ý trước khi luyện</h3>
            <p className="mt-0.5 text-xs leading-5 text-[#745b2f]">Luyện theo Part giúp tập trung vào dạng bài còn yếu; bài test full phù hợp khi bạn muốn kiểm tra khả năng làm bài liên tục và quản lý thời gian.</p>
          </div>
        </div>
      </section>

    </div>
  );
}

function ModeCard({ tone, icon, badge, title, description, action }: { tone: 'blue' | 'green' | 'amber' | 'rose'; icon: ReactNode; badge: string; title: string; description: string; action: ReactNode }) {
  const tones = {
    blue: 'bg-[#e2edf9] text-[#46709a]', green: 'bg-[#dfeee8] text-[#2f7461]', amber: 'bg-[#f6e7c2] text-[#927021]', rose: 'bg-[#f6ded8] text-[#b26050]',
  };
  return (
    <article className="flex min-h-[218px] flex-col rounded-lg border border-[#ddd6c6] bg-white p-4 shadow-[0_2px_8px_rgba(43,39,30,.06)]">
      <div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-600">{badge}</span></div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-stone-600">{description}</p>
      <div className="mt-auto pt-4">{action}</div>
    </article>
  );
}

function SvgIcon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">{children}</svg>;
}

function SkillIcon({ code }: { code: string }) {
  if (code === 'LISTENING') return <SvgIcon><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></SvgIcon>;
  if (code === 'SPEAKING') return <SvgIcon><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></SvgIcon>;
  if (code === 'WRITING') return <SvgIcon><path d="m4 20 4-1 10-10a2 2 0 0 0-3-3L5 16l-1 4Z" /><path d="m13.5 7.5 3 3" /></SvgIcon>;
  return <SvgIcon><path d="M4 5a3 3 0 0 1 3-3h4v17H7a3 3 0 0 0-3 3V5ZM20 5a3 3 0 0 0-3-3h-4v17h4a3 3 0 0 1 3 3V5Z" /></SvgIcon>;
}

function LayersIcon() { return <SvgIcon><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></SvgIcon>; }
function GridIcon() { return <SvgIcon><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></SvgIcon>; }
function TipIcon() { return <SvgIcon><path d="M9 18h6M10 22h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5C14.5 15.3 14 16 14 18h-4c0-2-.5-2.7-1.5-3.5Z" /></SvgIcon>; }
function HistoryIcon() { return <SvgIcon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></SvgIcon>; }
function LibraryIcon() { return <SvgIcon><path d="M4 4h16v16H4zM8 4v16M16 4v16" /><path d="M4 9h4M16 15h4" /></SvgIcon>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>; }
