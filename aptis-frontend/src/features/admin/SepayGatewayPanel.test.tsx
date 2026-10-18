// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SepayGatewayPanel } from './SepayGatewayPanel';

vi.mock('@/api/adminEndpoints', () => ({ adminBankTransferApi: {
  gatewayStatus: vi.fn().mockResolvedValue({ enabled: true, configured: true, environment: 'production', merchantId: 'SP-LIVE-FIXTURE', ipnUrl: 'https://aptispractices.io.vn/api/v1/payments/sepay/ipn' }),
  gatewayEvents: vi.fn().mockResolvedValue([]),
} }));
afterEach(cleanup);
it('shows only production configuration without Sandbox controls', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><SepayGatewayPanel /></QueryClientProvider>);
  await screen.findByText('SP-LIVE-FIXTURE');
  expect(screen.getByRole('heading', { name: 'Cổng thanh toán SePay · Production' })).toBeDefined();
  expect(screen.getByText('https://aptispractices.io.vn/api/v1/payments/sepay/ipn')).toBeDefined();
  expect(screen.queryByText(/Sandbox/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /Tạo đơn Sandbox/ })).toBeNull();
});
