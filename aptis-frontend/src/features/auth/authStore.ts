import { create } from 'zustand';
import { authApi } from '@/api/endpoints';
import { tokenStorage } from '@/lib/tokenStorage';
import type { MeResponse } from '@/types/api';

interface AuthState {
  user: MeResponse | null;
  /** true trong lúc khôi phục phiên khi mở lại trang */
  initializing: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  /** Gọi khi mở app: có refresh token thì lấy lại thông tin user */
  restore: () => Promise<void>;
  /** Gọi lại sau khi mua Premium để cập nhật premiumActive */
  refreshUser: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const tokens = await authApi.login({ email, password });
      tokenStorage.setAccessToken(tokens.accessToken, tokens.expiresInSeconds);
      tokenStorage.setRefreshToken(tokens.refreshToken);

      const user = await authApi.me();
      set({ user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async (allDevices = false) => {
    try {
      await authApi.logout({
        refreshToken: tokenStorage.getRefreshToken(),
        allDevices,
      });
    } catch {
      // Thu hồi phía server thất bại vẫn phải xóa token phía client
    } finally {
      tokenStorage.clear();
      set({ user: null });
    }
  },

  restore: async () => {
    if (!tokenStorage.getRefreshToken()) {
      set({ initializing: false });
      return;
    }
    try {
      // Interceptor tự refresh access token trước khi gọi /me
      const user = await authApi.me();
      set({ user, initializing: false });
    } catch {
      tokenStorage.clear();
      set({ user: null, initializing: false });
    }
  },

  refreshUser: async () => {
    const user = await authApi.me();
    set({ user });
  },

  clear: () => {
    tokenStorage.clear();
    set({ user: null });
  },
}));

/** Quyền Premium luôn đọc từ user do backend trả, không suy ra từ token. */
export function useIsPremium(): boolean {
  return useAuthStore((state) => state.user?.premiumActive ?? false);
}
