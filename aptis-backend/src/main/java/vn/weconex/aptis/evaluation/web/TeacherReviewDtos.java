package vn.weconex.aptis.evaluation.web;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.common.util.Enums.CefrLevel;

public final class TeacherReviewDtos {

    private TeacherReviewDtos() {
    }

    /** Bài cần xem, kèm cả điểm AI đã cho để giáo viên đối chiếu. */
    public record ReviewDetailResponse(
            String evaluationJobId,
            String attemptId,
            String questionSetId,
            String studentUserId,
            String evaluationType,
            String textResponse,
            String transcript,
            String recordingAssetId,
            String currentEvaluatorType,
            double currentTotalScore,
            double currentMaxScore,
            String currentCefrLevel,
            List<CriterionResponse> currentCriteria) {
    }

    public record CriterionResponse(
            String code, String name, double score, double maxScore, String feedback) {
    }

    public record SubmitReviewRequest(
            @NotEmpty @Valid List<CriterionScoreInput> criteria,
            CefrLevel cefrLevel,
            @Size(max = 2000) String summary,
            List<String> strengths,
            List<String> weaknesses,
            List<String> suggestions,
            @Size(max = 5000) String correctedVersion) {
    }

    public record CriterionScoreInput(
            @NotBlank String code,
            String name,
            @PositiveOrZero double score,
            @PositiveOrZero double maxScore,
            @Size(max = 1000) String feedback) {
    }

    public record ReviewResultResponse(
            String evaluationJobId,
            double totalScore,
            double maxScore,
            CefrLevel cefrLevel,
            Instant reviewedAt) {
    }

    /** Bản gọn cho danh sách chờ review. */
    public record PendingReviewResponse(
            String evaluationJobId,
            String attemptId,
            String questionSetId,
            String evaluatorType,
            Double totalScore,
            Double maxScore,
            String cefrLevel,
            Instant createdAt) {
    }
}
