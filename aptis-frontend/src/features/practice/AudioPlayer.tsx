import { useEffect, useRef, useState } from 'react';
import { assetApi } from '@/api/endpoints';
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

  if (!mainAudio) return null;

  const playsLeft = maxAudioPlays === null ? null : Math.max(0, maxAudioPlays - playCount);
  const exhausted = playsLeft === 0;
  const canPlay = !disabled && (!exhausted || playing);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  };

  const cycleRate = () => {
    const audio = audioRef.current;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] ?? 1;
    setPlaybackRate(next);
    if (audio) audio.playbackRate = next;
  };

  return (
    <div className="rounded-xl border border-[#e5d4aa] bg-[linear-gradient(180deg,#fffaf0_0%,#faebc5_100%)] px-3 py-2.5 sm:px-4">
      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : !signedUrl ? (
        <p className="py-1 text-xs text-stone-500">Đang tải audio…</p>
      ) : (
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={signedUrl}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => {
              if (exhausted || disabled) {
                audioRef.current?.pause();
                return;
              }
              setPlaying(true);
              setPlayCount((count) => count + 1);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />

          <button
            type="button"
            onClick={() => void togglePlayback()}
            disabled={!canPlay}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-800 text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={playing ? 'Tạm dừng audio' : 'Phát audio'}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span className="hidden shrink-0 font-mono text-[11px] text-stone-700 sm:inline">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            onChange={(event) => {
              const next = Number(event.target.value);
              setCurrentTime(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
            disabled={disabled || duration === 0}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-brand-800"
            aria-label="Vị trí audio"
          />

          <button type="button" onClick={cycleRate} className="h-8 min-w-11 rounded-lg border border-white/80 bg-white px-2 text-[11px] font-medium text-stone-700" aria-label="Đổi tốc độ phát">
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (audioRef.current) audioRef.current.muted = next;
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white text-stone-700"
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            <VolumeIcon muted={muted} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!audioRef.current) return;
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white text-stone-700"
            aria-label="Phát lại từ đầu"
          >
            <RestartIcon />
          </button>
        </div>
      )}

      {maxAudioPlays !== null && signedUrl && (
        <p className="mt-1.5 text-right text-[10px] text-stone-500">
          {exhausted ? 'Đã dùng hết số lần nghe' : `Còn ${playsLeft}/${maxAudioPlays} lần nghe`}
        </p>
      )}
    </div>
  );
}

function formatClock(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg>;
}

function PauseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M9 7v10M15 7v10" /></svg>;
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M6 10H3v4h3l4 3V7l-4 3Z" />{muted ? <path d="m15 10 4 4m0-4-4 4" /> : <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />}</svg>;
}

function RestartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 7" /></svg>;
}
