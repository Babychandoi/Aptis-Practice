import type { IconName } from '@/components/shell/icons';

/**
 * Thông tin hiển thị của từng kỹ năng Aptis, dùng chung cho mọi màn.
 *
 * Màu lấy đúng từ mock. Mỗi kỹ năng luôn một màu ở mọi nơi (icon, nhãn, thanh
 * điểm, thẻ bài làm) để học viên nhìn màu là biết đang ở kỹ năng nào.
 */
export interface SkillMeta {
  /** Mã component trong hệ thống. */
  code: string;
  slug: string;
  nameVi: string;
  nameEn: string;
  icon: IconName;
  fg: string;
  bg: string;
}

export const SKILLS: SkillMeta[] = [
  { code: 'SPEAKING', slug: 'noi', nameVi: 'Nói', nameEn: 'Speaking', icon: 'speaking', fg: '#15803D', bg: '#ECFDF3' },
  { code: 'LISTENING', slug: 'nghe', nameVi: 'Nghe', nameEn: 'Listening', icon: 'listening', fg: '#B45309', bg: '#FFFBEB' },
  { code: 'GRAMMAR_VOCABULARY', slug: 'ngu-phap-tu-vung', nameVi: 'Ngữ pháp & Từ vựng', nameEn: 'Grammar & Vocabulary', icon: 'gv', fg: '#6D28D9', bg: '#F5F3FF' },
  { code: 'READING', slug: 'doc', nameVi: 'Đọc', nameEn: 'Reading', icon: 'reading', fg: '#1D4ED8', bg: '#EFF6FF' },
  { code: 'WRITING', slug: 'viet', nameVi: 'Viết', nameEn: 'Writing', icon: 'writing', fg: '#BE185D', bg: '#FDF2F8' },
];

/** Kỹ năng không nhận ra (dữ liệu cũ, bài tổng hợp) vẫn có màu trung tính. */
const FALLBACK: SkillMeta = {
  code: 'OTHER', slug: '', nameVi: 'Tổng hợp', nameEn: 'Mixed', icon: 'focus', fg: '#0F172A', bg: '#F1F5F9',
};

export function skillByCode(code: string | null | undefined): SkillMeta {
  const key = (code ?? '').toUpperCase();
  return SKILLS.find((s) => s.code === key) ?? FALLBACK;
}

export function skillBySlug(slug: string | null | undefined): SkillMeta {
  return SKILLS.find((s) => s.slug === slug) ?? FALLBACK;
}

/**
 * Bậc CEFR ước theo điểm trên thang 50 của một kỹ năng.
 *
 * Chỉ dùng để hiển thị nhanh trên bảng điều khiển khi chưa có bậc chính thức từ
 * backend; ngưỡng khớp cách mock gắn nhãn (≥46 C, ≥38 B2, ≥26 B1).
 */
export function cefrFromScore50(score: number): string {
  if (score >= 46) return 'C';
  if (score >= 38) return 'B2';
  if (score >= 26) return 'B1';
  if (score >= 16) return 'A2';
  return 'A1';
}
