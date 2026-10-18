import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { formatDateTime } from '@/lib/format';

interface Account { id: string; email: string; signupTrialStatus: string; createdAt: string }
interface Group { reference: string; reason: 'SHARED_BROWSER' | 'SHARED_NETWORK'; accountCount: number; accounts: Account[] }
interface Signals { limitedEvents24h: number; browserGroups: Group[]; ipGroups: Group[] }

export function UserAbusePanel({ onSelect }: { onSelect: (email: string) => void }) {
  const [open, setOpen] = useState(false);
  const signals = useQuery({ queryKey: ['admin', 'users', 'abuse-signals'],
    queryFn: () => api.get<Signals>('/admin/users/abuse-signals').then((r) => r.data), enabled: open, staleTime: 30000 });
  const data = signals.data;
  return (
    <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-amber-950" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>Kiểm tra lạm dụng dùng thử / tài khoản liên quan</span><span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3 space-y-3">
        <p className="text-xs leading-5 text-ink-mute">Cùng trình duyệt là dấu hiệu liên quan, không chứng minh cùng người. Trùng IP chỉ là trùng mạng; không tự khóa tài khoản hoặc gói đã mua. Lịch sử tín hiệu mới được lưu 30 ngày, không thể suy ra mã trình duyệt cho dữ liệu cũ.</p>
        {signals.isPending && <p className="text-xs">Đang tải tín hiệu…</p>}
        {signals.error && <button type="button" className="text-xs text-red-700 underline" onClick={() => void signals.refetch()}>Không tải được tín hiệu. Thử lại</button>}
        {data && <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">{data.limitedEvents24h} cảnh báo giới hạn đăng ký trong 24 giờ (đã gộp để tránh spam).</p>
            <button type="button" className="text-xs text-brand-800 underline" disabled={signals.isFetching} onClick={() => void signals.refetch()}>Làm mới</button>
          </div>
          {[...data.browserGroups, ...data.ipGroups].map((group) => (
            <div key={group.reference} className="rounded-lg border border-amber-100 bg-white p-3">
              <p className="text-xs font-semibold">{group.reason === 'SHARED_BROWSER' ? 'Cùng mã trình duyệt' : 'Chỉ trùng IP mạng'} · {group.accountCount} tài khoản · {group.reference}</p>
              <ul className="mt-2 space-y-1">
                {group.accounts.map((account) => <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button type="button" className="break-all text-left text-brand-800 underline" onClick={() => onSelect(account.email)}>{account.email}</button>
                  <span className="text-ink-mute">{account.signupTrialStatus === 'BROWSER_USED' ? 'Không cấp lại dùng thử · ' : ''}{formatDateTime(account.createdAt)}</span>
                </li>)}
              </ul>
              {group.accountCount > group.accounts.length && <p className="mt-1 text-xs text-ink-mute">Hiện tối đa 10 tài khoản mỗi nhóm.</p>}
            </div>
          ))}
          {data.browserGroups.length === 0 && data.ipGroups.length === 0 && <p className="text-xs text-ink-mute">Chưa có nhóm tài khoản liên quan trong dữ liệu được ghi nhận.</p>}
        </>}
      </div>}
    </section>
  );
}
