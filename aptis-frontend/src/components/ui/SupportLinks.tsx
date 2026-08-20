import {
  COMMUNITY_FACEBOOK_GROUP_URL,
  SUPPORT_FACEBOOK_URL,
  SUPPORT_ZALO_PHONE_DISPLAY,
  SUPPORT_ZALO_URL,
} from '@/lib/support';

/**
 * Ba kênh liên hệ: Zalo, trang Facebook hỗ trợ và nhóm trao đổi học tập.
 *
 * Mọi link đều mở tab mới kèm rel="noreferrer" — đây là link ra ngoài, không
 * nên để học viên mất bài đang làm khi bấm vào.
 */

function ZaloIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.6 6.7-.1.9-.5 2.3-1.2 3.4-.2.3.1.6.4.5 1.9-.6 3.3-1.5 4.1-2.1.9.2 1.9.3 3.1.3 5.5 0 10-3.9 10-8.8S17.5 2 12 2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.45-4.92 8.45-9.94z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Bản gọn cho sidebar: chỉ icon + nhãn, không mô tả. */
export function SupportLinksCompact() {
  const items = [
    { href: SUPPORT_ZALO_URL, label: `Zalo ${SUPPORT_ZALO_PHONE_DISPLAY}`, icon: <ZaloIcon /> },
    { href: SUPPORT_FACEBOOK_URL, label: 'Trang hỗ trợ', icon: <FacebookIcon /> },
    { href: COMMUNITY_FACEBOOK_GROUP_URL, label: 'Nhóm học tập', icon: <UsersIcon /> },
  ];

  return (
    <div className="mt-3 space-y-0.5">
      <p className="px-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Hỗ trợ
      </p>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[36px] items-center gap-2.5 rounded-xl px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-surface hover:text-brand-800"
        >
          <span className="shrink-0 text-slate-400">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </a>
      ))}
    </div>
  );
}

/** Bản đầy đủ cho trang gói: có mô tả để học viên biết nên chọn kênh nào. */
export function SupportLinksCard() {
  const items = [
    {
      href: SUPPORT_ZALO_URL,
      label: 'Zalo hỗ trợ',
      description: SUPPORT_ZALO_PHONE_DISPLAY,
      icon: <ZaloIcon />,
    },
    {
      href: SUPPORT_FACEBOOK_URL,
      label: 'Trang hỗ trợ Facebook',
      description: 'Nhắn tin khi cần trợ giúp',
      icon: <FacebookIcon />,
    },
    {
      href: COMMUNITY_FACEBOOK_GROUP_URL,
      label: 'Nhóm trao đổi học tập',
      description: 'Tham gia cộng đồng luyện thi',
      icon: <UsersIcon />,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Cần hỗ trợ?</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Liên hệ trực tiếp nếu bạn cần giúp về thanh toán, kích hoạt gói hoặc nội dung đề.
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border bg-surface-paper px-3.5 py-2.5 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <span className="shrink-0 text-brand-700">{item.icon}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-900">{item.label}</span>
              <span className="block truncate text-[11px] text-slate-500">{item.description}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
