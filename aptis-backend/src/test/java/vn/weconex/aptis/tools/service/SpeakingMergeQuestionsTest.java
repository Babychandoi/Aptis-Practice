package vn.weconex.aptis.tools.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Tách ba câu hỏi Part 4 từ hai kiểu dữ liệu nhập đang có trong ngân hàng. */
class SpeakingMergeQuestionsTest {

    @Test
    void tachCauDanhSoTrongCungMotItem() {
        assertThat(SpeakingMergeService.splitQuestions(
                "1. Tell me about the last time you gave someone a present\n2. How did you feel?\n3. How should people encourage others?"))
                .containsExactly(
                        "Tell me about the last time you gave someone a present",
                        "How did you feel?",
                        "How should people encourage others?");
    }

    @Test
    void tachCauDanhSoNamTrenMotDong() {
        assertThat(SpeakingMergeService.splitQuestions("1. Describe a trip. 2. Who went with you? 3. Is travel important?"))
                .containsExactly("Describe a trip.", "Who went with you?", "Is travel important?");
    }

    @Test
    void boTheHtml() {
        assertThat(SpeakingMergeService.splitQuestions("<p>Tell me about a teacher who helped you.</p>"))
                .containsExactly("Tell me about a teacher who helped you.");
    }
}
