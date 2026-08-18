// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes executable elements and event handlers', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">Safe<img src=x onerror="alert(2)"></p>'
        + '<script>alert(3)</script><svg onload="alert(4)"></svg>',
    );

    expect(result).toBe('<p>Safe</p>');
  });

  it('blocks javascript URLs and protects new tabs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">bad</a>'))
      .toBe('<a>bad</a>');
    expect(sanitizeHtml('<a href="https://example.com" target="_blank">ok</a>'))
      .toContain('rel="noopener noreferrer"');
  });
});
