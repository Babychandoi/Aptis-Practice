import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return <ProductPlansPage product="premium" />;
}

export function AiVoicePlansPage() {
  return <ProductPlansPage product="ai-voice" />;
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

  // Mức tiết kiệm so với giá theo tháng của gói ngắn nhất — con số thật tính
  // từ bảng giá, không lấy phần trăm cố định như mock.
  const baseMonthly = plans[0]?.durationDays ? plans[0].priceAmount / (plans[0].durationDays / 30) : null;
  const savingOf = (plan: Plan) => {
    if (!baseMonthly || !plan.durationDays || plan.durationDays <= 30) return null;
    const pct = Math.round((1 - plan.priceAmount / (plan.durationDays / 30) / baseMonthly) * 100);
    return pct > 0 ? pct : null;
  };
  const features = selectedPlan && selectedPlan.features.length > 0
    ? selectedPlan.features.map((f) => f.displayName ?? f.code)
    : DEFAULT_FEATURES;
  const saving = selectedPlan ? savingOf(selectedPlan) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-7">
      <header className="flex animate-in flex-col items-center gap-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{aiVoice ? 'Gói AI Voice' : 'Gói Premium'}</p>
        <h1 className="max-w-[16ch] text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.045em]">
          {aiVoice ? 'Luyện nói mỗi ngày cùng AI' : 'Mở toàn bộ đề, AI chấm không giới hạn'}
        </h1>
        {!aiVoice && user?.premiumActive && (
          <p className="text-sm text-ink-mute">
            Bạn đang có gói Premium{user.premiumEndsAt ? ` đến ${formatDate(user.premiumEndsAt)}` : ' trọn đời'}. Mua thêm sẽ cộng nối tiếp thời hạn.
          </p>
        )}
        <div role="radiogroup" aria-label="Thời hạn gói" className="flex max-w-full flex-wrap justify-center gap-1 rounded-full bg-surface-muted p-1">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selectedPlan?.id === plan.id}
              onClick={() => { setSelectedPlanId(plan.id); setCodeCheck(null); }}
              className={clsx(
                'min-h-[40px] rounded-full px-5 text-sm font-semibold transition-colors',
                selectedPlan?.id === plan.id ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink',
              )}
            >
              {planDurationLabel(plan.durationDays)}
            </button>
          ))}
        </div>
      </header>

      {createOrder.error && (
        <ErrorBlock message={createOrder.error instanceof ApiError ? createOrder.error.message : 'Không tạo được đơn hàng'} />
      )}

      {selectedPlan && (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {!aiVoice && (
            <section className="flex animate-in flex-col gap-4 rounded-3xl border border-border bg-white p-6">
              <h2 className="text-lg font-bold">Miễn phí</h2>
              <p className="text-[44px] font-extrabold leading-none tracking-[-0.04em]">0đ</p>
              <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5"><CheckIcon muted /> {f}</li>
                ))}
                {FREE_LOCKED.map((f) => (
                  <li key={f} className="flex gap-2.5 text-ink-faint line-through decoration-ink-faint/60"><CrossIcon /> {f}</li>
                ))}
              </ul>
              <span className="mt-auto flex min-h-[48px] items-center justify-center rounded-full border border-border text-sm font-semibold">
                {user?.premiumActive ? 'Đã bao gồm trong Premium' : 'Đang dùng'}
              </span>
            </section>
          )}

          <section className="relative flex animate-in flex-col gap-4 overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_28px_60px_-34px_rgba(15,23,42,.7)]">
            <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-dashed border-white/10" />
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{selectedPlan.name}</h2>
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
        </div>
      )}

      <SupportLinksCard />
    </div>
  );
}

/**
 * Quyền của tài khoản miễn phí — phải khớp luật backend (ContentAccessService):
 * mọi đề và bài test đang là Premium, nên Free KHÔNG làm được đề nào ngoài bài
 * giáo viên giao trong lớp. Ghi sai ở đây là hứa với khách điều không có.
 */
const FREE_FEATURES = [
  'Đọc bảng tin',
  'Vào lớp học và làm bài giáo viên giao',
];

/** Những gì Free không có, gạch đi để khách thấy rõ Premium mở thêm gì. */
const FREE_LOCKED = [
  'Luyện đề và thi thử 5 kỹ năng',
  'AI chấm Writing & Speaking',
  'Dự đoán đề, cập nhật đề, mẹo học',
];

function CrossIcon() {
  return (
    <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-faint">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </span>
  );
}

function CheckIcon({ muted }: { muted?: boolean }) {
  return (
    <span aria-hidden="true" className={clsx('mt-0.5 shrink-0', muted ? 'text-ink-faint' : 'text-accent')}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5 10 17l9-10" /></svg>
    </span>
  );
}
