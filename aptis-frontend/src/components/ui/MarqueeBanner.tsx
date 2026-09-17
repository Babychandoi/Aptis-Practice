import { Link } from 'react-router-dom';

/**
 * Dải chữ chạy ngang dưới header, kiểu bảng tin báo.
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
}: {
  text: string;
  /** Có đường dẫn thì cả dải bấm được. */
  to?: string;
  ctaLabel?: string;
}) {
  const noiDung = (
    <span className="mx-8 inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true">📣</span>
      <span>{text}</span>
      {ctaLabel && (
        <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
          {ctaLabel}
        </span>
      )}
    </span>
  );

  const dai = (
    <div className="group relative overflow-hidden bg-gradient-to-r from-brand-700 to-brand-600 py-1.5 text-xs font-semibold text-white">
      {/* aria-hidden ở bản nhân đôi: trình đọc màn hình chỉ đọc một lần. */}
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {noiDung}
        <span aria-hidden="true" className="contents">
          {noiDung}
        </span>
      </div>
    </div>
  );

  if (!to) return dai;

  return (
    <Link to={to} className="block transition-opacity hover:opacity-95">
      {dai}
    </Link>
  );
}
