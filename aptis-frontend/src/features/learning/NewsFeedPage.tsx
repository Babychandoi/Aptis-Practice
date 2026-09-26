import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { newsApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { stagger } from '@/lib/motion';
import type { NewsPostSummary } from '@/types/api';

const PAGE_SIZE = 10;

/**
 * Bảng tin: bài hướng dẫn làm bài và dự đoán đề do quản trị viên đăng.
 *
 * <p>Đọc được cả khi chưa đăng nhập — người đã hết hạn còn lý do quay lại, và
 * Google có nội dung để lập chỉ mục.
 */
export function NewsFeedPage() {
  const [page, setPage] = useState(0);

  const feedQuery = useQuery({
    queryKey: ['news', 'feed', page],
    queryFn: () => newsApi.feed({ page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  if (feedQuery.isPending) return <LoadingBlock label="Đang tải bảng tin…" />;
  if (feedQuery.error || !feedQuery.data) {
    return (
      <ErrorBlock
        message="Không tải được bảng tin"
        onRetry={() => void feedQuery.refetch()}
      />
    );
  }

  const data = feedQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-in">
        <h1 className="page-title">Bảng tin</h1>
        <p className="page-description">Cách làm bài, dự đoán đề và thông báo mới nhất từ Aptis Practice.</p>
      </header>

      {data.content.length === 0 ? (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-sm text-ink-mute">Chưa có bài viết nào.</div>
      ) : (
        // Bài đầu trang (thường là bài ghim hoặc mới nhất) được làm nổi, các bài
        // sau xếp lưới — như mock. Trang sau không có bài nổi vì không còn là
        // "tin chính" của bảng tin nữa.
        <div className="grid gap-4 lg:grid-cols-3">
          {data.content.map((post, i) =>
            i === 0 && page === 0 ? (
              <FeaturedCard key={post.id} post={post} />
            ) : (
              <PostCard key={post.id} post={post} index={i} />
            ),
          )}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage((c) => Math.max(c - 1, 0))}>
            Trước
          </button>
          <span className="text-xs text-ink-mute">Trang {page + 1} / {data.totalPages}</span>
          <button type="button" className="btn-secondary" disabled={page + 1 >= data.totalPages} onClick={() => setPage((c) => c + 1)}>
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

function Meta({ post, dark }: { post: NewsPostSummary; dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.pinned && (
        <span className={dark ? 'rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold' : 'rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700'}>
          Ghim
        </span>
      )}
      {post.hasPractice && (
        <span className={dark ? 'rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold' : 'rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft'}>
          Có đề luyện
        </span>
      )}
      <span className={dark ? 'text-[11px] text-white/60' : 'text-[11px] text-ink-faint'}>
        {post.publishedAt ? formatDate(post.publishedAt) : ''}
      </span>
    </div>
  );
}

function FeaturedCard({ post }: { post: NewsPostSummary }) {
  return (
    <Link
      to={`/bang-tin/${post.slug}`}
      className="relative flex min-h-[300px] animate-in flex-col justify-end overflow-hidden rounded-3xl bg-ink p-7 text-white lg:row-span-2"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-spin-slow rounded-full border border-dashed border-white/10" />
      <div className="absolute left-7 top-7"><Meta post={post} dark /></div>
      <h2 className="text-[clamp(24px,2.6vw,32px)] font-extrabold leading-[1.12] tracking-[-0.03em]">{post.title}</h2>
      {post.excerpt && <p className="mt-3 line-clamp-3 text-[15px] leading-6 text-white/70">{post.excerpt}</p>}
      <span className="mt-4 text-sm font-semibold">Đọc bài →</span>
    </Link>
  );
}

function PostCard({ post, index }: { post: NewsPostSummary; index: number }) {
  return (
    <Link
      to={`/bang-tin/${post.slug}`}
      style={stagger(index)}
      className="flex animate-in flex-col gap-3 rounded-3xl border border-border bg-white p-5 transition-colors hover:border-brand-300"
    >
      <Meta post={post} />
      <h2 className="text-lg font-bold leading-6 tracking-tight">{post.title}</h2>
      {post.excerpt && <p className="line-clamp-2 text-sm leading-6 text-ink-mute">{post.excerpt}</p>}
      <div className="mt-auto flex items-center gap-4 text-[11px] text-ink-faint">
        <span>{post.viewCount} lượt xem</span>
        <span>{post.commentCount} bình luận</span>
      </div>
    </Link>
  );
}
