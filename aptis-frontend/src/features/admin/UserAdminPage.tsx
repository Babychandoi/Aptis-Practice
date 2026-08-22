import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminEntitlementApi, adminUserApi } from '@/api/adminEndpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { confirmDialog } from '@/lib/dialog';
import { formatDateTime, relativeTime } from '@/lib/format';
import type { AdminEntitlement, AdminSubscription, AdminUser, UserStatus } from '@/types/admin';
import { DataTable, PageHeader, Pager, ResultBanner } from './components/AdminUi';
import { usePermission } from './usePermission';

const PAGE_SIZE = 20;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function UserAdminPage() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const canWrite = has('user:write');
  const canManagePremium = has('entitlement:grant');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', query, status, page],
    queryFn: () => adminUserApi.list({ q: query || undefined, status: status || undefined, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const content = () => {
    if (usersQuery.isPending) return <LoadingBlock label="Đang tải danh sách người dùng…" />;
    if (usersQuery.error || !usersQuery.data) {
      return <ErrorBlock message={errorMessage(usersQuery.error, 'Không tải được danh sách người dùng')} onRetry={() => void usersQuery.refetch()} />;
    }

    const data = usersQuery.data;
    return (
      <>
        <p className="mb-2 text-xs text-slate-500">{data.totalElements} người dùng</p>
        <DataTable headers={['Người dùng', 'Trạng thái', 'Vai trò', 'Premium', 'Hoạt động gần nhất', 'Ngày tạo', '']} isEmpty={data.content.length === 0} empty="Không tìm thấy người dùng phù hợp.">
          {data.content.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-brand-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{user.displayName || user.fullName || 'Chưa đặt tên'}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </td>
              <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
              <td className="px-4 py-3"><div className="flex max-w-72 flex-wrap gap-1">{user.roles.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{role}</span>)}</div></td>
              <td className="px-4 py-3"><PremiumSummary user={user} canManage={canManagePremium} /></td>
              {/* Hoạt động là mốc "lần cuối còn ở web" — chính xác hơn đăng
                  nhập, vì refresh token sống 30 ngày nên người vào lại hằng
                  ngày không phải đăng nhập và lastLoginAt đứng im. Vẫn hiện
                  đăng nhập ở dòng phụ để đối chiếu. */}
              <td className="whitespace-nowrap px-4 py-3 text-xs">
                <p className="font-medium text-slate-700">{relativeTime(user.lastActivityAt)}</p>
                <p className="text-[11px] text-slate-400">
                  Đăng nhập: {formatDateTime(user.lastLoginAt)}
                </p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDateTime(user.createdAt)}</td>
              <td className="px-4 py-3 text-right"><button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => setSelected(user)}>Quản lý</button></td>
            </tr>
          ))}
        </DataTable>
        <Pager page={page} totalPages={data.totalPages} onChange={setPage} />
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Quản lý người dùng" description="Tìm tài khoản, quản lý trạng thái, vai trò và nâng cấp, gia hạn hoặc huỷ gói Premium." />
      {banner && <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />}
      <div className="mb-5 grid gap-3 rounded-xl bg-white p-4 shadow-[0_3px_14px_rgba(31,41,35,.07)] sm:grid-cols-[minmax(0,1fr)_220px]">
        <div><label htmlFor="user-search" className="label">Tìm người dùng</label><input id="user-search" className="input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Email hoặc số điện thoại" /></div>
        <div><label htmlFor="user-status" className="label">Trạng thái</label><select id="user-status" className="input" value={status} onChange={(event) => { setStatus(event.target.value as UserStatus | ''); setPage(0); }}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED">Tạm khóa</option><option value="PENDING_VERIFICATION">Chờ xác minh</option><option value="LOCKED">Khóa tạm thời</option></select></div>
      </div>
      {content()}
      {selected && <UserPanel user={selected} canWrite={canWrite} canManagePremium={canManagePremium} onClose={() => setSelected(null)} onSaved={(updated, message) => { setSelected(updated); setBanner(message); void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); }} />}
    </div>
  );
}

