package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost.PostStatus;

/** Bảng tin riêng của lớp. */
public interface ClassroomPostRepository extends JpaRepository<ClassroomPost, String> {

    /** Giáo viên thấy hết, kể cả nháp và bài đã ẩn. */
    List<ClassroomPost> findByClassroomIdOrderByPinnedDescCreatedAtDesc(String classroomId);

    /**
     * Bảng tin học viên thấy: bài ghim lên đầu, còn lại mới trước.
     *
     * <p>Sắp theo published_at chứ không phải created_at — bài soạn nháp từ
     * tuần trước mà hôm nay mới đăng thì phải nằm trên cùng, không bị chìm
     * xuống dưới những bài đăng sau nó.
     */
    List<ClassroomPost> findByClassroomIdAndStatusOrderByPinnedDescPublishedAtDesc(
            String classroomId, PostStatus status);
}
