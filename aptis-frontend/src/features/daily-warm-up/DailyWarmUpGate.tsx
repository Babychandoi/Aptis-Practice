import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { dailyWarmUpApi } from '@/api/endpoints';
import { MfIcon } from '@/features/monthly-focus/mfUi';
import { TypingWarmUp } from './TypingWarmUp';
import { warmUpDoneKey } from './warmUpLogic';

// Speaking kéo theo bộ ghi âm; chỉ tải khi hôm nay là ngày Speaking.
const SpeakingMarathon = lazy(() => import('./SpeakingMarathon').then((m) => ({ default: m.SpeakingMarathon })));

/** Đã khởi động trong phiên này (localStorage có thể bị chặn ở chế độ ẩn danh). */
const doneThisSession = new Set<string>();

/**
 * "Khởi động hôm nay": hiện một lần mỗi ngày khi học viên vào trang chủ, như
 * aptisprep.com. Ngày lẻ gõ lại câu trả lời mẫu Writing, ngày chẵn luyện Speaking
 * Marathon. Đóng giữa chừng cũng tính là đã xem hôm nay, để không làm phiền lại.
 */
export function DailyWarmUpGate({ userId }: { userId?: string }) {
  const query = useQuery({
    queryKey: ['daily-warm-up'],
    queryFn: dailyWarmUpApi.today,
    enabled: Boolean(userId),
    staleTime: 10 * 60_000,
  });
  const data = query.data;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const sessionKey = userId && data ? `${userId}:${data.dayKey}` : null;

  useEffect(() => {
    if (!userId || !data || data.mode === 'NONE' || !sessionKey) return;
    let done = doneThisSession.has(sessionKey);
    try { done ||= localStorage.getItem(warmUpDoneKey(userId)) === data.dayKey; } catch { /* ẩn danh */ }
    setOpen(!done);
  }, [userId, data, sessionKey]);

  const markDone = useCallback(() => {
    if (!userId || !data || !sessionKey) return;
    doneThisSession.add(sessionKey);
    try { localStorage.setItem(warmUpDoneKey(userId), data.dayKey); } catch { /* ẩn danh */ }
  }, [userId, data, sessionKey]);

  const close = useCallback(() => { markDone(); setOpen(false); }, [markDone]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus({ preventScroll: true });
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open || !data || data.mode === 'NONE') return null;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Khởi động hôm nay"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 outline-none backdrop-blur-sm sm:p-6"
    >
      {/* Khung không cao quá màn hình; nội dung tự cuộn bên trong, phần đầu/cuối dính lại. */}
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={close}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <MfIcon name="x" className="h-5 w-5" />
        </button>
        {data.mode === 'TYPING' ? (
          <TypingWarmUp items={data.items} userId={userId!} onFinished={markDone} onEnter={() => setOpen(false)} />
        ) : (
          <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500" role="status">Đang tải bài luyện…</p>}>
            <SpeakingMarathon part={data.part ?? 1} questions={data.questions} onFinished={markDone} onEnter={() => setOpen(false)} />
          </Suspense>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
