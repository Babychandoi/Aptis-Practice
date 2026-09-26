import type { CSSProperties } from 'react';

/** Trần số phần tử được so le: danh sách dài chỉ phần đầu nhún, phần sau hiện ngay. */
const MAX_STAGGER = 8;

/**
 * Độ trễ so le cho thẻ trong danh sách, như mock (mỗi thẻ chậm hơn thẻ trước
 * một nhịp). Chỉ dùng cùng một lớp animate-* có fill-mode both.
 */
export function stagger(index: number, stepMs = 60, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + Math.min(index, MAX_STAGGER) * stepMs}ms` };
}
