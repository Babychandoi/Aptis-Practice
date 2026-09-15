import { api } from '@/api/client';

/**
 * Gửi lượt xem trang về máy chủ.
 *
 * <p>Mục đích: biết học viên quan tâm gì — trang nào hay vào, bao nhiêu người
 * ghé trang nâng cấp gói mà không mua.
 *
 * <p>Mọi lỗi đều nuốt: thống kê hỏng thì mất số liệu, tuyệt đối không được làm
 * gián đoạn việc học.
 */

/** Khóa trang, phải khớp danh sách trắng ở backend. */
export type PageKey =
  | 'dashboard'
  | 'plans'
  | 'checkout'
  | 'affiliate'
  | 'exam-prediction'
  | 'news-feed'
  | 'news-post'
  | 'study-tips'
  | 'content-update'
  | 'mock-tests'
  | 'skill-list'
  | 'component'
  | 'component-parts'
  | 'component-tests'
  | 'part'
  | 'attempt'
  | 'attempt-result'
  | 'history'
  | 'profile';

/**
 * Suy khóa trang từ đường dẫn.
 *
 * <p>Dùng khóa ổn định chứ không dùng URL thô: URL chứa id và slug thay đổi
 * liên tục, gom nhóm theo URL sẽ ra hàng trăm dòng rời rạc không đọc được.
 *
 * <p>Thứ tự kiểm QUAN TRỌNG: đường dẫn cụ thể phải đứng trước đường dẫn bao,
 * vì "/luyen-tap/doc/part-1" cũng khớp tiền tố "/luyen-tap".
 */
export function resolvePageKey(pathname: string): PageKey | null {
  if (pathname === '/') return 'dashboard';
  if (pathname === '/plans') return 'plans';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname === '/gioi-thieu') return 'affiliate';
  if (pathname === '/du-doan-de') return 'exam-prediction';
  if (pathname === '/bang-tin') return 'news-feed';
  if (pathname.startsWith('/bang-tin/')) return 'news-post';
  if (pathname.startsWith('/meo-hoc')) return 'study-tips';
  if (pathname === '/cap-nhat-de') return 'content-update';
  if (pathname === '/mock-tests') return 'mock-tests';
  if (pathname === '/history') return 'history';
  if (pathname === '/profile') return 'profile';

  if (pathname.startsWith('/attempts/')) {
    return pathname.endsWith('/result') ? 'attempt-result' : 'attempt';
  }

  if (pathname === '/luyen-tap') return 'skill-list';
  if (pathname.startsWith('/luyen-tap/')) {
    if (pathname.endsWith('/theo-part')) return 'component-parts';
    if (pathname.includes('/bai-test')) return 'component-tests';
    // "/luyen-tap/doc" là trang kỹ năng, "/luyen-tap/doc/part-1" là trang Part.
    return pathname.split('/').filter(Boolean).length > 2 ? 'part' : 'component';
  }

  // Trang không nằm trong danh sách theo dõi (đăng nhập, quản trị…).
  return null;
}

/**
 * Id phiên, để nhóm các lượt xem của cùng một lần mở trình duyệt.
 *
 * <p>Dùng sessionStorage chứ không localStorage: đóng tab là kết thúc phiên,
 * đúng với ý nghĩa "một lần vào học".
 */
function sessionId(): string | undefined {
  try {
    const KEY = 'aptis.analytics.session';
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư) — vẫn gửi được, chỉ mất
    // khả năng nhóm theo phiên.
    return undefined;
  }
}

/** Gửi một lượt xem. Không bao giờ ném lỗi ra ngoài. */
export function trackPageView(input: {
  pageKey: PageKey;
  path: string;
  referrerKey?: PageKey | null;
  durationMs?: number;
}): void {
  void api
    .post('/analytics/page-views', {
      pageKey: input.pageKey,
      path: input.path.slice(0, 500),
      referrerKey: input.referrerKey ?? undefined,
      sessionId: sessionId(),
      durationMs: input.durationMs,
    })
    .catch(() => {
      // Im lặng: học viên không cần biết, và thử lại cũng không đáng.
    });
}

/**
 * Gửi lượt xem khi trang sắp bị đóng.
 *
 * <p>Dùng {@link navigator.sendBeacon}: trình duyệt vẫn gửi request kể cả khi
 * tab đã đóng, còn fetch/XHR thường thì bị hủy giữa chừng.
 *
 * <p>sendBeacon không gắn được header Authorization, nên lượt xem này về máy
 * chủ dưới dạng ẩn danh. Chấp nhận được: tổng lượt xem trang vẫn đúng, chỉ
 * không quy được cho người cụ thể — mà phần lớn lượt chuyển trang đi qua nhánh
 * cleanup có đủ token.
 */
export function trackPageViewOnUnload(input: {
  pageKey: PageKey;
  path: string;
  referrerKey?: PageKey | null;
  durationMs?: number;
}): void {
  try {
    if (typeof navigator.sendBeacon !== 'function') {
      return;
    }
    const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
    const body = JSON.stringify({
      pageKey: input.pageKey,
      path: input.path.slice(0, 500),
      referrerKey: input.referrerKey ?? undefined,
      sessionId: sessionId(),
      durationMs: input.durationMs,
    });
    navigator.sendBeacon(
      `${base}/analytics/page-views`,
      new Blob([body], { type: 'application/json' }),
    );
  } catch {
    // Trình duyệt chặn hoặc quota đầy — bỏ qua.
  }
}
