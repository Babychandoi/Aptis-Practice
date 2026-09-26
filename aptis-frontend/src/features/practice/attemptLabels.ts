import { useComponents, useExamVersions, usePartsOfComponents } from '@/features/catalog/catalogQueries';
import { skillByCode, type SkillMeta } from '@/lib/skills';
import type { AttemptSummary } from '@/types/api';

/**
 * Tên và kỹ năng của một lượt làm bài, dùng chung cho Bảng điều khiển và trang
 * Kết quả.
 *
 * API danh sách bài làm chỉ trả mã kỹ năng và mã Part, nên tên phải ghép từ
 * danh mục. Để mỗi trang tự ghép thì hai nơi đặt tên khác nhau cho cùng một bài.
 */
export function useAttemptLabels() {
  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const components = componentsQuery.data ?? [];
  const partsQuery = usePartsOfComponents(components.map((c) => c.id));

  const componentById = new Map(components.map((c) => [c.id, c]));
  const partById = new Map((partsQuery.data ?? []).map((p) => [p.id, p]));

  const skillOf = (a: AttemptSummary): SkillMeta =>
    skillByCode(a.componentId ? componentById.get(a.componentId)?.code : partById.get(a.partId ?? '')?.componentCode);

  const titleOf = (a: AttemptSummary): string => {
    const skill = skillOf(a);
    const part = a.partId ? partById.get(a.partId) : undefined;
    if (a.mode === 'MOCK_TEST' && !a.componentId && !a.partId) return 'Đề thi thử đủ 5 kỹ năng';
    if (part) return `${skill.nameEn} Part ${part.displayOrder}`;
    if (skill.code !== 'OTHER') return a.mode === 'MOCK_TEST' ? `${skill.nameEn} · bài test đầy đủ` : `${skill.nameEn} · luyện tập`;
    return a.mode === 'CUSTOM_PRACTICE' ? 'Luyện tuỳ chọn' : 'Bài luyện tập';
  };

  return { skillOf, titleOf };
}

/** Điểm quy về thang 50 của Aptis, từ phần trăm backend trả về. */
export function score50Of(a: AttemptSummary): number | null {
  return a.percentageScore == null ? null : a.percentageScore / 2;
}

/** Bài đã nộp thì mở trang kết quả, chưa nộp thì vào lại trang làm bài. */
export function attemptHref(a: AttemptSummary): string {
  return ['COMPLETED', 'SCORING', 'SUBMITTED'].includes(a.status) ? `/attempts/${a.id}/result` : `/attempts/${a.id}`;
}
