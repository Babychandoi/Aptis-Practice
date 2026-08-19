package vn.weconex.aptis.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import vn.weconex.aptis.common.util.Enums.EvaluationType;

class LlmEvaluationEngineTest {

    @Test
    void serializesLocalAcousticMetricsIntoTextPromptWithoutRuntimeCast() {
        LlmEvaluationEngine engine = engine();
        EvaluationEngine.EvaluationRequest request = new EvaluationEngine.EvaluationRequest(
                EvaluationType.SPEAKING_AI,
                null,
                "This is a clear spoken answer.",
                "asset-1",
                12_000L,
                Map.of("fluencyEstimate", 0.91, "longPauseCount", 1),
                new EvaluationEngine.RubricSpec(
                        "SPEAKING", 1, 5,
                        List.of(new EvaluationEngine.CriterionSpec(
                                "FLUENCY", "Fluency", 1, 5))),
                "Tell me about your trip.",
                Map.of());

        String prompt = ReflectionTestUtils.invokeMethod(
                engine, "buildUserPrompt", request, request.transcript());

        assertThat(prompt)
                .contains("Local acoustic metrics")
                .contains("\"fluencyEstimate\":0.91")
                .contains("\"longPauseCount\":1");
    }

    @Test
    void removesPronunciationClaimsInventedByTextOnlyModel() {
        EvaluationEngine.Feedback raw = new EvaluationEngine.Feedback(
                "Nội dung tốt.",
                List.of("Phát âm rõ ràng và dễ nghe.", "Từ vựng phong phú."),
                List.of("Ngữ điệu đôi lúc chưa tự nhiên.", "Có một lỗi ngữ pháp."),
                List.of("Cải thiện pronunciation.", "Dùng thêm từ nối."),
                "Corrected answer");

        EvaluationEngine.Feedback clean = ReflectionTestUtils.invokeMethod(
                engine(), "sanitizeSpeakingFeedback", raw);

        assertThat(clean.strengths()).containsExactly("Từ vựng phong phú.");
        assertThat(clean.weaknesses()).containsExactly("Có một lỗi ngữ pháp.");
        assertThat(clean.suggestions()).containsExactly("Dùng thêm từ nối.");
    }

    @Test
    void parsesMarkdownCommentaryAndDoubleEncodedJson() {
        assertThat(LlmEvaluationEngine.parseModelJson(
                "Kết quả:\n```json\n{\"criteria\":[]}\n```\nDone.")
                .path("criteria").isArray()).isTrue();
        assertThat(LlmEvaluationEngine.parseModelJson(
                "\"{\\\"criteria\\\":[]}\"")
                .path("criteria").isArray()).isTrue();
    }

    /**
     * Ca thật từ log production: AI-PRO là reasoning model, nó xuất chuỗi tự
     * vấn ("Wait, the prompt says...", "Let's check the criteria codes:") rồi
     * mới tới JSON. Miễn object còn nguyên thì vẫn phải chấm được.
     */
    @Test
    void parsesJsonBuriedUnderReasoningNarrationFromReasoningModel() {
        String reply = """
                Wait, the prompt says "Reply with raw JSON only — no markdown fence".
                Let's make sure the JSON is valid and has no markdown formatting.

                Let's check the criteria codes:
                - TASK_FULFILMENT
                - GRAMMAR

                {"criteria":[{"code":"TASK_FULFILMENT","score":4,"feedback":"Tốt."},
                {"code":"GRAMMAR","score":3,"feedback":"Còn lỗi thì."}],
                "cefrLevel":"B1","summary":"Khá","strengths":["Ý rõ"],
                "weaknesses":["Thì"],"suggestions":["Ôn thì"],"correctedVersion":"x"}
                """;

        var parsed = LlmEvaluationEngine.parseModelJson(reply);

        assertThat(parsed.path("criteria")).hasSize(2);
        assertThat(parsed.path("cefrLevel").asText()).isEqualTo("B1");
    }

