import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      // Luôn hiện thông báo giống nhau: không tiết lộ email nào đã đăng ký
      setLoading(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AuthCard title="Đã gửi yêu cầu">
        <p className="text-sm text-slate-600">
          Nếu <strong>{email}</strong> có tài khoản, bạn sẽ nhận được liên kết đặt lại mật
          khẩu trong vài phút.
        </p>
        <Link to="/login" className="btn-secondary mt-4 w-full">
          Về trang đăng nhập
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Đang gửi…' : 'Gửi liên kết'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthCard>
  );
}
