import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { describeError, type ErrorPresentation, type ErrorTone } from '@/lib/errorPresentation';

const TONE_STYLE: Record<ErrorTone, { panel: string; badge: string; title: string; body: string }> = {
  error: {
    panel: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    title: 'text-red-900',
    body: 'text-red-800',
  },
  warning: {
    panel: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    title: 'text-amber-900',
    body: 'text-amber-800',
  },
  info: {
    panel: 'border-[#cfe6dc] bg-[#eef6f2]',
    badge: 'bg-[#dcefe8] text-brand-800',
    title: 'text-brand-900',
    body: 'text-brand-900/80',
  },
};

interface Props {
  /** Lỗi thô; sẽ được `describeError` dịch sang thông báo tiếng Việt. */
  error?: unknown;
  /** Dùng khi không có object lỗi, chỉ muốn hiện một trạng thái đã biết. */
  presentation?: ErrorPresentation;
  /** Tiêu đề riêng của trang khi mã lỗi không nhận ra được. */
  fallbackTitle?: string;
  onRetry?: () => void;
  /** true = chiếm trọn khung nhìn, dùng cho lỗi khiến cả trang không dựng được. */
  fullPage?: boolean;
}

/**
 * Trạng thái lỗi dùng chung cho toàn hệ thống.
 *
 * <p>Khác {@link ErrorBlock} ở chỗ đây là một khối hoàn chỉnh có tiêu đề, lời
 * giải thích và lối đi tiếp — dùng khi cả trang không hiển thị được. `ErrorBlock`
 * vẫn dùng cho lỗi cục bộ của một thao tác (nộp bài lỗi, tạo đơn lỗi).
 *
 * <p>Nút "Thử lại" chỉ hiện khi lỗi thật sự có thể thử lại.
 */
export function ErrorState({
  error,
  presentation,
  fallbackTitle,
  onRetry,
  fullPage = false,
}: Props) {
  const view = presentation ?? describeError(error, fallbackTitle);
  const tone = TONE_STYLE[view.tone];

  const panel = (
    <section
      role="alert"
      className={clsx('mx-auto max-w-lg rounded-2xl border p-6 text-center', tone.panel)}
    >
      <span className={clsx('mx-auto grid h-12 w-12 place-items-center rounded-xl', tone.badge)} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16h.01" />
        </svg>
      </span>

      <h1 className={clsx('mt-4 text-lg font-semibold', tone.title)}>{view.title}</h1>
      <p className={clsx('mt-2 text-sm', tone.body)}>{view.description}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {view.canRetry && onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary">
            Thử lại
          </button>
        )}
        {view.action && (
          <Link
            to={view.action.to}
            className={view.canRetry && onRetry ? 'btn-secondary' : 'btn-primary'}
          >
            {view.action.label}
          </Link>
        )}
      </div>
    </section>
  );

  if (!fullPage) {
    return panel;
  }

  return <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">{panel}</div>;
}
