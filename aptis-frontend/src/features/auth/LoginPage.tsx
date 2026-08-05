import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';
import { AuthCard } from '@/features/auth/AuthCard';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Đã đăng nhập thì không hiển thị form nữa
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
    }
  };

  return (
    <AuthCard
      title="Chào mừng bạn trở lại"
      subtitle="Đăng nhập để tiếp tục lộ trình luyện thi Aptis của bạn."
    >
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

        <button type="submit" disabled={loading} className="btn-primary min-h-11 w-full">
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          Tạo tài khoản
        </Link>
      </p>
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
      return 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư.';
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
