import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';
import { AuthCard } from '@/features/auth/AuthCard';
import { AuthSupportNote } from '@/features/auth/AuthSupportNote';
import { ResendVerificationButton } from '@/features/auth/ResendVerificationButton';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Bị đẩy ra vì tài khoản đăng nhập ở nơi khác: nói rõ để họ không nghĩ hệ
  // thống lỗi, và biết là tài khoản có thể đang bị người khác dùng.
  const authFailure = (location.state as { authFailure?: string } | null)?.authFailure;
  const replacedNotice = authFailure === 'SESSION_REPLACED';

  // Đã đăng nhập thì không hiển thị form nữa
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);

    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
      // Chỉ hiện nút gửi lại khi đúng nguyên nhân là chưa xác thực email —
      // hiện với mọi lỗi (sai mật khẩu, tài khoản khoá) chỉ gây nhầm.
      setNeedsVerification(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
    }
  };

  return (
    <AuthCard
      title="Chào mừng bạn trở lại"
      subtitle="Đăng nhập để tiếp tục lộ trình luyện thi Aptis của bạn."
    >
      {replacedNotice && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-xs font-semibold text-amber-900">
            Phiên của bạn đã kết thúc
          </p>
          <p className="mt-1 text-[11px] leading-5 text-amber-800">
            Tài khoản này vừa được đăng nhập ở thiết bị khác. Mỗi tài khoản chỉ dùng
            được trên một thiết bị cùng lúc — đăng nhập lại để tiếp tục. Nếu không
            phải bạn, hãy đổi mật khẩu ngay.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ban@example.com"
            className="input min-h-11 bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-4">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            className="input min-h-11 bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-lg bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

        {/* Đây là lúc người dùng đang bế tắc: biết mình chưa xác thực nhưng thư
            thì không còn. Đưa nút gửi lại ngay dưới thông báo lỗi, dùng luôn
            email họ vừa nhập. */}
        {needsVerification && <ResendVerificationButton email={email} />}

        <button type="submit" disabled={loading} className="btn-primary min-h-11 w-full">
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <GoogleSignInButton onSuccess={() => navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })} />

      <p className="mt-7 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          Tạo tài khoản
        </Link>
      </p>

      <AuthSupportNote />
    </AuthCard>
  );
}

/** Map mã lỗi backend sang thông báo tiếng Việt. */
function describeLoginError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Không đăng nhập được, vui lòng thử lại';
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu không đúng';
    case 'EMAIL_NOT_VERIFIED':
      // Nhắc Spam ngay trong thông báo lỗi: đây là lúc người dùng đang thắc mắc
      // vì sao không vào được, không phải lúc để họ tự đi tìm.
      return 'Email chưa được xác thực. Kiểm tra hộp thư và cả thư mục Spam để tìm liên kết xác thực.';
    case 'ACCOUNT_LOCKED':
      return 'Tài khoản đang bị khóa tạm thời do đăng nhập sai nhiều lần';
    case 'ACCOUNT_SUSPENDED':
      return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.';
    case 'NETWORK_ERROR':
      return 'Không kết nối được tới máy chủ';
    default:
      return error.message;
  }
}
