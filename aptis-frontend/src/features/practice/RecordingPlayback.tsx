import { useQuery } from '@tanstack/react-query';
import { assetApi } from '@/api/endpoints';

/**
 * Nghe lại bài nói của chính mình ở trang kết quả.
 *
 * <p>URL không lấy sẵn cùng kết quả mà gọi riêng khi cần: presigned URL của
 * MinIO chỉ sống 10 phút, nhúng vào payload kết quả thì người mở lại trang cũ
 * sẽ bấm play ra link hết hạn.
 *
 * <p>Backend kiểm quyền sở hữu trong `requireOwnedOrStaff`, nên học viên không
 * nghe được ghi âm của người khác dù biết assetId.
 */
export function RecordingPlayback({
  assetId,
  label,
}: {
  assetId: string;
  label?: string;
}) {
  const query = useQuery({
    queryKey: ['asset-signed-url', assetId],
    queryFn: () => assetApi.signedUrl(assetId),
    // Link sống 10 phút; refetch sau 8 phút để người đang đọc nhận xét lâu vẫn
    // bấm play được.
    staleTime: 8 * 60_000,
    retry: 1,
  });

  if (query.isLoading) {
    return (
      <p className="text-xs text-slate-500">Đang tải bản ghi âm…</p>
    );
  }

  // Ghi âm cũ có thể đã bị dọn theo lịch, hoặc asset lỗi — nói rõ thay vì hiện
  // một player không chạy.
  if (query.error || !query.data?.signedUrl) {
    return (
      <p className="text-xs text-slate-500">
        Không tải được bản ghi âm này. Có thể file đã hết thời gian lưu.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      )}
      {/* preload="none": một đề Speaking có nhiều bản ghi, tải sẵn hết là kéo
          vài MB không ai nghe. */}
      <audio
        controls
        preload="none"
        src={query.data.signedUrl}
        className="h-9 w-full max-w-md"
      >
        Trình duyệt của bạn không phát được audio.
      </audio>
    </div>
  );
}
