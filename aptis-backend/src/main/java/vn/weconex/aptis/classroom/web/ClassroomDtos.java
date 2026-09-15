package vn.weconex.aptis.classroom.web;

import java.time.Instant;
import java.util.List;

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
            String status) {
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
            Instant joinedAt) {
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
            /** Gói đang hiệu lực, vd TEACHER_90; null khi chưa có. */
            String planCode,
            Instant planEndsAt,
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
            String content,
            String status,
            Instant createdAt) {
    }

    public record CreatePostRequest(
            @NotBlank @Size(max = 255) String title,
            String content) {
    }

    public record ClassroomPredictionResponse(
            String id,
            String componentId,
            String componentName,
            String title,
            String content,
            Instant createdAt) {
    }

    public record CreatePredictionRequest(
            @Size(max = 36) String componentId,
            @NotBlank @Size(max = 255) String title,
            String content) {
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
            long totalStudents,
            boolean overdue,
            Instant createdAt) {
    }

    public record CreateAssignmentRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 2000) String instructions,
            List<String> questionSetIds,
            @Size(max = 36) String blueprintId,
            /** ISO-8601; null = không hạn nộp. */
            String dueAt) {
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
            Instant gradedAt) {
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

    public record AdminOverviewResponse(
            long totalClassrooms,
            long totalTeachers,
            long totalStudents,
            List<AdminClassroomResponse> classrooms) {
    }
}
