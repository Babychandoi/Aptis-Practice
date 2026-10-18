import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { affiliateApi, billingApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { SupportLinksCard } from '@/components/ui/SupportLinks';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency, formatDate, planDurationLabel } from '@/lib/format';
import type { CheckAffiliateResult, Plan } from '@/types/api';

const DEFAULT_FEATURES = [
  'Toàn bộ ngân hàng đề Premium',
  'AI chấm và góp ý Writing & Speaking',
  'Keys Aptis, 4 đề trọng điểm và kho luyện 4 kỹ năng',
  'Theo dõi tiến độ và phân tích chi tiết theo Part',
];

export function PlansPage() {
  return <ProductPlansPage key="premium" product="premium" />;
}

export function AiVoicePlansPage() {
  return <ProductPlansPage key="ai-voice" product="ai-voice" />;
}

function ProductPlansPage({ product }: { product: 'premium' | 'ai-voice' }) {
  const aiVoice = product === 'ai-voice';
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const sessionKey = useRef(crypto.randomUUID()).current;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState('');
  // Kết quả kiểm mã: chỉ kiểm khi người dùng bấm, không kiểm theo từng phím —
  // gõ 8 ký tự sẽ thành 8 lượt gọi API mà 7 lượt đầu chắc chắn sai.
  const [codeCheck, setCodeCheck] = useState<CheckAffiliateResult | null>(null);

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => billingApi.plans(),
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo(
    () => [...(plansQuery.data ?? [])].filter((plan) => aiVoice
      ? plan.code.startsWith('AI_LOUNGE_')
      : !plan.code.startsWith('AI_LOUNGE_')).sort((a, b) => {
      if (a.durationDays == null) return 1;
      if (b.durationDays == null) return -1;
      return a.durationDays - b.durationDays;
    }),
    [aiVoice, plansQuery.data],
  );
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  const createOrder = useMutation({
    mutationFn: (planId: string) => billingApi.createOrder(
      {
        planId,
        // Chỉ gửi mã đã kiểm hợp lệ: gửi mã sai sẽ làm cả đơn hàng lỗi.
        ...(codeCheck?.valid && codeCheck.code ? { affiliateCode: codeCheck.code } : {}),
      },
      `order:${user?.id}:${planId}:${sessionKey}`,
    ),
    onSuccess: (order) => navigate(`/checkout/${order.id}`),
  });

  const checkCode = useMutation({
    mutationFn: (code: string) => affiliateApi.check(code, selectedPlan?.id ?? ""),
    onSuccess: setCodeCheck,
  });

  if (plansQuery.isLoading) return <LoadingBlock label={aiVoice ? 'Đang tải gói AI Voice…' : 'Đang tải gói Premium…'} />;

  if (plansQuery.error || plans.length === 0) {
    return <ErrorBlock message="Không tải được danh sách gói" onRetry={() => void plansQuery.refetch()} />;
  }

  // So sánh đơn giá với gói có thời hạn ngắn nhất, dùng giá thật từ API.
  const shortestPlan = plans.find((plan) => plan.durationDays != null && plan.durationDays > 0);
  const baseDaily = shortestPlan?.durationDays
    ? shortestPlan.priceAmount / shortestPlan.durationDays
    : null;
  const savingOf = (plan: Plan) => {
    if (!baseDaily || !plan.durationDays || plan.durationDays <= (shortestPlan?.durationDays ?? 0)) return null;
    const pct = Math.round((1 - plan.priceAmount / plan.durationDays / baseDaily) * 100);
    return pct > 0 ? pct : null;
  };
  const features = selectedPlan && selectedPlan.features.length > 0
    ? selectedPlan.features.map((f) => f.displayName ?? f.code)
    : DEFAULT_FEATURES;
  const saving = selectedPlan ? savingOf(selectedPlan) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
      <header className="flex animate-in flex-col items-center gap-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{aiVoice ? 'Gói AI Voice' : 'Gói Premium'}</p>
        <h1 className="max-w-[16ch] text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.045em]">
          {aiVoice ? 'Luyện nói mỗi ngày cùng AI' : 'Mở toàn bộ đề, AI chấm không giới hạn'}
        </h1>
        <nav aria-label="Chọn loại gói" className="grid w-full max-w-xl grid-cols-2 gap-1 rounded-2xl bg-surface-muted p-1.5 text-left">
          <Link
            to="/plans"
            aria-current={!aiVoice ? 'page' : undefined}
            className={clsx(
              'flex min-h-[58px] flex-col justify-center rounded-xl px-4 py-2 transition-colors',
              !aiVoice ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink',
            )}
          >
            <span className="text-sm font-bold">Premium đề</span>
            <span className="text-xs">Luyện đề · AI chấm</span>
          </Link>
          <Link
            to="/ai-voice/plans"
            aria-current={aiVoice ? 'page' : undefined}
            className={clsx(
              'flex min-h-[58px] flex-col justify-center rounded-xl px-4 py-2 transition-colors',
              aiVoice ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink',
            )}
          >
            <span className="text-sm font-bold">AI Voice</span>
            <span className="text-xs">Phòng hội thoại English</span>
          </Link>
        </nav>
        <p className="max-w-xl text-xs leading-5 text-ink-mute">
          Đây là hai gói riêng biệt. Premium đề không bao gồm quyền sử dụng AI Voice.
        </p>
        {!aiVoice && user?.premiumActive && (
          <p className="text-sm text-ink-mute">
            Bạn đang có gói Premium{user.premiumEndsAt ? ` đến ${formatDate(user.premiumEndsAt)}` : ' trọn đời'}. Mua thêm sẽ cộng nối tiếp thời hạn.
          </p>
        )}
      </header>

      {createOrder.error && (
        <ErrorBlock message={createOrder.error instanceof ApiError ? createOrder.error.message : 'Không tạo được đơn hàng'} />
      )}

      <section aria-label="Danh sách các gói" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map((plan) => {
          const selected = selectedPlan?.id === plan.id;
          const planSaving = savingOf(plan);
          const pricePerDay = plan.durationDays ? plan.priceAmount / plan.durationDays : null;
          return (
            <button
              key={plan.id}
              type="button"
              aria-pressed={selected}
              onClick={() => { setSelectedPlanId(plan.id); setCodeCheck(null); }}
              className={clsx(
                'relative flex min-h-[190px] flex-col gap-3 rounded-3xl border p-5 text-left transition-all',
                selected
                  ? 'border-ink bg-ink text-white shadow-[0_20px_40px_-28px_rgba(15,23,42,.8)] ring-2 ring-ink ring-offset-2'
                  : 'border-border bg-white text-ink hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-lg',
              )}
            >
              <span className="flex min-h-6 items-center justify-between gap-2">
                <span className={clsx('text-sm font-bold', selected ? 'text-white/90' : 'text-ink-soft')}>{plan.name}</span>
                {planSaving != null && (
                  <span className={clsx('shrink-0 rounded-full px-2 py-1 text-[11px] font-bold', selected ? 'bg-accent text-ink' : 'bg-accent/15 text-ink')}>
                    Giảm {planSaving}%
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[32px] font-extrabold leading-none tracking-[-0.04em]">{formatCurrency(plan.priceAmount, plan.currency)}</span>
                {plan.durationDays != null && <span className={clsx('text-xs', selected ? 'text-white/60' : 'text-ink-mute')}>/ {planDurationLabel(plan.durationDays).toLowerCase()}</span>}
              </span>
              {pricePerDay != null ? (
                <span className={clsx('text-xs leading-5', selected ? 'text-white/65' : 'text-ink-mute')}>
                  {formatCurrency(Math.round(pricePerDay), plan.currency)} / ngày
                  {planSaving != null && <span> · Tiết kiệm {planSaving}% so với gói {planDurationLabel(shortestPlan?.durationDays ?? null).toLowerCase()}</span>}
                </span>
              ) : <span className={clsx('text-xs', selected ? 'text-white/65' : 'text-ink-mute')}>Sử dụng không giới hạn thời gian</span>}
              <span className={clsx('mt-auto flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-bold', selected ? 'bg-white text-ink' : 'bg-surface-muted text-ink-soft')}>
                {selected ? 'Đang chọn' : 'Chọn gói này'}
              </span>
            </button>
          );
        })}
      </section>

      {selectedPlan && (
          <section className="relative flex animate-in flex-col gap-4 overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_28px_60px_-34px_rgba(15,23,42,.7)] md:p-8">
            <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-dashed border-white/10" />
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Gói đã chọn: {selectedPlan.name}</h2>
              {saving && <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-ink">Tiết kiệm {saving}%</span>}
            </div>
            <p className="flex items-baseline gap-2">
              <span className="text-[44px] font-extrabold leading-none tracking-[-0.04em]">{formatCurrency(selectedPlan.priceAmount, selectedPlan.currency)}</span>
              {selectedPlan.durationDays && <span className="text-sm text-white/60">/ {selectedPlan.durationDays} ngày</span>}
            </p>
            <ul className="flex flex-col gap-2.5 text-sm text-white/85">
              {features.slice(0, 6).map((f) => (
                <li key={f} className="flex gap-2.5"><CheckIcon /> {f}</li>
              ))}
            </ul>

            <div className="mt-2">
              <label className="mb-1.5 block text-xs font-semibold text-white/60" htmlFor="affiliate-code">Mã giới thiệu (nếu có)</label>
              <div className="flex gap-2">
                <input
                  id="affiliate-code"
                  type="text"
                  value={affiliateCode}
                  placeholder="VD: ABCD2345"
                  onChange={(event) => {
                    setAffiliateCode(event.target.value.toUpperCase());
                    setCodeCheck(null);
                  }}
                  className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 font-mono text-sm uppercase tracking-wider text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!affiliateCode.trim() || checkCode.isPending}
                  onClick={() => checkCode.mutate(affiliateCode.trim())}
                  className="min-h-[44px] shrink-0 rounded-full border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  {checkCode.isPending ? '…' : 'Áp dụng'}
                </button>
              </div>
              {codeCheck && (
                <p className={clsx('mt-1.5 text-xs leading-5', codeCheck.valid ? 'text-accent-light' : 'text-red-300')}>
                  {codeCheck.valid
                    ? `Được giảm ${formatCurrency(codeCheck.discountAmount, selectedPlan.currency)}`
                    : (codeCheck.message ?? 'Mã không dùng được')}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={createOrder.isPending}
              onClick={() => createOrder.mutate(selectedPlan.id)}
              className="btn mt-auto min-h-[52px] bg-white text-ink hover:bg-surface-muted"
            >
              {createOrder.isPending
                ? 'Đang tạo đơn…'
                : `${user?.premiumActive && !aiVoice ? 'Gia hạn' : 'Mua'} ${planDurationLabel(selectedPlan.durationDays).toLowerCase()}`}
            </button>
            <p className="text-center text-[11px] leading-5 text-white/50">
              Thanh toán một lần qua VietQR, không tự gia hạn. Kích hoạt ngay khi đối soát xong.
            </p>
          </section>
      )}

      <SupportLinksCard />
    </div>
  );
}

function CheckIcon() {
  return (
    <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5 10 17l9-10" /></svg>
    </span>
  );
}
