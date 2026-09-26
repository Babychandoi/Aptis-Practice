import type { ReactNode } from 'react';
import clsx from 'clsx';

/** Màu theo nhóm trạng thái, không theo từng mã — thêm trạng thái mới không vỡ. */
const TONE_CLASS = {
  neutral: 'bg-slate-100 text-ink-soft',
  info: 'bg-sky-100 text-sky-800',
  warn: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
} as const;

export type Tone = keyof typeof TONE_CLASS;

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'info',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warn',
  PUBLISHED: 'success',
  SUSPENDED: 'warn',
  ARCHIVED: 'neutral',

  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PAUSED: 'warn',
  CLOSED: 'neutral',

  PENDING: 'neutral',
  AWAITING_PAYMENT: 'info',
  PAID: 'success',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
  REFUNDED: 'danger',
  PARTIALLY_REFUNDED: 'warn',

  REQUESTED: 'neutral',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
  REJECTED: 'danger',

  QUEUED: 'neutral',
  COMPLETED: 'success',
  PARTIALLY_FAILED: 'warn',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  IN_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  CHANGES_REQUESTED: 'Cần sửa',
  PUBLISHED: 'Đã phát hành',
  SUSPENDED: 'Tạm ẩn',
  ARCHIVED: 'Lưu trữ',

  ACTIVE: 'Đang bán',
  INACTIVE: 'Ngừng bán',
  PAUSED: 'Tạm dừng',
  CLOSED: 'Đã đóng',

  PENDING: 'Chờ xử lý',
  AWAITING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  REFUNDED: 'Đã hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn một phần',

  REQUESTED: 'Đã yêu cầu',
  PROCESSING: 'Đang xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  REJECTED: 'Từ chối',

  QUEUED: 'Trong hàng đợi',
  COMPLETED: 'Hoàn tất',
  PARTIALLY_FAILED: 'Lỗi một phần',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASS[STATUS_TONE[status] ?? 'neutral'],
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Bảng cuộn ngang trên màn hẹp thay vì ép co cột đến mức không đọc được. */
/**
 * Tiêu đề cột: chuỗi cho cột thường, hoặc {key, label} khi cần đặt nội dung
 * bấm được (ví dụ nút sắp xếp) — React cần key ổn định, không lấy được từ node.
 */
export type TableHeader = string | { key: string; label: ReactNode };

export function DataTable({
  headers,
  children,
  empty,
  isEmpty,
}: {
  headers: TableHeader[];
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="card text-center text-sm text-ink-mute">
        {empty ?? 'Chưa có dữ liệu.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-[0_3px_14px_rgba(15,23,42,.07)]">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left">
            {headers.map((header) => {
              const key = typeof header === 'string' ? header : header.key;
              const label = typeof header === 'string' ? header : header.label;
              return (
                <th
                  key={key}
                  className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-mute"
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm">
      <button
        type="button"
        className="btn-secondary !px-3 !py-1"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </button>
      <span className="text-ink-mute">
        Trang {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary !px-3 !py-1"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}

/** Hộp thông báo kết quả thao tác; `errors` để hiện đủ lỗi publish một lượt. */
export function ResultBanner({
  tone,
  message,
  errors,
  onDismiss,
}: {
  tone: Tone;
  message: string;
  errors?: string[];
  onDismiss?: () => void;
}) {
  return (
    <div
      className={clsx(
        'mb-4 rounded-xl border p-4 text-sm',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
        (tone === 'info' || tone === 'neutral') && 'border-sky-200 bg-sky-50 text-sky-800',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs underline underline-offset-2"
          >
            Đóng
          </button>
        )}
      </div>
      {errors && errors.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type StatusTile<S extends string> = { value: S; label: string; hint?: string; eyebrow?: string };

/**
 * Hàng ô đếm theo trạng thái (theo mock quản trị). Bấm một ô để lọc danh sách,
 * bấm lại để bỏ lọc. Số chưa tải hiện dấu "–".
 */
export function StatusTiles<S extends string>({
  tiles,
  counts,
  active,
  onPick,
}: {
  tiles: StatusTile<S>[];
  counts?: Partial<Record<S, number | undefined>>;
  active: S | '' | undefined;
  onPick: (status: S | '') => void;
}) {
  return (
    <div className={clsx('mb-4 grid grid-cols-2 gap-3', tiles.length >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : tiles.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
      {tiles.map((tile) => {
        const selected = active === tile.value;
        return (
          <button
            key={tile.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(selected ? '' : tile.value)}
            className={clsx(
              'rounded-2xl border bg-white p-4 text-left transition hover:border-border-strong',
              selected ? 'border-ink ring-1 ring-ink' : 'border-border',
            )}
          >
            {tile.eyebrow && <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{tile.eyebrow}</span>}
            <span className="mt-1 block text-2xl font-bold tabular-nums text-ink">{counts?.[tile.value] ?? '–'}</span>
            <span className="block text-sm font-semibold text-ink-soft">{tile.label}</span>
            {tile.hint && <span className="block text-xs text-ink-mute">{tile.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
