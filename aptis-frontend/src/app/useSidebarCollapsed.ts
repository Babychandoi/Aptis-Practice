import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aptis.sidebar.collapsed';

/**
 * Trạng thái thu gọn sidebar, nhớ qua các lần tải trang.
 *
 * Đọc localStorage ngay trong hàm khởi tạo useState chứ không trong useEffect:
 * làm ở useEffect thì lần render đầu luôn ra sidebar mở rồi mới co lại, gây
 * nháy layout với người đã chọn thu gọn.
 *
 * localStorage bọc try/catch vì trình duyệt ở chế độ riêng tư hoặc chặn cookie
 * có thể throw khi truy cập — mất trạng thái thu gọn thì chấp nhận được, nhưng
 * làm sập cả layout thì không.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Không lưu được thì vẫn dùng bình thường trong phiên hiện tại.
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((value) => !value), []);

  return { collapsed, toggle };
}
