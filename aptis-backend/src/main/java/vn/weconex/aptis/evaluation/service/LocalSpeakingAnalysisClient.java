package vn.weconex.aptis.evaluation.service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/** Calls the self-hosted analyzer. Audio never leaves the private Docker network. */
@Slf4j
@Component
@ConditionalOnProperty(name = "aptis.evaluation.local-audio.enabled", havingValue = "true")
public class LocalSpeakingAnalysisClient {

    public record Analysis(String transcript, Map<String, Object> metrics) {
        public Analysis {
            transcript = transcript == null ? "" : transcript.trim();
            metrics = metrics == null ? Map.of() : Map.copyOf(metrics);
        }
    }

    private final String baseUrl;
    private final RestTemplate restTemplate;

    public LocalSpeakingAnalysisClient(
            @Value("${aptis.evaluation.local-audio.base-url:http://localhost:8000}") String baseUrl,
            @Value("${aptis.evaluation.local-audio.timeout-seconds:300}") int timeoutSeconds) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.strip().replaceAll("/+$", "");
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        this.restTemplate = new RestTemplate(factory);
        log.info("Local Speaking analyzer ready at {}", this.baseUrl);
    }

    @SuppressWarnings("unchecked")
    public Analysis analyze(byte[] audio, String mimeType) {
        if (audio == null || audio.length == 0) {
            return new Analysis("", Map.of());
        }
        String contentType = mimeType == null || mimeType.isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM_VALUE : mimeType;
        ByteArrayResource resource = new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return "recording." + extensionFor(contentType);
            }
        };
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", new HttpEntity<>(resource, fileHeaders));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/analyze", HttpMethod.POST,
                new HttpEntity<>(parts, headers), Map.class);
        Map<String, Object> body = response.getBody();
        if (body == null) {
            throw new IllegalStateException("Local Speaking analyzer returned an empty body");
        }
        Object transcript = body.get("transcript");
        Map<String, Object> metrics = body.get("metrics") instanceof Map<?, ?> raw
                ? new LinkedHashMap<>((Map<String, Object>) raw) : Map.of();
        return new Analysis(transcript == null ? "" : transcript.toString(), metrics);
    }

    private static String extensionFor(String mimeType) {
        String normalized = mimeType.toLowerCase();
        if (normalized.contains("wav")) return "wav";
        if (normalized.contains("mpeg") || normalized.contains("mp3")) return "mp3";
        if (normalized.contains("ogg")) return "ogg";
        if (normalized.contains("mp4")) return "mp4";
        return "webm";
    }
}
