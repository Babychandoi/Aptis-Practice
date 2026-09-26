package vn.weconex.aptis.classroom.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Lớp giáo viên đang làm việc, lấy từ header {@value #HEADER}.
 *
 * <p>Từ khi một giáo viên có nhiều lớp, mọi API /teacher/classroom/** cần biết
 * đang thao tác lớp nào. Đọc từ header thay vì thêm tham số vào hơn chục API:
 * frontend gắn header một chỗ trong axios, backend kiểm quyền một chỗ trong
 * ClassroomService.ownedClassroom.
 *
 * <p>Không có header (client cũ, job nền) thì trả null và ownedClassroom lấy
 * lớp đầu tiên — đúng hành vi trước V64.
 */
public final class TeacherClassroomContext {

    public static final String HEADER = "X-Classroom-Id";

    private TeacherClassroomContext() {
    }

    public static String selectedClassroomId() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        String value = request.getHeader(HEADER);
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        // UUID 36 ký tự; giá trị lạ coi như không chọn để khỏi truy vấn rác.
        return trimmed.matches("[0-9a-fA-F-]{36}") ? trimmed : null;
    }
}
