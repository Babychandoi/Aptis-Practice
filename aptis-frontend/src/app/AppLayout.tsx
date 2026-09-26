import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '@/features/auth/authStore';
import { usePermission } from '@/features/admin/usePermission';
import { formatDate } from '@/lib/format';
import {
  COMMUNITY_FACEBOOK_GROUP_URL,
  SUPPORT_FACEBOOK_URL,
  SUPPORT_ZALO_PHONE_DISPLAY,
  SUPPORT_ZALO_URL,
} from '@/lib/support';
import { MarqueeBanner } from '@/components/ui/MarqueeBanner';
import { useSidebarCollapsed } from '@/app/useSidebarCollapsed';
import { describePremiumExpiry } from '@/features/billing/premiumExpiry';
import { usePageTracking } from '@/app/usePageTracking';
import { Icon, type IconName } from '@/components/shell/icons';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  external?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Thứ tự và tên nhóm theo mock. "Công cụ" không có trong menu của mock (trang
// có sẵn nhưng không có lối vào), nên thêm vào đây theo quyết định 26/09/2026.
const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Bảng điều khiển', icon: 'home' },
  { to: '/mock-tests', label: 'Mô phỏng thi', icon: 'doc' },
  { to: '/cap-nhat-de', label: 'Cập nhật đề', icon: 'plus' },
  { to: '/du-doan-de', label: 'Dự đoán đề', icon: 'trend' },
  { to: '/bang-tin', label: 'Bảng tin', icon: 'news' },
  { to: '/meo-hoc', label: 'Mẹo học', icon: 'bulb' },
  { to: '/cong-cu', label: 'Công cụ', icon: 'tools' },
  { to: '/history', label: 'Kết quả của tôi', icon: 'clock' },
  { to: '/ai-english-lounge', label: 'AI English Lounge', icon: 'chat' },
];

const SKILL_NAV: NavItem[] = [
  { to: '/luyen-tap/ngu-phap-tu-vung', label: 'Ngữ pháp & Từ vựng', icon: 'gv' },
  { to: '/luyen-tap/doc', label: 'Đọc', icon: 'reading' },
  { to: '/luyen-tap/nghe', label: 'Nghe', icon: 'listening' },
  { to: '/luyen-tap/viet', label: 'Viết', icon: 'writing' },
  { to: '/luyen-tap/noi', label: 'Nói', icon: 'speaking' },
];

const SUPPORT_NAV: NavItem[] = [
  { to: SUPPORT_ZALO_URL, label: `Zalo ${SUPPORT_ZALO_PHONE_DISPLAY}`, icon: 'zalo', external: true },
  { to: SUPPORT_FACEBOOK_URL, label: 'Trang hỗ trợ', icon: 'globe', external: true },
  { to: COMMUNITY_FACEBOOK_GROUP_URL, label: 'Nhóm học tập', icon: 'group', external: true },
];

