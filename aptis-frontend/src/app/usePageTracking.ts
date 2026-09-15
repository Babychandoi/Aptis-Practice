import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageKey, trackPageView, trackPageViewOnUnload, type PageKey } from '@/lib/pageTracking';

/**
 * Gửi lượt xem mỗi khi đổi trang.
 *
 * <p>Gắn một lần ở layout chứ không rải vào từng trang: thêm trang mới là tự
 * có thống kê, không ai phải nhớ chèn lời gọi.
 */
export function usePageTracking(): void {
  const location = useLocation();

  // Trang trước đó, để biết học viên đến từ đâu.
  const previousKey = useRef<PageKey | null>(null);

  useEffect(() => {
    const pageKey = resolvePageKey(location.pathname);
    if (!pageKey) {
      return;
    }

    const referrerKey = previousKey.current;
    const path = location.pathname + location.search;
    const enteredAt = Date.now();
    previousKey.current = pageKey;

    // Gửi MỘT bản ghi duy nhất khi rời trang, kèm luôn thời gian ở lại — ghi cả
    // lúc vào lẫn lúc ra sẽ đếm mỗi trang thành hai lượt.
    //
    // Hai đường rời trang cần hai cách gửi khác nhau:
    // - Điều hướng trong ứng dụng: cleanup của effect chạy, gửi bằng XHR thường.
    // - Đóng tab hoặc chuyển tab: cleanup KHÔNG chạy, phải dùng sendBeacon ở
    //   visibilitychange. Bỏ qua nhánh này sẽ mất hẳn nhóm "xem trang giá rồi
    //   đóng luôn" — đúng nhóm cần đo nhất.
    //
    // Cờ dùng chung để một lượt xem không bị ghi hai lần khi cả hai cùng xảy ra.
    const sent = { done: false };
    const onHide = () => {
      if (sent.done || document.visibilityState !== 'hidden') return;
      sent.done = true;
      trackPageViewOnUnload({
        pageKey,
        path,
        referrerKey,
        durationMs: Date.now() - enteredAt,
      });
    };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (sent.done) return;
      sent.done = true;
      trackPageView({ pageKey, path, referrerKey, durationMs: Date.now() - enteredAt });
    };
  }, [location.pathname, location.search]);
}
