import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherContentApi } from '@/api/endpoints';
import { confirmDialog } from '@/lib/dialog';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SafeHtml } from '@/components/ui/SafeContent';
import { formatDateTime } from '@/lib/format';
import { markdownToHtml } from '@/lib/markdown';
import { useEscapeKey } from '@/lib/useEscapeKey';
import type { ClassroomPost, ClassroomPostStatus } from '@/types/api';

const STATUS: Record<ClassroomPostStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Nháp', tone: 'bg-surface-muted text-slate-600' },
  PUBLISHED: { label: 'Đang hiện', tone: 'bg-emerald-50 text-emerald-700' },
  HIDDEN: { label: 'Đã ẩn', tone: 'bg-amber-50 text-amber-800' },
};

/**
 * Bảng tin riêng của lớp.
 *
 * <p>Làm ngang bản của admin: soạn nháp, định dạng chữ bằng Markdown, ghim bài
 * quan trọng. Khác một điểm — chỉ học viên trong lớp thấy.
 */
export function TeacherPostsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClassroomPost | 'new' | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'posts'],
    queryFn: teacherContentApi.posts,
  });

  const remove = useMutation({
    mutationFn: teacherContentApi.deletePost,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'posts'] }),
  });

  // Ẩn/hiện nhanh mà không phải mở hộp thoại.
  const toggleVisible = useMutation({
    mutationFn: (post: ClassroomPost) =>
      teacherContentApi.updatePost(post.id, {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverAssetId: post.coverAssetId,
        pinned: post.pinned,
        status: post.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED',
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'posts'] }),
  });

  const togglePin = useMutation({
    mutationFn: (post: ClassroomPost) =>
      teacherContentApi.updatePost(post.id, {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverAssetId: post.coverAssetId,
        pinned: !post.pinned,
        status: post.status,
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'posts'] }),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được bảng tin" onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Thông báo chỉ học viên lớp bạn thấy — khác bảng tin chung của hệ thống.
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          + Viết bài
        </button>
      </div>

      {query.data.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Chưa có bài nào. Bấm “Viết bài” để đăng thông báo đầu tiên cho lớp.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {query.data.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-border bg-white px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.pinned && (
                      <span title="Đã ghim" aria-label="Đã ghim">
                        📌
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900">{post.title}</h3>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
                        STATUS[post.status].tone,
                      )}
                    >
                      {STATUS[post.status].label}
                    </span>
                  </div>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.excerpt}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    {post.publishedAt
                      ? `Đăng ${formatDateTime(post.publishedAt)}`
                      : `Tạo ${formatDateTime(post.createdAt)}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={togglePin.isPending}
                    onClick={() => togglePin.mutate(post)}
                    className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    {post.pinned ? 'Bỏ ghim' : 'Ghim'}
                  </button>
                  {post.status !== 'DRAFT' && (
                    <button
                      type="button"
                      disabled={toggleVisible.isPending}
                      onClick={() => toggleVisible.mutate(post)}
                      className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface disabled:opacity-50"
                    >
                      {post.status === 'PUBLISHED' ? 'Ẩn đi' : 'Hiện lại'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(post)}
                    className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: 'Xoá bài viết?',
                        text: `“${post.title}” sẽ bị gỡ khỏi bảng tin lớp.`,
                        confirmText: 'Xoá bài',
                        danger: true,
                      });
                      if (ok) remove.mutate(post.id);
                    }}
                    className="ml-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PostDialog
          post={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Soạn hoặc sửa một bài. Lưu nháp và đăng là hai nút riêng. */
function PostDialog({ post, onClose }: { post: ClassroomPost | null; onClose: () => void }) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverAssetId, setCoverAssetId] = useState(post?.coverAssetId ?? '');
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (status: ClassroomPostStatus) => {
      const body = {
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        content,
        coverAssetId: coverAssetId.trim() || null,
        pinned,
        status,
      };
      return post ? teacherContentApi.updatePost(post.id, body) : teacherContentApi.addPost(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'posts'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const submit = (status: ClassroomPostStatus) => {
    setError(null);
    if (!title.trim()) {
      setError('Nhập tiêu đề trước khi lưu');
      return;
    }
    save.mutate(status);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            {post ? 'Sửa bài đăng' : 'Viết bài cho lớp'}
          </h2>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-surface"
          >
            {preview ? 'Soạn tiếp' : 'Xem trước'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Tiêu đề
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lịch nghỉ lễ — bù bài Reading"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Tóm tắt (không bắt buộc)
            </span>
            <input
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="Một dòng hiện ở danh sách"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {preview ? (
            <div className="rounded-xl border border-border bg-surface-paper px-4 py-3">
              <SafeHtml html={markdownToHtml(content)} className="prose-sm" />
            </div>
          ) : (
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Nội dung
              </span>
              <textarea
                value={content}
                rows={10}
                onChange={(event) => setContent(event.target.value)}
                placeholder={'Viết thường, hoặc dùng Markdown:\n\n**in đậm**, *nghiêng*\n- gạch đầu dòng\n[chữ hiện](https://link)'}
                className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 font-mono text-[13px] leading-6 outline-none focus:border-brand-400"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Dùng được Markdown: <code>**đậm**</code>, <code>*nghiêng*</code>,{' '}
                <code>- danh sách</code>, <code>[chữ](link)</code>. Bấm “Xem trước” để kiểm tra.
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Mã ảnh bìa (không bắt buộc)
            </span>
            <input
              value={coverAssetId}
              onChange={(event) => setCoverAssetId(event.target.value)}
              placeholder="Dán id ảnh đã tải lên hệ thống"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-slate-700">Ghim lên đầu bảng tin lớp</span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit('DRAFT')}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface disabled:opacity-60"
            >
              Lưu nháp
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit('PUBLISHED')}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {save.isPending ? 'Đang lưu…' : 'Đăng cho lớp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