    @Test
    void rejectsTruncatedOrNonObjectJsonInsteadOfGuessingScores() {
        assertThatThrownBy(() -> LlmEvaluationEngine.parseModelJson(
                "{\"criteria\":[{\"code\":\"GRAMMAR\",\"score\":3"))
                .isInstanceOf(EvaluationProviderException.class)
                .hasMessageContaining("bị cắt");
        assertThatThrownBy(() -> LlmEvaluationEngine.parseModelJson("[1,2,3]"))
                .isInstanceOf(EvaluationProviderException.class)
                .hasMessageContaining("object");
    }

    @Test
    void safelyReadsOpenAiTextPartsAndFinishReason() {
        ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(Map.of(
                "choices", List.of(Map.of(
                        "finish_reason", "stop",
                        "message", Map.of("content", List.of(
                                Map.of("type", "text", "text", "{\"cri"),
                                Map.of("type", "text", "text", "teria\":[]}")))))));

        LlmEvaluationEngine.ModelMessage message = LlmEvaluationEngine.extractContent(response);

        assertThat(message.content()).isEqualTo("{\"criteria\":[]}");
        assertThat(message.finishReason()).isEqualTo("stop");
    }

    @Test
    void rejectsMalformedGatewayEnvelopeWithoutClassCastException() {
        ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(Map.of(
                "choices", "not-an-array"));

        assertThatThrownBy(() -> LlmEvaluationEngine.extractContent(response))
                .isInstanceOf(EvaluationProviderException.class)
                .hasMessageContaining("choices");
    }

    @Test
    void requiresEveryScoreRejectsDuplicatesAndClampsOutOfRangeValues() {
        EvaluationEngine.EvaluationRequest request = writingRequest();
        LlmEvaluationEngine engine = engine();

        assertThatThrownBy(() -> toResult(engine,
                "{\"criteria\":[{\"code\":\"GRAMMAR\"}]} ", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("thiếu score");

        assertThatThrownBy(() -> toResult(engine,
                "{\"criteria\":[{\"code\":\"GRAMMAR\",\"score\":2},"
                        + "{\"code\":\"grammar\",\"score\":3}]}", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("trùng tiêu chí");

        EvaluationEngine.EvaluationResult result = toResult(engine,
                "{\"criteria\":[{\"code\":\"GRAMMAR\",\"score\":99}],"
                        + "\"cefrLevel\":\"INVALID\"}", request);
        assertThat(result.totalScore()).isEqualTo(3);
        assertThat(result.cefrLevel()).isEqualTo("C2");
        assertThat(result.feedback().summary()).contains("100%");
    }

    private static EvaluationEngine.EvaluationResult toResult(
            LlmEvaluationEngine engine,
            String json,
            EvaluationEngine.EvaluationRequest request) {
        return ReflectionTestUtils.invokeMethod(
                engine,
                "toResult",
                LlmEvaluationEngine.parseModelJson(json),
                request.rubric(),
                request);
    }

    private static EvaluationEngine.EvaluationRequest writingRequest() {
        return new EvaluationEngine.EvaluationRequest(
                EvaluationType.WRITING_AI,
                "A complete answer.",
                null,
                null,
                null,
                Map.of(),
                new EvaluationEngine.RubricSpec(
                        "WRITING", 1, 3,
                        List.of(new EvaluationEngine.CriterionSpec(
                                "GRAMMAR", "Grammar", 1, 3))),
                "Write an answer.",
                Map.of());
    }

    private static LlmEvaluationEngine engine() {
        // Pool một nhà cung cấp giả: các test ở đây chỉ kiểm phần dựng prompt và
        // đọc kết quả, không thực sự gọi mạng.
        LlmProviderPool pool = new LlmProviderPool(
                "", "http://unused.local/v1", "test-key", "test-model", 1);
        return new LlmEvaluationEngine(pool, 0.2, 512, 5);
    }
}
