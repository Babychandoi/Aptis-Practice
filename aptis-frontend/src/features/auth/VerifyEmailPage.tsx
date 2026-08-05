import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthCard } from '@/features/auth/AuthCard';

type State = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<State>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Liên kết không hợp lệ');

  // StrictMode gọi effect hai lần ở dev; token dùng một lần nên phải chặn
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch((error: unknown) => {
        setState('error');
        setMessage(
          error instanceof ApiError && error.code === 'TOKEN_EXPIRED'
            ? 'Liên kết đã hết hạn hoặc đã được dùng'
            : 'Không xác thực được email',
        );
      });
  }, [token]);

  return (
    <AuthCard title="Xác thực email">
      {state === 'verifying' && <p className="text-sm text-slate-600">Đang xác thực…</p>}

      {state === 'success' && (
        <>
          <p className="text-sm text-slate-600">
            Email đã được xác thực. Bạn có thể đăng nhập ngay.
          </p>
          <Link to="/login" className="btn-primary mt-4 w-full">
            Đăng nhập
          </Link>
        </>
      )}

      {state === 'error' && (
        <>
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
          <Link to="/login" className="btn-secondary mt-4 w-full">
            Về trang đăng nhập
          </Link>
        </>
      )}
    </AuthCard>
  );
}
