import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { adminBankTransferApi } from '@/api/adminEndpoints';
import { usePermission } from './usePermission';
import { useAuthStore } from '@/features/auth/authStore';
import { useAdminWebSocket } from './useAdminWebSocket';

const NAV_ITEMS = [
  { to: '/admin/skill-tests', label: 'Bài test kỹ năng', permission: 'blueprint:write', icon: 'tests' },
  { to: '/admin/question-sets', label: 'Ngân hàng câu hỏi', permission: 'question_set:read', icon: 'questions' },
  { to: '/admin/imports', label: 'Import câu hỏi', permission: 'question_set:write', icon: 'import' },
  { to: '/admin/scoring', label: 'Cấu hình điểm', permission: 'question_set:write', icon: 'scoring' },
  { to: '/admin/exam-predictions', label: 'Dự đoán đề', permission: 'question_set:write', icon: 'scoring' },
  { to: '/admin/plans', label: 'Gói Premium', permission: 'plan:write', icon: 'plans' },
  { to: '/admin/orders', label: 'Đơn hàng', permission: 'order:read', icon: 'orders' },
  { to: '/admin/bank-transfers', label: 'Đối soát chuyển khoản', permission: 'order:read', icon: 'transfers', hasBadge: true },
  { to: '/admin/refunds', label: 'Hoàn tiền', permission: 'refund:write', icon: 'refunds' },
  { to: '/admin/users', label: 'Quản lý người dùng', permission: 'user:read', icon: 'users' },
  { to: '/admin/reports', label: 'Báo cáo', permission: 'report:read', icon: 'reports' },
] as const;

export function AdminLayout() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const canReadTransfers = has('order:read');

  // Lắng nghe WebSocket để cập nhật badge thông báo sidebar tức thì
  useAdminWebSocket({
    enabled: canReadTransfers,
    onEvent: (event) => {
      if (
        event.type === 'BANK_TRANSFER_CLAIMED' ||
        event.type === 'BANK_TRANSFER_CONFIRMED' ||
        event.type === 'BANK_TRANSFER_REJECTED'
      ) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'bank-transfers'] });
      }
    },
  });

  const pendingClaimsQuery = useQuery({
    queryKey: ['admin', 'bank-transfers', 'claimed-badge'],
    queryFn: () => adminBankTransferApi.list('CLAIMED', 0, 1),
    enabled: canReadTransfers,
  });
  const pendingCount = pendingClaimsQuery.data?.totalElements ?? 0;

  const visible = NAV_ITEMS.filter((item) => has(item.permission));
  const displayName = user?.profile?.displayName || user?.profile?.fullName || user?.email || 'Quản trị viên';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f1] text-[#1a1a18]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#123d34] text-white lg:flex">
        <Link to="/admin" className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-900"><AdminMark /></span>
          <span><span className="block text-sm font-bold">APTIS PRACTICE</span><span className="block text-[11px] text-[#a8cec2]">Trung tâm quản trị</span></span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86b2a5]">Quản lý hệ thống</p>
          <nav className="space-y-1" aria-label="Khu quản trị">
            {visible.map((item) => {
              const showBadge = 'hasBadge' in item && item.hasBadge && pendingCount > 0;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors', isActive ? 'bg-white text-brand-900 shadow-sm' : 'text-[#d6e7e1] hover:bg-white/10 hover:text-white')}>
                  <div className="flex items-center gap-3">
                    <AdminIcon name={item.icon} />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-brand-900">{displayName.charAt(0).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-semibold">{displayName}</span><span className="block text-[10px] text-[#a8cec2]">Quản trị hệ thống</span></span>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#e5e3dc] bg-white px-4 lg:left-64 lg:px-7">
        <Link to="/admin" className="flex items-center gap-2 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-900 text-white"><AdminMark /></span><span className="text-sm font-bold">Quản trị</span></Link>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-brand-900">← Trang học viên</Link>
          <span className="hidden h-6 w-px bg-stone-200 sm:block" />
          <span className="hidden max-w-52 truncate text-xs text-stone-500 sm:block">{user?.email}</span>
          <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900">Đăng xuất</button>
        </div>
      </header>

      <div className="pt-16 lg:pl-64">
        <div className="border-b border-[#e5e3dc] bg-[#f0efe9] px-4 py-2 lg:hidden">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Khu quản trị di động">
            {visible.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold', isActive ? 'bg-brand-800 text-white' : 'text-stone-600 hover:bg-white')}>{item.label}</NavLink>)}
          </nav>
        </div>
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
}

function AdminMark() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function AdminIcon({ name }: { name: (typeof NAV_ITEMS)[number]['icon'] }) {
  const paths = {
    tests: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/><path d="m15 16 2 2 4-5"/></>,
    questions: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h6M8 16h4"/></>,
    import: <><path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 19h14"/></>,
    scoring: <><circle cx="12" cy="12" r="9"/><path d="M8 12.5 10.5 15 16 9"/></>,
    plans: <><path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z"/></>,
    orders: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    transfers: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3M15 14l2 2 4-5"/></>,
    refunds: <><path d="M4 8h12a4 4 0 0 1 0 8H9"/><path d="m8 4-4 4 4 4"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">{paths[name]}</svg>;
}
