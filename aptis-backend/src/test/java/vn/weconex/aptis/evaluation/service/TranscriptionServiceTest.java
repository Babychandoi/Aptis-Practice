package vn.weconex.aptis.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.util.Enums.AssetStatus;

class TranscriptionServiceTest {

    @Test
    void usesLocalAnalyzerAndDoesNotSendAudioToPaidProvider() {
        Fixture fixture = fixture();
        when(fixture.local.analyze(fixture.audio, "audio/wav"))
                .thenReturn(new LocalSpeakingAnalysisClient.Analysis(
                        "A clear local transcript.",
                        Map.of("fluencyEstimate", 0.91, "wordsPerMinute", 138.0)));

        TranscriptionService.Transcript result = fixture.service.transcribe("recording-1");

        assertThat(result.available()).isTrue();
        assertThat(result.source()).isEqualTo("local");
        assertThat(result.text()).isEqualTo("A clear local transcript.");
        assertThat(result.acousticMetrics()).containsEntry("fluencyEstimate", 0.91);
        verify(fixture.remote, never()).transcribe(fixture.audio, "audio/wav");
    }

    @Test
    void localFailureDoesNotUsePaidFallbackByDefault() {
        Fixture fixture = fixture();
        when(fixture.local.analyze(fixture.audio, "audio/wav"))
                .thenThrow(new IllegalStateException("analyzer unavailable"));

        TranscriptionService.Transcript result = fixture.service.transcribe("recording-1");

        assertThat(result.available()).isFalse();
        assertThat(result.source()).isEqualTo("local-error");
        verify(fixture.remote, never()).transcribe(fixture.audio, "audio/wav");
    }

    @SuppressWarnings("unchecked")
    private static Fixture fixture() {
        byte[] audio = new byte[] {1, 2, 3, 4};
        AssetRepository assets = mock(AssetRepository.class);
        MinioStorageClient storage = mock(MinioStorageClient.class);
        LocalSpeakingAnalysisClient local = mock(LocalSpeakingAnalysisClient.class);
        LlmTranscriptionClient remote = mock(LlmTranscriptionClient.class);
        ObjectProvider<LocalSpeakingAnalysisClient> localProvider = mock(ObjectProvider.class);
        ObjectProvider<LlmTranscriptionClient> remoteProvider = mock(ObjectProvider.class);

        Asset asset = new Asset();
        asset.setId("recording-1");
        asset.setBucketName("recordings");
        asset.setObjectKey("users/u1/recording.wav");
        asset.setMimeType("audio/wav");
        asset.setFileSize((long) audio.length);
        asset.setDurationMs(12_000L);
        asset.setStatus(AssetStatus.READY);

        when(assets.findById("recording-1")).thenReturn(Optional.of(asset));
        when(storage.download("recordings", "users/u1/recording.wav")).thenReturn(audio);
        when(localProvider.getIfAvailable()).thenReturn(local);
        when(remoteProvider.getIfAvailable()).thenReturn(remote);

        TranscriptionService service = new TranscriptionService(
                assets, storage, remoteProvider, localProvider);
        ReflectionTestUtils.setField(service, "fallbackToRemote", false);
        return new Fixture(service, local, remote, audio);
    }

    private record Fixture(
            TranscriptionService service,
            LocalSpeakingAnalysisClient local,
            LlmTranscriptionClient remote,
            byte[] audio) {
    }
}
