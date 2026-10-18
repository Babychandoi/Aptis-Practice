import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

interface Metadata {
  title: string; description: string; canonical: string; image: string;
  imageType?: string; imageWidth?: number; imageHeight?: number;
  publishedAt?: string; modifiedAt?: string; jsonLd: Record<string, unknown>;
}
const ORIGIN = 'https://aptispractices.io.vn';
const DEFAULT: Metadata = {
  title: 'Aptis Practice — Luyện thi Aptis General online',
  description: 'Luyện thi Aptis General trực tuyến với đề thi thử bốn kỹ năng Nghe, Nói, Đọc, Viết. Chấm điểm tự động, chữa bài chi tiết và theo dõi tiến độ theo từng phần thi.',
  canonical: `${ORIGIN}/`, image: `${ORIGIN}/og-image.jpg`, imageType: 'image/jpeg', imageWidth: 1200, imageHeight: 630,
  jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Aptis Practice', url: `${ORIGIN}/` },
};

function applyNewsMetadata(data: Metadata, type = 'article') {
  document.title = data.title;
  const meta = (kind: 'name' | 'property', key: string, value?: string | number) => {
    const nodes = Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${kind}="${key}"]`));
    if (value == null) { nodes.forEach((node) => node.remove()); return; }
    const node = nodes.shift() ?? document.createElement('meta');
    nodes.forEach((duplicate) => duplicate.remove());
    node.setAttribute(kind, key); node.content = String(value);
    if (!node.parentNode) document.head.append(node);
  };
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = data.canonical;
  meta('name', 'description', data.description); meta('name', 'robots', 'index,follow,max-image-preview:large');
  meta('property', 'og:type', type); meta('property', 'og:title', data.title);
  meta('property', 'og:description', data.description); meta('property', 'og:url', data.canonical);
  meta('property', 'og:image', data.image); meta('property', 'og:image:alt', data.title);
  meta('property', 'og:image:type', data.imageType); meta('property', 'og:image:width', data.imageWidth);
  meta('property', 'og:image:height', data.imageHeight);
  meta('property', 'article:published_time', data.publishedAt); meta('property', 'article:modified_time', data.modifiedAt);
  meta('name', 'twitter:card', 'summary_large_image'); meta('name', 'twitter:title', data.title);
  meta('name', 'twitter:description', data.description); meta('name', 'twitter:image', data.image);
  // Replace site-only structured data; never leave an old article schema behind.
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
  const schema = document.createElement('script'); schema.id = 'news-jsonld'; schema.type = 'application/ld+json';
  schema.textContent = JSON.stringify(data.jsonLd); document.head.append(schema);
}

export function NewsSeo({ slug, notFound = false }: { slug?: string; notFound?: boolean }) {
  const metadata = useQuery({
    queryKey: ['news', 'seo', slug],
    queryFn: () => api.get<Metadata>(`/news-seo/metadata/${encodeURIComponent(slug!)}`).then((r) => r.data),
    enabled: Boolean(slug) && !notFound, staleTime: 0, retry: false,
  });
  useEffect(() => {
    if (notFound) {
      applyNewsMetadata({ ...DEFAULT, title: 'Không tìm thấy bài viết | Aptis Practice' });
      document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')!.content = 'noindex,follow';
    } else if (slug && metadata.data) applyNewsMetadata(metadata.data);
    else if (!slug) applyNewsMetadata({ ...DEFAULT, title: 'Bảng tin | Aptis Practice', canonical: `${ORIGIN}/bang-tin`,
      description: 'Cách làm bài, dự đoán đề và thông báo mới nhất từ Aptis Practice.',
      jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Bảng tin', url: `${ORIGIN}/bang-tin` },
    }, 'website');
    return () => applyNewsMetadata(DEFAULT, 'website');
  }, [slug, metadata.data, notFound]);
  return null;
}
