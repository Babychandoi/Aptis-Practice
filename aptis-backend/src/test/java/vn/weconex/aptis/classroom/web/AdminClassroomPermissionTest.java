package vn.weconex.aptis.classroom.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Khu quản trị lớp học phải đòi quyền của quản trị viên, không phải quyền của
 * giáo viên.
 *
 * <p>Giáo viên có {@code classroom:read} để xem lớp của chính mình. Nếu
 * {@link AdminClassroomController} cũng nhận quyền đó thì mỗi giáo viên khách
 * hàng sẽ đọc được danh sách toàn bộ lớp và email của giáo viên khác — đúng lỗi
 * đã xảy ra một lần và là lý do có bài kiểm tra này.
 */
class AdminClassroomPermissionTest {

    /** Quyền mà giáo viên đang có — endpoint quản trị không được nhận quyền nào trong đây. */
    private static final String[] QUYEN_CUA_GIAO_VIEN = {
        "classroom:read", "classroom:write", "question_set:read", "evaluation:review"
    };

    @Test
    @DisplayName("mọi endpoint /admin/classrooms đều đòi classroom:admin")
    void moiEndpointQuanTriDoiQuyenAdmin() {
        Method[] endpoints = Arrays.stream(AdminClassroomController.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(PreAuthorize.class))
                .toArray(Method[]::new);

        assertThat(endpoints)
                .as("phải có endpoint được bảo vệ, nếu rỗng là bài test đã hỏng")
                .isNotEmpty();

        for (Method endpoint : endpoints) {
            String bieuThuc = endpoint.getAnnotation(PreAuthorize.class).value();

            assertThat(bieuThuc)
                    .as("endpoint %s phải đòi classroom:admin", endpoint.getName())
                    .contains("classroom:admin");

            for (String quyenGiaoVien : QUYEN_CUA_GIAO_VIEN) {
                assertThat(bieuThuc)
                        .as(
                                "endpoint %s không được mở cho quyền %s của giáo viên",
                                endpoint.getName(), quyenGiaoVien)
                        .doesNotContain(quyenGiaoVien);
            }
        }
    }

    @Test
    @DisplayName("không endpoint quản trị nào bị bỏ quên @PreAuthorize")
    void khongEndpointNaoBiBoQuen() {
        Method[] khongBaoVe = Arrays.stream(AdminClassroomController.class.getDeclaredMethods())
                .filter(m -> java.lang.reflect.Modifier.isPublic(m.getModifiers()))
                .filter(m -> Arrays.stream(m.getAnnotations())
                        .anyMatch(a -> a.annotationType()
                                .getPackageName()
                                .startsWith("org.springframework.web.bind.annotation")))
                .filter(m -> !m.isAnnotationPresent(PreAuthorize.class))
                .toArray(Method[]::new);

        assertThat(khongBaoVe)
                .as("endpoint quản trị thiếu @PreAuthorize thì ai đăng nhập cũng gọi được")
                .isEmpty();
    }

    @Test
    @DisplayName("controller nằm dưới đường dẫn quản trị")
    void namDuoiDuongDanQuanTri() {
        RequestMapping mapping = AdminClassroomController.class.getAnnotation(RequestMapping.class);

        assertThat(mapping).isNotNull();
        assertThat(mapping.value()[0]).startsWith("/api/v1/admin/");
    }
}
