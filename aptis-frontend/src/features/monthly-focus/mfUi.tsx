import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { MonthlyFocusTip } from '@/types/monthlyFocus';
import type { PartIcon, Tone } from '@/features/monthly-focus/monthlyFocusLogic';

/**
 * Phần giao diện dùng chung của Đề trọng điểm tháng — bám theo website gốc:
 * ô icon vuông bo góc nền màu, thẻ viền mảnh, nút viền tròn.
 */

const PATHS: Record<string, string> = {
  headphones: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  book: 'M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
  notebook: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chat: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  bulb: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4',
  play: 'M6 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2',
  shuffle: 'M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M18 2l4 4-4 4M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8M18 14l4 4-4 4',
  rush: 'M13 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 22l4-7 3 2v5M12 9l-3 3 4 3 2-4 4 1M9 12 6 9l-3 1',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  filter: 'M3 6h18M7 12h10M10 18h4',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  panel: 'M3 3h18v18H3zM15 3v18',
  rotate: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  x: 'M18 6 6 18M6 6l12 12',
  xCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6',
  check: 'M20 6 9 17l-5-5',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.8h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  listOrdered: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  sparkles: 'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2zM5 3v4M3 5h4M19 17v4M17 19h4',
  square: 'M6 6h12v12H6z',
  // Icon câu lạc bộ Writing (tên theo lucide của website)
  briefcase: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  palette: 'M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.4.5.5 1 .5 1.4 0 1.3-1.3 2.3-3 2.3zM7.5 10.5h.01M10.5 7.5h.01M15.5 8.5h.01M7.5 14.5h.01',
  home: 'M3 10 12 3l9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  film: 'M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4M3 3h18v18H3z',
  video: 'm16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  userCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 20.7a5 5 0 0 1 10 0',
  clipboard: 'M9 2h6v4H9zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14l2 2 4-4',
  lock: 'M5 11h14v11H5zM7 11V7a5 5 0 0 1 10 0v4',
  walk: 'M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0M7 21l3-4M16 21l-2-4-3-3 1-6M6 12l2-3 4-1 3 3 3 1',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z',
  plane: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  utensils: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  dumbbell: 'M6.5 6.5h11M6.5 17.5h11M6 20V4M18 20V4M3 15V9M21 15V9',
  monitor: 'M2 3h20v14H2zM8 21h8M12 17v4',
};

/** Tên icon lucide bên website -> icon trong bộ trên. */
const LUCIDE: Record<string, string> = {
  Briefcase: 'briefcase', Edit: 'pen', PenTool: 'pen', ClipboardCheck: 'clipboard', Palette: 'palette', Home: 'home',
  House: 'home', BookOpen: 'book', Book: 'book', Users: 'users', User: 'user', UserCircle: 'userCircle', Film: 'film',
  Video: 'video', Music: 'music', Leaf: 'leaf', Sprout: 'leaf', Trees: 'leaf', Camera: 'camera', Lock: 'lock',
  Footprints: 'walk', Globe: 'globe', Plane: 'plane', Utensils: 'utensils', UtensilsCrossed: 'utensils',
  Dumbbell: 'dumbbell', Monitor: 'monitor', Laptop: 'monitor', MessageCircle: 'chat', MessagesSquare: 'chat',
};

export function MfIcon({ name, className = 'h-5 w-5', strokeWidth = 2 }: { name: string; className?: string; strokeWidth?: number }) {
  const d = PATHS[LUCIDE[name] ?? name] ?? PATHS.pen;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const TONE: Record<string, string> = {
  blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500', purple: 'bg-purple-500',
  cyan: 'bg-cyan-500', red: 'bg-red-500', yellow: 'bg-yellow-500', pink: 'bg-pink-500', amber: 'bg-amber-500',
  indigo: 'bg-indigo-500', teal: 'bg-teal-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500', sky: 'bg-sky-500', rose: 'bg-rose-500',
};

/** Ô icon vuông nền màu, như thẻ kỹ năng/Part của website. */
export function ToneTile({ tone, icon, size = 'md' }: { tone: Tone | string; icon: PartIcon | string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center rounded-xl text-white shadow-sm',
        TONE[tone] ?? TONE.blue,
        size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9',
      )}
    >
      <MfIcon name={icon} className={size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} />
    </span>
  );
}

export function Stars({ count, className }: { count: number | null | undefined; className?: string }) {
  if (!count) return null;
  return (
    <span className={clsx('tracking-[-1px] text-amber-400', className)} aria-label={`${count} sao`}>
      {'★'.repeat(Math.max(0, Math.min(5, count)))}
    </span>
  );
}

/** Tiêu đề trang: chữ đậm lớn + dòng mô tả xám, như website. */
export function PageHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px]">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
      {children}
    </header>
  );
}

/** Khung "Mẹo của Admin": thu gọn mặc định, bấm "Hiển thị" mới mở danh sách. */
export function TipsCard({ tips, fallbackTitle }: { tips: MonthlyFocusTip[]; fallbackTitle: string }) {
  const [open, setOpen] = useState(false);
  const tip = tips[0];
  const title = tip?.title || fallbackTitle;
  const lines = tips.flatMap((t) => t.content);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-amber-500">
          <MfIcon name="bulb" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {tip?.description !== '' && (
            <p className="mt-1 text-sm text-slate-500">
              {tip?.description || 'Những lưu ý thực tế từ Admin giúp bạn cải thiện điểm số khi làm bài.'}
            </p>
          )}
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            {open ? 'Ẩn' : 'Hiển thị'}
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-4 space-y-2 pl-16 text-sm leading-6 text-slate-700">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Hộp thoại giữa màn hình, nền tối mờ; Esc hoặc bấm nền để đóng. */
export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx('relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl', className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 rounded-full text-slate-700 hover:text-slate-900">
          <MfIcon name="xCircle" className="h-6 w-6" strokeWidth={1.6} />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Nút viền tròn nhỏ của thanh công cụ (Xem đáp án, Auto shuffle…). */
export function PillButton({
  active, tone = 'slate', onClick, children, title,
}: { active?: boolean; tone?: 'slate' | 'green' | 'purple'; onClick: () => void; children: ReactNode; title?: string }) {
  const tones = {
    slate: active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    green: active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    purple: active ? 'border-purple-400 bg-purple-100 text-purple-700' : 'border-purple-200 bg-white text-purple-600 hover:bg-purple-50',
  };
  return (
    <button type="button" title={title} onClick={onClick} className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors', tones[tone])}>
      {children}
    </button>
  );
}

