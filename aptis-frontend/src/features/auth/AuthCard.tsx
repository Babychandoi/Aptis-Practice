import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl border border-border lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-dark p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-brand-800/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              {/* Bản logo riêng cho nền tối: phần đen của logo gốc đã đổi sang
                  trắng, nếu dùng logo thường thì nửa hình biến mất. */}
              <img
                src="/images/logo-mark-dark-sm.png"
                alt=""
                width="40"
                height="40"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div>
                <span className="block text-lg font-bold tracking-tight">Aptis Practice</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">General</span>
              </div>
            </div>

            <h1 className="mt-12 max-w-sm text-3xl font-bold leading-tight tracking-tight text-white">
              Luyện thi chuẩn Aptis General.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Không gian luyện thi bám sát cấu trúc thi thật, hỗ trợ AI chấm và phân tích chuyên sâu cho từng kỹ năng.
            </p>
          </div>

          <ul className="relative mt-12 space-y-4 text-sm text-slate-200">
            {[
              'Luyện tập trọn bộ 5 kỹ năng theo từng Part',
              'AI chấm và phản hồi tiêu chuẩn Writing & Speaking',
              'Theo dõi chi tiết tiến độ và ước lượng CEFR',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-dark font-bold text-xs">
                  ✓
                </span>
                <span className="text-xs font-medium text-slate-200">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-[560px] items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3 text-brand-600">
                <img
                  src="/images/logo-mark-sm.png"
                  alt=""
                  width="40"
                  height="40"
                  className="h-10 w-10 shrink-0 object-contain"
                />
                <span className="text-lg font-bold text-slate-900">Aptis Practice</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
