// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignupTrialNotice } from './SignupTrialNotice';

afterEach(cleanup);
describe('signup trial browser notice', () => {
  it('explains the browser limit and links to paid plans', () => {
    render(<MemoryRouter><SignupTrialNotice user={{ premiumActive: false, signupTrialStatus: 'BROWSER_USED' }} /></MemoryRouter>);
    expect(screen.getByRole('status').textContent).toContain('dùng chung máy');
    expect(screen.getByRole('link', { name: 'Xem gói Premium' }).getAttribute('href')).toBe('/plans');
  });
  it('never labels an active paid subscriber as blocked', () => {
    render(<SignupTrialNotice user={{ premiumActive: true, signupTrialStatus: 'BROWSER_USED' }} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('does not change legacy or eligible account screens', () => {
    render(<SignupTrialNotice user={{ premiumActive: false, signupTrialStatus: 'LEGACY' }} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