/** Tên trang hiện trên thanh trên cùng, theo đoạn đầu của đường dẫn. */
const CRUMBS: [RegExp, string][] = [
  [/^\/$/, 'Bảng điều khiển'],
  [/^\/mock-tests/, 'Mô phỏng thi'],
  [/^\/cap-nhat-de/, 'Cập nhật đề'],
  [/^\/du-doan-de/, 'Dự đoán đề'],
  [/^\/bang-tin/, 'Bảng tin'],
  [/^\/meo-hoc/, 'Mẹo học'],
  [/^\/cong-cu/, 'Công cụ'],
  [/^\/history/, 'Kết quả của tôi'],
  [/^\/attempts\/[^/]+\/result/, 'Kết quả'],
  [/^\/ai-english-lounge/, 'AI English Lounge'],
  [/^\/ai-voice\/plans/, 'Gói AI Voice'],
  [/^\/plans/, 'Gói Premium'],
  [/^\/checkout/, 'Thanh toán'],
  [/^\/gioi-thieu/, 'Giới thiệu nhận thưởng'],
  [/^\/lop-hoc|^\/lop\//, 'Lớp học'],
  [/^\/giang-day/, 'Lớp tôi dạy'],
  [/^\/profile/, 'Tài khoản'],
  [/^\/luyen-tap|^\/components|^\/parts|^\/practice/, 'Kỹ năng'],
];

function crumbOf(path: string) {
  return CRUMBS.find(([re]) => re.test(path))?.[1] ?? 'Aptis Practice';
}

export function AppLayout() {
  // Ghi lượt xem trang để biết học viên quan tâm gì; đặt ở layout nên trang mới
  // tự có thống kê.
  usePageTracking();

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isAdmin, has } = usePermission();
  const isTeacher = has('classroom:write');
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);

  // Đổi trang thì đóng ngăn kéo: bấm một mục trong đó là đã chọn xong.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Trong một lớp thì lớp có thanh bên riêng, thay hẳn thanh bên hệ thống.
  // Để cả hai thì màn hình mất gần nửa chiều ngang cho hai cột điều hướng.
  const trongLopHoc =
    location.pathname === '/giang-day' || location.pathname.startsWith('/lop-hoc/');

  const expiry = describePremiumExpiry(user?.premiumEndsAt);
  // Dùng thử và gói đã mua cùng dùng premiumEndsAt, chỉ khác chữ hiển thị.
  const trial = user?.premiumActive === true && user.premiumFromTrial === true;
  const planLabel = trial ? 'Dùng thử' : 'Premium';
  const displayName = user?.profile?.displayName || user?.profile?.fullName || user?.email || 'Học viên';
  const roleLabel = isAdmin ? 'Quản trị' : isTeacher ? 'Giáo viên' : user?.premiumActive ? planLabel : 'Miễn phí';

  const groups: NavGroup[] = [
    { title: 'Menu chính', items: MAIN_NAV },
    { title: 'Kỹ năng', items: SKILL_NAV },
    {
      title: 'Tài khoản',
      items: [
        { to: '/plans', label: 'Gói Premium', icon: 'star' },
        { to: '/gioi-thieu', label: 'Giới thiệu nhận thưởng', icon: 'gift' },
        // Chỉ tài khoản có quyền mới thấy: mock đặt nút này cho mọi người, nhưng
        // học viên bấm vào chỉ gặp trang báo không có quyền.
        ...(isAdmin ? [{ to: '/admin', label: 'Quản trị hệ thống', icon: 'home' as IconName }] : []),
      ],
    },
    { title: 'Hỗ trợ', items: SUPPORT_NAV },
  ];

  // Giáo viên vào lớp mình dạy mỗi ngày nên để lên đầu, trên cả Menu chính.
  if (isTeacher) {
    groups.unshift({ title: 'Giảng dạy', items: [{ to: '/giang-day', label: 'Lớp tôi dạy', icon: 'classes' }] });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Màn làm bài chiếm trọn màn hình, không thanh bên, không thanh trên — như
  // trong mock, để học viên tập trung như trong phòng thi.
  const isActiveAttempt = /^\/attempts\/[^/]+\/?$/.test(location.pathname);
  if (isActiveAttempt) {
    return (
      <div className="min-h-screen bg-white text-ink">
        <main>
          <Outlet />
        </main>
      </div>
    );
  }

  const sideWidth = trongLopHoc ? 'md:pl-64' : collapsed ? 'md:pl-[76px]' : 'md:pl-64';
  const sideLeft = trongLopHoc ? 'md:left-64' : collapsed ? 'md:left-[76px]' : 'md:left-64';
  const showBanner = bannerOpen && !trongLopHoc;

  return (
    <div className="min-h-screen bg-white text-ink">
      {!trongLopHoc && (
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-white md:flex',
            'transition-[width] duration-200 ease-out',
            collapsed ? 'w-[76px]' : 'w-64',
          )}
        >
          <SidebarHeader collapsed={collapsed} onToggle={toggleSidebar} />
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <SidebarGroups groups={groups} collapsed={collapsed} />
          </div>
        </aside>
      )}

      {/* Ngăn kéo điện thoại: cùng nội dung với sidebar desktop. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Đóng menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] animate-drawer-left flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-ink-mute hover:bg-surface-muted"
                aria-label="Đóng menu"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <SidebarGroups groups={groups} collapsed={false} />
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-mute hover:bg-surface-muted"
              >
                <Icon name="logout" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur md:px-5',
          'transition-[left] duration-200 ease-out',
          sideLeft,
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-ink md:hidden"
          aria-label="Mở menu"
        >
          <Icon name="menu" />
        </button>

        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
          {crumbOf(location.pathname)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={isTeacher ? '/giang-day' : '/lop-hoc'}
            aria-label="Lớp học"
            className={clsx(
              // Điện thoại chỉ hiện icon (tròn 36px) cho khỏi chật; màn rộng hiện cả chữ.
              'inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-full border px-2 text-[13px] font-semibold transition-colors sm:px-3.5',
              /^\/(lop-hoc|giang-day)/.test(location.pathname)
                ? 'border-ink bg-surface-muted'
                : 'border-border bg-white hover:border-brand-300',
            )}
          >
            <Icon name="classes" className="h-4 w-4" />
            <span className="hidden sm:inline">Lớp học</span>
          </Link>

          <Link
            to="/gioi-thieu"
            aria-label="Giới thiệu nhận thưởng"
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-full border border-border bg-white px-2 text-[13px] font-semibold transition-colors hover:border-brand-300 lg:px-3.5"
          >
            <Icon name="gift" className="h-4 w-4" />
            <span className="hidden lg:inline">Giới thiệu</span>
          </Link>

          <PremiumPill
            active={user?.premiumActive === true}
            label={planLabel}
            expiryLabel={expiry?.label}
            expiringSoon={expiry?.expiringSoon === true}
            endsAt={user?.premiumEndsAt}
          />

          <Link to="/profile" className="flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-surface-muted lg:pr-3">
            <Avatar name={displayName} />
            <span className="hidden max-w-40 text-left lg:block">
              <span className="block truncate text-[13px] font-semibold leading-4">{displayName}</span>
              <span className="block text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-ink-faint">{roleLabel}</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden h-9 w-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink md:grid"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>

      {showBanner && (
        <div className={clsx('fixed inset-x-0 top-16 z-20 transition-[left] duration-200 ease-out', sideLeft)}>
          <MarqueeBanner
            text="AI English Lounge — luyện phản xạ giao tiếp tiếng Anh bằng giọng nói với AI, chọn giọng nam hoặc nữ, tối đa 120 phút mỗi ngày."
            to="/ai-english-lounge"
            ctaLabel="Khám phá ngay"
            onClose={() => setBannerOpen(false)}
          />
        </div>
      )}

      <div
        className={clsx(
          'transition-[padding] duration-200 ease-out',
          showBanner ? 'pt-[102px]' : 'pt-16',
          sideWidth,
        )}
      >
        <main className="mx-auto max-w-[1240px] px-4 py-7 pb-20 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/" className={clsx('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')} title="Aptis Practice">
      {/* width/height khai sẵn để trình duyệt giữ chỗ, không giật layout khi ảnh
          tải xong. */}
      <img src="/images/logo-mark-sm.png" alt="" width="34" height="34" className="h-[34px] w-[34px] shrink-0 object-contain" />
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold leading-5 tracking-tight">Aptis Practice</span>
          <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-ink-faint">General</span>
        </span>
      )}
    </Link>
  );
}

function SidebarHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className={clsx('flex items-center gap-2 px-4 py-4', collapsed && 'flex-col px-2')}>
      <Brand collapsed={collapsed} />
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-mute transition-colors hover:text-ink',
          !collapsed && 'ml-auto',
        )}
        aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        aria-expanded={!collapsed}
      >
        <span className={clsx('transition-transform', collapsed && 'rotate-180')}>
          <Icon name="chevronLeft" className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}

function SidebarGroups({ groups, collapsed }: { groups: NavGroup[]; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <nav key={group.title} aria-label={group.title} className="flex flex-col gap-0.5">
          {/* Nhãn nhóm biến mất khi thu gọn: chữ không vừa 76px, còn lại chỉ
              một vệt bị cắt. Ranh giới nhóm vẫn nhận ra nhờ vạch ngăn. */}
          {!collapsed ? (
            <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{group.title}</p>
          ) : (
            <span className="mx-auto mb-1 h-px w-6 bg-border" />
          )}
          {group.items.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
      ))}
    </div>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const base = clsx(
    'flex min-h-[40px] items-center rounded-xl text-sm transition-colors',
    collapsed ? 'justify-center px-0' : 'gap-3 px-2.5',
  );
  const content = (
    <>
      <Icon name={item.icon} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noreferrer"
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={clsx(base, 'font-medium text-ink-soft hover:bg-surface-paper hover:text-ink')}
      >
        {content}
      </a>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => clsx(
        base,
        isActive ? 'bg-surface-muted font-bold text-ink' : 'font-medium text-ink-soft hover:bg-surface-paper hover:text-ink',
      )}
    >
      {content}
    </NavLink>
  );
}

function PremiumPill({
  active,
  label,
  expiryLabel,
  expiringSoon,
  endsAt,
}: {
  active: boolean;
  label: string;
  expiryLabel?: string;
  expiringSoon: boolean;
  endsAt?: string | null;
}) {
  // Chưa có gói: một lời mời nâng cấp. Có gói: chấm xanh và số ngày còn lại,
  // chuyển vàng khi sắp hết để học viên kịp gia hạn giữa lúc đang ôn.
  if (!active) {
    return (
      <Link
        to="/plans"
        className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-soft"
      >
        <Icon name="star" className="h-4 w-4" />
        Nâng cấp
      </Link>
    );
  }
  return (
    <Link
      to="/plans"
      title={endsAt ? `${label} hết hạn ${formatDate(endsAt)}` : label}
      className={clsx(
        'inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
        expiringSoon ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-border bg-white hover:border-brand-300',
      )}
    >
      {/* Chấm trạng thái có vòng toả như mock */}
      <span className={clsx('relative h-2 w-2 rounded-full', expiringSoon ? 'bg-amber-500' : 'bg-accent')}>
        <span aria-hidden="true" className={clsx('absolute inset-0 animate-ping-soft rounded-full', expiringSoon ? 'bg-amber-500' : 'bg-accent')} />
      </span>
      <span className="sm:hidden">{label}</span>
      <span className="hidden sm:inline">{expiryLabel ? `${label} · ${expiryLabel}` : label}</span>
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
      {name.trim().charAt(0).toUpperCase() || 'A'}
    </span>
  );
}
