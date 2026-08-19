import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi, billingApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import type { CefrLevel } from '@/types/api';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function ProfilePage() {
  const { user, refreshUser, logout } = useAuthStore();

  const [fullName, setFullName] = useState(user?.profile?.fullName ?? '');
  const [displayName, setDisplayName] = useState(user?.profile?.displayName ?? '');
  const [targetCefrLevel, setTargetCefrLevel] = useState<CefrLevel | ''>(
    user?.profile?.targetCefrLevel ?? '',
  );
  const [targetExamDate, setTargetExamDate] = useState(user?.profile?.targetExamDate ?? '');
  const [saved, setSaved] = useState(false);

  const subscriptionsQuery = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => billingApi.currentSubscriptions(),
  });

  const updateProfile = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        fullName: fullName || null,
        displayName: displayName || null,
        targetCefrLevel: targetCefrLevel || null,
        targetExamDate: targetExamDate || null,
      }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  if (!user) {
    return <LoadingBlock />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Tài khoản</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Thông tin cá nhân</h2>

        <div>
          <span className="label">Email</span>
          <p className="text-sm text-slate-600">
            {user.email}
            {user.emailVerified ? (
              <span className="ml-2 text-xs text-emerald-600">✓ Đã xác thực</span>
            ) : (
              <span className="ml-2 text-xs text-amber-600">Chưa xác thực</span>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="fullName" className="label">
            Họ và tên
          </label>
          <input
            id="fullName"
            type="text"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="displayName" className="label">
            Tên hiển thị
          </label>
          <input
            id="displayName"
            type="text"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="targetCefr" className="label">
              Mục tiêu CEFR
            </label>
            <select
              id="targetCefr"
              className="input"
              value={targetCefrLevel}
              onChange={(e) => setTargetCefrLevel(e.target.value as CefrLevel | '')}
            >
              <option value="">Chưa chọn</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="examDate" className="label">
              Ngày thi dự kiến
            </label>
            <input
              id="examDate"
              type="date"
              className="input"
              value={targetExamDate}
              onChange={(e) => setTargetExamDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate()}
            className="btn-primary"
          >
            {updateProfile.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Đã lưu</span>}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Gói dịch vụ</h2>

        {user.premiumActive ? (
          <p className="text-sm text-slate-700">
            Premium đang hiệu lực
            {user.premiumEndsAt ? ` đến ${formatDate(user.premiumEndsAt)}` : ' trọn đời'}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Bạn đang dùng gói miễn phí</p>
        )}

        {(subscriptionsQuery.data?.length ?? 0) > 0 && (
          <div className="mt-3 space-y-2">
            {subscriptionsQuery.data!.map((subscription) => (
              <div
                key={subscription.id}
                className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span>{subscription.planName ?? subscription.planCode}</span>
                <span className="text-slate-500">
                  {subscription.status}
                  {subscription.endsAt ? ` · đến ${formatDate(subscription.endsAt)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Bảo mật</h2>
        <button
          type="button"
          onClick={() => void logout(true)}
          className="btn-secondary w-full"
        >
          Đăng xuất khỏi tất cả thiết bị
        </button>
      </section>
    </div>
  );
}
