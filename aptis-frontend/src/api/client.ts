import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStorage } from '@/lib/tokenStorage';
import type { ApiErrorResponse, TokenResponse } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Endpoint không cần token và không được retry sau refresh. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/**
 * Tên trường tiếng Việt để ghép vào thông báo lỗi.
 *
 * Backend trả tên trường theo đúng tên thuộc tính Java (`password`,
 * `classroomName`). Hiện nguyên vậy thì người dùng phải tự đoán ô nào trên màn
 * hình — nhất là ở khu quản trị, nơi một form có cả chục ô.
 *
 * Trường nào chưa có ở đây thì hiện nguyên tên gốc: thiếu tên đẹp vẫn tốt hơn
 * giấu luôn lỗi.
 */
const TEN_TRUONG: Record<string, string> = {
  email: 'Email',
  password: 'Mật khẩu',
  newPassword: 'Mật khẩu mới',
  currentPassword: 'Mật khẩu hiện tại',
  fullName: 'Họ tên',
  displayName: 'Tên hiển thị',
  phone: 'Số điện thoại',
  title: 'Tiêu đề',
  content: 'Nội dung',
  name: 'Tên',
  description: 'Mô tả',
  classroomName: 'Tên lớp',
  joinCode: 'Mã lớp',
  planCode: 'Mã gói',
  code: 'Mã',
  priceAmount: 'Giá',
  maxStudents: 'Số học viên tối đa',
  commissionPercent: 'Hoa hồng (%)',
  discountPercent: 'Giảm giá (%)',
  rateNote: 'Ghi chú',
  platformFeePercent: 'Phí nền tảng (%)',
  minPayoutAmount: 'Số tiền rút tối thiểu',
  holdDays: 'Số ngày giữ',
  bankName: 'Tên ngân hàng',
  bankAccountNumber: 'Số tài khoản',
  bankAccountName: 'Tên chủ tài khoản',
  note: 'Ghi chú',
  adminNote: 'Ghi chú của quản trị',
  linkUrl: 'Đường dẫn',
  materialType: 'Loại tài liệu',
  dueAt: 'Hạn nộp',
  questionSetIds: 'Đề được chọn',
  instructions: 'Hướng dẫn',
};

/**
 * Ghép thông báo lỗi thành câu người dùng hiểu được.
 *
 * Backend trả `message` chung ("Dữ liệu không hợp lệ") kèm `fieldErrors` nói rõ
 * ô nào sai. Chỉ lấy `message` là vứt mất phần hữu ích duy nhất — người dùng
 * thấy "Dữ liệu không hợp lệ" mà không biết phải sửa ở đâu.
 */
function buildMessage(payload: ApiErrorResponse): string {
  const chung = payload.message || payload.code;
  const fields = payload.fieldErrors;
  if (!fields || fields.length === 0) {
    return chung;
  }

  const chiTiet = fields
    .map((loi) => `${TEN_TRUONG[loi.field] ?? loi.field}: ${loi.message}`)
    .join('; ');

  return `${chung} — ${chiTiet}`;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors?: { field: string; message: string }[];

  constructor(status: number, payload: ApiErrorResponse) {
    super(buildMessage(payload));
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
    this.fieldErrors = payload.fieldErrors;
  }

  get isPremiumRequired(): boolean {
    return this.code === 'PREMIUM_REQUIRED';
  }

  get isUnauthenticated(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.code === 'TOKEN_INVALID';
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30_000,
});

/** Refresh đang chạy — request khác chờ chung thay vì gọi refresh nhiều lần. */
let refreshPromise: Promise<string> | null = null;

/** Đăng ký từ AuthProvider để chuyển về trang đăng nhập khi refresh thất bại. */
let onAuthFailure: ((reason?: string) => void) | null = null;

export function setAuthFailureHandler(handler: (reason?: string) => void): void {
  onAuthFailure = handler;
}

/**
 * Mã lỗi từ phản hồi refresh thất bại, để trang đăng nhập nói đúng lý do —
 * bị đẩy ra vì đăng nhập nơi khác khác hẳn với hết phiên thường.
 */
function authFailureReason(error: unknown): string | undefined {
  const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

function isPublicPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_PATHS.some((path) => url.includes(path));
}

async function refreshAccessToken(): Promise<string> {
  const legacyRefreshToken = tokenStorage.getLegacyRefreshToken();

  // Dùng axios gốc để interceptor không bắt lại request refresh
  const response = await axios.post<TokenResponse>(
    `${BASE_URL}/auth/refresh`,
    legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      withCredentials: true,
    },
  );

  const data = response.data;
  tokenStorage.setAccessToken(data.accessToken, data.expiresInSeconds);
  tokenStorage.clearLegacyRefreshToken();
  return data.accessToken;
}

/** Khôi phục phiên từ refresh cookie khi tải lại ứng dụng. */
export async function restoreAccessToken(): Promise<void> {
  await refreshAccessToken();
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isPublicPath(config.url)) {
    return config;
  }

  // Refresh chủ động trước khi token hết hạn, tránh vòng 401 -> retry
  if (tokenStorage.getAccessToken() && !tokenStorage.isAccessTokenFresh()) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    try {
      await refreshPromise;
    } catch (refreshError) {
      tokenStorage.clear();
      onAuthFailure?.(authFailureReason(refreshError));
    }
  }

  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    // 401 dù đã refresh chủ động: thử refresh một lần rồi gọi lại
    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !isPublicPath(config.url)
    ) {
      config._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      } catch (refreshError) {
        tokenStorage.clear();
        onAuthFailure?.(authFailureReason(refreshError));
      }
    }

    if (error.response?.data?.code) {
      throw new ApiError(error.response.status, error.response.data);
    }

    // Lỗi mạng hoặc timeout: không có body chuẩn từ backend
    throw new ApiError(error.response?.status ?? 0, {
      code: 'NETWORK_ERROR',
      message: 'Không kết nối được tới máy chủ',
      timestamp: new Date().toISOString(),
    });
  },
);
