import { useState } from 'react';
import { authApi } from '@/api/endpoints';

/**
 * Nút gửi lại email xác thực.
 *
 * <p>Khi không biết trước email (ví dụ ở trang xác thực với liên kết hết hạn),
 * component tự hiện ô nhập.
 *
 * <p>Backend luôn trả 202 kể cả khi email không tồn tại hoặc đã xác thực rồi,
 * nên thông báo thành công phải viết theo kiểu "nếu tài khoản chưa xác thực" —
 * nói chắc "đã gửi" là tiết lộ email đó có tồn tại.
 */
export function ResendVerificationButton({
  email: knownEmail,
  label = 'Gửi lại email xác thực',
}: {
  email?: string;
  label?: string;
}) {
  const [email, setEmail] = useState(knownEmail ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const needsInput = !knownEmail;

  const handleSend = async () => {
    if (!email.trim()) return;

    setState('sending');
    try {
      await authApi.resendVerification(email.trim());
      setState('sent');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
        <p className="text-xs font-semibold text-emerald-900">Đã xử lý yêu cầu</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-800">
          Nếu tài khoản <strong>{email.trim()}</strong> chưa xác thực, một email mới đang
          được gửi tới. Kiểm tra cả thư mục <strong>Spam</strong> — liên kết cũ sẽ không
          còn dùng được nữa.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {needsInput && (
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Nhập email đã đăng ký"
          className="input mb-2 min-h-11 bg-white"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      )}

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={state === 'sending' || !email.trim()}
        className="btn-secondary min-h-11 w-full"
      >
        {state === 'sending' ? 'Đang gửi…' : label}
      </button>

      {state === 'error' && (
        <p role="alert" className="mt-2 text-xs leading-5 text-red-700">
          Không gửi được lúc này. Thử lại sau hoặc nhắn Zalo hỗ trợ bên dưới.
        </p>
      )}
    </div>
  );
}
