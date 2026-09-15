import { useEffect } from 'react';

/**
 * Gọi {@code onEscape} khi người dùng bấm phím Escape.
 *
 * <p>Dùng cho hộp thoại tự dựng: bấm ra nền không phải ai cũng nghĩ ra, và khi
 * hộp thoại không đóng được thì lớp phủ chặn hết thao tác phía sau — người dùng
 * tưởng trang bị treo.
 */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}
