import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { adminContentApi, adminNewsApi } from '@/api/adminEndpoints';
import { assetApi, uploadToPresignedUrl } from '@/api/endpoints';
import { useComponents, useExamVersions, usePartsOfComponents, useTopics } from '@/features/catalog/catalogQueries';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SafeHtml } from '@/components/ui/SafeContent';
import { confirmDialog } from '@/lib/dialog';
import { formatDateTime, relativeTime } from '@/lib/format';
import { markdownToHtml } from '@/lib/markdown';
import type { PartSummary } from '@/types/api';
import type {
  AdminNewsCommentRow,
  AdminQuestionSet,
  AdminNewsPostRow,
  NewsCommentStatus,
  NewsPostStatus,
  SaveNewsPostRequest,
} from '@/types/admin';
import { DataTable, PageHeader, Pager, ResultBanner } from './components/AdminUi';
import { usePermission } from './usePermission';

const PAGE_SIZE = 20;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Quản trị bảng tin: soạn bài và kiểm duyệt bình luận.
 *
 * Hai tab vì đây là hai việc khác nhau về nhịp: soạn bài làm theo đợt, còn
 * duyệt bình luận là việc kiểm mỗi ngày.
 */
export function NewsAdminPage() {
  const { has } = usePermission();
  const canWrite = has('news:write');
  const canModerate = has('news:moderate');

  const [tab, setTab] = useState<'posts' | 'comments'>(canWrite ? 'posts' : 'comments');
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Bảng tin"
        description="Đăng bài hướng dẫn làm bài, dự đoán đề và kiểm duyệt bình luận của học viên."
      />
      {banner && <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />}

      <div className="mb-5 flex gap-1 border-b border-[#e8e5dc]">
        {canWrite && (
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>
            Bài viết
          </TabButton>
        )}
        {canModerate && (
          <TabButton active={tab === 'comments'} onClick={() => setTab('comments')}>
            Bình luận
            <PendingBadge />
          </TabButton>
        )}
      </div>

      {tab === 'posts' && canWrite && <PostsTab onBanner={setBanner} />}
      {tab === 'comments' && canModerate && <CommentsTab onBanner={setBanner} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative -mb-px inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'border-b-2 border-brand-800 text-brand-900'
          : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}

/** Số bình luận chờ duyệt — để không phải mở tab mới biết có việc. */
function PendingBadge() {
  const query = useQuery({
    queryKey: ['admin', 'news', 'pending-count'],
    queryFn: adminNewsApi.pendingCount,
    refetchInterval: 60_000,
  });

  const count = query.data ?? 0;
  if (count === 0) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------
// Tab bài viết
// ---------------------------------------------------------------------

function PostsTab({ onBanner }: { onBanner: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<NewsPostStatus | ''>('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdminNewsPostRow | 'new' | null>(null);

  const postsQuery = useQuery({
    queryKey: ['admin', 'news', 'posts', status, page],
    queryFn: () =>
      adminNewsApi.posts({ status: status || undefined, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminNewsApi.remove(id),
    onSuccess: () => {
      onBanner('Đã xoá bài viết.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-white p-4 shadow-[0_3px_14px_rgba(31,41,35,.07)]">
        <div className="w-full sm:w-52">
          <label htmlFor="news-status" className="label">
            Trạng thái
          </label>
          <select
            id="news-status"
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as NewsPostStatus | '');
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            <option value="PUBLISHED">Đã đăng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + Viết bài mới
        </button>
      </div>

      {postsQuery.isPending ? (
        <LoadingBlock label="Đang tải danh sách bài viết…" />
      ) : postsQuery.error || !postsQuery.data ? (
        <ErrorBlock
          message={errorMessage(postsQuery.error, 'Không tải được danh sách bài viết')}
          onRetry={() => void postsQuery.refetch()}
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">{postsQuery.data.totalElements} bài viết</p>
          <DataTable
            headers={['Bài viết', 'Trạng thái', 'Bình luận', 'Lượt xem', 'Cập nhật', '']}
            isEmpty={postsQuery.data.content.length === 0}
            empty="Chưa có bài viết nào."
          >
            {postsQuery.data.content.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-brand-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {post.pinned && <span title="Đã ghim">📌 </span>}
                    {post.title}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">/{post.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <PostStatusBadge status={post.status} />
                  {!post.commentsEnabled && (
                    <p className="mt-1 text-[11px] text-slate-400">Đã tắt bình luận</p>
                  )}
                  {post.commentsEnabled && post.commentsModerated && (
                    <p className="mt-1 text-[11px] text-amber-700">Bình luận cần duyệt</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className="font-medium text-slate-700">{post.commentCount}</span>
                  {post.pendingCommentCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      +{post.pendingCommentCount} chờ
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{post.viewCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {post.updatedAt ? relativeTime(post.updatedAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5"
                      onClick={() => setEditing(post)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !border-red-200 !px-3 !py-1.5 !text-red-700"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: 'Xoá bài viết?',
                          text: `Xoá "${post.title}" và toàn bộ ${post.commentCount} bình luận. Không thể hoàn tác.`,
                          confirmText: 'Xoá',
                          danger: true,
                        });
                        if (ok) deleteMutation.mutate(post.id);
                      }}
                    >
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
          <Pager page={page} totalPages={postsQuery.data.totalPages} onChange={setPage} />
        </>
      )}

      {editing && (
        <PostEditor
          postId={editing === 'new' ? null : editing.id}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            onBanner(message);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function PostStatusBadge({ status }: { status: NewsPostStatus }) {
  const map: Record<NewsPostStatus, { label: string; className: string }> = {
    PUBLISHED: { label: 'Đã đăng', className: 'bg-brand-50 text-brand-800' },
    DRAFT: { label: 'Bản nháp', className: 'bg-slate-100 text-slate-600' },
    ARCHIVED: { label: 'Lưu trữ', className: 'bg-stone-200 text-stone-700' },
  };
  const item = map[status];
  return (
    <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', item.className)}>
      {item.label}
    </span>
  );
}

// ---------------------------------------------------------------------
// Trình soạn bài
// ---------------------------------------------------------------------

function PostEditor({
  postId,
  onClose,
  onSaved,
}: {
  postId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const existingQuery = useQuery({
    queryKey: ['admin', 'news', 'post', postId],
    queryFn: () => adminNewsApi.post(postId as string),
    enabled: postId != null,
  });

  // Danh mục để gắn đề luyện. Bài không gắn thì để trống cả hai.
  //
  // Part phải lấy theo từng kỹ năng rồi gộp: API /components/{id}/parts nhận
  // một component, không có endpoint trả hết Part.
  const versionsQuery = useExamVersions();
  const versionId = versionsQuery.data?.[0]?.id;
  const componentsQuery = useComponents(versionId);
  const componentIds = useMemo(
    () => (componentsQuery.data ?? []).map((component) => component.id),
    [componentsQuery.data],
  );
  const partsQuery = usePartsOfComponents(componentIds);
  const topicsQuery = useTopics();

  /** Tên kỹ năng cho nhãn Part — PartSummary chỉ mang componentCode. */
  const componentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const component of componentsQuery.data ?? []) {
      map.set(component.id, component.name);
    }
    return map;
  }, [componentsQuery.data]);

  const [form, setForm] = useState<SaveNewsPostRequest>({
    title: '',
    excerpt: '',
    body: '',
    partId: '',
    topicId: '',
    pinned: false,
    commentsEnabled: true,
    commentsModerated: false,
    status: 'DRAFT',
  });
  const [preview, setPreview] = useState(false);
  // Giữ cả tên đề, không chỉ id: sửa bài cũ phải hiện được tên đề đã gắn mà
  // không phải gọi thêm API tra từng id.
  const [linkedSets, setLinkedSets] = useState<{ id: string; title: string; partLabel: string | null }[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Chèn đoạn Markdown tại vị trí con trỏ.
   *
   * Nối vào cuối bài thì người viết phải tự cắt dán ảnh về đúng chỗ — với bài
   * hướng dẫn nhiều bước, ảnh nằm sai chỗ là mất nghĩa.
   */
  const insertAtCursor = (snippet: string) => {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body: `${f.body}

${snippet}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}${snippet}${el.value.slice(end)}`;
    setForm((f) => ({ ...f, body: next }));
    // Đặt lại con trỏ sau đoạn vừa chèn, để gõ tiếp được ngay
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  };

  useEffect(() => {
    const post = existingQuery.data;
    if (!post) return;
    setLinkedSets(
      (post.questionSets ?? []).map((set) => ({
        id: set.questionSetId,
        title: set.title,
        partLabel: set.partLabel,
      })),
    );
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? '',
      body: post.body,
      partId: post.partId ?? '',
      topicId: post.topicId ?? '',
      pinned: post.pinned,
      commentsEnabled: post.commentsEnabled,
      commentsModerated: post.commentsModerated,
      status: 'DRAFT',
    });
  }, [existingQuery.data]);

  const previewHtml = useMemo(() => markdownToHtml(form.body), [form.body]);

  const saveMutation = useMutation({
    mutationFn: (status: NewsPostStatus) => {
      const payload: SaveNewsPostRequest = {
        ...form,
        questionSetIds: linkedSets.map((set) => set.id),
        title: form.title.trim(),
        excerpt: form.excerpt?.trim() || null,
        partId: form.partId || null,
        topicId: form.topicId || null,
        status,
      };
      return postId ? adminNewsApi.update(postId, payload) : adminNewsApi.create(payload);
    },
    onSuccess: (_row, status) =>
      onSaved(status === 'PUBLISHED' ? 'Đã đăng bài viết.' : 'Đã lưu bản nháp.'),
  });

  const disabled = form.title.trim().length === 0 || form.body.trim().length === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="flex-1 cursor-default" aria-label="Đóng" onClick={onClose} />
      <aside
        className="flex w-full max-w-3xl flex-col overflow-y-auto bg-white shadow-xl"
        aria-label={postId ? 'Sửa bài viết' : 'Viết bài mới'}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            {postId ? 'Sửa bài viết' : 'Viết bài mới'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={preview ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? 'Đang xem trước' : 'Xem trước'}
            </button>
            <button type="button" className="btn-ghost !px-2 !py-1" onClick={onClose}>
              Đóng
            </button>
          </div>
        </header>

        {postId && existingQuery.isPending ? (
          <div className="p-5">
            <LoadingBlock label="Đang tải bài viết…" />
          </div>
        ) : (
          <div className="flex-1 space-y-4 p-5">
            {saveMutation.error && (
              <ResultBanner
                tone="danger"
                message={errorMessage(saveMutation.error, 'Không lưu được bài viết')}
              />
            )}

            <div>
              <label htmlFor="post-title" className="label">
                Tiêu đề
              </label>
              <input
                id="post-title"
                className="input"
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                placeholder="Cách làm Reading Part 2 không bị mất điểm"
              />
            </div>

            <div>
              <label htmlFor="post-excerpt" className="label">
                Tóm tắt <span className="font-normal text-slate-400">(để trống thì tự cắt từ nội dung)</span>
              </label>
              <textarea
                id="post-excerpt"
                className="input min-h-[56px]"
                maxLength={500}
                value={form.excerpt ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, excerpt: event.target.value }))}
              />
            </div>

            {preview ? (
              <div>
                <p className="label">Xem trước</p>
                <div className="rounded-xl border border-slate-200 p-4">
                  <h1 className="text-xl font-bold text-slate-900">{form.title || '(chưa có tiêu đề)'}</h1>
                  <SafeHtml html={previewHtml} className="news-body mt-3" />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="post-body" className="label !mb-0">
                    Nội dung
                  </label>
                  <ImageUploadButton onUploaded={insertAtCursor} />
                </div>
                <textarea
                  id="post-body"
                  ref={bodyRef}
                  className="input min-h-[320px] font-mono text-[13px]"
                  value={form.body}
                  onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
                  placeholder={'## Bước 1\n\n**Đọc câu đầu** của mỗi đoạn trước.\n\n- gạch đầu dòng\n- gạch đầu dòng\n\n> Lưu ý quan trọng\n\n[Chữ hiện ra](/luyen-tap/doc)\n\n![Ảnh](/duong-dan-anh.png)'}
                />
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Định dạng: <code className="font-mono">## Tiêu đề</code> ·{' '}
                  <code className="font-mono">**đậm**</code> ·{' '}
                  <code className="font-mono">*nghiêng*</code> ·{' '}
                  <code className="font-mono">- danh sách</code> ·{' '}
                  <code className="font-mono">&gt; trích dẫn</code> ·{' '}
                  <code className="font-mono">[chữ](đường-dẫn)</code> ·{' '}
                  <code className="font-mono">![ảnh](đường-dẫn)</code>
                </p>
              </div>
            )}

            {/* Hai cách gắn đề, dùng riêng hoặc cùng lúc. Đề chọn đích danh có
                ưu tiên: có nó thì trang bài viết hiện danh sách đề, bỏ qua phần
                lọc theo Part/chủ đề. */}
            <QuestionSetPicker
              selected={linkedSets}
              onChange={setLinkedSets}
              parts={partsQuery.data ?? []}
              componentNames={componentNames}
            />

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-1 text-sm font-semibold text-slate-900">
                Hoặc lấy đề theo nhóm
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Chỉ dùng khi KHÔNG chọn đề đích danh ở trên. Học viên bấm một nút và nhận đề
                bất kỳ trong nhóm — phù hợp bài dự đoán đề theo chủ đề.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="post-part" className="label">
                    Part
                  </label>
                  <select
                    id="post-part"
                    className="input"
                    value={form.partId ?? ''}
                    onChange={(event) => setForm((f) => ({ ...f, partId: event.target.value }))}
                  >
                    <option value="">— Không gắn —</option>
                    {(partsQuery.data ?? []).map((part) => (
                      <option key={part.id} value={part.id}>
                        {componentNames.get(part.componentId) ?? part.componentCode} · {part.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="post-topic" className="label">
                    Chủ đề
                  </label>
                  <select
                    id="post-topic"
                    className="input"
                    value={form.topicId ?? ''}
                    onChange={(event) => setForm((f) => ({ ...f, topicId: event.target.value }))}
                  >
                    <option value="">— Không gắn —</option>
                    {(topicsQuery.data ?? []).map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-slate-200 p-4">
              <Toggle
                label="Ghim lên đầu bảng tin"
                checked={form.pinned ?? false}
                onChange={(value) => setForm((f) => ({ ...f, pinned: value }))}
              />
              <Toggle
                label="Cho phép bình luận"
                hint="Tắt cho bài chỉ thông báo, không cần hỏi đáp."
                checked={form.commentsEnabled ?? true}
                onChange={(value) => setForm((f) => ({ ...f, commentsEnabled: value }))}
              />
              <Toggle
                label="Bình luận phải được duyệt mới hiện"
                hint="Bật cho bài dễ gây tranh luận. Bài thường nên tắt, để học viên hỏi đáp không phải chờ."
                checked={form.commentsModerated ?? false}
                disabled={!(form.commentsEnabled ?? true)}
                onChange={(value) => setForm((f) => ({ ...f, commentsModerated: value }))}
              />
            </div>
          </div>
        )}

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            className="btn-secondary"
            disabled={disabled || saveMutation.isPending}
            onClick={() => saveMutation.mutate('DRAFT')}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={disabled || saveMutation.isPending}
            onClick={() => saveMutation.mutate('PUBLISHED')}
          >
            {saveMutation.isPending ? 'Đang lưu…' : 'Đăng bài'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

/**
 * Chọn đích danh từng đề gắn vào bài viết.
 *
 * Vì sao cần: gắn theo Part/chủ đề chỉ là LỌC NHÓM — học viên bấm vào nhận đề
 * bất kỳ trong nhóm, mỗi người mỗi bộ khác nhau. Bài dạy cách làm một đề cụ thể
 * thì phải mở đúng đề đó.
 */
function QuestionSetPicker({
  selected,
  onChange,
  parts,
  componentNames,
}: {
  selected: { id: string; title: string; partLabel: string | null }[];
  onChange: (next: { id: string; title: string; partLabel: string | null }[]) => void;
  parts: PartSummary[];
  componentNames: Map<string, string>;
}) {
  const [partId, setPartId] = useState("");
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  // Chờ người dùng gõ xong mới tìm, khỏi gọi API mỗi ký tự
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(term.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  const searchQuery = useQuery({
    queryKey: ["admin", "news", "pick-sets", partId, query],
    queryFn: () =>
      adminContentApi.search({
        partId: partId || undefined,
        q: query || undefined,
        status: "PUBLISHED",
        size: 20,
      }),
    // Chưa chọn Part và chưa gõ gì thì đừng tải cả ngân hàng đề
    enabled: partId.length > 0 || query.length > 0,
  });

  const add = (set: AdminQuestionSet) => {
    if (selected.some((item) => item.id === set.id)) return;
    onChange([...selected, { id: set.id, title: set.title, partLabel: set.partName }]);
  };

  const remove = (id: string) => onChange(selected.filter((item) => item.id !== id));

  /** Đổi vị trí — thứ tự này là thứ tự học viên thấy. */
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <p className="mb-1 text-sm font-semibold text-slate-900">
        Đề gắn vào bài <span className="font-normal text-slate-500">(chọn đích danh)</span>
      </p>
      <p className="mb-3 text-xs text-slate-500">
        Học viên thấy danh sách và bấm vào từng đề để làm ĐÚNG đề đó. Kéo thứ tự bằng hai
        mũi tên.
      </p>

      {selected.length > 0 && (
        <ul className="mb-3 space-y-2">
          {selected.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-brand-100 text-[11px] font-bold text-brand-800">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800">{item.title}</span>
                {item.partLabel && (
                  <span className="block text-[11px] text-slate-400">{item.partLabel}</span>
                )}
              </span>
              <button
                type="button"
                className="px-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Lên"
              >
                ↑
              </button>
              <button
                type="button"
                className="px-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Xuống"
              >
                ↓
              </button>
              <button
                type="button"
                className="px-1 text-[11px] font-semibold text-red-700 hover:underline"
                onClick={() => remove(item.id)}
              >
                Gỡ
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className="input"
          value={partId}
          onChange={(event) => setPartId(event.target.value)}
          aria-label="Lọc theo Part"
        >
          <option value="">— Chọn Part để tìm đề —</option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>
              {componentNames.get(part.componentId) ?? part.componentCode} · {part.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Tìm theo tên đề hoặc mã"
          aria-label="Tìm đề"
        />
      </div>

      {searchQuery.isFetching && (
        <p className="mt-2 text-xs text-slate-400">Đang tìm…</p>
      )}

      {searchQuery.data && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {searchQuery.data.content.length === 0 ? (
            <p className="p-3 text-xs text-slate-400">Không tìm thấy đề phù hợp.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {searchQuery.data.content.map((set) => {
                const already = selected.some((item) => item.id === set.id);
                return (
                  <li key={set.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => add(set)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-brand-50 disabled:bg-slate-50 disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{set.title}</span>
                        <span className="block font-mono text-[10px] text-slate-400">
                          {set.code} · {set.partName}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-brand-800">
                        {already ? "Đã chọn" : "+ Thêm"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tải ảnh lên rồi chèn Markdown vào bài.
 *
 * Ảnh dùng assetType NEWS_IMAGE, khác IMAGE của ngân hàng đề: ảnh bài viết vào
 * bucket đọc công khai và phục vụ qua /api/v1/news/images/{id}, vì bài đọc tự do
 * mà signed URL chỉ sống 10 phút và cần đăng nhập mới xin được.
 */
function ImageUploadButton({ onUploaded }: { onUploaded: (markdown: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith('image/')) {
        throw new Error('Vui lòng chọn tệp ảnh.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Ảnh tối đa 5MB. Hãy giảm kích thước rồi thử lại.');
      }

      const request = await assetApi.createUploadUrl({
        assetType: 'NEWS_IMAGE',
        mimeType: file.type,
        filename: file.name,
        fileSize: file.size,
      });
      await uploadToPresignedUrl(request.uploadUrl, file, file.type);
      await assetApi.complete(request.assetId);

      // Chú thích ảnh lấy từ tên tệp, bỏ phần mở rộng — người viết sửa lại được
      const alt = file.name.replace(/.[^.]+$/, '');
      return `![${alt}](/api/v1/news/images/${request.assetId})`;
    },
    onSuccess: (markdown) => {
      onUploaded(markdown);
      if (inputRef.current) inputRef.current.value = '';
    },
  });

  return (
    <div className="flex items-center gap-2">
      {upload.error && (
        <span className="text-[11px] text-red-700">
          {upload.error instanceof Error ? upload.error.message : 'Không tải được ảnh'}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
        }}
      />
      <button
        type="button"
        className="btn-secondary !px-3 !py-1.5 text-xs"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? 'Đang tải ảnh…' : '🖼 Chèn ảnh'}
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-3', disabled && 'opacity-50')}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-brand-800"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------
// Tab kiểm duyệt bình luận
// ---------------------------------------------------------------------

function CommentsTab({ onBanner }: { onBanner: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<NewsCommentStatus>('PENDING');
  const [page, setPage] = useState(0);

  const commentsQuery = useQuery({
    queryKey: ['admin', 'news', 'comments', status, page],
    queryFn: () => adminNewsApi.comments({ status, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminNewsApi.approve(id),
    onSuccess: () => {
      onBanner('Đã duyệt bình luận.');
      refresh();
    },
  });

  const hideMutation = useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      adminNewsApi.hide(input.id, input.reason),
    onSuccess: () => {
      onBanner('Đã ẩn bình luận. Người viết vẫn thấy bản của mình kèm lý do.');
      refresh();
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (id: string) => adminNewsApi.purge(id),
    onSuccess: () => {
      onBanner('Đã xoá hẳn bình luận.');
      refresh();
    },
  });

  return (
    <div>
      <div className="mb-5 w-full rounded-xl bg-white p-4 shadow-[0_3px_14px_rgba(31,41,35,.07)] sm:w-64">
        <label htmlFor="comment-status" className="label">
          Trạng thái
        </label>
        <select
          id="comment-status"
          className="input"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as NewsCommentStatus);
            setPage(0);
          }}
        >
          <option value="PENDING">Chờ duyệt</option>
          <option value="VISIBLE">Đang hiện</option>
          <option value="HIDDEN">Đã ẩn</option>
          <option value="DELETED">Người viết đã xoá</option>
        </select>
      </div>

      {commentsQuery.isPending ? (
        <LoadingBlock label="Đang tải bình luận…" />
      ) : commentsQuery.error || !commentsQuery.data ? (
        <ErrorBlock
          message={errorMessage(commentsQuery.error, 'Không tải được bình luận')}
          onRetry={() => void commentsQuery.refetch()}
        />
      ) : commentsQuery.data.content.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          {status === 'PENDING' ? 'Không có bình luận nào chờ duyệt.' : 'Không có bình luận nào.'}
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">{commentsQuery.data.totalElements} bình luận</p>
          <div className="space-y-3">
            {commentsQuery.data.content.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                pending={
                  approveMutation.isPending || hideMutation.isPending || purgeMutation.isPending
                }
                onApprove={() => approveMutation.mutate(comment.id)}
                onHide={(reason) => hideMutation.mutate({ id: comment.id, reason })}
                onPurge={() => purgeMutation.mutate(comment.id)}
              />
            ))}
          </div>
          <Pager page={page} totalPages={commentsQuery.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  pending,
  onApprove,
  onHide,
  onPurge,
}: {
  comment: AdminNewsCommentRow;
  pending: boolean;
  onApprove: () => void;
  onHide: (reason?: string) => void;
  onPurge: () => void;
}) {
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_3px_14px_rgba(31,41,35,.07)]">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-900">{comment.authorName}</span>
        <span className="text-slate-400">{comment.authorEmail}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">{formatDateTime(comment.createdAt)}</span>
      </div>

      <p className="text-[11px] text-slate-400">
        Ở bài: <span className="font-medium text-slate-600">{comment.postTitle}</span>
      </p>

      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm leading-6 text-slate-700">
        {comment.body}
      </p>

      {comment.hiddenReason && (
        <p className="mt-2 text-[11px] italic text-slate-500">
          Lý do ẩn đang hiện cho người viết: {comment.hiddenReason}
        </p>
      )}

      {hiding ? (
        <div className="mt-3">
          <label htmlFor={`reason-${comment.id}`} className="label">
            Lý do ẩn <span className="font-normal text-slate-400">(người viết đọc được)</span>
          </label>
          <input
            id={`reason-${comment.id}`}
            className="input"
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: bình luận không liên quan đến bài viết"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn-primary !px-3 !py-1.5 text-xs"
              disabled={pending}
              onClick={() => {
                onHide(reason.trim() || undefined);
                setHiding(false);
                setReason('');
              }}
            >
              Ẩn bình luận
            </button>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => setHiding(false)}
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {comment.status !== 'VISIBLE' && (
            <button
              type="button"
              className="btn-primary !px-3 !py-1.5 text-xs"
              disabled={pending}
              onClick={onApprove}
            >
              {comment.status === 'PENDING' ? 'Duyệt, cho hiện' : 'Cho hiện lại'}
            </button>
          )}
          {comment.status !== 'HIDDEN' && (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              disabled={pending}
              onClick={() => setHiding(true)}
            >
              Ẩn
            </button>
          )}
          <button
            type="button"
            className="btn-secondary !border-red-200 !px-3 !py-1.5 text-xs !text-red-700"
            disabled={pending}
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Xoá hẳn bình luận?',
                text:
                  'Người viết cũng không còn thấy. Chỉ nên dùng cho spam — muốn giữ lại để họ biết vì sao thì chọn Ẩn.',
                confirmText: 'Xoá hẳn',
                danger: true,
              });
              if (ok) onPurge();
            }}
          >
            Xoá hẳn
          </button>
        </div>
      )}
    </div>
  );
}
