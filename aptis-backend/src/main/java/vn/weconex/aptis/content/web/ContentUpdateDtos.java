package vn.weconex.aptis.content.web;

import java.time.LocalDate;
import java.util.List;

public final class ContentUpdateDtos {

    private ContentUpdateDtos() {
    }

    /** Một mục trên timeline nhật ký cập nhật. */
    public record UpdateLogResponse(
            String id,
            LocalDate logDate,
            String label,
            String description,
            String partId,
            /** Rỗng khi là cập nhật chung, không có đề để làm. */
            List<UpdateQuestionSetResponse> questionSets) {
    }

    public record UpdateQuestionSetResponse(
            String questionSetId,
            String code,
            String title,
            int itemCount) {
    }
}
