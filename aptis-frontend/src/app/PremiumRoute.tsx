import type { ReactNode } from 'react';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { useIsPremium } from '@/features/auth/authStore';

/**
 * Bọc các route chỉ dành cho Premium.
 *
 * Hiện {@link PremiumGate} thay vì điều hướng đi: giữ nguyên URL để học viên
 * thấy mình đang ở đâu và mở được bằng cách nào, thay vì bị đẩy về trang khác
 * mà không hiểu vì sao.
 *
 * Đây là lớp giao diện. Với nội dung lấy từ API, backend vẫn phải tự chặn —
 * không dựa vào component này (§42).
 */
export function PremiumRoute({
  children,
  message,
}: {
  children: ReactNode;
  message?: string;
}) {
  const isPremium = useIsPremium();

  if (!isPremium) {
    return (
      <div className="space-y-5">
        <PremiumGate message={message} />
      </div>
    );
  }

  return <>{children}</>;
}
