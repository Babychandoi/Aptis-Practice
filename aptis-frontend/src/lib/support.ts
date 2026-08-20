/**
 * Kênh hỗ trợ và cộng đồng.
 *
 * Gom vào một chỗ vì cùng bộ link này xuất hiện ở sidebar, trang gói và trang
 * lỗi — sửa số Zalo hay đổi link nhóm chỉ phải sửa ở đây.
 */

/** Số Zalo hỗ trợ. Giữ dạng có nhóm số cho dễ đọc khi hiển thị. */
export const SUPPORT_ZALO_PHONE = '0868490940';
export const SUPPORT_ZALO_PHONE_DISPLAY = '086 849 0940';

/**
 * zalo.me nhận số không dấu cách. Mở được cả trên app điện thoại và Zalo Web,
 * nên không cần tách link riêng cho mobile.
 */
export const SUPPORT_ZALO_URL = `https://zalo.me/${SUPPORT_ZALO_PHONE}`;

/** Trang Facebook hỗ trợ. */
export const SUPPORT_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61593145937681';

/** Nhóm Facebook trao đổi học tập. */
export const COMMUNITY_FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/978429121925414';

export type SupportChannel = {
  label: string;
  description: string;
  href: string;
};

/**
 * Thứ tự theo mức độ được trả lời nhanh: Zalo nhanh nhất, nhóm là nơi hỏi
 * chung nên chậm nhất.
 */
export const SUPPORT_CHANNELS: SupportChannel[] = [
  {
    label: 'Zalo hỗ trợ',
    description: SUPPORT_ZALO_PHONE_DISPLAY,
    href: SUPPORT_ZALO_URL,
  },
  {
    label: 'Trang hỗ trợ Facebook',
    description: 'Nhắn tin khi cần trợ giúp',
    href: SUPPORT_FACEBOOK_URL,
  },
  {
    label: 'Nhóm trao đổi học tập',
    description: 'Tham gia cộng đồng luyện thi',
    href: COMMUNITY_FACEBOOK_GROUP_URL,
  },
];
