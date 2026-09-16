import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Điều hướng trong một lớp học.
 *
 * <p>Khi đang ở trong lớp, cái này thay hẳn thanh bên của hệ thống: người dùng
 * đang làm việc với lớp thì các mục luyện tập chung chỉ gây nhiễu, mà 4-5 tab
 * xếp ngang thì hết chỗ ngay trên màn hẹp.
 *
 * <p>Trên điện thoại vẫn là hàng nút cuộn ngang — thanh bên không đủ chỗ.
 */
export interface ClassroomNavItem<T extends string> {
  key: T;
  label: string;
  /** Số hiện bên phải, ví dụ số bài chưa làm. Bỏ trống thì không hiện. */
  badge?: number;
}

export function ClassroomSidebar<T extends string>({
  title,
  subtitle,
  backTo,
  backLabel,
  items,
  value,
  onChange,
}: {
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel: string;
  items: ClassroomNavItem<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <>
      {/* Thanh bên cho màn rộng */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            ← {backLabel}
          </Link>

          <div className="rounded-2xl border border-border bg-white px-4 py-3.5">
            <p className="text-sm font-bold leading-5 text-slate-900">{title}</p>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>

          <nav className="space-y-1" aria-label="Mục trong lớp">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={value === item.key ? 'page' : undefined}
                onClick={() => onChange(item.key)}
                className={clsx(
                  'flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors',
                  value === item.key
                    ? 'bg-brand-100 font-semibold text-brand-800'
                    : 'text-slate-600 hover:bg-surface-paper hover:text-slate-900',
                )}
              >
                <span className="flex-1 truncate text-left">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold',
                      value === item.key
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-muted text-slate-600',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Hàng nút cho điện thoại và máy tính bảng */}
      <div className="lg:hidden">
        <Link
          to={backTo}
          className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          ← {backLabel}
        </Link>
        {/* Cuộn ngang thay vì xuống dòng: 5 mục xuống dòng đẩy nội dung
            xuống quá sâu trên màn hẹp. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-1.5 rounded-2xl bg-surface-muted p-1">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={value === item.key ? 'page' : undefined}
                onClick={() => onChange(item.key)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  value === item.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="rounded-full bg-brand-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
