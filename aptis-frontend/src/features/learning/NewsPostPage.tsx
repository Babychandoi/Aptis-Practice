import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { newsApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SafeHtml } from '@/components/ui/SafeContent';
import { useIsPremium } from '@/features/auth/authStore';
import { useAuthStore } from '@/features/auth/authStore';
import { formatDateTime, relativeTime } from '@/lib/format';
import { markdownToHtml } from '@/lib/markdown';
import type { LinkedQuestionSet, NewsComment } from '@/types/api';

/** Bài viết bảng tin kèm phần bình luận. */
export function NewsPostPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isPremium = useIsPremium();

  const postQuery = useQuery({
    queryKey: ['news', 'post', slug],
    queryFn: () => newsApi.detail(slug),
    enabled: slug.length > 0,
  });

  const post = postQuery.data;

  const bodyHtml = useMemo(
    () => (post ? markdownToHtml(post.body) : ''),
    [post],
  );

  /**
   * Mở ĐÚNG một đề đã gắn.
   *
   * Dùng part-attempts với questionSetIds chứ không dùng custom-attempts: nhánh
   * custom chỉ lọc theo Part/chủ đề nên ra đề bất kỳ trong nhóm — bài dạy cách
   * làm một đề cụ thể thì phải mở đúng đề đó.
   */
  const openSetMutation = useMutation({
    mutationFn: (set: LinkedQuestionSet) => {
      if (!set.partId) throw new Error('Đề này thiếu thông tin Part');
      return practiceApi.createPartAttempt({
        partId: set.partId,
        questionSetIds: [set.questionSetId],
      });
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
  });

  /** Luyện theo nhóm Part/chủ đề — dùng khi bài không gắn đề đích danh. */
  const practiceMutation = useMutation({
    mutationFn: () => {
      if (!post) throw new Error('Chưa tải xong bài viết');
      return practiceApi.createCustomAttempt({
        ...(post.topicId ? { topicIds: [post.topicId] } : {}),
        ...(post.partId ? { partIds: [post.partId] } : {}),
        questionSetCount: Math.min(Math.max(post.practiceSetCount, 1), 10),
      });
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
  });

  if (postQuery.isPending) return <LoadingBlock label="Đang tải bài viết…" />;
  if (postQuery.error || !post) {
    const notFound = postQuery.error instanceof ApiError && postQuery.error.status === 404;
    return (
      <ErrorBlock
        message={notFound ? 'Bài viết không tồn tại hoặc đã bị ẩn' : 'Không tải được bài viết'}
        onRetry={notFound ? undefined : () => void postQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/bang-tin" className="text-xs font-semibold text-brand-800 hover:underline">
        ← Bảng tin
      </Link>

      <article className="mt-3">
        <h1 className="text-2xl font-bold leading-8 text-slate-900">{post.title}</h1>
        <p className="mt-2 text-xs text-slate-400">
          {post.publishedAt ? formatDateTime(post.publishedAt) : ''} · {post.viewCount} lượt xem
        </p>

        {/* Markdown do quản trị viên viết, vẫn đi qua bộ lọc HTML trước khi render */}
        <SafeHtml html={bodyHtml} className="news-body mt-5" />
      </article>

      {/* Đề gắn đích danh đi trước: bấm vào là mở đúng đề đó. Bài chỉ gắn
          Part/chủ đề thì rơi xuống nhánh luyện theo nhóm bên dưới. */}
      {post.questionSets.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="text-sm font-semibold text-brand-900">
            Đề trong bài này ({post.questionSets.length})
          </h2>
          <p className="mt-1 text-xs text-brand-800">Bấm vào từng đề để làm đúng đề đó.</p>

          <ul className="mt-3 space-y-2">
            {post.questionSets.map((set, index) => (
              <li key={set.questionSetId}>
                <LinkedSetRow
                  set={set}
                  index={index + 1}
                  pending={openSetMutation.isPending}
                  onOpen={() => openSetMutation.mutate(set)}
                />
              </li>
            ))}
          </ul>

          {openSetMutation.error && (
            <p className="mt-2 text-xs text-red-700">
              {openSetMutation.error instanceof ApiError
                ? openSetMutation.error.message
                : 'Không mở được đề'}
            </p>
          )}
        </section>
      ) : post.practiceSetCount > 0 ? (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="text-sm font-semibold text-brand-900">Luyện đề theo bài này</h2>
          <p className="mt-1 text-xs text-brand-800">
            {post.practiceSetCount} đề khớp nội dung bài viết.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={practiceMutation.isPending}
            onClick={() => practiceMutation.mutate()}
          >
            {practiceMutation.isPending ? 'Đang tạo đề…' : 'Làm bài ngay'}
          </button>
          {practiceMutation.error && (
            <p className="mt-2 text-xs text-red-700">
              {practiceMutation.error instanceof ApiError
                ? practiceMutation.error.message
                : 'Không tạo được lượt luyện tập'}
            </p>
          )}
        </section>
      ) : null}

      <CommentSection
        postId={post.id}
        commentsEnabled={post.commentsEnabled}
        commentsModerated={post.commentsModerated}
        canComment={post.canComment}
        loggedIn={user != null}
        isPremium={isPremium}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['news', 'post', slug] });
        }}
      />
    </div>
  );
}

