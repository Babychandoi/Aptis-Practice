// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewsSeo } from './NewsSeo';

vi.mock('@/api/client', () => ({ api: { get: vi.fn() } }));
import { api } from '@/api/client';

async function applyNewsMetadata(data: typeof metadata, type = 'article') {
  vi.mocked(api.get).mockResolvedValue({ data });
  cleanup();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <NewsSeo slug={type === 'article' ? 'du-doan-13-10' : undefined} />
  </QueryClientProvider>);
  await waitFor(() => expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(type));
  if (type === 'article') await waitFor(() => expect(document.title).toBe(data.title));
}

afterEach(() => { cleanup(); document.head.innerHTML = ''; });
const metadata = {
  title: 'Dự đoán 13/10 | Aptis Practice', description: 'Chủ đề luyện tập ngày 13/10.',
  canonical: 'https://aptispractices.io.vn/bang-tin/du-doan-13-10',
  image: 'https://aptispractices.io.vn/news-images/du-doan-13-10', imageType: 'image/png', imageWidth: 1200, imageHeight: 630,
  publishedAt: '2026-10-13T01:00:00Z', jsonLd: { '@type': 'BlogPosting', headline: 'Dự đoán 13/10' },
};
describe('news metadata when navigating without a reload', () => {
  it('replaces generic tags without duplicates and sets article canonical/schema', async () => {
    document.head.innerHTML = '<meta property="og:title" content="Generic"><meta property="og:title" content="Duplicate"><script type="application/ld+json">{}</script>';
    await applyNewsMetadata(metadata);
    expect(document.title).toBe(metadata.title);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(metadata.description);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(metadata.canonical);
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(metadata.image);
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(JSON.parse(document.querySelector('#news-jsonld')!.textContent!)).toEqual(metadata.jsonLd);
  });
  it('clears article-only dates and replaces the schema when leaving an article', async () => {
    await applyNewsMetadata(metadata);
    await applyNewsMetadata(metadata, 'website');
    expect(document.querySelector('meta[property="article:published_time"]')).toBeNull();
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
    expect(document.querySelector('#news-jsonld')?.textContent).not.toContain('BlogPosting');
  });
  it('treats adversarial titles/descriptions as text, never HTML', async () => {
    await applyNewsMetadata({ ...metadata, title: '</title><script>alert(1)</script>', description: '" onload="alert(2)' });
    expect(document.title).toBe('</title><script>alert(1)</script>');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('onload')).toBeNull();
    expect(document.querySelector('script:not([type="application/ld+json"])')).toBeNull();
  });
});