function UserPanel({ user, canWrite, canManagePremium, onClose, onSaved }: { user: AdminUser; canWrite: boolean; canManagePremium: boolean; onClose: () => void; onSaved: (user: AdminUser, message: string) => void }) {
  const rolesQuery = useQuery({ queryKey: ['admin', 'user-roles'], queryFn: adminUserApi.roles });
  const [roles, setRoles] = useState<string[]>(user.roles);

  useEffect(() => setRoles(user.roles), [user]);

  const statusMutation = useMutation({
    mutationFn: () => adminUserApi.updateStatus(user.id, user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'),
    onSuccess: (updated) => onSaved(updated, updated.status === 'ACTIVE' ? 'Đã mở lại tài khoản.' : 'Đã tạm khóa tài khoản.'),
  });
  const rolesMutation = useMutation({
    mutationFn: () => adminUserApi.updateRoles(user.id, roles),
    onSuccess: (updated) => onSaved(updated, 'Đã cập nhật vai trò người dùng.'),
  });
  const mutationError = statusMutation.error || rolesMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="flex-1 cursor-default" aria-label="Đóng quản lý người dùng" onClick={onClose} />
      <aside className="flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl" aria-label={`Quản lý ${user.email}`}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{user.displayName || user.fullName || 'Người dùng'}</h2><p className="text-sm text-slate-500">{user.email}</p></div><button type="button" className="btn-ghost !px-2 !py-1" onClick={onClose}>Đóng</button></header>
        <div className="flex-1 space-y-6 p-5">
          {mutationError && <ResultBanner tone="danger" message={errorMessage(mutationError, 'Không thể cập nhật người dùng')} />}
          <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Trạng thái tài khoản</h3><p className="mt-1 text-sm text-slate-500">Tạm khóa sẽ chặn đăng nhập nhưng không xóa dữ liệu.</p></div><UserStatusBadge status={user.status} /></div>{canWrite && (user.status === 'ACTIVE' || user.status === 'SUSPENDED') && <button type="button" className={user.status === 'ACTIVE' ? 'btn-secondary mt-4 w-full !border-red-200 !text-red-700' : 'btn-primary mt-4 w-full'} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()}>{user.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Mở lại tài khoản'}</button>}</section>
          <PremiumSection user={user} canManage={canManagePremium} onSaved={onSaved} />
          <section><h3 className="font-semibold text-slate-900">Vai trò</h3><p className="mt-1 text-sm text-slate-500">Vai trò quyết định các khu vực và thao tác tài khoản được phép sử dụng.</p>{rolesQuery.isPending && <LoadingBlock label="Đang tải vai trò…" />}{rolesQuery.data && <div className="mt-3 space-y-2">{rolesQuery.data.map((role) => <label key={role.code} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-800" checked={roles.includes(role.code)} disabled={!canWrite} onChange={(event) => setRoles((current) => event.target.checked ? [...current, role.code] : current.filter((code) => code !== role.code))} /><span><span className="block text-sm font-semibold text-slate-900">{role.name}</span><span className="block text-xs text-slate-500">{role.description || role.code}</span></span></label>)}</div>}{canWrite && <button type="button" className="btn-primary mt-4 w-full" disabled={roles.length === 0 || rolesMutation.isPending || roles.slice().sort().join('|') === user.roles.slice().sort().join('|')} onClick={() => rolesMutation.mutate()}>Lưu vai trò</button>}</section>
        </div>
      </aside>
    </div>
  );
}

const PREMIUM_CODE = 'PREMIUM_CONTENT_ACCESS';

function PremiumSummary({ user, canManage }: { user: AdminUser; canManage: boolean }) {
  const entitlementsQuery = useQuery({
    queryKey: ['admin', 'users', user.id, 'entitlements'],
    queryFn: () => adminEntitlementApi.ofUser(user.id),
    enabled: canManage,
  });
  const period = getPremiumPeriod(entitlementsQuery.data ?? []);
  const isPremium = period != null || (!entitlementsQuery.isSuccess && user.premiumActive);
  const startsAt = period?.startsAt;
  const endsAt = period?.endsAt ?? user.premiumEndsAt;

  if (entitlementsQuery.isPending) return <span className="text-xs text-slate-400">Đang tải gói…</span>;
  if (!isPremium) return <span className="text-xs text-slate-400">Chưa có gói</span>;

  return (
    <div className="min-w-44 text-xs">
      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">Premium</span>
      <p className="mt-1 text-slate-600">Từ: {startsAt ? formatDateTime(startsAt) : '—'}</p>
      <p className="text-slate-600">Đến: {endsAt ? formatDateTime(endsAt) : 'Trọn đời'}</p>
    </div>
  );
}

function PremiumSection({ user, canManage, onSaved }: {
  user: AdminUser;
  canManage: boolean;
  onSaved: (user: AdminUser, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [durationDays, setDurationDays] = useState(30);
  const entitlementsQuery = useQuery({
    queryKey: ['admin', 'users', user.id, 'entitlements'],
    queryFn: () => adminEntitlementApi.ofUser(user.id),
    enabled: canManage,
  });
  const subscriptionsQuery = useQuery({
    queryKey: ['admin', 'users', user.id, 'subscriptions'],
    queryFn: () => adminEntitlementApi.subscriptionsOfUser(user.id),
    enabled: canManage,
  });
  const premiumEntitlements = (entitlementsQuery.data ?? []).filter((item) => item.entitlementCode === PREMIUM_CODE);
  const premiumPeriod = getPremiumPeriod(premiumEntitlements);
  const hasPremium = premiumPeriod != null || (!entitlementsQuery.isSuccess && user.premiumActive);
  const premiumEndsAt = premiumPeriod?.endsAt ?? user.premiumEndsAt;

  const grantMutation = useMutation({
    mutationFn: async () => {
      const remainingDays = hasPremium && premiumEndsAt
        ? Math.max(0, Math.ceil((new Date(premiumEndsAt).getTime() - Date.now()) / 86_400_000))
        : 0;
      return adminEntitlementApi.grant(user.id, {
        entitlementCode: PREMIUM_CODE,
        durationDays: remainingDays + durationDays,
        reason: hasPremium ? `Gia hạn Premium thêm ${durationDays} ngày` : `Nâng cấp Premium ${durationDays} ngày`,
      });
    },
    onSuccess: (entitlement) => {
      void refreshPremiumQueries(queryClient, user.id);
      onSaved(
        { ...user, premiumActive: true, premiumEndsAt: entitlement.endsAt },
        hasPremium ? `Đã gia hạn Premium thêm ${durationDays} ngày.` : `Đã nâng cấp Premium ${durationDays} ngày.`,
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const [entitlements, subscriptions] = await Promise.all([
        adminEntitlementApi.ofUser(user.id),
        adminEntitlementApi.subscriptionsOfUser(user.id),
      ]);
      const activeSubscriptions = subscriptions.filter(isActiveSubscription);
      const standalonePremium = entitlements.filter((item) =>
        item.entitlementCode === PREMIUM_CODE && item.sourceType !== 'SUBSCRIPTION');
      await Promise.all([
        ...activeSubscriptions.map((item) => adminEntitlementApi.revokeSubscription(item.id, 'Admin huỷ gói tại Quản lý người dùng')),
        ...standalonePremium.map((item) => adminEntitlementApi.revoke(item.id, 'Admin huỷ gói tại Quản lý người dùng')),
      ]);
    },
    onSuccess: () => {
      void refreshPremiumQueries(queryClient, user.id);
      onSaved({ ...user, premiumActive: false, premiumEndsAt: null }, 'Đã huỷ gói Premium của người dùng.');
    },
  });

  const mutationError = grantMutation.error || cancelMutation.error;
  const pending = grantMutation.isPending || cancelMutation.isPending;
  const activeSubscriptions = (subscriptionsQuery.data ?? []).filter(isActiveSubscription);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Gói Premium</h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasPremium
              ? premiumPeriod?.startsAt ? `Từ ${formatDateTime(premiumPeriod.startsAt)} đến ${premiumEndsAt ? formatDateTime(premiumEndsAt) : 'trọn đời'}.` : `Có hiệu lực đến ${premiumEndsAt ? formatDateTime(premiumEndsAt) : 'trọn đời'}.`
              : 'Tài khoản chưa có gói Premium.'}
          </p>
        </div>
        <span className={hasPremium ? 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'}>
          {hasPremium ? 'Premium' : 'Chưa có gói'}
        </span>
      </div>

      {canManage && (
        <>
          {(entitlementsQuery.isPending || subscriptionsQuery.isPending) && <p className="mt-3 text-xs text-slate-500">Đang tải thông tin gói…</p>}
          {(entitlementsQuery.error || subscriptionsQuery.error) && <p className="mt-3 text-xs text-red-600">Không tải được đầy đủ thông tin gói. Hãy thử lại.</p>}
          {mutationError && <div className="mt-3"><ResultBanner tone="danger" message={errorMessage(mutationError, 'Không thể cập nhật gói Premium')} /></div>}

          {hasPremium && (activeSubscriptions.length > 0 || premiumEntitlements.length > 0) && (
            <p className="mt-3 text-xs text-slate-500">
              Nguồn quyền: {activeSubscriptions.length > 0 ? `${activeSubscriptions.length} gói đã mua` : 'cấp thủ công'}.
            </p>
          )}

          {!hasPremium || premiumEndsAt ? (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <label className="sr-only" htmlFor={`premium-days-${user.id}`}>Thời hạn Premium</label>
              <select id={`premium-days-${user.id}`} className="input" value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} disabled={pending}>
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={90}>90 ngày</option>
                <option value={180}>180 ngày</option>
                <option value={365}>365 ngày</option>
              </select>
              <button type="button" className="btn-primary whitespace-nowrap" disabled={pending} onClick={() => grantMutation.mutate()}>
                {hasPremium ? 'Gia hạn gói' : 'Nâng cấp gói'}
              </button>
            </div>
          ) : null}

          {hasPremium && (
            <button
              type="button"
              className="btn-secondary mt-3 w-full !border-red-200 !text-red-700"
              disabled={pending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: 'Huỷ quyền Premium?',
                  text: 'Toàn bộ quyền Premium đang có của người dùng này sẽ bị thu hồi ngay.',
                  confirmText: 'Huỷ quyền',
                  danger: true,
                });
                if (ok) cancelMutation.mutate();
              }}
            >
              Huỷ gói Premium
            </button>
          )}
        </>
      )}
    </section>
  );
}

function isActiveSubscription(subscription: AdminSubscription) {
  if (subscription.status !== 'ACTIVE' || subscription.revokedAt) return false;
  return !subscription.endsAt || new Date(subscription.endsAt).getTime() > Date.now();
}

function getPremiumPeriod(entitlements: AdminEntitlement[]) {
  const premium = entitlements.filter((item) => item.entitlementCode === PREMIUM_CODE);
  if (premium.length === 0) return null;

  const startsAt = premium
    .map((item) => item.startsAt)
    .reduce((earliest, value) => new Date(value).getTime() < new Date(earliest).getTime() ? value : earliest);
  const endsAt = premium.some((item) => item.endsAt == null)
    ? null
    : premium.map((item) => item.endsAt as string)
      .reduce((latest, value) => new Date(value).getTime() > new Date(latest).getTime() ? value : latest);

  return { startsAt, endsAt };
}

async function refreshPremiumQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'entitlements'] }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'subscriptions'] }),
  ]);
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  const labels: Record<UserStatus, string> = {
    ACTIVE: 'Đang hoạt động',
    SUSPENDED: 'Tạm khóa',
    LOCKED: 'Khóa tạm thời',
    PENDING_VERIFICATION: 'Chờ xác minh',
    DELETED: 'Đã xóa',
  };
  const colors: Record<UserStatus, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    SUSPENDED: 'bg-amber-100 text-amber-800',
    LOCKED: 'bg-red-100 text-red-800',
    PENDING_VERIFICATION: 'bg-sky-100 text-sky-800',
    DELETED: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}
