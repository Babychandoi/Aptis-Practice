package vn.weconex.aptis.evaluation.service;

import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;

/** Transcribes Speaking audio and collects local acoustic measurements. */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranscriptionService {

    private static final int MAX_AUDIO_BYTES = 10 * 1024 * 1024;

    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;
    private final ObjectProvider<LlmTranscriptionClient> transcriptionClient;
    private final ObjectProvider<LocalSpeakingAnalysisClient> localAnalysisClient;

    /** Must be explicitly enabled because the remote audio fallback costs money. */
    @Value("${aptis.evaluation.local-audio.fallback-to-remote:false}")
    private boolean fallbackToRemote;

    public record Transcript(
            String text,
            Long durationMs,
            boolean available,
            Map<String, Object> acousticMetrics,
            String source) {

        public Transcript {
            text = text == null ? "" : text;
            acousticMetrics = acousticMetrics == null ? Map.of() : Map.copyOf(acousticMetrics);
            source = source == null ? "none" : source;
        }

        public Transcript(String text, Long durationMs, boolean available) {
            this(text, durationMs, available, Map.of(), "none");
        }
    }

    public Transcript transcribe(String recordingAssetId) {
        if (recordingAssetId == null) {
            return new Transcript("", null, false);
        }
        Asset asset = assetRepository.findById(recordingAssetId).orElse(null);
        if (asset == null) {
            log.warn("Recording asset {} was not found", recordingAssetId);
            return new Transcript("", null, false);
        }
        if (!asset.isReady()) {
            log.warn("Recording asset {} is not READY ({})", recordingAssetId, asset.getStatus());
            return new Transcript("", asset.getDurationMs(), false);
        }
        if (asset.getFileSize() != null && asset.getFileSize() > MAX_AUDIO_BYTES) {
            log.warn("Recording {} is too large ({} bytes)", recordingAssetId, asset.getFileSize());
            return new Transcript("", asset.getDurationMs(), false);
        }

        LocalSpeakingAnalysisClient localClient = localAnalysisClient.getIfAvailable();
        LlmTranscriptionClient remoteClient = transcriptionClient.getIfAvailable();
        if (localClient == null && remoteClient == null) {
            log.debug("No transcription provider is enabled for asset {}", recordingAssetId);
            return new Transcript("", asset.getDurationMs(), false);
        }

        try {
            byte[] audio = storageClient.download(asset.getBucketName(), asset.getObjectKey());
            if (localClient != null) {
                try {
                    LocalSpeakingAnalysisClient.Analysis analysis =
                            localClient.analyze(audio, asset.getMimeType());
                    log.debug("Local Speaking asset {}: {} bytes -> {} chars, {} metrics",
                            recordingAssetId, audio.length, analysis.transcript().length(),
                            analysis.metrics().size());
                    // A successful empty transcript means silence, not a provider failure.
                    return new Transcript(
                            analysis.transcript(), asset.getDurationMs(), true,
                            analysis.metrics(), "local");
                } catch (Exception ex) {
                    log.error("Local Speaking analyzer failed for asset {}: {}",
                            recordingAssetId, ex.getMessage());
                    if (!fallbackToRemote) {
                        return new Transcript("", asset.getDurationMs(), false,
                                Map.of(), "local-error");
                    }
                    log.warn("Falling back to paid remote audio STT for asset {}", recordingAssetId);
                }
            }

            if (remoteClient == null) {
                return new Transcript("", asset.getDurationMs(), false);
            }
            String text = remoteClient.transcribe(audio, asset.getMimeType());
            log.debug("Remote STT asset {}: {} bytes -> {} chars",
                    recordingAssetId, audio.length, text.length());
            return new Transcript(text, asset.getDurationMs(), !text.isBlank(),
                    Map.of(), "remote-llm");

        } catch (Exception ex) {
            log.error("Cannot transcribe recording asset {}: {}", recordingAssetId, ex.getMessage());
            return new Transcript("", asset.getDurationMs(), false);
        }
    }
}
