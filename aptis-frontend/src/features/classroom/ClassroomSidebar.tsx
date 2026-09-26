import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { SupportLinksCompact, type SupportContacts } from '@/components/ui/SupportLinks';
import { Icon, type IconName } from '@/components/shell/icons';

/**
 * Thanh bên khi đang ở trong một lớp học, theo mock.
 *
 * <p>Thay chỗ thanh bên hệ thống (cùng vị trí, cùng bề ngang) để chuyển vào lớp
 * không thấy giao diện nhảy. Trên điện thoại là hàng nút cuộn ngang.
 */
export interface ClassroomNavItem<T extends string> {
  key: T;
  label: string;
  icon?: IconName;
  /** Số hiện bên phải, ví dụ yêu cầu chờ duyệt. Bỏ trống thì không hiện. */
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
  switcher,
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
  /** Ô chọn lớp khi giáo viên dạy nhiều lớp. */
  switcher?: ReactNode;
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-white md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="/images/logo-mark-sm.png" alt="" width="34" height="34" className="h-[34px] w-[34px] shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-5 tracking-tight">Aptis Practice</span>
            <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-ink-faint">Lớp học</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <Link
            to={backTo}
            className="mb-3 flex min-h-[36px] items-center gap-2 rounded-xl px-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-paper hover:text-ink"
          >
            <Icon name="back" className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="mb-5 rounded-2xl border border-border bg-surface-paper px-3.5 py-3">
            {switcher ?? <p className="text-[15px] font-bold leading-5">{title}</p>}
            {subtitle && <p className="mt-1 text-xs leading-4 text-ink-mute">{subtitle}</p>}
          </div>

          <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Trong lớp</p>
          <nav className="flex flex-col gap-0.5" aria-label="Mục trong lớp">
            {items.map((item) => {
              const on = value === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => onChange(item.key)}
                  className={clsx(
                    'flex min-h-[42px] w-full items-center gap-3 rounded-xl border px-2.5 text-sm transition-colors',
                    on ? 'border-ink/80 bg-surface-muted font-bold text-ink' : 'border-transparent font-medium text-ink-soft hover:bg-surface-paper hover:text-ink',
                  )}
                >
                  {item.icon && <Icon name={item.icon} />}
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <SupportLinksCompact contacts={contacts ?? {}} />
        </div>
      </aside>

      {/* Điện thoại và máy tính bảng */}
      <div className="md:hidden">
        <Link to={backTo} className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute hover:text-ink">
          <Icon name="back" className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        {switcher && <div className="mb-2.5">{switcher}</div>}
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-1 rounded-full bg-surface-muted p-1">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={value === item.key ? 'page' : undefined}
                onClick={() => onChange(item.key)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                  value === item.key ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink',
                )}
              >
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
