import { useEffect, useState } from 'react';
import { assetApi } from '@/api/endpoints';
import type { AssetRef } from '@/types/api';

interface Props {
  assets: AssetRef[];
}

/**
 * Ảnh ngữ liệu dùng chung cho cả bộ câu hỏi — Speaking Part 2 và Part 3 đưa một
 * ảnh rồi hỏi 3 câu về ảnh đó.
 *
 * Ảnh nằm trong bucket private nên phải xin signed URL như audio, không dùng
 * được đường dẫn tĩnh.
 */
export function ImageViewer({ assets }: Props) {
  const mainImage = assets.find((asset) => asset.role === 'MAIN_IMAGE') ?? assets[0];
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Bấm vào ảnh để xem to — ảnh đề thi nhiều chi tiết nhỏ, thí sinh cần miêu tả.
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!mainImage) return;
    let cancelled = false;
    setSignedUrl(null);
    setError(false);

    assetApi
      .signedUrl(mainImage.assetId)
      .then((asset) => {
        if (!cancelled) setSignedUrl(asset.signedUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mainImage]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (!mainImage) return null;

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Không tải được ảnh của đề này. Thử tải lại trang.
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
            title="Bấm để xem ảnh lớn"
          >
            <img
              src={signedUrl}
              alt="Ảnh của đề bài"
              className="max-h-[420px] w-full object-contain"
            />
          </button>
        ) : (
          <div className="grid h-48 place-items-center text-xs text-stone-400">Đang tải ảnh…</div>
        )}
      </div>

      {zoomed && signedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh của đề bài"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-4"
        >
          <img src={signedUrl} alt="Ảnh của đề bài" className="max-h-full max-w-full object-contain" />
          <span className="absolute bottom-4 text-xs text-white/70">Bấm bất kỳ hoặc Esc để đóng</span>
        </div>
      )}
    </>
  );
}
