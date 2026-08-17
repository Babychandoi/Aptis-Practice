import { useEffect, useMemo, useState } from 'react';
import { assetApi } from '@/api/endpoints';
import type { AssetRef } from '@/types/api';

interface Props {
  assets: AssetRef[];
}

/** Hiển thị một hoặc nhiều ảnh dùng chung của đề Speaking. */
export function ImageViewer({ assets }: Props) {
  const orderedImages = useMemo(
    () => [...assets].sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0)),
    [assets],
  );

  if (orderedImages.length === 0) return null;

  return (
    <div className={orderedImages.length > 1 ? 'grid gap-3 sm:grid-cols-2' : ''}>
      {orderedImages.map((asset, index) => (
        <ImageAsset
          key={`${asset.assetId}:${asset.role}`}
          asset={asset}
          label={orderedImages.length > 1 ? `Ảnh ${index + 1}` : 'Ảnh của đề bài'}
        />
      ))}
    </div>
  );
}

function ImageAsset({ asset, label }: { asset: AssetRef; label: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setError(false);
    assetApi
      .signedUrl(asset.assetId)
      .then((response) => {
        if (!cancelled) setSignedUrl(response.signedUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [asset.assetId]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Không tải được {label.toLowerCase()}. Thử tải lại trang.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#dfe5dd] bg-white">
        {signedUrl ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full cursor-zoom-in"
            title={`Bấm để xem lớn ${label.toLowerCase()}`}
          >
            <img src={signedUrl} alt={label} className="h-[280px] w-full object-contain sm:h-[340px]" />
          </button>
        ) : (
          <div className="grid h-48 place-items-center text-xs text-stone-400">Đang tải {label.toLowerCase()}…</div>
        )}
      </div>

      {zoomed && signedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-4"
        >
          <img src={signedUrl} alt={label} className="max-h-full max-w-full object-contain" />
          <span className="absolute bottom-4 text-xs text-white/70">Bấm bất kỳ hoặc Esc để đóng</span>
        </div>
      )}
    </>
  );
}
