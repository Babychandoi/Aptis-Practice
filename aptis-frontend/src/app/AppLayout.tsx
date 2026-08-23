import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/features/auth/authStore';
import { usePermission } from '@/features/admin/usePermission';
import { formatDate } from '@/lib/format';
import { SupportLinksCompact } from '@/components/ui/SupportLinks';
import { useSidebarCollapsed } from '@/app/useSidebarCollapsed';
import { describePremiumExpiry } from '@/features/billing/premiumExpiry';

// shortLabel dùng cho thanh nav dưới trên điện thoại: 5 mục trên máy hẹp
// (~360px) chỉ còn ~64px mỗi ô, nhãn đầy đủ tràn ra ngoài vùng bấm. Sidebar
// desktop vẫn dùng label đầy đủ.
const PRIMARY_NAV = [
  { to: '/', label: 'Bảng điều khiển', shortLabel: 'Trang chủ', icon: 'home' },
  { to: '/mock-tests', label: 'Mô phỏng thi', shortLabel: 'Thi thử', icon: 'exam' },
  { to: '/cap-nhat-de', label: 'Cập nhật đề', shortLabel: 'Đề mới', icon: 'sparkle' },
  { to: '/meo-hoc', label: 'Mẹo học', shortLabel: 'Mẹo học', icon: 'tips' },
  { to: '/history', label: 'Kết quả của tôi', shortLabel: 'Kết quả', icon: 'history' },
] as const;

