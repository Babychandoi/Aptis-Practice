import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { contentUpdateApi, newsApi } from '@/api/endpoints';
import { useAttemptLabels } from '@/features/practice/attemptLabels';
import { formatDate } from '@/lib/format';
import { stagger } from '@/lib/motion';
import type { ContentUpdateLog, NewsPostSummary } from '@/types/api';

/** Đợt cập nhật trong vòng chừng này ngày thì gắn nhãn MỚI. */
const NEW_DAYS = 7;
const UPDATE_LIMIT = 4;
const NEWS_LIMIT = 3;

const isRecent = (isoDate: string) => Date.now() - new Date(isoDate).getTime() <= NEW_DAYS * 86_400_000;

/** Nhãn của bài viết: bài không có danh mục nên suy ra từ trạng thái thật của bài. */
function newsTag(post: NewsPostSummary) {
  if (post.pinned) return 'Ghim';
  if (post.hasPractice) return 'Có đề luyện';
  return 'Tin mới';
}

/**
 * Khối "Mới cập nhật" và "Bảng tin" ở trang chủ, theo mock 10/2026.
 *
 * <p>Đợt cập nhật đề chỉ dành cho Premium (backend trả 403 cho tài khoản
 * miễn phí), nên khi bị 403 cột này đổi thành lời mời nâng cấp thay vì báo
 * lỗi. Bảng tin ai cũng đọc được.
 */
export function DashboardFresh() {
  const { skillOfPart, partNumberOf } = useAttemptLabels();

  const updates = useQuery({
    queryKey: ['content-updates'],
    queryFn: contentUpdateApi.list,
    staleTime: 5 * 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 403) && count < 1,
  });
  const news = useQuery({
    queryKey: ['dashboard-news'],
    queryFn: () => newsApi.feed({ size: NEWS_LIMIT }),
    staleTime: 5 * 60_000,
  });

  const locked = updates.error instanceof ApiError && updates.error.status === 403;
  const logs = (updates.data ?? []).slice(0, UPDATE_LIMIT);
  const posts = (news.data?.content ?? []).slice(0, NEWS_LIMIT);

  /** "Writing Part 4"; Ngữ pháp & Từ vựng không đánh số Part. */
  const chipOf = (log: ContentUpdateLog) => {
    const skill = skillOfPart(log.partId);
    const number = partNumberOf(log.partId);
    const text = skill.code === 'GRAMMAR_VOCABULARY' || !number ? skill.nameEn : `${skill.nameEn} Part ${number}`;
    return { skill, text: log.partId ? text : log.label };
  };

  return (
    <section className="grid animate-in gap-6 rounded-3xl border border-border bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
      {/* Mới cập nhật */}
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
            Mới cập nhật
          </h2>
          <Link to="/cap-nhat-de" className="text-xs font-semibold text-ink-mute hover:text-ink">Xem tất cả →</Link>
        </header>

        {locked ? (
          <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3.5 text-sm leading-6 text-ink-soft">
            Danh sách đề mới thuộc gói Premium.{' '}
            <Link to="/plans" className="font-semibold text-ink underline underline-offset-2">Xem gói Premium</Link>
          </p>
        ) : updates.isPending ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-muted" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-mute">Chưa có đợt cập nhật nào.</p>
        ) : (
          <ol className="relative mt-4 flex flex-col gap-5 border-l-2 border-ink/80 pl-5">
            {logs.map((log, index) => {
              const { skill, text } = chipOf(log);
              const count = log.questionSets.length;
              return (
                <li key={log.id} className="relative animate-in" style={stagger(index, 70)}>
                  <span
                    aria-hidden="true"
                    className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-[3px] bg-white"
                    style={{ borderColor: skill.fg }}
                  />
                  <Link to="/cap-nhat-de" className="group block">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: skill.bg, color: skill.fg }}>
                        {text}
                      </span>
                      <span className="text-xs text-ink-faint">{formatDate(log.logDate)}</span>
                      {isRecent(log.logDate) && (
                        <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">MỚI</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                      <p className="line-clamp-2 min-w-0 text-[14.5px] leading-6 group-hover:text-ink-soft">{log.description}</p>
                      {count > 0 && <span className="mt-0.5 shrink-0 text-xs font-semibold text-ink-soft">{count} bộ mới</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Bảng tin */}
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Bảng tin</h2>
          <Link to="/bang-tin" className="text-xs font-semibold text-ink-mute hover:text-ink">Xem tất cả →</Link>
        </header>

        {news.isPending ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-muted" />)}
          </div>
        ) : posts.length === 0 ? (
          <p className="mt-4 text-sm text-ink-mute">Chưa có bài viết nào.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {posts.map((post, index) => (
              <li key={post.id} className="animate-in" style={stagger(index, 70)}>
                <Link
                  to={`/bang-tin/${post.slug}`}
                  className="block rounded-2xl border border-border bg-surface-paper px-3.5 py-3 transition-colors hover:border-brand-300"
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', post.pinned ? 'bg-amber-50 text-amber-700' : 'bg-surface-muted text-ink-soft')}>
                      {newsTag(post)}
                    </span>
                    {post.publishedAt && <span className="text-xs text-ink-faint">{formatDate(post.publishedAt)}</span>}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold leading-5">{post.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
