package vn.weconex.aptis.classroom.web;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** DTO cho lớp học. */
public final class ClassroomDtos {

    private ClassroomDtos() {
    }

    // ---------------- Giáo viên ----------------

    /** Lớp của giáo viên, kèm số liệu tổng quan cho đầu trang. */
    public record ClassroomResponse(
            String id,
            String name,
            String description,
            String joinCode,
            boolean joinEnabled,
            /** Lớp có được giao đề từ ngân hàng hệ thống không — admin bật. */
            boolean systemContentEnabled,
            String pricingType,
            long priceAmount,
            int maxStudents,
            long studentCount,
            String status,
            /** Kênh liên hệ riêng của giáo viên; null thì lớp không hiện khối hỗ trợ. */
            String supportZalo,
            String supportFacebook,
            String supportGroup,
            String supportNote,
            /** Hạn sử dụng lớp; null = không giới hạn. */
            Instant expiresAt,
            /** Quá hạn thì giáo viên chỉ xem được thông báo, không thao tác gì. */
            boolean expired) {
    }

    /** Một học viên trong lớp, kèm tiến độ tóm tắt. */
    public record ClassroomStudentResponse(
            String userId,
            String fullName,
            String email,
            /** Chữ cái đầu để vẽ avatar. */
            String initial,
            long attemptsDone,
            /** Điểm trung bình thang 10; null khi chưa làm bài nào. */
            Double averageScore,
            Instant lastActiveAt,
            String paymentStatus,
            Instant joinedAt) {
    }

    /** Điểm mạnh/yếu của cả lớp theo kỹ năng. */
    public record ClassProgressResponse(
            String componentCode,
            String componentName,
            /** Phần trăm 0-100, trung bình của cả lớp. */
            int score) {
    }

    public record UpdateClassroomRequest(
            @Size(max = 255) String name,
            @Size(max = 2000) String description) {
    }

    /** Kênh liên hệ giáo viên tự khai; để trống trường nào thì bỏ trường đó. */
    public record UpdateSupportRequest(
            @Size(max = 255) String supportZalo,
            @Size(max = 500) String supportFacebook,
            @Size(max = 500) String supportGroup,
            @Size(max = 500) String supportNote) {
    }

    public record UpdatePricingRequest(
            @NotBlank String pricingType,
            long priceAmount) {
    }

    public record ToggleJoinRequest(boolean joinEnabled) {
    }

    // ---------------- Học viên ----------------

    /** Lớp mà học viên đang tham gia. */
    public record StudentClassroomResponse(
            String classroomId,
            String name,
            String teacherName,
            boolean systemContentEnabled,
            String pricingType,
            long priceAmount,
            String paymentStatus,
            /** Đã trả tiền hoặc lớp miễn phí — được làm bài. */
            boolean canPractice,
            Instant joinedAt,
            /** Kênh liên hệ của giáo viên dạy lớp này, không phải của nền tảng. */
            String supportZalo,
            String supportFacebook,
            String supportGroup,
            String supportNote,
            /** Lớp hết hạn hoặc đã đóng: học viên chỉ thấy thông báo, không vào được. */
            boolean locked) {
    }

    public record JoinClassroomRequest(
            @NotBlank @Size(max = 16) String joinCode) {
    }

    // ---------------- Admin ----------------

    public record AdminClassroomResponse(
            String id,
            String name,
            String teacherUserId,
            String teacherName,
            String teacherEmail,
            String joinCode,
            long studentCount,
            int maxStudents,
            boolean systemContentEnabled,
            String pricingType,
            long priceAmount,
            String status,
            /** Hạn dùng lớp; null = vô thời hạn. */
            Instant expiresAt,
            boolean expired,
            Instant createdAt) {
    }

