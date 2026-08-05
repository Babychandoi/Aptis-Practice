/**
 * Lưu token phía client.
 *
 * Access token giữ trong memory để không bị đọc qua XSS từ localStorage.
 * Refresh token buộc phải bền qua reload nên vẫn nằm ở localStorage — đây là
 * đánh đổi đã biết. Khi backend chuyển sang cookie HttpOnly cho refresh token
 * (khuyến nghị ở §30) thì bỏ phần refresh ở đây đi.
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

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clear(): void {
    accessToken = null;
    accessTokenExpiresAt = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
