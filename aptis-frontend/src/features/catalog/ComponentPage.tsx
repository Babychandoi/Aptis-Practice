import { Link, Navigate, useParams } from 'react-router-dom';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, componentPath, findComponentBySlug } from '@/features/catalog/catalogRoutes';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { useIsPremium } from '@/features/auth/authStore';
import { skillByCode } from '@/lib/skills';
import { Icon } from '@/components/shell/icons';

const TIPS_PATH: Record<string, string> = {
  LISTENING: '/meo-hoc/nghe-phan-3',
  READING: '/meo-hoc/doc',
  WRITING: '/meo-hoc/viet',
  SPEAKING: '/meo-hoc/noi',
};

/** Trang một kỹ năng: ba cách luyện, tô theo màu riêng của kỹ năng đó. */
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
    return <ErrorBlock message="Không tìm thấy kỹ năng này. Hãy chọn lại từ menu Kỹ năng." />;
  }

  if (componentId) return <Navigate to={componentPath(component.code)} replace />;

  const tipsPath = TIPS_PATH[component.code.toUpperCase()];
  const parts = partsQuery.data ?? [];
  const displayName = componentDisplayName(component);
  const totalQuestionSets = parts.reduce((sum, part) => sum + part.publishedQuestionSetCount, 0);
  const skill = skillByCode(component.code);
  const base = componentPath(component.code);

  const modes = [
    {
      key: 'parts',
      chip: `Linh hoạt · ${parts.length} Part`,
      title: 'Luyện theo Part',
      desc: 'Chọn đúng dạng bài cần cải thiện. Tập trung rèn luyện từng Part với giải thích chi tiết.',
      // Backend vẫn là nơi chặn thật (PREMIUM_REQUIRED); dẫn sang trang gói để
      // học viên biết mở bằng cách nào thay vì bấm vào rồi mới báo lỗi.
      to: isPremium ? `${base}/theo-part` : '/plans',
      cta: isPremium ? 'Chọn Part để luyện' : 'Nâng cấp Premium để luyện theo Part',
      locked: !isPremium,
      hot: false,
    },
    {
      key: 'tests',
      chip: 'Chuẩn thi · Bấm giờ',
      title: 'Bài test đầy đủ',
      desc: 'Làm liền mạch toàn bộ các Part của kỹ năng này với đồng hồ đếm ngược như kỳ thi thật.',
      to: `${base}/bai-test`,
      cta: 'Bắt đầu bài test',
      locked: false,
      hot: true,
    },
    {
      key: 'tips',
      chip: 'Chiến thuật',
      title: tipsPath ? 'Mẹo làm bài' : 'Kết quả đã làm',
      desc: tipsPath
        ? 'Chiến thuật làm bài, từ khoá bẫy paraphrase và mẹo đạt band điểm cao.'
        : 'Xem lại điểm và bài làm của kỹ năng này để biết mình còn yếu ở đâu.',
      to: tipsPath ? (isPremium ? tipsPath : '/plans') : '/history',
      cta: tipsPath ? (isPremium ? 'Xem mẹo làm bài' : 'Nâng cấp Premium để xem mẹo') : 'Xem kết quả',
      locked: Boolean(tipsPath) && !isPremium,
      hot: false,
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex animate-rise flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav className="font-mono text-xs uppercase tracking-[0.12em] text-ink-faint" aria-label="Đường dẫn">
            <Link to="/" className="hover:text-ink">← Bảng điều khiển</Link>
            <span className="mx-2">/</span>
            <span className="text-ink-soft">{skill.nameVi || displayName}</span>
          </nav>
          <h1 className="mt-4 text-[clamp(40px,6vw,64px)] font-extrabold leading-none tracking-[-0.045em]">
            {skill.nameVi || displayName}
          </h1>
          <p className="mt-3 text-base text-ink-mute">
            {parts.length} Part · {totalQuestionSets} bộ câu hỏi đang có sẵn
          </p>
        </div>
        {component.durationSeconds ? (
          <span
            className="self-start rounded-full px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.12em] sm:self-auto"
            style={{ background: skill.bg, color: skill.fg }}
          >
            {Math.round(component.durationSeconds / 60)} phút / đề full
          </span>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((m, i) => (
          <article
            key={m.key}
            className="flex animate-rise flex-col gap-4 rounded-3xl border border-border bg-white p-6"
            style={{
              animationDelay: `${i * 80}ms`,
              ...(m.hot
                ? {
                    borderColor: skill.fg,
                    boxShadow: `0 22px 44px -30px ${skill.fg}`,
                    background: `linear-gradient(180deg, ${skill.bg} 0%, #FFFFFF 55%)`,
                  }
                : {}),
            }}
          >
            <span
              className="self-start rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em]"
              style={
                m.hot
                  ? { background: '#0F172A', color: '#FFFFFF' }
                  : i === 0
                    ? { background: skill.bg, color: skill.fg }
                    : { background: '#F1F5F9', color: '#475569' }
              }
            >
              {m.chip}
            </span>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{m.title}</h2>
            <p className="flex-1 text-[15px] leading-6 text-ink-mute">{m.desc}</p>
            <Link
              to={m.to}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border text-[15px] font-bold transition-opacity hover:opacity-90"
              style={
                m.locked
                  ? { borderColor: '#FDE68A', background: '#FFFBEB', color: '#78350F' }
                  : m.hot
                    ? { background: skill.fg, borderColor: skill.fg, color: '#FFFFFF' }
                    : { background: '#FAFAF7', borderColor: '#E7E5DF', color: '#0F172A' }
              }
            >
              {m.locked && <Icon name="lock" className="h-4 w-4" />}
              {m.cta}
              {!m.locked && <Icon name="arrow" className="h-4 w-4" />}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
