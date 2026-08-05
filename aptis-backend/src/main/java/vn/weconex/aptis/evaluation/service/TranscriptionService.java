package vn.weconex.aptis.evaluation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;

/**
 * Chuyển giọng nói thành văn bản cho luồng chấm Speaking (PHẦN IV §40 bước 6).
 *
 * <p><b>Chưa tích hợp STT thật.</b> Implementation hiện tại chỉ đọc metadata file
 * ghi âm và trả về transcript rỗng kèm ghi chú. Nhờ vậy luồng chấm chạy được
 * end-to-end, nhưng điểm Speaking chưa phản ánh nội dung học viên nói.
 *
 * <p>Để tích hợp thật: thay thân {@link #transcribe} bằng lệnh gọi Whisper,
 * Google STT hoặc Azure Speech — tải file từ MinIO qua presigned URL rồi gửi
 * lên provider. Chữ ký hàm không cần đổi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranscriptionService {

    private final AssetRepository assetRepository;

    /**
     * @param text       nội dung nói; rỗng khi chưa có STT
     * @param durationMs thời lượng bản ghi, lấy từ metadata asset
     * @param available  false nghĩa là transcript chưa dùng được để chấm nội dung
     */
    public record Transcript(String text, Long durationMs, boolean available) {
    }

    public Transcript transcribe(String recordingAssetId) {
        if (recordingAssetId == null) {
            return new Transcript("", null, false);
        }

        Asset asset = assetRepository.findById(recordingAssetId).orElse(null);
        if (asset == null) {
            log.warn("Không tìm thấy asset ghi âm {}", recordingAssetId);
            return new Transcript("", null, false);
        }
        if (!asset.isReady()) {
            log.warn("Asset ghi âm {} chưa READY (đang {})",
                    recordingAssetId, asset.getStatus());
            return new Transcript("", asset.getDurationMs(), false);
        }

        // TODO Tích hợp STT: tải file qua presigned URL rồi gửi lên provider.
        // Hiện trả transcript rỗng — engine chấm sẽ dựa vào thời lượng bản ghi.
        log.debug("STT chưa tích hợp; bỏ qua transcript cho asset {} ({} ms)",
                recordingAssetId, asset.getDurationMs());

        return new Transcript("", asset.getDurationMs(), false);
    }
}
