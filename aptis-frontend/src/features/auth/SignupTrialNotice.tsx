import { Link } from 'react-router-dom';
import type { MeResponse } from '@/types/api';

export function SignupTrialNotice({ user }: { user: Pick<MeResponse, 'premiumActive' | 'signupTrialStatus'> | null }) {
  if (!user || user.premiumActive || !['BROWSER_USED', 'BROWSER_UNAVAILABLE'].includes(user.signupTrialStatus ?? '')) return null;
  return (
    <aside role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">{user.signupTrialStatus === 'BROWSER_USED' ? 'Trình duyệt này đã nhận lượt dùng thử miễn phí' : 'Chưa xác định được mã trình duyệt để cấp dùng thử'}</p>
      <p className="mt-1 text-xs leading-5">
        {user.signupTrialStatus === 'BROWSER_USED'
          ? 'Mỗi mã trình duyệt chỉ nhận dùng thử cho một tài khoản. Tạo thêm tài khoản không cấp lại thời gian miễn phí. Nếu bạn dùng chung máy, hãy liên hệ hỗ trợ để được kiểm tra.'
          : 'Bạn vẫn có thể đăng nhập và mua gói. Hãy cho phép cookie, đăng nhập lại hoặc liên hệ hỗ trợ để kiểm tra quyền dùng thử.'}
        {' '}<Link to="/plans" className="font-semibold underline">Xem gói Premium</Link>.
      </p>
    </aside>
  );
}
