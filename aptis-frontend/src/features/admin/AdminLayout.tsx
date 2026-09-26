import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { adminPendingApi, type AdminPendingCounts } from '@/api/adminEndpoints';
import { usePermission } from './usePermission';
import { useAuthStore } from '@/features/auth/authStore';
import { useAdminWebSocket } from './useAdminWebSocket';
import { Icon, type IconName } from '@/components/shell/icons';

type BadgeKey = keyof AdminPendingCounts;

interface AdminNavItem {
  to: string;
  label: string;
  permission: string;
  icon: IconName;
  badge?: BadgeKey;
}

// Thứ tự và tên theo mock.
const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin/skill-tests', label: 'Bài test kỹ năng', permission: 'blueprint:write', icon: 'tests' },
  { to: '/admin/question-sets', label: 'Ngân hàng câu hỏi', permission: 'question_set:read', icon: 'questions', badge: 'questionSets' },
  { to: '/admin/imports', label: 'Import câu hỏi', permission: 'question_set:write', icon: 'import' },
  { to: '/admin/contributions', label: 'Đề giáo viên gửi', permission: 'question_set:review', icon: 'tsets', badge: 'contributions' },
  { to: '/admin/scoring', label: 'Cấu hình điểm', permission: 'question_set:write', icon: 'scoring' },
  { to: '/admin/exam-predictions', label: 'Dự đoán đề', permission: 'question_set:write', icon: 'trend' },
  { to: '/admin/news', label: 'Bảng tin', permission: 'news:write', icon: 'news', badge: 'newsComments' },
  { to: '/admin/plans', label: 'Gói Premium', permission: 'plan:write', icon: 'star' },
  { to: '/admin/gemini', label: 'Gemini Live', permission: 'plan:write', icon: 'spark' },
  { to: '/admin/orders', label: 'Đơn hàng', permission: 'order:read', icon: 'orders' },
  { to: '/admin/bank-transfers', label: 'Đối soát chuyển khoản', permission: 'order:read', icon: 'transfers', badge: 'bankTransfers' },
  { to: '/admin/refunds', label: 'Hoàn tiền', permission: 'refund:write', icon: 'refunds', badge: 'refunds' },
  { to: '/admin/affiliate', label: 'Giới thiệu & hoa hồng', permission: 'affiliate:read', icon: 'gift', badge: 'payouts' },
  { to: '/admin/classrooms', label: 'Lớp học & giáo viên', permission: 'classroom:read', icon: 'classes' },
  { to: '/admin/users', label: 'Quản lý người dùng', permission: 'user:read', icon: 'group' },
  { to: '/admin/analytics', label: 'Học viên quan tâm gì', permission: 'analytics:read', icon: 'pie' },
  { to: '/admin/reports', label: 'Báo cáo', permission: 'report:read', icon: 'reports' },
];

export function AdminLayout() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { has } = usePermission();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const canReadTransfers = has('order:read');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

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
        void queryClient.invalidateQueries({ queryKey: ['admin', 'pending-counts'] });
      }
    },
  });

  // Một lần gọi đếm mọi việc chờ xử lý; backend chỉ trả mục người xem có quyền.
  const pendingQuery = useQuery({
    queryKey: ['admin', 'pending-counts'],
    queryFn: adminPendingApi.counts,
    refetchInterval: 60_000,
  });
  const badges: AdminPendingCounts = pendingQuery.data ?? {};

  const visible = NAV_ITEMS.filter((item) => has(item.permission));
  const current = visible.find((item) => location.pathname.startsWith(item.to));
  const displayName = user?.profile?.displayName || user?.profile?.fullName || 'Quản trị viên';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <>
      <Link to="/admin" className="flex items-center gap-3 px-4 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-admin">
          <Icon name="home" />
        </span>
        <span>
          <span className="block text-sm font-extrabold tracking-wide text-white">APTIS PRACTICE</span>
          <span className="block text-[11px] text-admin-fg/80">Trung tâm quản trị</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-admin-fg/60">Quản lý hệ thống</p>
        <nav className="flex flex-col gap-0.5" aria-label="Khu quản trị">
          {visible.map((item) => {
            const count = item.badge ? badges[item.badge] ?? 0 : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex min-h-10 items-center gap-3 rounded-xl px-2.5 text-[13.5px] transition-colors',
                  isActive ? 'bg-white font-bold text-admin' : 'font-medium text-admin-fg hover:bg-admin-hover hover:text-white',
                )}
              >
                <Icon name={item.icon} />
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-admin-hover text-[13px] font-semibold text-white transition-colors hover:bg-white/15"
        >
          <Icon name="back" className="h-4 w-4" />
          Trang học viên
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-white text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-admin lg:flex">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col bg-admin shadow-2xl">{sidebar}</div>
        </div>
      )}

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white px-4 lg:left-64 lg:px-5">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border lg:hidden"
          aria-label="Mở menu quản trị"
        >
          <Icon name="menu" />
        </button>
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
          {current?.label ?? 'Trung tâm quản trị'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-2.5 rounded-full p-1 lg:pr-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-48 truncate text-[13px] font-semibold leading-4">{displayName}</span>
              <span className="block text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-ink-faint">Admin</span>
            </span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-faint hover:bg-surface-muted hover:text-ink"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="pt-16 lg:pl-64">
        <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6"><Outlet /></main>
      </div>
    </div>
  );
}
