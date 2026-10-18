// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CheckoutPage } from './CheckoutPage';

const mocks = vi.hoisted(() => ({ order: vi.fn(), transfer: vi.fn(), claim: vi.fn(), refresh: vi.fn(), user: vi.fn(), method: vi.fn(), gateway: vi.fn() }));
vi.mock('@/api/endpoints', () => ({ billingApi: { order: mocks.order, createBankTransfer: mocks.transfer, claimBankTransfer: mocks.claim, refreshBankTransferQr: mocks.refresh, paymentMethod: mocks.method, sepayCheckout: mocks.gateway } }));
vi.mock('@/features/auth/authStore', () => ({ useAuthStore: (selector: (state: { refreshUser: typeof mocks.user }) => unknown) => selector({ refreshUser: mocks.user }) }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test') } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function mount(automatic: boolean, paid = false, ai = false, returned = false) {
  mocks.method.mockResolvedValue({ mode: 'BANK_TRANSFER' });
  mocks.order.mockResolvedValue({ id: 'order', orderCode: 'APORDER', status: paid ? 'PAID' : 'AWAITING_PAYMENT', items: [{ itemName: ai ? 'AI English Lounge 7 ngày' : 'Premium 7 ngày' }] });
  mocks.transfer.mockResolvedValue({ id: 'transfer', orderId: 'order', transferCode: 'AP12345678', amount: 99000, currency: 'VND', status: 'PENDING', bankName: 'Test Bank', accountNumber: '1234567890', accountHolder: 'Test only', qrContent: 'test-qr', qrExpiresAt: new Date(Date.now() + 600000).toISOString(), automaticConfirmation: automatic });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[returned ? '/checkout/order?sepay=success' : '/checkout/order']}><Routes><Route path="/checkout/:orderId" element={<CheckoutPage />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('Checkout xác nhận thanh toán', () => {
  it('success redirect alone neither confirms payment nor offers another transfer', async () => {
    mount(false, false, false, true);
    mocks.method.mockResolvedValue({ mode: 'SEPAY_GATEWAY' });
    mocks.gateway.mockResolvedValue({ invoice: 'APTISPGTEST', checkoutUrl: 'https://pay.sepay.vn/v1/checkout/init', fields: { signature: 'signed' } });
    await screen.findByText(/Đang chờ xác nhận thanh toán từ hệ thống/);
    expect(screen.queryByText('Thanh toán đã được xác nhận')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Thanh toán qua SePay' })).toBeNull();
    expect(mocks.transfer).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it('SePay gateway does not create a legacy QR or claim payment', async () => {
    mount(false);
    mocks.method.mockResolvedValue({ mode: 'SEPAY_GATEWAY' });
    mocks.gateway.mockResolvedValue({ invoice: 'APTISPGTEST', checkoutUrl: 'https://pay.sepay.vn/v1/checkout/init', fields: { merchant: 'test', signature: 'signed' } });
    const button = await screen.findByRole('button', { name: 'Thanh toán qua SePay' });
    expect(button.closest('form')?.getAttribute('action')).toBe('https://pay.sepay.vn/v1/checkout/init');
    expect(button.closest('form')?.getAttribute('method')).toBe('POST');
    expect(mocks.transfer).not.toHaveBeenCalled();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.gateway).toHaveBeenCalledWith('order');
  });
  it('chờ ngân hàng tự xác nhận và không gửi lời khai chuyển tiền', async () => {
    mount(true);
    await screen.findByText('Đang chờ ngân hàng xác nhận.');
    expect(screen.queryByRole('button', { name: 'Tôi đã chuyển khoản →' })).toBeNull();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Test Bank/).length).toBeGreaterThan(0);
  });
  it('còn thao tác báo chuyển khi tự động chưa được cấu hình', async () => {
    mount(false);
    await screen.findByRole('button', { name: 'Tôi đã chuyển khoản →' });
    expect(screen.queryByText('Đang chờ ngân hàng xác nhận.')).toBeNull();
  });
  it('mua AI Voice thành công mở đúng phòng hội thoại', async () => {
    mount(true, true, true);
    const link = await screen.findByRole('link', { name: 'Bắt đầu trò chuyện với AI' });
    expect(link.getAttribute('href')).toBe('/ai-english-lounge');
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
});