    /** Admin tạo tài khoản giáo viên, hệ thống tự sinh lớp. */
    public record CreateTeacherRequest(
            @NotBlank @Size(max = 255) String fullName,
            @NotBlank @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 128) String password,
            @Size(max = 255) String classroomName,
            /** Mã gói cấp sẵn, vd TEACHER_90; để trống thì không cấp gói. */
            @Size(max = 64) String planCode) {
    }

    public record CreateTeacherResponse(
            String userId,
            String email,
            String classroomId,
            String joinCode) {
    }

    /** Admin sửa thông tin giáo viên và lớp của họ. */
    public record UpdateTeacherRequest(
            @Size(max = 255) String fullName,
            @Size(max = 255) String classroomName,
            /** Để trống = giữ mật khẩu cũ. */
            @Size(min = 8, max = 128) String newPassword) {
    }

    public record ToggleSystemContentRequest(boolean enabled) {
    }

    public record SetMaxStudentsRequest(Integer maxStudents) {
    }

    /**
     * Gia hạn lớp.
     *
     * @param days số ngày tính từ hôm nay (7/30/90/180/365); null = bỏ hạn
     */
    public record SetClassroomExpiryRequest(
            @Min(1) @Max(3650) Integer days) {
    }

    public record TeacherSettingsResponse(
            int platformFeePercent,
            int defaultMaxStudents) {
    }

    public record UpdateTeacherSettingsRequest(
            int platformFeePercent,
            int defaultMaxStudents) {
    }

    /** Một dòng trong bảng tài khoản giáo viên của admin. */
    public record AdminTeacherResponse(
            String userId,
            String fullName,
            String email,
            String classroomName,
            String joinCode,
            long studentCount,
            /** Gói đang hiệu lực, vd TEACHER_90; null khi chưa bán gói. */
            String planCode,
            /** Hạn dùng lớp; null = vô thời hạn. */
            Instant expiresAt,
            boolean expired,
            String status) {
    }

    // ---------------- Nội dung lớp ----------------

    public record MaterialResponse(
            String id,
            String title,
            String materialType,
            String assetId,
            String linkUrl,
            Instant createdAt) {
    }

    public record CreateMaterialRequest(
            @NotBlank @Size(max = 255) String title,
            @NotBlank String materialType,
            @Size(max = 36) String assetId,
            @Size(max = 1000) String linkUrl) {
    }

    public record ClassroomPostResponse(
            String id,
            String title,
            String excerpt,
            /** Markdown. */
            String content,
            /** Client tự lấy link xem qua /assets/{id}/signed-url. */
            String coverAssetId,
            boolean pinned,
            String status,
            Instant publishedAt,
            Instant createdAt) {
    }

    /**
     * Tạo hoặc sửa một bài trong bảng tin lớp.
     *
     * @param status DRAFT khi còn soạn, PUBLISHED khi cho lớp xem
     */
    public record SavePostRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 500) String excerpt,
            String content,
            @Size(max = 36) String coverAssetId,
            Boolean pinned,
            @Size(max = 16) String status) {
    }

    public record ClassroomPredictionResponse(
            String id,
            String componentId,
            String componentName,
            String topicId,
            String topicName,
            String partId,
            String partName,
            LocalDate predictDate,
            String priority,
            String label,
            String sectionLabel,
            String source,
            String status,
            int displayOrder,
            String title,
            String content,
            /** Đề giáo viên chỉ đích danh, ngoài phần lọc theo chủ đề. */
            List<PredictionQuestionSetResponse> questionSets,
            /** Số đề học viên mở được: đề chỉ đích danh cộng đề cùng chủ đề. */
            int openableCount,
            Instant createdAt) {
    }

    /** Một đề gắn vào mục dự đoán của lớp. */
    public record PredictionQuestionSetResponse(
            String id,
            String title,
            String partName,
            String componentName,
            /** true = đề do chính giáo viên soạn, không phải đề hệ thống. */
            boolean own) {
    }

    public record SavePredictionRequest(
            @Size(max = 36) String componentId,
            @Size(max = 36) String topicId,
            @Size(max = 36) String partId,
            LocalDate predictDate,
            @Size(max = 16) String priority,
            @Size(max = 255) String label,
            @Size(max = 64) String sectionLabel,
            @Size(max = 255) String source,
            @Size(max = 16) String status,
            Integer displayOrder,
            @NotBlank @Size(max = 255) String title,
            String content,
            /** Để trống = giữ nguyên danh sách đề đang gắn. */
            List<String> questionSetIds) {
    }

    // ---------------- Bài giao ----------------

    public record AssignmentResponse(
            String id,
            String title,
            String instructions,
            String sourceType,
            String blueprintId,
            Instant dueAt,
            String status,
            /** Số đề trong bài giao. */
            int questionSetCount,
            long submittedCount,
            /** Số em được giao: cả lớp, hoặc chỉ những em được chỉ định. */
            long totalStudents,
            /** Id học viên được chỉ định; rỗng nghĩa là giao cho cả lớp. */
            List<String> recipientUserIds,
            boolean overdue,
            Instant createdAt) {
    }

    public record CreateAssignmentRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 2000) String instructions,
            List<String> questionSetIds,
            @Size(max = 36) String blueprintId,
            /** ISO-8601; null = không hạn nộp. */
            String dueAt,
            /** Để trống = giao cả lớp; có id = chỉ giao cho những em đó. */
            List<String> recipientUserIds) {
    }

    /** Một bài nộp, nhìn từ phía giáo viên khi chấm. */
    public record SubmissionResponse(
            String id,
            String userId,
            String fullName,
            String email,
            String initial,
            String attemptId,
            String status,
            Instant submittedAt,
            /** Điểm AI thang 10; null khi chưa chấm. */
            Double aiScore,
            Double teacherScore,
            String teacherComment,
            Instant gradedAt,
            /** Số liệu làm bài, để giáo viên chấm mà không phải mở từng bài. */
            Integer totalItems,
            Integer answeredItems,
            Integer correctItems,
            Double rawScore,
            Double maxScore) {
    }

    public record GradeSubmissionRequest(
            /** Để trống = giữ điểm AI. */
            Double teacherScore,
            @Size(max = 4000) String comment) {
    }

    /** Bài giao nhìn từ phía học viên. */
    public record StudentAssignmentResponse(
            String id,
            String classroomId,
            String classroomName,
            String title,
            String instructions,
            Instant dueAt,
            boolean overdue,
            /** NOT_STARTED | IN_PROGRESS | SUBMITTED | LATE | GRADED */
            String status,
            String attemptId,
            Double teacherScore,
            String teacherComment) {
    }

    /** Đề giáo viên tự soạn. */
    public record TeacherQuestionSetResponse(
            String id,
            String title,
            String partName,
            String componentName,
            String status,
            Instant createdAt) {
    }

    /**
     * Một đề giáo viên tự soạn, trong màn quản lý đề của họ.
     *
     * @param contributionStatus null = chưa từng đề xuất vào ngân hàng chung
     * @param contributionNote lý do admin từ chối, để giáo viên biết đường sửa
     */
    public record TeacherAuthoredSetResponse(
            String id,
            String code,
            String title,
            String partId,
            String partName,
            String componentName,
            String taskTypeCode,
            int itemCount,
            String status,
            String contributionStatus,
            String contributionNote,
            Instant createdAt) {
    }

    public record ContributeRequest(@Size(max = 1000) String note) {
    }

    /** Một đề giáo viên đề xuất, trong màn duyệt của admin. */
    public record ContributionResponse(
            String id,
            String questionSetId,
            String questionSetTitle,
            String questionSetCode,
            String partName,
            String componentName,
            String teacherUserId,
            String teacherName,
            String teacherEmail,
            String status,
            /** Lời nhắn của giáo viên khi gửi. */
            String note,
            /** Lý do admin từ chối. */
            String adminNote,
            Instant reviewedAt,
            Instant createdAt) {
    }

    public record ReviewContributionRequest(@Size(max = 1000) String adminNote) {
    }

    // ---------------- Bài thi giáo viên tự ghép ----------------

    /**
     * Bài thi ghép của giáo viên: full một kỹ năng hoặc đủ 5 kỹ năng.
     *
     * @param componentId null = bài đủ 5 kỹ năng
     * @param selectionMode FIXED = chọn tay từng đề, RULES = hệ thống bốc
     */
    public record TeacherBlueprintResponse(
            String id,
            String code,
            String name,
            String description,
            String componentId,
            String componentName,
            /** FIXED = giáo viên chọn tay từng đề, RULES = hệ thống bốc. */
            String selectionMode,
            Integer durationSeconds,
            String status,
            int questionSetCount,
            int ruleCount,
            Instant createdAt) {
    }

    /** Một đề được chọn đích danh vào bài thi ghép. */
    public record BlueprintFixedSetResponse(
            String questionSetId,
            String title,
            String partId,
            String partName,
            String componentName,
            int displayOrder) {
    }

    /** Luật bốc đề cho một part, khi giáo viên không chọn tay. */
    public record BlueprintRuleRequest(
            @NotBlank @Size(max = 36) String partId,
            @Min(1) @Max(50) int questionSetCount,
            @Min(1) @Max(5) Integer difficultyMin,
            @Min(1) @Max(5) Integer difficultyMax) {
    }

    public record SaveBlueprintRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 2000) String description,
            /** Để trống = bài đủ 5 kỹ năng. */
            @Size(max = 36) String componentId,
            /** FIXED hoặc RULES. */
            @NotBlank @Size(max = 16) String selectionMode,
            @Min(60) @Max(36000) Integer durationSeconds,
            /** Khi FIXED: đề chọn đích danh, theo thứ tự muốn hiện. */
            List<String> questionSetIds,
            /** Khi RULES: luật bốc đề theo từng part. */
            List<BlueprintRuleRequest> rules) {
    }

    public record AdminOverviewResponse(
            long totalClassrooms,
            long totalTeachers,
            long totalStudents,
            List<AdminClassroomResponse> classrooms) {
    }
}
