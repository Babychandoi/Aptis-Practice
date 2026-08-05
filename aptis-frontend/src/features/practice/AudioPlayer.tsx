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

/**
 * Phát audio Listening qua signed URL ngắn hạn.
 *
 * <p>Giới hạn số lần phát ở đây chỉ là trải nghiệm người dùng — nó ngăn học
 * viên bấm thêm, nhưng không phải hàng rào bảo mật vì signed URL đã ở trên
 * client. Kiểm soát thật nằm ở backend (cột audio_play_count).
 */
export function AudioPlayer({ assets, maxAudioPlays, initialPlayCount, disabled }: Props) {
  const mainAudio = assets.find((asset) => asset.role === 'MAIN_AUDIO') ?? assets[0];

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(initialPlayCount);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!mainAudio) return;

    let cancelled = false;
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

  return (
    <div className="mb-4 rounded-lg bg-slate-100 p-3">
      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : !signedUrl ? (
        <p className="text-sm text-slate-500">Đang tải audio…</p>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            controls
            src={signedUrl}
            className="w-full"
            onPlay={() => {
              if (exhausted || disabled) {
                audioRef.current?.pause();
                return;
              }
              setPlayCount((count) => count + 1);
            }}
          />

          <p className="mt-1.5 text-xs text-slate-500">
            {maxAudioPlays === null
              ? 'Nghe lại không giới hạn'
              : exhausted
                ? 'Đã dùng hết số lần nghe cho phép'
                : `Còn ${playsLeft}/${maxAudioPlays} lần nghe`}
          </p>
        </>
      )}
    </div>
  );
}
