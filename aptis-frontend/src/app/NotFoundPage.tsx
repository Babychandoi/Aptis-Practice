import { useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * URL không khớp route nào.
 *
 * <p>Trước đây catch-all là `<Navigate to="/" replace />`: gõ sai địa chỉ thì
 * bị đá về trang chủ không một lời giải thích, và link hỏng trong email hay
 * bookmark trông y như bình thường. Nói rõ ra thì người dùng biết là mình vào
 * nhầm chỗ chứ không phải hệ thống nuốt mất nội dung.
 */
export function NotFoundPage() {
  const location = useLocation();

  return (
    <ErrorState
      fullPage
      presentation={{
        title: 'Không tìm thấy trang',
        description: `Địa chỉ "${location.pathname}" không tồn tại. Link có thể đã cũ hoặc bị sao chép thiếu ký tự.`,
        tone: 'info',
        canRetry: false,
        action: { label: 'Về trang chủ', to: '/' },
      }}
    />
  );
}
