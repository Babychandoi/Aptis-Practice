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
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-brand-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-600"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-brand-800"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M5 4.75A2.75 2.75 0 0 1 7.75 2H20v16H7.75A2.75 2.75 0 0 0 5 20.75V4.75Z" />
                  <path d="M5 20.75A2.75 2.75 0 0 1 7.75 18H20v4H7.75A2.75 2.75 0 0 1 5 19.25V4" />
                  <path d="M9 7h7M9 11h5" />
                </svg>
              </span>
              <span className="text-xl font-semibold tracking-tight">Aptis Practice</span>
            </div>

            <h1 className="mt-10 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.025em]">
              Tiến bộ rõ ràng qua từng bài luyện.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-brand-100">
              Không gian luyện thi tập trung, bám sát cấu trúc Aptis General và hỗ trợ
              bạn cải thiện đều cả bốn kỹ năng.
            </p>
          </div>

          <ul className="relative mt-12 space-y-4 text-sm text-brand-50">
            {[
              'Luyện tập theo đúng Component và Part',
              'Nhận phản hồi cho Writing và Speaking',
              'Theo dõi lịch sử và tiến bộ học tập',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="m5 10 3 3 7-7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-[560px] items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3 text-brand-700">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M5 4.75A2.75 2.75 0 0 1 7.75 2H20v16H7.75A2.75 2.75 0 0 0 5 20.75V4.75Z" />
                    <path d="M5 20.75A2.75 2.75 0 0 1 7.75 18H20v4H7.75A2.75 2.75 0 0 1 5 19.25V4" />
                  </svg>
                </span>
                <span className="text-lg font-semibold">Aptis Practice</span>
              </div>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
