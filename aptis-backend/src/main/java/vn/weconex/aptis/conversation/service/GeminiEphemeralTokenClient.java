package vn.weconex.aptis.conversation.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

@Component
@RequiredArgsConstructor
public class GeminiEphemeralTokenClient {
    private static final URI TOKEN_URI = URI.create("https://generativelanguage.googleapis.com/v1beta/auth_tokens");
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public Token create(String systemInstruction, GeminiProviderPool.Credential credential, int sessionMinutes,
            String resumptionHandle, String voice) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(sessionMinutes + 5L));
        Instant newSessionExpiresAt = now.plusSeconds(60);
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("responseModalities", List.of("AUDIO"));
        generationConfig.put("speechConfig", Map.of("voiceConfig", Map.of(
                "prebuiltVoiceConfig", Map.of("voiceName", voice))));
        Map<String, Object> setup = new LinkedHashMap<>();
        setup.put("model", "models/" + credential.model());
        setup.put("generationConfig", generationConfig);
        setup.put("inputAudioTranscription", Map.of());
        setup.put("outputAudioTranscription", Map.of());
        // With a locked bidiGenerateContentSetup, client-side setup values are ignored.
        // Keep VAD and no-interruption behavior on the server's authoritative setup.
        setup.put("realtimeInputConfig", Map.of(
                "activityHandling", "NO_INTERRUPTION",
                "automaticActivityDetection", Map.of(
                        "disabled", false,
                        "startOfSpeechSensitivity", "START_SENSITIVITY_HIGH",
                        "endOfSpeechSensitivity", "END_SENSITIVITY_HIGH",
                        "prefixPaddingMs", 100,
                        "silenceDurationMs", 600)));
        setup.put("sessionResumption", resumptionHandle == null || resumptionHandle.isBlank()
                ? Map.of() : Map.of("handle", resumptionHandle));
        setup.put("contextWindowCompression", Map.of(
                "triggerTokens", "80000",
                "slidingWindow", Map.of("targetTokens", "40000")));
        setup.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        Map<String, Object> body = Map.of(
                "uses", 1,
                "expireTime", expiresAt.toString(),
                "newSessionExpireTime", newSessionExpiresAt.toString(),
                "bidiGenerateContentSetup", setup);
        try {
            HttpRequest request = HttpRequest.newBuilder(TOKEN_URI)
                    .timeout(Duration.ofSeconds(20))
                    .header("x-goog-api-key", credential.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,
                        "Gemini không cấp được token tạm (HTTP " + response.statusCode() + ")");
            }
            JsonNode json = objectMapper.readTree(response.body());
            String name = json.path("name").asText();
            if (name.isBlank()) throw new IllegalStateException("Gemini response thiếu token name");
            return new Token(name, expiresAt, newSessionExpiresAt);
        } catch (ApiException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Kết nối Gemini bị gián đoạn");
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Không kết nối được Gemini Live");
        }
    }

    /** Kiểm tra credential độc lập với model/config đang chuẩn bị phát hành. */
    public Token testCredential(String apiKey, String model) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(5));
        Instant newSessionExpiresAt = now.plusSeconds(60);
        return requestToken(apiKey, Map.of(
                "uses", 1,
                "expireTime", expiresAt.toString(),
                "newSessionExpireTime", newSessionExpiresAt.toString(),
                "bidiGenerateContentSetup", Map.of(
                        "model", "models/" + model,
                        "sessionResumption", Map.of(),
                        "contextWindowCompression", Map.of(
                                "triggerTokens", "80000",
                                "slidingWindow", Map.of("targetTokens", "40000")),
                        "generationConfig", Map.of("responseModalities", List.of("AUDIO")))),
                expiresAt, newSessionExpiresAt);
    }

    private Token requestToken(String apiKey, Map<String, Object> body,
            Instant expiresAt, Instant newSessionExpiresAt) {
        try {
            HttpRequest request = HttpRequest.newBuilder(TOKEN_URI)
                    .timeout(Duration.ofSeconds(20))
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String detail = objectMapper.readTree(response.body()).path("error").path("message").asText();
                if (detail.length() > 300) detail = detail.substring(0, 300);
                throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,
                        "Gemini từ chối key (HTTP " + response.statusCode() + "): " + detail);
            }
            JsonNode json = objectMapper.readTree(response.body());
            String name = json.path("name").asText();
            if (name.isBlank()) throw new IllegalStateException("Gemini response thiếu token name");
            return new Token(name, expiresAt, newSessionExpiresAt);
        } catch (ApiException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Kết nối Gemini bị gián đoạn");
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Không kết nối được Gemini Live");
        }
    }

    public record Token(String value, Instant expiresAt, Instant newSessionExpiresAt) {}
}
