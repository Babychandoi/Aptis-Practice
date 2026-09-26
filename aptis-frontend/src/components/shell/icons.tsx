/**
 * Bộ icon của giao diện mới, chép đúng path từ mock (nét 1.8, 24×24).
 *
 * Gom một chỗ để sidebar học viên, sidebar lớp học và sidebar quản trị dùng
 * chung một nét vẽ. Trước đây mỗi layout tự khai icon riêng nên cùng một khái
 * niệm (ví dụ "Nghe") có hai hình khác nhau ở hai nơi.
 */
const PATHS = {
  // Kỹ năng
  focus: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  speaking: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
  listening: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H5a1 1 0 0 1-1-1zM20 15h-3v5h2a1 1 0 0 0 1-1z',
  reading: 'M4 5.5h6a2 2 0 0 1 2 2V19a2 2 0 0 0-2-2H4zM20 5.5h-6a2 2 0 0 0-2 2V19a2 2 0 0 1 2-2h6z',
  writing: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  gv: 'M3.5 18 8 6h1l4.5 12M5.2 14h6.6M20.5 18v-4.2c0-1.6-1-2.6-2.6-2.6-1 0-1.9.4-2.5 1.1M20.5 14.6c-3 0-4.9.8-4.9 2.1 0 .9.7 1.5 1.8 1.5 1.7 0 3.1-1.2 3.1-3.1',
  // Điều hướng
  home: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
  plus: 'M12 5v14M5 12h14',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  news: 'M4 5h13v14a2 2 0 0 0 2-2V8h1v9a3 3 0 0 1-3 3H5a1 1 0 0 1-1-1zM7 8h7M7 12h7M7 16h4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  clock: 'M12 7.5V12l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  chat: 'M4 5h16v11H9l-5 4z',
  star: 'm12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1',
  zalo: 'M12 4c4.7 0 8.5 3.1 8.5 7s-3.8 7-8.5 7c-1 0-2-.1-2.9-.4L5 19l1-3.3C4.5 14.4 3.5 12.8 3.5 11c0-3.9 3.8-7 8.5-7z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z',
  group: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17.5 14.2A5 5 0 0 1 21 19',
  tools: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  classes: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  logout: 'M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  chevronLeft: 'm15 18-6-6 6-6',
  back: 'M19 12H5M11 18l-6-6 6-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  // Quản trị
  tests: 'M3 4h18v16H3zM7 9h10M7 13h6M7 17h4M15 16l2 2 4-5',
  questions: 'M5 4h14v16H5zM8 8h8M8 12h6M8 16h4',
  import: 'M12 3v12M8 11l4 4 4-4M5 19h14',
  tsets: 'M6 3h9l4 4v14H6zM14 3v5h5M9 14l2 2 4-4',
  scoring: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5 10.5 15 16 9',
  spark: 'M12 3c.5 4.5 4.5 8.5 9 9-4.5.5-8.5 4.5-9 9-.5-4.5-4.5-8.5-9-9 4.5-.5 8.5-4.5 9-9z',
  orders: 'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5',
  transfers: 'M3 5h18v14H3zM3 10h18M7 15h3M15 14l2 2 4-5',
  refunds: 'M4 8h12a4 4 0 0 1 0 8H9M8 4 4 8l4 4',
  pie: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  // Lớp học
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.2 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.8H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
  play: 'M7 4.5v15L19.5 12z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  check: 'M5 12.5 10 17l9-10',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
