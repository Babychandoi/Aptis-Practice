import { useEffect, useRef } from 'react';

/**
 * Ngăn xếp hộp thoại đang mở, cái mở sau cùng nằm cuối.
 *
 * <p>Cần vì hộp thoại có thể lồng nhau — ví dụ đang giao bài thì mở xem trước
 * một đề. Nếu cả hai cùng nghe Escape thì một lần bấm đóng sạch, người dùng mất
 * hết lựa chọn đang làm dở ở hộp bên dưới.
 */
type Handler = { current: () => void };

const dangMo: Handler[] = [];

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  // Chỉ hộp trên cùng đóng; các hộp bên dưới giữ nguyên.
  const tren = dangMo[dangMo.length - 1];
  if (tren) tren.current();
}

/**
 * Gọi {@code onEscape} khi người dùng bấm Escape, nếu đây là hộp thoại trên cùng.
 *
 * <p>Dùng cho hộp thoại tự dựng: bấm ra nền không phải ai cũng nghĩ ra, và khi
 * hộp thoại không đóng được thì lớp phủ chặn hết thao tác phía sau — người dùng
 * tưởng trang bị treo.
 */
export function useEscapeKey(onEscape: () => void) {
  // Giữ hàm trong ref: onEscape thường là hàm mới mỗi lần render, đăng ký lại
  // theo nó sẽ đẩy hộp thoại lên đầu ngăn xếp liên tục và làm loạn thứ tự.
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    // Trình duyệt chỉ cần một listener cho cả ngăn xếp; gắn khi có hộp đầu tiên.
    if (dangMo.length === 0) {
      window.addEventListener('keydown', onKey);
    }
    dangMo.push(handler);

    return () => {
      const viTri = dangMo.lastIndexOf(handler);
      if (viTri >= 0) dangMo.splice(viTri, 1);
      if (dangMo.length === 0) {
        window.removeEventListener('keydown', onKey);
      }
    };
  }, []);
}
