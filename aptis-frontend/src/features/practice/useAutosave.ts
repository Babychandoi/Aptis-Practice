import { useCallback, useEffect, useRef, useState } from 'react';
import { practiceApi } from '@/api/endpoints';
import type { ItemResponsePayload } from '@/types/api';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 1500;

/**
 * Autosave câu trả lời (§38.8). Debounce để không gọi API mỗi lần bấm chọn,
 * và flush ngay khi chuyển bộ câu hỏi hoặc nộp bài.
 */
export function useAutosave(attemptId: string, enabled: boolean) {
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<string, {
    questionSetId: string;
    payloads: ItemResponsePayload[];
    timeSpentSeconds: number;
  }>>(new Map());

  const flush = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pending = Array.from(pendingRef.current.values());
    if (pending.length === 0) return;

    pendingRef.current.clear();
    setState('saving');
    try {
      // The backend document is an aggregate. Keep writes ordered as an extra
      // defence against a slow older request finishing after a newer one.
      for (const entry of pending) {
        await practiceApi.saveResponses(attemptId, entry.questionSetId, {
            itemResponses: entry.payloads,
            timeSpentSeconds: entry.timeSpentSeconds,
        });
      }
      setState('saved');
    } catch {
      for (const entry of pending) {
        if (!pendingRef.current.has(entry.questionSetId)) {
          pendingRef.current.set(entry.questionSetId, entry);
        }
      }
      // Giữ trạng thái lỗi để UI cảnh báo; người dùng vẫn có thể bấm nộp lại
      setState('error');
    }
  }, [attemptId]);

  const schedule = useCallback(
    (questionSetId: string, payloads: ItemResponsePayload[], timeSpentSeconds: number) => {
      if (!enabled) return;

      pendingRef.current.set(questionSetId, { questionSetId, payloads, timeSpentSeconds });
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [enabled, flush],
  );

  const discard = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current.clear();
    setState('idle');
  }, []);

  // Cố gắng lưu khi người dùng đóng tab
  useEffect(() => {
    const handler = () => {
      if (pendingRef.current.size > 0) void flush();
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [flush]);

  return { state, schedule, flush, discard };
}
