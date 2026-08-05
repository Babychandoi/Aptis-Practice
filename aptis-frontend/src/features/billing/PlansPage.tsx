import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { billingApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency, formatDate, planDurationLabel } from '@/lib/format';
import type { Plan } from '@/types/api';

const DEFAULT_FEATURES = [
  'Toàn bộ ngân hàng đề Premium',
  'AI chấm và góp ý Writing & Speaking',
  'Keys Aptis, 4 đề trọng điểm và kho luyện 4 kỹ năng',
  'Theo dõi tiến độ và phân tích chi tiết theo Part',
];

export function PlansPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const sessionKey = useRef(crypto.randomUUID()).current;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => billingApi.plans(),
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo(
    () => [...(plansQuery.data ?? [])].sort((a, b) => {
      if (a.durationDays == null) return 1;
      if (b.durationDays == null) return -1;
      return a.durationDays - b.durationDays;
    }),
    [plansQuery.data],
  );
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  const createOrder = useMutation({
    mutationFn: (planId: string) => billingApi.createOrder(
      { planId },
      `order:${user?.id}:${planId}:${sessionKey}`,
    ),
    onSuccess: (order) => navigate(`/checkout/${order.id}`),
  });

  if (plansQuery.isLoading) return <LoadingBlock label="Đang tải gói Premium…" />;

  if (plansQuery.error || plans.length === 0) {
    return <ErrorBlock message="Không tải được danh sách gói" onRetry={() => void plansQuery.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl bg-brand-900 px-5 py-6 text-white sm:px-7">
        <span className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-700/50" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100">
            Aptis Practice Premium
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Học trọn bộ, tiến bộ rõ ràng</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            Mở toàn bộ kho luyện, thi thử đủ 4 kỹ năng và nhận góp ý Writing/Speaking bằng AI.
          </p>
        </div>
      </header>

      {user?.premiumActive && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Bạn đang có Premium{user.premiumEndsAt ? ` đến ${formatDate(user.premiumEndsAt)}` : ' trọn đời'}.
          Mua thêm sẽ nối tiếp thời hạn hiện tại.
        </div>
      )}

      {createOrder.error && (
        <ErrorBlock message={createOrder.error instanceof ApiError ? createOrder.error.message : 'Không tạo được đơn hàng'} />
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white">1</span>
              <div>
                <h2 className="font-semibold text-stone-900">Chọn gói sử dụng</h2>
                <p className="mt-0.5 text-xs text-stone-500">Quyền lợi giống nhau, chỉ khác thời hạn</p>
              </div>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{plans.length} gói</span>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan?.id === plan.id}
                popular={plan.durationDays === 30}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            ))}
          </div>
        </section>

        {selectedPlan && (
          <aside className="sticky top-24 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_35px_rgba(30,41,35,.09)]">
            <div className="border-b border-stone-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dda43e] text-sm font-bold text-white">2</span>
                <div>
                  <h2 className="font-semibold text-stone-900">Xác nhận thanh toán</h2>
                  <p className="mt-0.5 text-xs text-stone-500">Kiểm tra gói trước khi tiếp tục</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-xl bg-[#f5f2e9] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Gói đã chọn</p>
                <p className="mt-2 font-semibold text-stone-900">{selectedPlan.name}</p>
                <p className="mt-1 text-sm text-stone-600">{planDurationLabel(selectedPlan.durationDays)}</p>
                <div className="mt-4 flex items-end justify-between border-t border-stone-300 pt-4">
                  <span className="text-sm text-stone-600">Tổng cộng</span>
                  <span className="text-xl font-bold text-brand-800">{formatCurrency(selectedPlan.priceAmount, selectedPlan.currency)}</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs leading-5 text-stone-600">
                <li className="flex gap-2"><CheckIcon /> Kích hoạt tự động sau khi thanh toán thành công</li>
                <li className="flex gap-2"><CheckIcon /> Thanh toán một lần, không tự động gia hạn</li>
                <li className="flex gap-2"><CheckIcon /> Tiến độ học được giữ nguyên khi gia hạn</li>
              </ul>

              <button
                type="button"
                disabled={createOrder.isPending}
                onClick={() => createOrder.mutate(selectedPlan.id)}
                className="btn-primary mt-5 w-full"
              >
                {createOrder.isPending ? 'Đang tạo đơn…' : 'Tiếp tục thanh toán →'}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-stone-500">
                Bằng việc tiếp tục, bạn xác nhận đã chọn đúng gói và thời hạn.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, popular, onSelect }: {
  plan: Plan;
  selected: boolean;
  popular: boolean;
  onSelect: () => void;
}) {
  const features = plan.features.length > 0
    ? plan.features.map((feature) => feature.displayName ?? feature.code)
    : DEFAULT_FEATURES;
  const monthlyPrice = plan.durationDays && plan.durationDays >= 30
    ? Math.round(plan.priceAmount / (plan.durationDays / 30))
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'group relative flex min-h-[310px] flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-brand-700 bg-[#f2faf7] shadow-[0_8px_22px_rgba(5,92,76,.10)] ring-1 ring-brand-700'
          : 'border-stone-200 bg-white hover:border-brand-300 hover:shadow-sm',
      )}
      aria-pressed={selected}
    >
      <span className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-brand-50" aria-hidden="true" />
      <div className="relative flex min-h-7 items-start justify-between gap-2">
        <span className={clsx(
          'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
          popular ? 'bg-[#fbecd1] text-[#986b20]' : 'bg-brand-50 text-brand-800',
        )}>
          {popular ? 'Phổ biến nhất' : durationBadge(plan.durationDays)}
        </span>
        <span className={clsx(
          'grid h-5 w-5 place-items-center rounded-full border',
          selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-stone-300 bg-[#f5f2e9]',
        )} aria-hidden="true">{selected ? '✓' : ''}</span>
      </div>

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-stone-500">{planDurationLabel(plan.durationDays)}</p>
      <h3 className="mt-1 text-base font-semibold text-stone-900">{plan.name}</h3>
      <p className="mt-3 text-xl font-bold tracking-[-0.03em] text-stone-900">{formatCurrency(plan.priceAmount, plan.currency)}</p>
      {monthlyPrice !== null && <p className="mt-1 text-xs font-semibold text-[#4d7b28]">~{formatCurrency(monthlyPrice, plan.currency)}/tháng</p>}

      <div className="my-4 border-t border-stone-200" />
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-700">Bao gồm</p>
      <ul className="mt-2 space-y-2">
        {features.slice(0, 5).map((feature) => (
          <li key={feature} className="flex gap-2 text-xs leading-5 text-stone-600"><CheckIcon /> <span>{feature}</span></li>
        ))}
      </ul>
    </button>
  );
}

function durationBadge(durationDays: number | null | undefined) {
  if (durationDays == null) return 'Trọn đời';
  if (durationDays <= 14) return 'Trải nghiệm nhanh';
  if (durationDays >= 90) return 'Tiết kiệm dài hạn';
  return 'Luyện tập hiệu quả';
}

function CheckIcon() {
  return <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700" aria-hidden="true">✓</span>;
}
