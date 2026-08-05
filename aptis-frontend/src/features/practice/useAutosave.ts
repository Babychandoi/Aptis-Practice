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
  const pendingRef = useRef<{
    questionSetId: string;
    payloads: ItemResponsePayload[];
    timeSpentSeconds: number;
  } | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pending = pendingRef.current;
    if (!pending || pending.payloads.length === 0) return;

    pendingRef.current = null;
    setState('saving');
    try {
      await practiceApi.saveResponses(attemptId, pending.questionSetId, {
        itemResponses: pending.payloads,
        timeSpentSeconds: pending.timeSpentSeconds,
      });
      setState('saved');
    } catch {
      // Giữ trạng thái lỗi để UI cảnh báo; người dùng vẫn có thể bấm nộp lại
      setState('error');
    }
  }, [attemptId]);

  const schedule = useCallback(
    (questionSetId: string, payloads: ItemResponsePayload[], timeSpentSeconds: number) => {
      if (!enabled) return;

      pendingRef.current = { questionSetId, payloads, timeSpentSeconds };
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [enabled, flush],
  );

  // Cố gắng lưu khi người dùng đóng tab
  useEffect(() => {
    const handler = () => {
      if (pendingRef.current) void flush();
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [flush]);

  return { state, schedule, flush };
}
