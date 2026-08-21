import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/features/auth/authStore';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Nút "Đăng nhập bằng Google" dùng Google Identity Services.
 *
 * <p>Google render nút bằng script của họ, nên phải nạp script rồi gọi
 * {@code renderButton} vào một div trống — không tự vẽ nút được (chính sách
 * thương hiệu của Google, và nút của họ tự lo đa ngôn ngữ, One Tap).
 *
 * <p>Client ID lấy từ API chứ không nhúng lúc build: đổi Client ID chỉ cần sửa
 * .env và khởi động lại backend. Chưa cấu hình thì component không hiện gì —
 * hiện nút bấm vào là lỗi thì tệ hơn không có nút.
 */
export function GoogleSignInButton({ onSuccess }: { onSuccess?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [error, setError] = useState<string | null>(null);

  // onSuccess thường là arrow function viết inline ở chỗ gọi, nên nó là tham
  // chiếu MỚI sau mỗi lần render. Đưa vào deps của useEffect thì effect chạy
  // lại và Google vẽ thêm một nút nữa — đã gặp đúng lỗi hai nút trùng nhau.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const configQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: authApi.config,
    // Client ID gần như không đổi; hỏi lại mỗi lần vào trang đăng nhập là vô ích.
    staleTime: 60 * 60_000,
    retry: 1,
  });

  const clientId = configQuery.data?.googleClientId;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    let cancelled = false;

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) return;
      setError(null);
      try {
        await loginWithGoogle(response.credential);
        onSuccessRef.current?.();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Không đăng nhập được bằng Google, thử lại sau',
        );
      }
    };

    const render = () => {
      const google = (window as unknown as { google?: GoogleIdentity }).google;
      if (cancelled || !google?.accounts?.id || !containerRef.current) return;

      // Dọn trước khi vẽ: React 18 StrictMode chạy effect hai lần ở dev, và
      // container còn nút cũ thì Google thêm nút thứ hai chứ không thay.
      containerRef.current.innerHTML = '';

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => void handleCredential(response),
      });
      google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        locale: 'vi',
        width: 320,
      });
    };

    // Script có thể đã nạp từ lần vào trang trước (SPA không tải lại trang).
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      if ((window as unknown as { google?: GoogleIdentity }).google?.accounts?.id) {
        render();
      } else {
        existing.addEventListener('load', render, { once: true });
      }
    } else {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', render, { once: true });
      script.addEventListener('error', () => {
        if (!cancelled) setError('Không tải được Google. Kiểm tra kết nối mạng.');
      });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [clientId, loginWithGoogle]);

  // Chưa cấu hình Client ID: không hiện gì cả.
  if (!clientId) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          hoặc
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 flex justify-center">
        <div ref={containerRef} />
      </div>

      <p className="mt-2.5 text-center text-[11px] leading-5 text-slate-500">
        Đăng nhập bằng Google không cần xác thực email.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-center text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Phần API của Google Identity Services mà component này dùng. */
type GoogleIdentity = {
  accounts?: {
    id?: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>,
      ) => void;
    };
  };
};
