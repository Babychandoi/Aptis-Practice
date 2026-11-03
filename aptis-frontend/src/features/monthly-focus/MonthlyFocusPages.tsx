import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { monthlyFocusApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import {
  basePath,
  pagePath,
  pagesOf,
  SKILL_OF_SLUG,
  SKILL_SLUG,
  SKILLS,
} from '@/features/monthly-focus/monthlyFocusLogic';
import { MfIcon, PageHeading, ToneTile } from '@/features/monthly-focus/mfUi';

/** /de-trong-diem — bốn thẻ kỹ năng, như trang "Đề trọng điểm tháng" của website. */
export function MonthlyFocusHomePage() {
  return (
    <div className="mx-auto w-full max-w-[1480px]">
      <PageHeading title="Đề trọng điểm tháng" description="Chọn kỹ năng trọng điểm trong tháng để luyện tập tập trung cho kỳ thi Aptis." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {SKILLS.map((s) => (
          <Link
            key={s.skill}
            to={`${basePath}/${SKILL_SLUG[s.skill]}`}
            className="group rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start gap-4">
              <ToneTile tone={s.tone} icon={s.icon} />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">{s.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{s.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** /de-trong-diem/:skill — thẻ từng Part; Writing có trang riêng (câu lạc bộ). */
export function MonthlyFocusSkillPage() {
  const { skillSlug } = useParams<{ skillSlug: string }>();
  const skill = SKILL_OF_SLUG[skillSlug ?? ''];
  const counts = useQuery({ queryKey: ['monthly-focus', 'summary'], queryFn: monthlyFocusApi.summary, staleTime: 5 * 60_000 });
  if (!skill) return <Navigate to={basePath} replace />;
  if (skill === 'writing') return <MonthlyFocusWritingPage />;

  const meta = SKILLS.find((s) => s.skill === skill)!;
  return (
    <div className="mx-auto w-full max-w-[1480px]">
      <PageHeading title={meta.title} description={meta.description} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {pagesOf(skill).map((p) => {
          const n = counts.data?.[p.key];
          return (
            <Link
              key={p.key}
              to={pagePath(p)}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start gap-4">
                <ToneTile tone={p.tone} icon={p.icon} />
                <h2 className="pt-1 text-xl font-bold leading-snug text-slate-900">{p.title}</h2>
              </div>
              <p className="mt-6 text-sm text-slate-500">{p.description}</p>
              {n != null && <p className="mt-2 text-xs font-medium text-slate-400">{n} đề trọng điểm</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Màu nền icon câu lạc bộ: website dùng tên màu tailwind, vài màu ngoài bảng thì lấy xanh. */
function MonthlyFocusWritingPage() {
  const query = useQuery({ queryKey: ['monthly-focus', 'writing'], queryFn: monthlyFocusApi.writing, staleTime: 5 * 60_000 });
  if (query.isPending) return <LoadingBlock label="Đang tải câu lạc bộ Writing…" />;
  if (query.error || !query.data) return <ErrorBlock message="Không tải được trang Writing trọng điểm" onRetry={() => void query.refetch()} />;

  const { clubs, hotTopics, predictDate } = query.data;
  // Topic dự đoán nào trùng tên câu lạc bộ thì bấm vào được.
  const clubOf = (label: string) => {
    const want = label.toLowerCase().replace(/\s*club\s*$/i, '').trim();
    return clubs.find((c) => c.title.toLowerCase().replace(/\s*club\s*$/i, '').trim() === want);
  };
  const shown = hotTopics.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
        <MfIcon name="pen" className="h-3.5 w-3.5" /> Trọng điểm tháng
      </span>
      <h1 className="mt-3 text-[32px] font-bold tracking-tight text-slate-900">Luyện Writing</h1>
      <p className="mt-1 text-[15px] text-slate-500">Câu lạc bộ Writing trọng điểm và topic dự đoán cần ôn trước.</p>

      {hotTopics.length > 0 && (
        <section className="mt-6 rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-cyan-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase text-white">
                  <MfIcon name="sparkles" className="h-3 w-3" /> Dự đoán đề Writing
                </span>
                {predictDate && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-600">
                    <MfIcon name="calendar" className="h-3.5 w-3.5" /> {formatDate(predictDate)}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">Dự đoán đề hằng ngày</h2>
              <p className="mt-1 text-sm text-slate-500">Topic Writing được lấy từ bộ dự đoán chung, gom theo mức ưu tiên để ôn nhanh.</p>
            </div>
            <Link to="/du-doan-de" className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50">
              Xem đủ <MfIcon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-600">Ưu tiên cao</span>
              <span className="text-xs text-slate-500">{hotTopics.length} topic</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {shown.map((label) => {
                const club = clubOf(label);
                const cls = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800';
                return club ? (
                  <Link key={label} to={`${basePath}/viet/clb/${club.topicKey}`} className={`${cls} hover:border-slate-300 hover:bg-slate-50`}>
                    {label} <MfIcon name="arrowRight" className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span key={label} className={cls}>{label}</span>
                );
              })}
              {hotTopics.length > shown.length && (
                <Link to="/du-doan-de" className="inline-flex items-center rounded-xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600">
                  +{hotTopics.length - shown.length} topic
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Câu lạc bộ luyện viết</h2>
        <span className="text-sm font-semibold text-cyan-600">{clubs.length} club</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <Link
            key={club.topicKey}
            to={`${basePath}/viet/clb/${club.topicKey}`}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          >
            <ToneTile tone={club.color ?? 'blue'} icon={club.iconName ?? 'pen'} size="md" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-slate-900">{club.title}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{club.description || '4 phần luyện viết theo chủ đề này.'}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-cyan-600">Luyện →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
