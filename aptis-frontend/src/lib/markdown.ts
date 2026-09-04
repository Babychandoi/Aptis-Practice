/**
 * Markdown -> HTML cho bài viết bảng tin.
 *
 * Tự viết thay vì thêm thư viện: bài viết chỉ cần tiêu đề, đậm, nghiêng, danh
 * sách, link, ảnh, trích dẫn và khối code. Một thư viện Markdown đầy đủ nặng
 * hơn cả phần này rất nhiều lần cho một tính năng duy nhất.
 *
 * Kết quả BẮT BUỘC đi qua sanitizeHtml trước khi render — hàm này chỉ dựng cấu
 * trúc, không phải hàng rào bảo mật. Người viết là admin nhưng vẫn phải lọc:
 * nội dung có thể dán từ nguồn ngoài, và một tài khoản admin bị chiếm không nên
 * chạy được script trên máy học viên.
 */

/** Ký tự không thể gõ, dùng làm mốc giữ chỗ cho code inline. */
const MARK = String.fromCharCode(1);

/** Escape trước khi ghép vào HTML, nếu không dấu < của người viết thành thẻ. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Định dạng trong một dòng: đậm, nghiêng, code, link, ảnh.
 *
 * Code inline tách ra TRƯỚC và giữ nguyên phần bên trong, vì `**a**` viết trong
 * code phải hiện đúng như vậy chứ không được in đậm. Mốc giữ chỗ là ký tự điều
 * khiển người viết không gõ được — dùng số như " 0 " thì câu "làm trong 0 giây"
 * sẽ bị thay mất.
 */
function inline(text: string): string {
  const codeSpans: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `${MARK}${codeSpans.length - 1}${MARK}`;
  });

  out = escapeHtml(out);

  // Ảnh trước link: cú pháp ảnh chỉ khác link một dấu ! ở đầu
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, alt: string, src: string) => `<img src="${src}" alt="${alt}">`,
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) => `<a href="${href}">${label}</a>`,
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  const restore = new RegExp(`${MARK}(\\d+)${MARK}`, 'g');
  return out.replace(restore, (_m, index: string) => codeSpans[Number(index)] ?? '');
}

/** Markdown -> HTML thô. Luôn đưa kết quả qua sanitizeHtml trước khi render. */
export function markdownToHtml(markdown: string): string {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  // Trạng thái danh sách và khối code đang mở
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith('```')) {
      closeParagraph();
      closeList();
      html.push(inCodeBlock ? '</code></pre>' : '<pre><code>');
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      html.push(escapeHtml(raw) + '\n');
      continue;
    }

    if (line.trim() === '') {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      // Tiêu đề bài đã là h1 trên trang, nên # của người viết bắt đầu từ h2
      const level = Math.min((heading[1] ?? '#').length + 1, 6);
      html.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeParagraph();
      closeList();
      html.push(`<blockquote>${inline(quote[1] ?? '')}</blockquote>`);
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      closeParagraph();
      if (listType !== 'ul') {
        closeList();
        html.push('<ul>');
        listType = 'ul';
      }
      html.push(`<li>${inline(bullet[1] ?? '')}</li>`);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      closeParagraph();
      if (listType !== 'ol') {
        closeList();
        html.push('<ol>');
        listType = 'ol';
      }
      html.push(`<li>${inline(numbered[1] ?? '')}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  closeParagraph();
  closeList();
  if (inCodeBlock) {
    html.push('</code></pre>');
  }

  return html.join('');
}
