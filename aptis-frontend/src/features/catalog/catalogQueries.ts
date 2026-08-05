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