const SKILL_NAV = [
  { to: '/luyen-tap/ngu-phap-tu-vung', label: 'Ngữ pháp & Từ vựng', icon: 'grammar' },
  { to: '/luyen-tap/doc', label: 'Đọc', icon: 'reading' },
  { to: '/luyen-tap/nghe', label: 'Nghe', icon: 'listening' },
  { to: '/luyen-tap/viet', label: 'Viết', icon: 'writing' },
  { to: '/luyen-tap/noi', label: 'Nói', icon: 'speaking' },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isAdmin } = usePermission();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const expiry = describePremiumExpiry(user?.premiumEndsAt);
  const displayName = user?.profile?.displayName || user?.profile?.fullName || user?.email || 'Học viên';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActiveAttempt = /^\/attempts\/[^/]+\/?$/.test(location.pathname);

  if (isActiveAttempt) {
    return (
      <div className="min-h-screen bg-[#f5f5f2] text-[#15161a]">
        <main>
          <Outlet />
        </main>
      </div>
    );
  }

  // Generate breadcrumb text
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'BẢNG ĐIỀU KHIỂN';
    if (path === '/luyen-tap') return 'KỸ NĂNG / SKILLS';
    if (path.startsWith('/mock-tests')) return 'THI THỬ / MOCK TESTS';
    if (path.startsWith('/cap-nhat-de')) return 'CẬP NHẬT ĐỀ / NEW CONTENT';
    if (path.startsWith('/meo-hoc')) return 'MẸO HỌC / STUDY TIPS';
    if (path.startsWith('/history')) return 'LỊCH SỬ / KẾT QUẢ';
    if (path.startsWith('/plans')) return 'GÓI PREMIUM';
    if (path.startsWith('/profile')) return 'HỒ SƠ / TÀI KHOẢN';
    if (path.includes('ngu-phap-tu-vung')) return 'LUYỆN TẬP / NGỮ PHÁP & TỪ VỰNG';
    if (path.includes('/doc')) return 'LUYỆN TẬP / ĐỌC';
    if (path.includes('/nghe')) return 'LUYỆN TẬP / NGHE';
    if (path.includes('/viet')) return 'LUYỆN TẬP / VIẾT';
    if (path.includes('/noi')) return 'LUYỆN TẬP / NÓI';
    return 'APTIS PRACTICE';
  };

  return (
    <div className="min-h-screen bg-surface text-[#15161a]">
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-white md:flex',
          // Chuyển động chỉ trên chiều rộng: animate cả layout làm nội dung
          // chính giật theo mỗi lần bấm.
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <div className="flex h-18 items-center gap-3 border-b border-border px-3.5 py-4">
          <Link
            to="/"
            className={clsx('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}
            title={collapsed ? 'Aptis Practice' : undefined}
          >
            {/* width/height khai sẵn để trình duyệt giữ chỗ, không giật layout khi
                ảnh tải xong. File nguồn cao 128px nên hiển thị 36px vẫn nét ở màn
                hình retina. */}
            <img
              src="/images/logo-mark-sm.png"
              alt=""
              width="36"
              height="36"
              className="h-9 w-9 shrink-0 object-contain"
            />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold tracking-tight text-slate-900">Aptis Practice</span>
                <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">General</span>
              </span>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-surface hover:text-slate-800"
              aria-label="Thu gọn thanh điều hướng"
              aria-expanded="true"
              title="Thu gọn"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        {/* Khi đã thu gọn, nút mở lại đứng riêng một dòng: nhồi chung với logo
            thì cả hai đều bị bó trong 4.5rem và khó bấm đúng. */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="mx-auto mt-2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-surface hover:text-slate-800"
            aria-label="Mở rộng thanh điều hướng"
            aria-expanded="false"
            title="Mở rộng"
          >
            <ChevronRightIcon />
          </button>
        )}
        <div className="flex-1 overflow-y-auto px-3.5 py-5">
          {/* Nhãn nhóm biến mất khi thu gọn: chữ "Menu chính" không vừa 4.5rem,
              để lại chỉ thành một vệt bị cắt. Ranh giới nhóm vẫn nhận ra được
              nhờ khoảng cách giữa các nav. */}
          {!collapsed && <NavSectionLabel>Menu chính</NavSectionLabel>}
          <nav className="space-y-1" aria-label="Điều hướng chính">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink key={item.to} {...item} collapsed={collapsed} />
            ))}
          </nav>

          {!collapsed && <NavSectionLabel className="mt-6">Kỹ năng</NavSectionLabel>}
          <nav className={clsx('space-y-1', collapsed && 'mt-4 border-t border-border pt-4')} aria-label="Các kỹ năng Aptis">
            {SKILL_NAV.map((item) => (
              <SidebarLink key={item.to} {...item} collapsed={collapsed} />
            ))}
          </nav>

          {!collapsed && <NavSectionLabel className="mt-6">Tài khoản</NavSectionLabel>}
          <nav className={clsx('space-y-1', collapsed && 'mt-4 border-t border-border pt-4')} aria-label="Tài khoản">
            <SidebarLink to="/plans" label="Gói Premium" icon="premium" collapsed={collapsed} />
            {isAdmin && <SidebarLink to="/admin" label="Quản trị hệ thống" icon="admin" collapsed={collapsed} />}
          </nav>

          {!collapsed && <SupportLinksCompact />}
        </div>

        {/* Premium Widget */}
        <div className="p-3.5">
          {collapsed ? (
            // Thu gọn: thẻ quảng cáo dài không vừa, nên chỉ còn một chỉ dấu
            // bấm được — vẫn giữ đường vào trang gói.
            !user?.premiumActive ? (
              <Link
                to="/plans"
                className="grid h-10 w-full place-items-center rounded-xl bg-dark font-mono text-[10px] font-bold uppercase tracking-widest text-accent transition-colors hover:bg-dark/90"
                title="Nâng cấp Premium"
                aria-label="Nâng cấp Premium"
              >
                PRO
              </Link>
            ) : (
              <div
                className="grid h-10 w-full place-items-center rounded-xl border border-brand-200 bg-brand-50"
                title={
                  user.premiumEndsAt
                    ? `Premium — hết hạn ${formatDate(user.premiumEndsAt)}`
                    : 'Premium — gói kích hoạt đầy đủ'
                }
              >
                <span className="h-2 w-2 rounded-full bg-accent" />
              </div>
            )
          ) : !user?.premiumActive ? (
            <div className="rounded-2xl bg-dark p-4 text-white shadow-sm">
              <span className="inline-block font-mono text-[10px] font-bold tracking-widest uppercase text-accent">
                Premium
              </span>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                Mở trọn bộ 600+ đề và AI chấm Writing & Speaking.
              </p>
              <Link
                to="/plans"
                className="mt-3 flex min-h-[36px] w-full items-center justify-center rounded-xl bg-accent px-3 text-xs font-bold text-dark transition-all hover:bg-accent-light"
              >
                Nâng cấp ngay →
              </Link>
            </div>
          ) : (
            <div
              className={clsx(
                'rounded-2xl border p-3.5',
                expiry?.expiringSoon
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-brand-200 bg-brand-50',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'h-2 w-2 rounded-full',
                    expiry?.expiringSoon ? 'bg-amber-500' : 'bg-accent',
                  )}
                />
                <span
                  className={clsx(
                    'font-mono text-xs font-bold uppercase',
                    expiry?.expiringSoon ? 'text-amber-900' : 'text-brand-800',
                  )}
                >
                  {expiry ? expiry.label : 'Premium trọn đời'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                {user.premiumEndsAt
                  ? `Hết hạn ${formatDate(user.premiumEndsAt)}`
                  : 'Gói kích hoạt đầy đủ'}
              </p>

              {/* Nút gia hạn chỉ hiện khi sắp hết: gói còn dài mà cứ mời gia hạn
                  thì thành quảng cáo, học viên bỏ qua và đến lúc cần thật cũng
                  không để ý nữa. */}
              {expiry?.expiringSoon && (
                <Link
                  to="/plans"
                  className="mt-2.5 flex min-h-[34px] w-full items-center justify-center rounded-xl bg-amber-500 px-3 text-xs font-bold text-white transition-colors hover:bg-amber-600"
                >
                  Gia hạn ngay →
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Header */}
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-border bg-white/95 px-4 backdrop-blur md:px-8',
          'transition-[left] duration-200 ease-out',
          collapsed ? 'md:left-[4.5rem]' : 'md:left-64',
        )}
      >
        <Link to="/" className="flex items-center gap-2 md:hidden">
          <img
            src="/images/logo-mark-sm.png"
            alt=""
            width="32"
            height="32"
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="text-sm font-bold tracking-tight">Aptis Practice</span>
        </Link>

        {/* Breadcrumbs for desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {getBreadcrumb()}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Hiện cả trên điện thoại: Premium đã rời khỏi thanh nav dưới để
              nhường chỗ cho Kỹ năng, nên đây là đường vào duy nhất trên mobile.
              Nhãn rút ngắn ở máy hẹp cho vừa header. */}
          {!user?.premiumActive && (
            <Link
              to="/plans"
              className="inline-flex min-h-[36px] shrink-0 items-center rounded-xl bg-brand-100 px-3 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-200 sm:px-3.5"
            >
              <span className="sm:hidden">Premium</span>
              <span className="hidden sm:inline">Nâng cấp Premium</span>
            </Link>
          )}

          {/* Đã Premium: hiện thời hạn còn lại để học viên không bị mất quyền
              giữa lúc đang ôn. Sắp hết hạn thì đổi sang nút gia hạn màu cảnh
              báo — lúc đó thông tin không đủ, cần một hành động. */}
          {user?.premiumActive && expiry?.expiringSoon && (
            <Link
              to="/plans"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
              title={`Premium ${expiry.label.toLowerCase()} — gia hạn để học không gián đoạn`}
            >
              <span aria-hidden="true">⏳</span>
              <span className="sm:hidden">Gia hạn</span>
              <span className="hidden sm:inline">{expiry.label} · Gia hạn</span>
            </Link>
          )}

          {user?.premiumActive && expiry && !expiry.expiringSoon && (
            <Link
              to="/plans"
              className="hidden min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100 sm:inline-flex"
              title={`Premium hết hạn ${formatDate(user.premiumEndsAt)}`}
            >
              <span className="h-2 w-2 rounded-full bg-accent" />
              Premium · {expiry.label}
            </Link>
          )}

          <Link to="/profile" className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface">
            <Avatar name={displayName} />
            <span className="hidden max-w-40 text-left lg:block">
              <span className="block truncate text-xs font-semibold text-slate-900">{displayName}</span>
              <span className="block font-mono text-[10px] uppercase text-slate-400">
                {user?.premiumActive ? 'Premium' : 'Free'}
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-surface hover:text-slate-800"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <NavIcon name="logout" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={clsx('pt-16 transition-[padding] duration-200 ease-out', collapsed ? 'md:pl-[4.5rem]' : 'md:pl-64')}>
        <main className="mx-auto max-w-[1240px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden" aria-label="Điều hướng di động">
        {/* Số cột phải KHỚP số mục, nếu không mục cuối rơi xuống hàng hai và
            thanh nav cao gấp đôi, che mất nội dung trang. Hiện 6 mục: 5 của
            PRIMARY_NAV cộng Kỹ năng. */}
        <div className="mx-auto grid max-w-md grid-cols-6">
          {/* Kỹ năng thay chỗ Premium: sidebar desktop liệt kê cả 5 kỹ năng,
              còn mobile không có sidebar nên cần một đường vào. Premium chuyển
              lên header, nơi nó hiện ở mọi kích thước màn hình. */}
          {[
            ...PRIMARY_NAV,
            { to: '/luyen-tap', label: 'Kỹ năng', shortLabel: 'Kỹ năng', icon: 'skills' as const },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => clsx(
                'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0 text-[9px] font-medium transition-colors',
                isActive ? 'bg-brand-100 text-brand-800 font-semibold' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <NavIcon name={item.icon} />
              {/* truncate thay vì cho xuống dòng: hai dòng chữ đội chiều cao
                  thanh nav lên và ăn vào nội dung trang. */}
              <span className="w-full truncate text-center leading-tight tracking-tight">
                {item.shortLabel}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavSectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx('mb-2 px-3.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400', className)}>{children}</p>;
}

function SidebarLink({
  to,
  label,
  icon,
  collapsed = false,
}: {
  to: string;
  label: string;
  icon: IconName;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      // title cho tooltip khi chỉ còn icon; aria-label để trình đọc màn hình
      // vẫn đọc được tên mục dù chữ đã ẩn.
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => clsx(
        'flex min-h-[42px] items-center rounded-xl text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
        isActive ? 'bg-brand-100 text-brand-800 font-semibold' : 'text-slate-600 hover:bg-surface-paper hover:text-slate-900',
      )}
    >
      <span className="text-brand-600"><NavIcon name={icon} /></span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </NavLink>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-mono text-xs font-bold text-white shadow-sm ring-2 ring-brand-100">
      {name.trim().charAt(0).toUpperCase() || 'A'}
    </span>
  );
}

type IconName = 'home' | 'sparkle' | 'skills' | 'exam' | 'tips' | 'history' | 'premium' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking' | 'admin' | 'logout';

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    // Lưới 4 ô: gợi ý "chọn từ nhiều mục", không trùng icon của kỹ năng nào
    // Tia sáng: gợi ý "mới thêm", không trùng icon kỹ năng nào
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8.5 13.2 11l2.5 1-2.5 1L12 15.5 10.8 13l-2.5-1 2.5-1z" /></>,
    skills: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    exam: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    tips: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6M10 22h4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    premium: <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3Z" />,
    grammar: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /></>,
    reading: <><path d="M4 5a3 3 0 0 1 3-3h4v17H7a3 3 0 0 0-3 3V5ZM20 5a3 3 0 0 0-3-3h-4v17h4a3 3 0 0 1 3 3V5Z" /></>,
    listening: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></>,
    writing: <><path d="m4 20 4-1 10-10a2 2 0 0 0-3-3L5 16l-1 4Z" /><path d="m13.5 7.5 3 3" /></>,
    speaking: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    admin: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    logout: <><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="m15 8 4 4-4 4M19 12H9" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">{paths[name]}</svg>;
}

