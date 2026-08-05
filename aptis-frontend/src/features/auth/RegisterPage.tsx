import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({ email, password, fullName: fullName || undefined });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_ALREADY_USED') {
        setError('Email này đã được sử dụng');
      } else {
        setError(err instanceof ApiError ? err.message : 'Không tạo được tài khoản');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthCard title="Kiểm tra hộp thư" subtitle="Chỉ còn một bước nữa">
        <p className="text-sm text-slate-600">
          Chúng tôi đã gửi liên kết xác thực tới <strong>{email}</strong>. Mở liên kết đó để
          kích hoạt tài khoản.
        </p>
        <Link to="/login" className="btn-secondary mt-4 w-full">
          Về trang đăng nhập
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Tạo tài khoản" subtitle="Bắt đầu với các bài học miễn phí">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="label">
            Họ và tên
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Tối thiểu 8 ký tự</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Nhập lại mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Đang tạo…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-brand-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthCard>
  );
}
