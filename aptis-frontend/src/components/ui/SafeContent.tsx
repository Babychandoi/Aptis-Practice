import { useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

type ContentFormat = 'HTML' | 'PLAIN_TEXT' | 'MARKDOWN';

export interface SafeContentValue {
  format: ContentFormat;
  value: string;
}

export function SafeHtml({ html, className = '' }: { html: string; className?: string }) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export function SafeContent({ content, className = '' }: {
  content: SafeContentValue;
  className?: string;
}) {
  if (content.format !== 'HTML') {
    return <div className={`whitespace-pre-wrap ${className}`}>{content.value}</div>;
  }
  return <SafeHtml html={content.value} className={className} />;
}
