package vn.weconex.aptis.evaluation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;

/**
 * Chuyển giọng nói thành văn bản cho luồng chấm Speaking (PHẦN IV §40 bước 6).
 *
 * <p>Dùng {@link LlmTranscriptionClient} khi bật {@code aptis.evaluation.stt}:
 * tải file từ MinIO rồi gửi cho model đa phương thức nghe. Không bật thì trả
 * transcript rỗng — luồng chấm vẫn chạy nhưng điểm Speaking không phản ánh nội
 * dung học viên nói.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranscriptionService {

    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;

    /**
     * Rỗng khi chưa cấu hình STT. Dùng ObjectProvider thay vì @Autowired
     * required=false để bean chỉ được tạo khi cờ bật.
     */
    private final ObjectProvider<LlmTranscriptionClient> transcriptionClient;

    /**
     * Giới hạn kích thước file đưa vào bộ nhớ. Bài Speaking dài nhất là 2 phút
     * (~1 MB webm/opus), nên 10 MB đã rất rộng; đặt trần để một file lỗi không
     * làm hết heap của worker.
     */
    private static final int MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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

        LlmTranscriptionClient client = transcriptionClient.getIfAvailable();
        if (client == null) {
            log.debug("STT chưa bật; bỏ qua transcript cho asset {} ({} ms)",
                    recordingAssetId, asset.getDurationMs());
            return new Transcript("", asset.getDurationMs(), false);
        }

        if (asset.getFileSize() != null && asset.getFileSize() > MAX_AUDIO_BYTES) {
            log.warn("Bản ghi {} quá lớn ({} bytes), bỏ qua STT",
                    recordingAssetId, asset.getFileSize());
            return new Transcript("", asset.getDurationMs(), false);
        }

        try {
            byte[] audio = storageClient.download(asset.getBucketName(), asset.getObjectKey());
            String text = client.transcribe(audio, asset.getMimeType());

            // DEBUG, không INFO: mỗi bài Speaking sinh một dòng, bật INFO thì log
            // production bị ngập. Cần chẩn đoán thì đổi log level của package.
            log.debug("STT asset {}: {} bytes {} -> {} ký tự",
                    recordingAssetId, audio.length, asset.getMimeType(), text.length());
            // available = false khi không nghe ra tiếng nói: engine chấm phải biết
            // để không trừ điểm nội dung dựa trên transcript rỗng.
            return new Transcript(text, asset.getDurationMs(), !text.isBlank());

        } catch (Exception ex) {
            log.error("Không lấy được transcript cho asset {}: {}",
                    recordingAssetId, ex.getMessage());
            return new Transcript("", asset.getDurationMs(), false);
        }
    }
}
