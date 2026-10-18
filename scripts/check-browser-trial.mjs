/** Read-only prod smoke: fresh browser, no credentials, registration or trial consumption. */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = process.env.PLAYWRIGHT_MODULE_PATH
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href) : await import('playwright');
const base = process.env.BROWSER_TRIAL_BASE_URL ?? 'https://aptispractices.io.vn';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const response = await context.request.get(`${base}/api/v1/auth/config`);
  assert.equal(response.status(), 200);
  assert.ok(response.headers()['cache-control'].includes('no-store'));
  const cookies = await context.cookies();
  const bid = cookies.find((cookie) => cookie.name === '__Host-aptis_bid');
  assert.ok(bid && bid.secure && bid.httpOnly && bid.path === '/' && bid.sameSite === 'Lax');
  assert.match(bid.value, /^[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/);
  const again = await context.request.get(`${base}/api/v1/auth/config`);
  assert.equal(again.status(), 200);
  assert.equal((await context.cookies()).find((cookie) => cookie.name === bid.name).value, bid.value);
  console.log('PASS stable, signed Secure/HttpOnly/host-only browser cookie; config is not cached.');
  const admin = await context.request.get(`${base}/api/v1/admin/users/abuse-signals`);
  assert.ok([401, 403].includes(admin.status()), 'Anonymous visitors must not read admin evidence');
  console.log('PASS admin signals reject anonymous requests.');
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  assert.equal((await page.goto(`${base}/register`)).status(), 200);
  await page.getByRole('heading', { name: 'Tạo tài khoản', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('không chặn dùng thử chỉ vì chung Wi-Fi'));
  assert.ok(!(await page.evaluate(() => document.cookie)).includes('__Host-aptis_bid'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  if (process.env.BROWSER_TRIAL_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.BROWSER_TRIAL_SCREENSHOT_DIR}/aptis-browser-trial-register.png` });
  }
  console.log('PASS mobile registration notice, no horizontal overflow, no runtime errors and browser ID invisible to JS.');
  assert.equal((await page.goto(`${base}/login`)).status(), 200);
  await page.getByRole('heading', { name: 'Chào mừng bạn trở lại', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('Cookie bảo mật ghi nhớ lượt dùng thử'));
  assert.deepEqual(errors, []);
  console.log('PASS login page and privacy notice. No account/trial created on production.');
  await context.close();
} finally { await browser.close(); }
