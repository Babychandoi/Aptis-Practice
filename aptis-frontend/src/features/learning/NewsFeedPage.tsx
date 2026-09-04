import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { newsApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
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
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Bảng tin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cách làm bài, dự đoán đề và thông báo mới nhất từ Aptis Practice.
        </p>
      </header>

      {data.content.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          Chưa có bài viết nào.
        </div>
      ) : (
        <div className="space-y-4">
          {data.content.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
          >
            Trước
          </button>
          <span className="text-xs text-slate-500">
            Trang {page + 1} / {data.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: NewsPostSummary }) {
  return (
    <Link
      to={`/bang-tin/${post.slug}`}
      className="block rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {post.pinned && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            📌 Ghim
          </span>
        )}
        {post.hasPractice && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800">
            Có đề luyện
          </span>
        )}
        <span className="text-[11px] text-slate-400">
          {post.publishedAt ? formatDate(post.publishedAt) : ''}
        </span>
      </div>

      <h2 className="text-base font-semibold leading-6 text-slate-900">{post.title}</h2>

      {post.excerpt && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
      )}

      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
        <span>{post.viewCount} lượt xem</span>
        <span>{post.commentCount} bình luận</span>
      </div>
    </Link>
  );
}
