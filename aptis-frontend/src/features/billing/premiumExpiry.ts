/**
 * Tính thời hạn còn lại của gói Premium.
 *
 * <p>Đếm theo NGÀY LỊCH chứ không theo số giờ chia 24: gói hết hạn 23:00 hôm
 * nay thì học viên nghĩ là "hết hôm nay", còn chia giờ sẽ ra 0 ngày và hiện
 * "hết hạn hôm nay" trong khi vẫn còn dùng được — hoặc ngược lại, hết hạn
 * 01:00 sáng mai mà báo còn 1 ngày thì họ tưởng còn cả ngày mai.
 */

export type PremiumExpiry = {
  /** Số ngày lịch còn lại; 0 nghĩa là hết hạn trong hôm nay. */
  daysLeft: number;
  /** Nên nhắc gia hạn: còn ít ngày hoặc đã quá hạn. */
  expiringSoon: boolean;
  /** Câu hiển thị cho người dùng. */
  label: string;
};

/** Dưới ngưỡng này thì nhắc gia hạn. */
const WARN_DAYS = 7;

export function describePremiumExpiry(endsAt: string | null | undefined): PremiumExpiry | null {
  // null = gói trọn đời: không có gì để đếm, cũng không cần nhắc gia hạn.
  if (!endsAt) return null;

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;

  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round((startOfDay(end) - startOfDay(new Date())) / MS_PER_DAY);

  if (daysLeft < 0) {
    return { daysLeft, expiringSoon: true, label: 'Gói đã hết hạn' };
  }
  if (daysLeft === 0) {
    return { daysLeft, expiringSoon: true, label: 'Hết hạn hôm nay' };
  }
  if (daysLeft === 1) {
    return { daysLeft, expiringSoon: true, label: 'Còn 1 ngày' };
  }

  return {
    daysLeft,
    expiringSoon: daysLeft <= WARN_DAYS,
    label: `Còn ${daysLeft} ngày`,
  };
}
