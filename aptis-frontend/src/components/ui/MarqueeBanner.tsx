import { Link } from 'react-router-dom';
import { Icon } from '@/components/shell/icons';

/**
 * Dải tin chạy ngang dưới header, nền mực như trong mock.
 *
 * <p>Dùng để loan một tin duy nhất đang muốn nhiều người biết. Chạy hai bản nội
 * dung nối nhau rồi dịch đúng một nửa, nên vòng lặp không có khoảng trống.
 *
 * <p>Dừng khi rê chuột để đọc kịp, và đứng yên hẳn với người bật "giảm chuyển
 * động" trong hệ điều hành — chữ trôi liên tục gây khó chịu cho một số người.
 */
export function MarqueeBanner({
  text,
  to,
  ctaLabel,
  onClose,
}: {
  text: string;
  /** Có đường dẫn thì cả dải bấm được. */
  to?: string;
  ctaLabel?: string;
  /** Có thì hiện nút đóng ở mép phải. */
  onClose?: () => void;
}) {
  const noiDung = (
    <span className="mx-6 inline-flex items-center gap-2.5 whitespace-nowrap">
      <span className="rounded bg-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ink">Mới</span>
      <span>{text}</span>
      {ctaLabel && (
        <span className="rounded bg-white/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]">
          {ctaLabel}
        </span>
      )}
    </span>
  );

  const chay = (
    <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
      {noiDung}
      {/* aria-hidden ở bản nhân đôi: trình đọc màn hình chỉ đọc một lần. */}
      <span aria-hidden="true" className="contents">
        {noiDung}
      </span>
    </div>
  );

  return (
    <div className="group relative flex h-[38px] items-center overflow-hidden bg-ink text-xs font-medium text-white">
      {to ? (
        <Link to={to} className="block min-w-0 flex-1 overflow-hidden">{chay}</Link>
      ) : (
        <div className="min-w-0 flex-1 overflow-hidden">{chay}</div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="grid h-full w-10 shrink-0 place-items-center bg-ink text-white/70 hover:text-white"
          aria-label="Ẩn dải thông báo"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
