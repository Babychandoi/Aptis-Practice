package vn.weconex.aptis.content.web;

import java.util.List;

public final class StudyTipsDtos {

    private StudyTipsDtos() {
    }

    /**
     * Chuỗi tiêu đề đáp án của một đề Reading Part 4, theo đúng thứ tự đoạn văn.
     *
     * @param headings tiêu đề đúng của đoạn 1..7 — học viên học thuộc chuỗi này
     * @param passages đoạn văn tương ứng, để giao diện đối chiếu khi cần
     */
    public record HeadingChainResponse(
            String questionSetId,
            String questionSetCode,
            String title,
            List<String> headings,
            List<String> passages,
            Integer examYear,
            Integer hotness) {
    }

    /**
     * Mã người nói của một chủ đề Listening Part 3.
     *
     * @param code     bốn chữ số theo thứ tự bốn câu: Man=1, Woman=2, Both=0
     * @param speakers tên người nói từng câu, để giao diện tô màu và đọc thành lời
     */
    public record SpeakerCodeResponse(
            String questionSetId,
            String questionSetCode,
            String title,
            String code,
            List<String> speakers,
            Integer examYear,
            Integer hotness) {
    }
}
