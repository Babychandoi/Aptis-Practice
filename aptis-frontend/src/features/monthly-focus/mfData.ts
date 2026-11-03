import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monthlyFocusApi } from '@/api/endpoints';
import type { AssetRef } from '@/types/api';
import type { MonthlyFocusPage, MonthlyFocusPageKey, MonthlyFocusProgress, MonthlyFocusResult } from '@/types/monthlyFocus';

/** URL ký của audio/ảnh một đề — xin qua API trang trọng điểm (đúng luật làm thử/Premium). */
export function useAssetUrls(pageKey: MonthlyFocusPageKey, questionSetId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['monthly-focus', 'assets', pageKey, questionSetId],
    queryFn: () => monthlyFocusApi.assetUrls(pageKey, questionSetId!),
    enabled: enabled && !!questionSetId,
    // URL ký sống 10 phút; xin lại trước khi hết hạn.
    staleTime: 8 * 60_000,
    gcTime: 9 * 60_000,
  });
}

/** Audio của đề theo thứ tự phát: bài chung trước, rồi từng câu theo thứ tự item. */
export function audioOrder(assets: AssetRef[]) {
  const rank = (role: string) => (role === 'MAIN_AUDIO' ? 0 : role === 'ITEM_AUDIO_ALL' ? 1 : 2);
  return assets
    .filter((a) => /AUDIO/.test(a.role))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.displayOrder - b.displayOrder);
}

/** Cỡ chữ của tab Cài đặt — lưu ở trình duyệt, áp cho vùng làm bài. */
export const FONT_SIZES = [
  { value: 14, label: 'Small (14px)' },
  { value: 16, label: 'Medium (16px)' },
  { value: 18, label: 'Large (18px)' },
  { value: 20, label: 'Extra Large (20px)' },
];

/** State nhớ ở localStorage (Auto shuffle, Rush Mode, cỡ chữ); trình duyệt chặn lưu thì chỉ nhớ trong phiên. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* trình duyệt chặn lưu thì thôi */ }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Dữ liệu dùng chung của các trình luyện trọng điểm: trang, tiến độ, ghi/xoá tiến độ. */
export function usePageData(pageKey: MonthlyFocusPageKey, topic?: string) {
  const queryClient = useQueryClient();
  const page = useQuery({
    queryKey: ['monthly-focus', 'page', pageKey, topic ?? null],
    queryFn: () => monthlyFocusApi.page(pageKey, topic),
    staleTime: 10 * 60_000,
  });
  const progressKey = ['monthly-focus', 'progress', pageKey];
  const progress = useQuery({ queryKey: progressKey, queryFn: () => monthlyFocusApi.progress(pageKey) });
  const record = useMutation({
    mutationFn: (v: { questionSetId: string; result: MonthlyFocusResult }) => monthlyFocusApi.record(pageKey, v.questionSetId, v.result),
    onSuccess: (entry) => queryClient.setQueryData<MonthlyFocusProgress[]>(progressKey, (old = []) =>
      [...old.filter((p) => p.questionSetId !== entry.questionSetId), entry]),
  });
  const clear = useMutation({
    mutationFn: () => monthlyFocusApi.clearProgress(pageKey),
    onSuccess: () => queryClient.setQueryData(progressKey, []),
  });
  const byId = new Map((progress.data ?? []).map((p) => [p.questionSetId, p]));
  return { page, progress, byId, record, clear };
}

export function lockedMessage(page: MonthlyFocusPage) {
  return `Câu này thuộc gói Premium. Tài khoản miễn phí được luyện thử ${page.freeLimit} câu đầu của mỗi phần trọng điểm.`;
}
