import type { ComponentSummary, PartSummary } from '@/types/api';

const COMPONENT_SLUG_BY_CODE: Record<string, string> = {
  GRAMMAR_VOCABULARY: 'ngu-phap-tu-vung',
  READING: 'doc',
  LISTENING: 'nghe',
  WRITING: 'viet',
  SPEAKING: 'noi',
};

const COMPONENT_NAME_BY_CODE: Record<string, string> = {
  GRAMMAR_VOCABULARY: 'Ngữ pháp & Từ vựng',
  READING: 'Đọc',
  LISTENING: 'Nghe',
  WRITING: 'Viết',
  SPEAKING: 'Nói',
};

export function componentDisplayName(component: Pick<ComponentSummary, 'code' | 'name'>): string {
  return COMPONENT_NAME_BY_CODE[component.code] ?? component.name;
}

export function componentSlug(code: string): string {
  return COMPONENT_SLUG_BY_CODE[code] ?? slugify(code);
}

export function componentPath(code: string): string {
  return `/luyen-tap/${componentSlug(code)}`;
}

export function findComponentBySlug(components: ComponentSummary[], slug: string | undefined) {
  return components.find((component) => componentSlug(component.code) === slug);
}

export function partSlug(part: Pick<PartSummary, 'code' | 'name'>): string {
  return slugify(part.code || part.name);
}

export function partPath(componentCode: string, part: Pick<PartSummary, 'code' | 'name'>): string {
  return `${componentPath(componentCode)}/${partSlug(part)}`;
}

export function findPartBySlug(parts: PartSummary[], slug: string | undefined) {
  return parts.find((part) => partSlug(part) === slug);
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' va ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
