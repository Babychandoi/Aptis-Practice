import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';
import { AuthSupportNote } from '@/features/auth/AuthSupportNote';

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
        <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Không thấy thư? Kiểm tra thư mục <strong>Spam</strong> hoặc{' '}
          <strong>Quảng cáo</strong>. Liên kết có hiệu lực trong 1 giờ.
        </p>
        <Link to="/login" className="btn-secondary mt-4 w-full">
          Về trang đăng nhập
        </Link>

        <AuthSupportNote message="Không nhận được email đặt lại mật khẩu?" />
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
