import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthCard title="Liên kết không hợp lệ">
        <p className="text-sm text-slate-600">Liên kết đặt lại mật khẩu thiếu token.</p>
        <Link to="/forgot-password" className="btn-secondary mt-4 w-full">
          Yêu cầu liên kết mới
        </Link>
      </AuthCard>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      // Backend đã thu hồi mọi phiên cũ, người dùng phải đăng nhập lại
      navigate('/login', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'TOKEN_EXPIRED'
          ? 'Liên kết đã hết hạn hoặc đã được dùng'
          : 'Không đặt lại được mật khẩu',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Đặt lại mật khẩu">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="label">
            Mật khẩu mới
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
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
          {loading ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    </AuthCard>
  );
}
