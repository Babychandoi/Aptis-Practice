import {
  SUPPORT_FACEBOOK_URL,
  SUPPORT_ZALO_PHONE_DISPLAY,
  SUPPORT_ZALO_URL,
} from '@/lib/support';

/**
 * Kênh liên hệ cho người CHƯA đăng nhập được.
 *
 * <p>Sidebar và trang hồ sơ đều nằm sau đăng nhập, nên người mắc ở bước xác
 * thực email hoặc quên mật khẩu không có đường nào tìm hỗ trợ. Đặt ngay trên
 * các trang auth để họ liên hệ được từ đúng lúc gặp khó.
 */
export function AuthSupportNote({
  message = 'Gặp khó khi đăng nhập hoặc xác thực email?',
}: {
  message?: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-paper p-3.5">
      <p className="text-xs font-semibold text-slate-800">{message}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        Liên hệ hỗ trợ kỹ thuật để được xử lý trực tiếp:
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <a
          href={SUPPORT_ZALO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-800 transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          Zalo {SUPPORT_ZALO_PHONE_DISPLAY}
        </a>
        <a
          href={SUPPORT_FACEBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          Trang hỗ trợ Facebook
        </a>
      </div>
    </div>
  );
}
