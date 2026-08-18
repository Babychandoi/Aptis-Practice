/**
 * Lưu token phía client.
 *
 * Access token giữ trong memory để không bị đọc qua XSS từ localStorage.
 * Refresh token nằm trong cookie HttpOnly. Khoá localStorage dưới đây chỉ được
 * giữ tạm để chuyển tiếp phiên cũ rồi xoá ngay sau lần refresh thành công.
 */

const REFRESH_TOKEN_KEY = 'aptis.refreshToken';

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  /** Còn hạn ít hơn 30 giây thì coi như đã hết để chủ động refresh trước. */
  isAccessTokenFresh(): boolean {
    if (!accessToken || accessTokenExpiresAt === null) return false;
    return accessTokenExpiresAt - Date.now() > 30_000;
  },

  setAccessToken(token: string, expiresInSeconds: number): void {
    accessToken = token;
    accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  },

  getLegacyRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  clearLegacyRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  clear(): void {
    accessToken = null;
    accessTokenExpiresAt = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
