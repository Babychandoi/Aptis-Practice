/** Read-only production smoke test in a fresh browser (never uses admin cookies).
 * PLAYWRIGHT_MODULE_PATH may point to an existing playwright/index.mjs.
 * NEWS_SEO_BASE_URL defaults to production; no writes or login operations.
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = process.env.PLAYWRIGHT_MODULE_PATH
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href) : await import('playwright');
const base = (process.env.NEWS_SEO_BASE_URL ?? 'https://aptispractices.io.vn').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
try {
  const client = await browser.newContext();
  const feedResponse = await client.request.get(`${base}/api/v1/news?size=50`);
  assert.equal(feedResponse.status(), 200);
  const posts = (await feedResponse.json()).content;
  assert.ok(posts.length > 0);
  const sitemap = await (await client.request.get(`${base}/sitemap.xml`)).text();
  for (const post of posts) {
    const path = `/bang-tin/${post.slug}`;
    const response = await client.request.get(base + path);
    assert.equal(response.status(), 200);
    const html = await response.text();
    const metadata = await (await client.request.get(`${base}/api/v1/news-seo/metadata/${post.slug}`)).json();
    assert.ok(html.includes('<title>') && html.includes('<h1>') && html.includes('BlogPosting'));
    assert.ok(html.includes(metadata.canonical));
    assert.ok(html.includes(`/news-images/${post.slug}`));
    assert.ok(sitemap.includes(metadata.canonical));
    const imageUrl = new URL(metadata.image);
    const image = await client.request.get(base + imageUrl.pathname + imageUrl.search);
    assert.equal(image.status(), 200);
    assert.ok(image.headers()['content-type'].startsWith('image/'));
    assert.ok((await image.body()).length > 100);
    const bot = await client.request.get(base + path, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
    assert.equal(await bot.text(), html, 'Bot and browser must receive the same article HTML');
    console.log(`PASS HTML/metadata/image/sitemap: ${post.slug}`);
  }
  const invalid = await client.request.get(`${base}/bang-tin/seo-smoke-article-does-not-exist`);
  assert.equal(invalid.status(), 404);
  assert.ok((await invalid.text()).includes('noindex'));

  const latest = posts[0];
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  const staticResponse = await staticPage.goto(`${base}/bang-tin/${latest.slug}`);
  assert.equal(staticResponse.status(), 200);
  assert.equal(await staticPage.locator('h1').textContent(), latest.title);
  assert.ok((await staticPage.locator('.news-content').textContent()).length > 100);
  await noJs.close();

  const page = await client.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const pageResponse = await page.goto(`${base}/bang-tin/${latest.slug}`);
  assert.equal(pageResponse.status(), 200);
  await page.waitForSelector('.news-body', { timeout: 30000 });
  assert.equal(await page.locator('h1').textContent(), latest.title);
  assert.equal(await page.title(), `${latest.title} | Aptis Practice`);
  assert.ok(page.url().includes('/bang-tin/'), 'Guest must not be redirected to login');
  await page.getByRole('link', { name: '← Bảng tin', exact: true }).click();
  await page.waitForFunction(() => document.title === 'Bảng tin | Aptis Practice');
  await page.getByRole('heading', { name: latest.title, exact: true }).click();
  await page.waitForFunction((title) => document.title === title, `${latest.title} | Aptis Practice`);
  assert.deepEqual(errors, []);
  console.log('PASS guest React UI, client navigation, no-JS article and genuine 404.');
  await client.close();
} finally { await browser.close(); }