/**
 * Một đề trong danh sách.
 *
 * Đề bị khoá vẫn hiện, chỉ đổi thành lời mời mua gói: học viên hết hạn cần thấy
 * bài có bao nhiêu đề để biết mình đang bỏ lỡ gì.
 */
function LinkedSetRow({
  set,
  index,
  pending,
  onOpen,
}: {
  set: LinkedQuestionSet;
  index: number;
  pending: boolean;
  onOpen: () => void;
}) {
  // Nhãn Part trong DB là PART_2; đọc ra cho học viên thì cần "Part 2".
  const label = set.partLabel ? set.partLabel.replace("PART_", "Part ") : null;

  if (!set.unlocked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-white/60 px-3.5 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-500">{set.title}</span>
          {label && <span className="block text-[11px] text-slate-400">{label}</span>}
        </span>
        <Link
          to="/plans"
          className="shrink-0 rounded-lg bg-dark px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-accent"
        >
          Mở khoá
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800">
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">{set.title}</span>
        {label && <span className="block text-[11px] text-slate-500">{label}</span>}
      </span>
      <span aria-hidden="true" className="shrink-0 text-brand-800">
        →
      </span>
    </button>
  );
}

function CommentSection({
  postId,
  commentsEnabled,
  commentsModerated,
  canComment,
  loggedIn,
  isPremium,
  onChanged,
}: {
  postId: string;
  commentsEnabled: boolean;
  commentsModerated: boolean;
  canComment: boolean;
  loggedIn: boolean;
  isPremium: boolean;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['news', 'comments', postId],
    queryFn: () => newsApi.comments(postId, { size: 50 }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['news', 'comments', postId] });
    onChanged();
  };

  const addMutation = useMutation({
    mutationFn: (input: { text: string; parentId?: string }) =>
      newsApi.addComment(postId, input.text, input.parentId),
    onSuccess: () => {
      setBody('');
      setReplyBody('');
      setReplyTo(null);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => newsApi.deleteComment(commentId),
    onSuccess: refresh,
  });

  if (!commentsEnabled) {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 text-center text-sm text-slate-500">
        Bài viết này đã tắt bình luận.
      </section>
    );
  }

  const comments = commentsQuery.data?.content ?? [];

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">
        Bình luận {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Ba trạng thái khác nhau, đừng gộp: chưa đăng nhập, đã đăng nhập mà hết
          hạn, và được bình luận. Nói đúng việc cần làm thì học viên mới làm được. */}
      {canComment ? (
        <form
          className="mb-6"
          onSubmit={(event) => {
            event.preventDefault();
            const text = body.trim();
            if (text) addMutation.mutate({ text });
          }}
        >
          {commentsModerated && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              Bình luận ở bài này sẽ hiện sau khi quản trị viên duyệt.
            </p>
          )}
          <textarea
            className="input min-h-[88px]"
            placeholder="Đặt câu hỏi hoặc chia sẻ cách làm của bạn…"
            maxLength={2000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">{body.length}/2000</span>
            <button
              type="submit"
              className="btn-primary !px-4 !py-2"
              disabled={body.trim().length === 0 || addMutation.isPending}
            >
              {addMutation.isPending ? 'Đang gửi…' : 'Gửi bình luận'}
            </button>
          </div>
          {addMutation.error && (
            <p className="mt-2 text-xs text-red-700">
              {addMutation.error instanceof ApiError
                ? addMutation.error.message
                : 'Không gửi được bình luận'}
            </p>
          )}
        </form>
      ) : (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          {!loggedIn ? (
            <p className="text-slate-600">
              <Link to="/login" className="font-semibold text-brand-800 hover:underline">
                Đăng nhập
              </Link>{' '}
              để đặt câu hỏi dưới bài viết.
            </p>
          ) : !isPremium ? (
            <p className="text-slate-600">
              Bình luận và hỏi đáp dành cho học viên Premium.{' '}
              <Link to="/plans" className="font-semibold text-brand-800 hover:underline">
                Xem gói học
              </Link>
            </p>
          ) : (
            <p className="text-slate-600">Hiện chưa thể bình luận ở bài này.</p>
          )}
        </div>
      )}

      {commentsQuery.isPending ? (
        <LoadingBlock label="Đang tải bình luận…" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có bình luận nào.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                canReply={canComment}
                replying={replyTo === comment.id}
                replyBody={replyBody}
                onReplyBodyChange={setReplyBody}
                onStartReply={() => {
                  setReplyTo(comment.id);
                  setReplyBody('');
                }}
                onCancelReply={() => setReplyTo(null)}
                onSubmitReply={() => {
                  const text = replyBody.trim();
                  if (text) addMutation.mutate({ text, parentId: comment.id });
                }}
                submitting={addMutation.isPending}
                onDelete={() => deleteMutation.mutate(comment.id)}
                onDeleteReply={(replyId) => deleteMutation.mutate(replyId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  canReply,
  replying,
  replyBody,
  onReplyBodyChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  submitting,
  onDelete,
  onDeleteReply,
  nested = false,
}: {
  comment: NewsComment;
  canReply: boolean;
  replying?: boolean;
  replyBody?: string;
  onReplyBodyChange?: (value: string) => void;
  onStartReply?: () => void;
  onCancelReply?: () => void;
  onSubmitReply?: () => void;
  submitting?: boolean;
  onDelete?: () => void;
  /** Xoá một trả lời — truyền từ cấp gốc xuống vì mutation nằm ở đó. */
  onDeleteReply?: (replyId: string) => void;
  nested?: boolean;
}) {
  // Bình luận bị ẩn hoặc chờ duyệt CHỈ người viết nhận được (backend lọc), nên
  // ở đây chỉ cần làm mờ và nói rõ lý do — ẩn im lặng thì họ tưởng lỗi và gửi lại.
  const muted = comment.status !== 'VISIBLE';

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4',
        muted ? 'border-dashed border-slate-300 bg-slate-50 opacity-60' : 'border-border bg-white',
        nested && 'ml-6 sm:ml-10',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{comment.authorName}</span>
        {comment.fromAdmin && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">
            Quản trị viên
          </span>
        )}
        {comment.mine && !comment.fromAdmin && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Bạn
          </span>
        )}
        <span className="text-[11px] text-slate-400">{relativeTime(comment.createdAt)}</span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p>

      {comment.statusNote && (
        <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] italic text-slate-500">
          {comment.statusNote}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3">
        {!nested && canReply && !muted && onStartReply && (
          <button
            type="button"
            className="text-[11px] font-semibold text-brand-800 hover:underline"
            onClick={onStartReply}
          >
            Trả lời
          </button>
        )}
        {comment.mine && onDelete && (
          <button
            type="button"
            className="text-[11px] font-semibold text-slate-400 hover:text-red-700"
            onClick={onDelete}
          >
            Xoá
          </button>
        )}
      </div>

      {replying && onReplyBodyChange && onSubmitReply && (
        <div className="mt-3">
          <textarea
            className="input min-h-[64px]"
            placeholder="Trả lời…"
            maxLength={2000}
            value={replyBody ?? ''}
            onChange={(event) => onReplyBodyChange(event.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="btn-primary !px-3 !py-1.5 text-xs"
              disabled={(replyBody ?? '').trim().length === 0 || submitting}
              onClick={onSubmitReply}
            >
              Gửi
            </button>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onCancelReply}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentItem
                comment={reply}
                canReply={false}
                nested
                onDelete={onDeleteReply ? () => onDeleteReply(reply.id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
