/** Read-only live smoke: verifies credentials/config/auth; never creates orders or transfers money.
 * Configuration probe is sent by this script, NOT by SePay, and never creates a receipt.
 * Credentials remain in memory; no values, order data, cookies or JWTs are printed.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const env = { ...process.env };
for (const line of (await readFile(new URL('../.env', import.meta.url), 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && /^(SEPAY_|PUBLIC_ORIGIN$)/.test(match[1]) && env[match[1]] === undefined) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
}
assert.equal(env.SEPAY_ENABLED, 'false');assert.equal(env.SEPAY_ENV, 'production');
assert.ok(env.SEPAY_MERCHANT_ID && !env.SEPAY_MERCHANT_ID.startsWith('SP-TEST-'));
assert.match(env.SEPAY_SECRET_KEY ?? '', /^spsk_(live|prod)_/);
assert.ok(!Object.keys(env).some((name) => name.startsWith('SEPAY_SANDBOX_')), 'Retired SePay Sandbox variables must be removed');
const base = env.PUBLIC_ORIGIN.replace(/\/$/, '');
assert.equal(new URL(base).protocol, 'https:');
for (const name of ['SEPAY_ENABLED', 'SEPAY_ENV', 'SEPAY_MERCHANT_ID', 'SEPAY_SECRET_KEY', 'SEPAY_IPN_SECRET']) {
  const running = execFileSync('docker', ['exec', 'aptis-backend', 'printenv', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  assert.equal(running, env[name] ?? '', `Running backend does not match .env for ${name}`);
}
console.log('PASS backend loaded production credentials with hosted checkout disabled; retired SePay Sandbox configuration removed.');
execFileSync('docker', ['exec', 'aptis-backend', 'sh', '-c', 'test -z "${SEPAY_SANDBOX_SECRET_KEY+x}" && test -z "${SEPAY_SANDBOX_MERCHANT_ID+x}" && test -z "${SEPAY_SANDBOX_IPN_SECRET+x}"'], { stdio: ['ignore', 'pipe', 'pipe'] });
console.log('PASS running container no longer has SePay Sandbox environment variables.');
const remote = await fetch('https://pgapi.sepay.vn/v1/order?per_page=1', { headers: { Authorization: 'Basic ' + Buffer.from(env.SEPAY_MERCHANT_ID + ':' + env.SEPAY_SECRET_KEY).toString('base64') }, signal: AbortSignal.timeout(12000) });
assert.equal(remote.status, 200);
console.log('PASS official SePay production API authentication HTTP 200 (read-only).');
for (const path of ['/api/v1/admin/sepay/gateway', '/api/v1/admin/sepay/gateway/events']) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(12000) });
  assert.equal(response.status, 401);
}
console.log('PASS production admin APIs reject anonymous visitors.');
const retired = await fetch(base + '/api/v1/payments/sepay/ipn/sandbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
assert.ok([401, 403, 404, 410].includes(retired.status));
console.log('PASS retired SePay Sandbox callback is inaccessible.');
const ipn = '/api/v1/payments/sepay/ipn';
const request = (body, secret) => fetch(base + ipn, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(secret ? { 'X-Secret-Key': secret } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
assert.equal((await request({ notification_type: 'CONFIGURATION_PROBE' })).status, 401);
assert.equal((await request({ notification_type: 'CONFIGURATION_PROBE' }, 'wrong-key')).status, 401);
const key = env.SEPAY_IPN_SECRET || env.SEPAY_SECRET_KEY;
const probe = await request({ notification_type: 'CONFIGURATION_PROBE' }, key);
assert.equal(probe.status, 200);assert.equal((await probe.json()).success, true);
assert.equal((await request({ notification_type: 'ORDER_PAID', order: { order_invoice_number: 'APTISSB' + 'A'.repeat(32) } }, key)).status, 400);
console.log('PASS live endpoint rejects missing/wrong key and Sandbox invoice; authenticated no-op probe HTTP 200.');
console.log('No live checkout/order/payment/entitlement created. Actual provider IPN still requires a real payment by the account owner.');
