const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return DATE_FORMATTER.format(new Date(isoString));
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return DATE_TIME_FORMATTER.format(new Date(isoString));
}

/** Backend lưu tiền bằng đồng (BIGINT), không chia 100. */
export function formatCurrency(amount: number, currency = 'VND'): string {
  if (currency === 'VND') {
    return CURRENCY_FORMATTER.format(amount);
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
}

/** mm:ss cho timer, hh:mm:ss khi vượt 1 giờ. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

export function planDurationLabel(durationDays: number | null | undefined): string {
  if (durationDays == null) return 'Trọn đời';
  if (durationDays % 365 === 0) return `${durationDays / 365} năm`;
  if (durationDays % 30 === 0) return `${durationDays / 30} tháng`;
  return `${durationDays} ngày`;
}

/**
 * Khoảng thời gian tính tới hiện tại, dạng "5 phút trước".
 *
 * <p>Dùng cho cột "hoạt động gần nhất" ở trang quản trị: khi cần biết ai vừa
 * còn ở web thì "3 phút trước" trả lời ngay, còn "22/08 22:09" buộc người đọc
 * tự trừ trong đầu.
 *
 * <p>Quá 7 ngày thì đổi sang ngày cụ thể — "23 ngày trước" không còn hữu ích
 * bằng biết đúng hôm nào.
 */
export function relativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Chưa có';

  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return 'Chưa có';

  const diffMs = Date.now() - then;
  // Lệch đồng hồ client/server có thể cho ra số âm nhỏ; coi như vừa xong.
  if (diffMs < 60_000) return 'Vừa xong';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} ngày trước`;

  return formatDate(isoString);
}
