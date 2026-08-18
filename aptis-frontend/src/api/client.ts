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

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors?: { field: string; message: string }[];

  constructor(status: number, payload: ApiErrorResponse) {
    super(payload.message || payload.code);
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
let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
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
    } catch {
      tokenStorage.clear();
      onAuthFailure?.();
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
      } catch {
        tokenStorage.clear();
        onAuthFailure?.();
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
