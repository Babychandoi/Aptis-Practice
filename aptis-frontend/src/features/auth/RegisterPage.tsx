import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';
import { AuthSupportNote } from '@/features/auth/AuthSupportNote';
import { ResendVerificationButton } from '@/features/auth/ResendVerificationButton';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';

export function RegisterPage() {
  const navigate = useNavigate();
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

        {/* Cảnh báo spam đặt ngay đây, không để người dùng tự đoán: thư gửi qua
            Gmail nên hay bị lọc, và người không tìm thấy thư thường nghĩ hệ
            thống lỗi rồi bỏ đi. */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-xs font-semibold text-amber-900">
            Không thấy thư trong hộp thư đến?
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-amber-800">
            <li>• Kiểm tra thư mục <strong>Spam</strong> hoặc <strong>Quảng cáo</strong></li>
            <li>• Tìm với từ khoá <strong>Aptis Practice</strong></li>
            <li>• Thư có thể đến chậm 1–2 phút</li>
          </ul>
          <p className="mt-2 text-[11px] leading-5 text-amber-800">
            Nếu thấy thư trong Spam, bấm <strong>“Không phải spam”</strong> để các thư sau
            vào đúng hộp thư đến.
          </p>
        </div>

        <ResendVerificationButton email={email} />

        <Link to="/login" className="btn-ghost mt-3 w-full">
          Về trang đăng nhập
        </Link>

        <AuthSupportNote message="Vẫn không nhận được email xác thực?" />
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

      <GoogleSignInButton onSuccess={() => navigate('/', { replace: true })} />

      <p className="mt-4 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-brand-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthCard>
  );
}
