import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherContentApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import type { ClassroomMaterial, ClassroomPost, ClassroomPrediction } from '@/types/api';

/**
 * Ba loại nội dung có chung hình dạng cần cho danh sách: id, tiêu đề, ngày tạo.
 * Gộp lại một kiểu để không phải viết ba nhánh hiển thị giống hệt nhau.
 */
type ContentItem = ClassroomMaterial | ClassroomPost | ClassroomPrediction;

type ContentKind = 'materials' | 'posts' | 'predictions';

const LABELS: Record<ContentKind, { title: string; hint: string; button: string }> = {
  materials: {
    title: 'Tài liệu lớp',
    hint: 'Dán link tài liệu để học viên trong lớp mở.',
    button: 'Thêm tài liệu',
  },
  posts: {
    title: 'Bảng tin lớp',
    hint: 'Thông báo chỉ học viên lớp bạn thấy — khác bảng tin chung của hệ thống.',
    button: 'Đăng thông báo',
  },
  predictions: {
    title: 'Dự đoán đề riêng',
    hint: 'Nhận định của bạn cho lớp, bên cạnh dự đoán chung của hệ thống.',
    button: 'Đăng dự đoán',
  },
};

/** Tài liệu, bảng tin và dự đoán riêng của lớp — cùng một dạng nên gom chung. */
export function TeacherContentTab({ kind }: { kind: ContentKind }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const meta = LABELS[kind];

  const query = useQuery<ContentItem[]>({
    queryKey: ['teacher', 'classroom', kind],
    queryFn: () => {
      if (kind === 'materials') return teacherContentApi.materials();
      if (kind === 'posts') return teacherContentApi.posts();
      return teacherContentApi.predictions();
    },
  });

  const add = useMutation<ContentItem, Error, void>({
    mutationFn: () => {
      if (kind === 'materials') {
        return teacherContentApi.addMaterial({
          title: title.trim(),
          materialType: 'LINK',
          linkUrl: body.trim(),
        });
      }
      if (kind === 'posts') {
        return teacherContentApi.addPost({ title: title.trim(), content: body });
      }
      return teacherContentApi.addPrediction({ title: title.trim(), content: body });
    },
    onSuccess: () => {
      setTitle('');
      setBody('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', kind] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không thêm được'),
  });

  const remove = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => {
      if (kind === 'materials') return teacherContentApi.deleteMaterial(id);
      if (kind === 'posts') return teacherContentApi.deletePost(id);
      return teacherContentApi.deletePrediction(id);
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', kind] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <form
        className="space-y-3 rounded-2xl border border-border bg-white px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          add.mutate();
        }}
      >
        <div>
          <h2 className="text-sm font-bold text-slate-900">{meta.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{meta.hint}</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Tiêu đề
          </span>
          <input
            value={title}
            required
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              kind === 'materials'
                ? 'Bảng động từ bất quy tắc'
                : kind === 'posts'
                  ? 'Lịch nghỉ lễ — bù bài Reading'
                  : 'Dự đoán chủ đề Speaking tháng 10'
            }
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {kind === 'materials' ? 'Đường dẫn' : 'Nội dung'}
          </span>
          {kind === 'materials' ? (
            <input
              type="url"
              value={body}
              required
              onChange={(event) => setBody(event.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          ) : (
            <textarea
              value={body}
              rows={5}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                kind === 'posts' ? 'Nội dung thông báo…' : 'Lý do và gợi ý ôn tập…'
              }
              className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          )}
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={add.isPending}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {add.isPending ? 'Đang lưu…' : meta.button}
        </button>
      </form>

      <div>
        <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Đã thêm
        </h3>

        {query.isPending ? (
          <LoadingBlock label="Đang tải…" />
        ) : query.error ? (
          <ErrorBlock message="Không tải được" onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white px-4 py-5 text-center text-sm text-slate-500">
            Chưa có mục nào.
          </p>
        ) : (
          <ul className="space-y-2">
            {query.data.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-white px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-slate-900">{item.title}</p>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá "${item.title}"?`)) remove.mutate(item.id);
                    }}
                    className="shrink-0 text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Xoá
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {formatDate(item.createdAt)}
                  {'linkUrl' in item && item.linkUrl && (
                    <>
                      {' · '}
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 hover:text-brand-800"
                      >
                        Mở link
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Nút chuyển giữa ba loại nội dung. */
export function ContentKindTabs({
  value,
  onChange,
}: {
  value: ContentKind;
  onChange: (kind: ContentKind) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(LABELS) as ContentKind[]).map((kind) => (
        <TabButton key={kind} active={value === kind} onClick={() => onChange(kind)}>
          {LABELS[kind].title}
        </TabButton>
      ))}
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-brand-600 bg-brand-50 text-brand-800'
          : 'border-border bg-white text-slate-600 hover:bg-surface',
      )}
    >
      {children}
    </button>
  );
}
