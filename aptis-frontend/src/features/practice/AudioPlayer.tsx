import { useEffect, useRef, useState } from 'react';
import { assetApi } from '@/api/endpoints';
import { claimPlayback, releasePlayback } from '@/features/practice/audioSession';
import type { AssetRef } from '@/types/api';

interface Props {
  assets: AssetRef[];
  /** null = không giới hạn số lần phát */
  maxAudioPlays: number | null;
  /** Số lần đã phát theo ghi nhận của backend */
  initialPlayCount: number;
  disabled: boolean;
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75] as const;

export function AudioPlayer({ assets, maxAudioPlays, initialPlayCount, disabled }: Props) {
  const mainAudio = assets.find((asset) => asset.role === 'MAIN_AUDIO') ?? assets[0];
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(initialPlayCount);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!mainAudio) return;
    let cancelled = false;
    setSignedUrl(null);
    setError(null);

    assetApi
      .signedUrl(mainAudio.assetId)
      .then((asset) => {
        if (!cancelled) setSignedUrl(asset.signedUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được file audio');
      });

    return () => {
      cancelled = true;
    };
  }, [mainAudio]);

  // Thuộc tính của phần tử audio KHÔNG tự đồng bộ với state React: audio là
  // DOM có trạng thái riêng. Không áp lại thì sau khi src đổi (chuyển đề, xin
  // lại signed URL) audio mới vẫn giữ muted của lần trước — người dùng thấy
  // thanh thời gian chạy mà không ra tiếng.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    audio.playbackRate = playbackRate;
  }, [muted, playbackRate, signedUrl]);

  // Rời trang hoặc chuyển đề thì dừng hẳn, đừng để audio chạy tiếp ở nền.
  //
  // Phải bắt phần tử vào biến NGAY khi effect chạy: React gỡ ref về null trước
  // khi gọi hàm dọn dẹp, nên đọc audioRef.current trong đó luôn được null và
  // lệnh dừng không bao giờ chạy.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    return () => {
      audio.pause();
      releasePlayback(audio);
    };
  }, [signedUrl]);

  if (!mainAudio) return null;

  const playsLeft = maxAudioPlays === null ? null : Math.max(0, maxAudioPlays - playCount);
  const exhausted = playsLeft === 0;
  const canPlay = !disabled && (!exhausted || playing);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;
    if (audio.paused) {
      // Dừng bài khác TRƯỚC khi gọi play(): play() là promise, đợi tới onPlay
      // thì đã có khoảng hở hai bài cùng kêu.
      claimPlayback(audio);
      try {
        await audio.play();
      } catch {
        // Trình duyệt chặn tự phát hoặc file lỗi — nút trở lại trạng thái dừng
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const cycleRate = () => {
    const audio = audioRef.current;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] ?? 1;
    setPlaybackRate(next);
    if (audio) audio.playbackRate = next;
  };

  return (
    <div
      className={
        'rounded-2xl bg-dark p-4 text-white shadow-sm transition-colors ' +
        (playing ? 'border-2 border-accent' : 'border border-slate-800')
      }
    >
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !signedUrl ? (
        <p className="py-1 text-xs text-slate-400">Đang tải audio…</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <audio
            ref={audioRef}
            src={signedUrl}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={(event) => {
              if (exhausted || disabled) {
                audioRef.current?.pause();
                return;
              }
              claimPlayback(event.currentTarget);
              setPlaying(true);
              setPlayCount((count) => count + 1);
            }}
            onPause={() => setPlaying(false)}
            onEnded={(event) => {
              setPlaying(false);
              releasePlayback(event.currentTarget);
            }}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void togglePlayback()}
              disabled={!canPlay}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-md transition hover:bg-brand-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={playing ? 'Tạm dừng audio' : 'Phát audio'}
              title={playing ? 'Tạm dừng' : 'Phát'}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <span className="font-mono text-xs text-slate-300 min-w-[70px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {playing && (
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                Đang phát
              </span>
            )}
          </div>

          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              disabled={!canPlay}
              onChange={(event) => {
                const audio = audioRef.current;
                const next = Number(event.target.value);
                setCurrentTime(next);
                if (audio) audio.currentTime = next;
              }}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand-500 focus:outline-none"
              aria-label="Thanh thời gian audio"
            />

            <button
              type="button"
              onClick={cycleRate}
              className="rounded-lg bg-slate-800 px-2 py-1 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Đổi tốc độ phát"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className={muted ? 'text-accent' : 'text-slate-400 hover:text-white'}
              aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
              title={muted ? 'Bật tiếng' : 'Tắt tiếng (bài vẫn chạy — bấm ⏸ để dừng)'}
            >
              {muted ? <MutedIcon /> : <VolumeIcon />}
            </button>
          </div>

          {playsLeft !== null && (
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent shrink-0">
              {exhausted ? 'Hết lượt phát' : `Còn ${playsLeft}/${maxAudioPlays} lượt`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-x-0.5"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86Z" /></svg>;
}

function PauseIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}

function VolumeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M11 5 6 9H2v6h4l5 4V5ZM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}

function MutedIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M11 5 6 9H2v6h4l5 4V5ZM23 9l-6 6M17 9l6 6" /></svg>;
}

