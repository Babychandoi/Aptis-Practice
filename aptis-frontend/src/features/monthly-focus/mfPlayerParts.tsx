import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { claimPlayback, releasePlayback } from '@/features/practice/audioSession';
import type { AssetRef } from '@/types/api';
import type { MonthlyFocusPageKey, MonthlyFocusResult } from '@/types/monthlyFocus';
import { MfIcon } from '@/features/monthly-focus/mfUi';
import { audioOrder, FONT_SIZES, useAssetUrls } from '@/features/monthly-focus/mfData';

/**
 * Thanh nghe như website: [Play] "Nhấn Play để nghe" … "Đã nghe: n/2 lần".
 * Một lượt nghe tính khi bắt đầu phát từ đầu; tạm dừng rồi phát tiếp không tính thêm.
 * Đề có nhiều file (Listening 2 cũ lưu mỗi người nói một file) thì phát nối tiếp.
 */
export function ListenBar({
  pageKey, questionSetId, assets, maxPlays = 2,
}: { pageKey: MonthlyFocusPageKey; questionSetId: string; assets: AssetRef[]; maxPlays?: number }) {
  const playlist = audioOrder(assets);
  const urls = useAssetUrls(pageKey, questionSetId, playlist.length > 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState(0);
  const [plays, setPlays] = useState(0);
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const [error, setError] = useState<string | null>(null);

  const src = playlist[track] ? urls.data?.[playlist[track]!.assetId] : undefined;

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) { audio.pause(); releasePlayback(audio); }
    };
  }, []);

  if (playlist.length === 0) return null;

  const fresh = state === 'idle' || state === 'ended';
  const exhausted = fresh && plays >= maxPlays;

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (state === 'playing') { audio.pause(); return; }
    if (exhausted) return;
    if (fresh) {
      // Lượt mới luôn bắt đầu từ file đầu (onEnded đã đưa track về 0).
      audio.currentTime = 0;
      setPlays((n) => n + 1);
    }
    try {
      setError(null);
      claimPlayback(audio);
      await audio.play();
    } catch (err) {
      if ((err as DOMException | undefined)?.name !== 'AbortError') setError('Không phát được audio. Hãy tải lại trang rồi thử lại.');
      setState('paused');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={!src || exhausted}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        <MfIcon name={state === 'playing' ? 'pause' : 'play'} className="h-4 w-4" />
        {state === 'playing' ? 'Pause' : 'Play'}
      </button>
      <span className="text-sm text-slate-500">
        {error ?? (urls.isError ? 'Không tải được audio' : !src ? 'Đang tải audio…'
          : state === 'playing' ? 'Đang phát…' : state === 'paused' ? 'Đã tạm dừng'
            : exhausted ? 'Đã hết lượt nghe' : 'Nhấn Play để nghe')}
      </span>
      <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <MfIcon name="volume" className="h-4 w-4 text-slate-500" /> Đã nghe: {plays}/{maxPlays} lần
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={() => setState('playing')}
        onPause={(e) => { if (!e.currentTarget.ended) setState('paused'); }}
        onCanPlay={(e) => {
          // Sang file kế tiếp trong lượt nghe: phát luôn.
          if (state === 'playing' && e.currentTarget.paused) void e.currentTarget.play().catch(() => setState('paused'));
        }}
        onEnded={(e) => {
          if (track + 1 < playlist.length) { setTrack(track + 1); return; }
          releasePlayback(e.currentTarget);
          setTrack(0);
          setState('ended');
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Ngăn kéo "Tiến độ học"
// ---------------------------------------------------------------------

export interface ProgressCell {
  attempts: number;
  lastResult?: MonthlyFocusResult | null;
}

export function ProgressDrawer({
  open, onClose, label, cells, current, onPick, onClear, onSave, saving, fontSize, onFontSize,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  cells: ProgressCell[];
  current: number;
  onPick: (index: number) => void;
  onClear: () => void;
  onSave: () => void;
  saving: boolean;
  fontSize: number;
  onFontSize: (size: number) => void;
}) {
  const [tab, setTab] = useState<'questions' | 'settings'>('questions');
  const [confirmClear, setConfirmClear] = useState(false);
  const done = cells.filter((c) => c.attempts > 0).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-label="Tiến độ học"
        className="flex h-full w-full max-w-[400px] flex-col bg-white p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-500 hover:text-slate-800">
            <MfIcon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {(['questions', 'settings'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx('flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium',
                tab === t ? 'border-2 border-slate-900 bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
            >
              <MfIcon name={t === 'questions' ? 'list' : 'settings'} className="h-4 w-4" />
              {t === 'questions' ? 'Câu hỏi' : 'Cài đặt'}
            </button>
          ))}
        </div>

        {tab === 'questions' ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Tiến độ học</h3>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600"><MfIcon name="panel" className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p><span className="text-2xl font-bold text-slate-900">{done}</span><span className="text-sm text-slate-500"> / {cells.length}</span></p>
                <span className="text-xs text-slate-500">Đã làm</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${cells.length ? (done / cells.length) * 100 : 0}%` }} />
              </div>
              <div className="mt-3 flex gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Đúng hết</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Còn sai</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-sky-500" /> Đã làm</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-5 gap-2">
                {cells.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onPick(i); onClose(); }}
                    className={clsx(
                      'relative rounded-xl border py-2 text-center transition-colors',
                      i === current ? 'border-2 border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                      cell.lastResult === 'CORRECT' && 'border-emerald-300 bg-emerald-50',
                      cell.lastResult === 'WRONG' && 'border-red-300 bg-red-50',
                      cell.lastResult === 'DONE' && 'border-sky-300',
                    )}
                  >
                    {i === current && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-500" />}
                    <span className="block text-base font-bold text-slate-900">{String(i + 1).padStart(2, '0')}</span>
                    <span className="block text-[10px] text-slate-500">{cell.attempts} lần làm</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 p-3">
              <p className="text-xs text-slate-500">{current + 1} / {cells.length}</p>
              {confirmClear ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { onClear(); setConfirmClear(false); }} className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Xóa hết</button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Thôi</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmClear(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <MfIcon name="trash" className="h-4 w-4" /> Xóa kết quả các câu đã làm
                </button>
              )}
              <button type="button" onClick={onSave} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                <MfIcon name="save" className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu tiến độ học'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900" htmlFor="mf-font">
                <span className="font-serif text-base">T</span> Font Size
              </label>
              <select
                id="mf-font"
                value={fontSize}
                onChange={(e) => onFontSize(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {FONT_SIZES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <p className="mt-2 text-xs text-slate-500">Đổi cỡ chữ của phần làm bài.</p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900">Preview</h4>
              <div className="mt-2 rounded-xl border border-slate-200 p-4" style={{ zoom: fontSize / 16 }}>
                <p className="text-base text-slate-900">The quick brown fox jumps over the lazy dog.</p>
                <p className="mt-1 text-sm text-slate-500">Chữ trong bài sẽ hiện với cỡ này.</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
