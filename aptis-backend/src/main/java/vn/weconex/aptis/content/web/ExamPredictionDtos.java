package vn.weconex.aptis.content.web;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class ExamPredictionDtos {

    private ExamPredictionDtos() {
    }

    // ---------- Học viên ----------

    /**
     * Một ngày dự đoán, đã nhóm theo kỹ năng.
     *
     * @param predictDate ngày của bản tin — có thể sớm hơn ngày hôm nay khi
     *                    admin chưa cập nhật, client hiện đúng ngày này để học
     *                    viên biết tin cũ hay mới
     */
    public record PredictionFeedResponse(
            LocalDate predictDate,
            String source,
            List<PredictionSkillResponse> skills) {
    }

    /**
     * @param sections nhóm hiển thị trong kỹ năng ("Part 5", "Q16-17"), giữ thứ
     *                 tự admin đặt
     */
    public record PredictionSkillResponse(
            String componentId,
            String componentCode,
            String componentName,
            int displayOrder,
            int topicCount,
            List<PredictionSectionResponse> sections) {
    }

    public record PredictionSectionResponse(
            String sectionLabel,
            List<PredictionItemResponse> items) {
    }

    /**
     * @param questionSetCount số đề làm được của chủ đề này; 0 thì client làm mờ
     *                         và không cho bấm, vì bấm vào sẽ ra lượt rỗng
     * @param repeatCount      số lần chủ đề xuất hiện trong khoảng đang xem,
     *                         dùng cho tab "đề hot nhất"
     * @param partIds          các part CÓ đề của chủ đề này. Cần đến vì Writing
     *                         Part 2/3/4 là cùng một club và đề thi thật làm
     *                         liền cả ba: client xin một bộ mỗi part để không
     *                         bị trùng bộ khi part này nhiều đề hơn part kia.
     */
    public record PredictionItemResponse(
            String id,
            String topicId,
            String partId,
            String label,
            String priority,
            int questionSetCount,
            int repeatCount,
            List<String> partIds) {
    }

    // ---------- Admin ----------

    public record AdminPredictionResponse(
            String id,
            LocalDate predictDate,
            String topicId,
            String topicName,
            String partId,
            String partName,
            String componentId,
            String componentCode,
            String priority,
            String label,
            String sectionLabel,
            String source,
            String status,
            int displayOrder,
            int questionSetCount) {
    }

    public record SavePredictionRequest(
            @NotNull LocalDate predictDate,
            @NotBlank String topicId,
            /** Bỏ trống = dự đoán cho cả kỹ năng. */
            String partId,
            @NotBlank String componentId,
            /** HOT hoặc BACKUP; bỏ trống = HOT. */
            String priority,
            String label,
            String sectionLabel,
            String source,
            /** DRAFT hoặc PUBLISHED; bỏ trống = PUBLISHED. */
            String status,
            Integer displayOrder) {
    }
}
