// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserAbusePanel } from './UserAbusePanel';
vi.mock('@/api/client', () => ({ api: { get: vi.fn() } }));
import { api } from '@/api/client';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('admin trial abuse evidence', () => {
  it('loads only after expansion and distinguishes shared network from browser evidence', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { limitedEvents24h: 1, browserGroups: [], ipGroups: [{ reference: 'N-test', reason: 'SHARED_NETWORK', accountCount: 2,
      accounts: [{ id: 'u1', email: 'student@example.com', signupTrialStatus: 'GRANTED', createdAt: '2026-10-13T00:00:00Z' }] }] } });
    const onSelect = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><UserAbusePanel onSelect={onSelect} /></QueryClientProvider>);
    expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra lạm dụng/ }));
    expect(await screen.findByText(/Chỉ trùng IP mạng/)).toBeTruthy();
    expect(screen.getByText(/không tự khóa tài khoản/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'student@example.com' }));
    expect(onSelect).toHaveBeenCalledWith('student@example.com');
  });
});
