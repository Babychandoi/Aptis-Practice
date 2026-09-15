package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost.PostStatus;

/** Bảng tin riêng của lớp. */
public interface ClassroomPostRepository extends JpaRepository<ClassroomPost, String> {

    List<ClassroomPost> findByClassroomIdOrderByCreatedAtDesc(String classroomId);

    /** Học viên chỉ thấy bài đã đăng, không thấy bài bị ẩn. */
    List<ClassroomPost> findByClassroomIdAndStatusOrderByCreatedAtDesc(
            String classroomId, PostStatus status);
}
