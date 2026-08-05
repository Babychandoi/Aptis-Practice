import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/features/auth/authStore';
import { usePermission } from '@/features/admin/usePermission';
import { formatDate } from '@/lib/format';

const PRIMARY_NAV = [
  { to: '/', label: 'Bảng điều khiển', icon: 'home' },
  { to: '/mock-tests', label: 'Mô phỏng thi', icon: 'exam' },
  { to: '/history', label: 'Kết quả của tôi', icon: 'history' },
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
  const { user, logout } = useAuthStore();
  const { isAdmin } = usePermission();
  const displayName = user?.profile.displayName || user?.profile.fullName || user?.email || 'Học viên';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1a1a18]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#e8e5dc] bg-[#f5f3ec] md:flex">
        <Link to="/" className="flex h-16 items-center gap-3 border-b border-[#e8e5dc] px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-800 text-white shadow-sm">
            <BrandIcon />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[-0.02em]">APTIS PRACTICE</span>
            <span className="block text-[10px] text-stone-500">Nền tảng luyện thi</span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavSectionLabel>Menu chính</NavSectionLabel>
          <nav className="space-y-1" aria-label="Điều hướng chính">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>

          <NavSectionLabel className="mt-7">Luyện Aptis</NavSectionLabel>
          <nav className="space-y-1" aria-label="Các kỹ năng Aptis">
            {SKILL_NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => clsx(
                  'group flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors',
                  isActive ? 'bg-[#dcefe8] text-brand-900' : 'text-stone-700 hover:bg-white hover:text-brand-800',
                )}
              >
                <span className="text-brand-700"><NavIcon name={item.icon} /></span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <NavSectionLabel className="mt-7">Tài khoản</NavSectionLabel>
          <nav className="space-y-1" aria-label="Tài khoản">
            <SidebarLink to="/plans" label="Gói Premium" icon="premium" />
            {isAdmin && <SidebarLink to="/admin" label="Quản trị hệ thống" icon="admin" />}
          </nav>
        </div>

        <div className="border-t border-[#e8e5dc] p-3">
          <Link to="/profile" className="flex items-center gap-3 rounded-xl bg-white/70 p-2.5 transition-colors hover:bg-white">
            <Avatar name={displayName} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{displayName}</span>
              <span className="block text-[10px] text-stone-500">{user?.premiumActive ? 'Premium' : 'Học viên'}</span>
            </span>
          </Link>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#eceae3] bg-white/95 px-4 backdrop-blur md:left-60 md:px-6">
        <Link to="/" className="flex items-center gap-2 md:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-800 text-white"><BrandIcon /></span>
          <span className="text-sm font-bold">APTIS PRACTICE</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {!user?.premiumActive && (
            <Link to="/plans" className="hidden min-h-9 items-center rounded-lg bg-[#fbf3dc] px-3 text-xs font-semibold text-[#8b6415] hover:bg-[#f6e8bc] sm:inline-flex">
              Nâng cấp Premium
            </Link>
          )}
          {user?.premiumActive && (
            <span className="hidden rounded-full bg-[#e4f3ed] px-3 py-1 text-xs font-semibold text-brand-800 sm:inline" title={user.premiumEndsAt ? `Hết hạn ${formatDate(user.premiumEndsAt)}` : 'Trọn đời'}>
              Premium
            </span>
          )}
          <Link to="/profile" className="flex min-h-10 items-center gap-2 rounded-xl px-2 hover:bg-stone-100">
            <Avatar name={displayName} />
            <span className="hidden max-w-40 text-left lg:block">
              <span className="block truncate text-xs font-semibold">{displayName}</span>
              <span className="block text-[10px] text-stone-500">Học viên</span>
            </span>
          </Link>
          <button type="button" onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Đăng xuất" title="Đăng xuất">
            <NavIcon name="logout" />
          </button>
        </div>
      </header>

      <div className="pt-16 md:pl-60">
        <main className="mx-auto max-w-[1240px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden" aria-label="Điều hướng di động">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[...PRIMARY_NAV, { to: '/plans', label: 'Premium', icon: 'premium' as const }].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => clsx('flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium', isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-500')}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavSectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx('mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400', className)}>{children}</p>;
}

function SidebarLink({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => clsx('flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors', isActive ? 'bg-[#dcefe8] text-brand-900' : 'text-stone-700 hover:bg-white hover:text-brand-800')}>
      <NavIcon name={icon} />
      {label}
    </NavLink>
  );
}

function Avatar({ name }: { name: string }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-800 text-xs font-bold text-white ring-2 ring-[#dcefe8]">{name.trim().charAt(0).toUpperCase() || 'A'}</span>;
}

function BrandIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 0 5 23V4.5Z" /><path d="M8.5 8H15M8.5 12H15M8.5 16H13" /></svg>;
}

type IconName = 'home' | 'exam' | 'history' | 'premium' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking' | 'admin' | 'logout';

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    exam: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
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
