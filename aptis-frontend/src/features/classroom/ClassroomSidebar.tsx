import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { SupportLinksCompact, type SupportContacts } from '@/components/ui/SupportLinks';

/**
 * Thanh bên khi đang ở trong một lớp học.
 *
 * <p>Dựng đúng khung của thanh bên hệ thống — cột cố định bám mép trái, cao hết
 * màn hình, cùng logo và cùng kiểu mục — vì nó THAY CHỖ thanh bên đó chứ không
 * phải một khối phụ nằm trong nội dung. Làm khác khung thì người dùng thấy giao
 * diện lệch hẳn khi bước vào lớp.
 *
 * <p>Trên điện thoại vẫn là hàng nút cuộn ngang: không có thanh bên nào ở kích
 * thước đó, còn 7 mục xuống dòng thì đẩy nội dung xuống quá sâu.
 */
export interface ClassroomNavItem<T extends string> {
  key: T;
  label: string;
  /** Số hiện bên phải, ví dụ sĩ số lớp. Bỏ trống thì không hiện. */
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
  contacts,
}: {
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel: string;
  items: ClassroomNavItem<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Kênh liên hệ của giáo viên dạy lớp này; thiếu thì không hiện khối hỗ trợ. */
  contacts?: SupportContacts;
}) {
  return (
    <>
      {/* Cột cố định cho màn rộng — cùng vị trí và cùng bề ngang với thanh bên
          hệ thống, để chuyển vào lớp không thấy giao diện nhảy. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-18 items-center gap-3 border-b border-border px-3.5 py-4">
          <Link to={backTo} className="flex min-w-0 items-center gap-3">
            <img
              src="/images/logo-mark-sm.png"
              alt=""
              width="36"
              height="36"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-slate-900">
                Aptis Practice
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Lớp học
              </span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-5">
          <Link
            to={backTo}
            className="mb-4 flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-surface-paper hover:text-slate-900"
          >
            ← {backLabel}
          </Link>

          <div className="mb-4 rounded-2xl bg-surface-paper px-3.5 py-3">
            <p className="text-sm font-bold leading-5 text-slate-900">{title}</p>
            {subtitle && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{subtitle}</p>}
          </div>

          <p className="mb-2 px-3.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Trong lớp
          </p>
          <nav className="space-y-1" aria-label="Mục trong lớp">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={value === item.key ? 'page' : undefined}
                onClick={() => onChange(item.key)}
                className={clsx(
                  'flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-all duration-150',
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

          <SupportLinksCompact contacts={contacts ?? {}} />
        </div>
      </aside>

      {/* Điện thoại và máy tính bảng */}
      <div className="md:hidden">
        <Link
          to={backTo}
          className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          ← {backLabel}
        </Link>
        {/* Cuộn ngang thay vì xuống dòng: 7 mục xuống dòng đẩy nội dung xuống
            quá sâu trên màn hẹp. */}
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
