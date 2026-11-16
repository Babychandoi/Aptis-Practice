package vn.weconex.aptis.content.web;

import java.util.List;

public final class DailyWarmUpDtos {

    private DailyWarmUpDtos() {
    }

    /**
     * Bài khởi động của ngày.
     *
     * @param mode TYPING (gõ câu Writing), SPEAKING (Speaking Marathon) hoặc NONE khi
     *             chưa có dữ liệu — khi đó trang chủ không hiện gì.
     * @param part Part Speaking của ngày; null khi không phải SPEAKING.
     */
    public record WarmUpResponse(
            String dayKey,
            String mode,
            Integer part,
            List<TypingItem> items,
            List<MarathonQuestion> questions) {
    }

    /** Một câu cần gõ: câu hỏi Writing và câu trả lời mẫu. */
    public record TypingItem(String id, String prompt, String text) {
    }

    public record MarathonQuestion(
            String id,
            String groupId,
            String question,
            String questionVi,
            List<String> ideas,
            List<String> ideasVi,
            List<String> sentences,
            List<String> sentencesVi,
            List<String> images) {
    }
}
