package vn.weconex.aptis.evaluation.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Bóc transcript ra khỏi lớp bọc mà model thêm vào.
 *
 * <p>Điểm nguy hiểm nhất: bản ghi câm trả về khung XML rỗng. Không bóc thì code
 * tưởng là có lời nói, đem đi chấm và cho học viên điểm dựa trên một chuỗi rác.
 */
class LlmTranscriptionClientTest {

    private static String sse(String content) {
        String escaped = content.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n");
        return "data: {\"choices\":[{\"delta\":{\"content\":\"" + escaped + "\"}}]}\n"
                + "data: [DONE]";
    }

    private static String json(String content) {
        String escaped = content.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n");
        return "{\"choices\":[{\"message\":{\"content\":\"" + escaped + "\"}}]}";
    }

    @Test
    @DisplayName("Bản ghi câm: khung XML rỗng phải ra chuỗi rỗng")
    void emptyXmlBecomesEmpty() {
        String raw = "```xml\n<transcript>\n</transcript>\n```";
        assertThat(LlmTranscriptionClient.extractContent(sse(raw))).isEmpty();
        assertThat(LlmTranscriptionClient.extractContent(json(raw))).isEmpty();
    }

    @Test
    @DisplayName("Có lời nói: lấy đúng nội dung, bỏ khung")
    void unwrapsSpokenText() {
        String raw = "```xml\n<transcript>I have had a few interviews.</transcript>\n```";
        assertThat(LlmTranscriptionClient.extractContent(sse(raw)))
                .isEqualTo("I have had a few interviews.");
    }

    @Test
    @DisplayName("Thẻ transcript không kèm markdown vẫn bóc được")
    void unwrapsBareTag() {
        assertThat(LlmTranscriptionClient.extractContent(sse("<transcript>Hello there</transcript>")))
                .isEqualTo("Hello there");
    }

    @Test
    @DisplayName("Model trả thẳng transcript thì giữ nguyên")
    void keepsPlainText() {
        assertThat(LlmTranscriptionClient.extractContent(sse("Yes, I have had a few interviews.")))
                .isEqualTo("Yes, I have had a few interviews.");
    }

    @Test
    @DisplayName("Router báo lỗi thì trả rỗng, không lấy nhầm thông báo lỗi làm transcript")
    void errorBecomesEmpty() {
        assertThat(LlmTranscriptionClient.extractContent(
                "{\"error\":{\"message\":\"rate limit\"}}")).isEmpty();
        assertThat(LlmTranscriptionClient.extractContent(
                "data: {\"error\":{\"message\":\"rate limit\"}}\ndata: [DONE]")).isEmpty();
    }

    @Test
    @DisplayName("Mã canh không nghe được gì phải ra rỗng, không thành transcript")
    void noSpeechMarkerBecomesEmpty() {
        assertThat(LlmTranscriptionClient.extractContent(sse("[[NO_SPEECH]]"))).isEmpty();
        // Model hay bọc thêm khung quanh mã canh.
        assertThat(LlmTranscriptionClient.extractContent(
                sse("```\n[[NO_SPEECH]]\n```"))).isEmpty();
        assertThat(LlmTranscriptionClient.extractContent(
                sse("<transcript>[[NO_SPEECH]]</transcript>"))).isEmpty();
    }

    @Test
    @DisplayName("Phản hồi rỗng hoặc null không làm vỡ")
    void handlesEmptyInput() {
        assertThat(LlmTranscriptionClient.extractContent(null)).isEmpty();
        assertThat(LlmTranscriptionClient.extractContent("")).isEmpty();
        assertThat(LlmTranscriptionClient.extractContent("   ")).isEmpty();
    }
}
