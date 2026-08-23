import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { contentUpdateApi, practiceApi } from '@/api/endpoints';
import { formatDate } from '@/lib/format';
import type { ContentUpdateLog } from '@/types/api';

/** Số mục hiện trên trang chủ; xem hết thì mở popup. */
const PREVIEW_COUNT = 2;

/**
 * Nhật ký cập nhật nội dung: thẻ gọn trên trang chủ, bấm ra popup đầy đủ.
 *
 * <p>Bấm một đợt cập nhật sẽ tạo lượt làm bài chỉ với ĐÚNG những đề của đợt đó
 * — không đi qua trang Part, vì ở đó backend tự chọn từ cả ngân hàng và học
 * viên phải làm lại cả đề cũ.
 *
 * <p>Tài khoản chưa Premium: backend trả 403, thẻ tự ẩn. Không hiện danh sách
 * rồi chặn ở bước bấm, cũng không mời nâng cấp ở đây — trang chủ đã có nút
 * Premium riêng.
 */
export function ContentUpdateCard() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['content-updates'],
    queryFn: contentUpdateApi.list,
    staleTime: 5 * 60_000,
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 403) && count < 1,
  });

  const startAttempt = useMutation({
    mutationFn: (log: ContentUpdateLog) =>
      practiceApi.createPartAttempt({
        partId: log.partId!,
        questionSetIds: log.questionSets.map((set) => set.questionSetId),
      }),
    onSuccess: (attempt) => {
      setOpen(false);
      navigate(`/attempts/${attempt.id}`);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : 'Không mở được đề, thử lại sau',
      );
    },
  });

  // 403 (chưa Premium) hoặc chưa có đợt nào: không hiện gì.
  if (query.error || !query.data || query.data.length === 0) {
    return null;
  }

  const logs = query.data;
  const preview = logs.slice(0, PREVIEW_COUNT);

  return (
    <>
      <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <BellIcon />
            </span>
            <h2 className="text-base font-bold text-slate-900">Nhật ký cập nhật</h2>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-brand-800">
            {logs.length} cập nhật
          </span>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {preview.map((log) => (
            <UpdateRow
              key={log.id}
              log={log}
              onOpen={() => startAttempt.mutate(log)}
              busy={startAttempt.isPending}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-2.5 text-xs leading-5 text-red-700">{error}</p>
        )}

        <button
          type="button"
          onClick={() => { setError(null); setOpen(true); }}
          className="mt-3 flex min-h-[38px] w-full items-center justify-center rounded-xl bg-white text-xs font-bold text-brand-800 transition-colors hover:bg-brand-100"
        >
          Xem tất cả
        </button>
      </section>

      {open && (
        <UpdateDialog
          logs={logs}
          busy={startAttempt.isPending}
          error={error}
          onStart={(log) => startAttempt.mutate(log)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function UpdateRow({
  log,
  onOpen,
  busy,
}: {
  log: ContentUpdateLog;
  onOpen: () => void;
  busy: boolean;
}) {
  // Không có đề gắn kèm (cập nhật chung, ví dụ thêm tài liệu) thì chỉ hiện mô
  // tả — nút "mở chi tiết" sẽ dẫn tới hư không.
  const playable = Boolean(log.partId) && log.questionSets.length > 0;

  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
          {formatDate(log.logDate)}
        </span>
        <span className="text-xs font-bold text-slate-900">{log.label}</span>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-slate-600">{log.description}</p>

      {playable && (
        <button
          type="button"
          onClick={onOpen}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700 transition-colors hover:text-brand-800 disabled:opacity-60"
        >
          {busy ? 'Đang mở…' : `Làm ${log.questionSets.length} đề mới →`}
        </button>
      )}
    </div>
  );
}

function UpdateDialog({
  logs,
  busy,
  error,
  onStart,
  onClose,
}: {
  logs: ContentUpdateLog[];
  busy: boolean;
  error: string | null;
  onStart: (log: ContentUpdateLog) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Nền bấm để đóng: dùng button để bàn phím cũng đóng được. */}
      <button
        type="button"
        aria-label="Đóng nhật ký cập nhật"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lịch sử cập nhật"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <BellIcon />
            </span>
            <h2 className="text-base font-bold text-slate-900">Lịch sử cập nhật</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-mono text-[10px] font-bold text-brand-800">
              {logs.length} cập nhật
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-surface hover:text-slate-800"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Danh sách đã sắp mới nhất trước từ backend (log_date DESC). */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="text-xs leading-5 text-red-700">{error}</p>
          )}
          {logs.map((log) => (
            <UpdateRow
              key={log.id}
              log={log}
              onOpen={() => onStart(log)}
              busy={busy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
