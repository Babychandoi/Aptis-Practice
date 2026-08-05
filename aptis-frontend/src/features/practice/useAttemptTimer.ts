import { useEffect, useState } from 'react';

/**
 * Đếm ngược tới thời điểm hết hạn do backend cấp.
 *
 * <p>Tính theo mốc thời gian tuyệt đối chứ không trừ dần từng giây, nên tab bị
 * treo hay máy sleep thì đồng hồ vẫn đúng khi quay lại.
 */
export function useAttemptTimer(
  expiresAt: string | null,
  onExpire: () => void,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    expiresAt ? computeSecondsLeft(expiresAt) : null,
  );

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = computeSecondsLeft(expiresAt);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        onExpire();
      }
    };

    const interval = window.setInterval(tick, 1000);
    tick();

    return () => window.clearInterval(interval);
  }, [expiresAt, onExpire]);

  return secondsLeft;
}

function computeSecondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
