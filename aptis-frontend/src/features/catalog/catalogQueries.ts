import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints';

/** Danh mục thay đổi rất ít — cache dài để không gọi lại mỗi lần điều hướng. */
const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useExamVersions() {
  return useQuery({
    queryKey: ['exam-versions'],
    queryFn: () => catalogApi.examVersions(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useComponents(examVersionId: string | undefined) {
  return useQuery({
    queryKey: ['components', examVersionId],
    queryFn: () => catalogApi.components(examVersionId!),
    enabled: Boolean(examVersionId),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useParts(componentId: string | undefined) {
  return useQuery({
    queryKey: ['parts', componentId],
    queryFn: () => catalogApi.parts(componentId!),
    enabled: Boolean(componentId),
    staleTime: CATALOG_STALE_TIME,
  });
}

/**
 * Part của nhiều component gộp lại một mảng.
 *
 * Bài mock full trải trên cả 5 kỹ năng và không gắn componentId, nên không thể
 * dùng useParts (chỉ nhận một component) để tra tên/kỹ năng của từng Part.
 */
export function usePartsOfComponents(componentIds: string[]) {
  const ids = [...componentIds].sort();
  return useQuery({
    queryKey: ['parts-multi', ids],
    queryFn: async () => {
      const groups = await Promise.all(ids.map((id) => catalogApi.parts(id)));
      return groups.flat();
    },
    enabled: ids.length > 0,
    staleTime: CATALOG_STALE_TIME,
  });
}

export function usePart(partId: string | undefined) {
  return useQuery({
    queryKey: ['part', partId],
    queryFn: () => catalogApi.part(partId!),
    enabled: Boolean(partId),
    staleTime: CATALOG_STALE_TIME,
  });
}

/**
 * Không cache lâu: canAccess phụ thuộc entitlement, có thể đổi sau khi mua
 * Premium hoặc bị thu hồi quyền.
 */
export function useQuestionSets(partId: string | undefined) {
  return useQuery({
    queryKey: ['question-sets', partId],
    queryFn: () => catalogApi.questionSets(partId!),
    enabled: Boolean(partId),
    staleTime: 30 * 1000,
  });
}

export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => catalogApi.topics(),
    staleTime: CATALOG_STALE_TIME,
  });
}
