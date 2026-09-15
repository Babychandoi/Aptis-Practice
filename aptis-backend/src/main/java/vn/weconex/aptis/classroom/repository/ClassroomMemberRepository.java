package vn.weconex.aptis.classroom.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;

/** Thành viên lớp. */
public interface ClassroomMemberRepository extends JpaRepository<ClassroomMember, String> {

    Optional<ClassroomMember> findByClassroomIdAndUserId(String classroomId, String userId);

    List<ClassroomMember> findByClassroomIdAndStatusOrderByJoinedAtDesc(
            String classroomId, MemberStatus status);

    List<ClassroomMember> findByUserIdAndStatus(String userId, MemberStatus status);

    long countByClassroomIdAndStatus(String classroomId, MemberStatus status);

    /**
     * Học viên có đang ở trong lớp này không.
     *
     * <p>Dùng để chặn giáo viên xem dữ liệu học viên không thuộc lớp mình.
     */
    @Query("""
            SELECT COUNT(m) > 0 FROM ClassroomMember m
            WHERE m.classroomId = :classroomId AND m.userId = :userId
              AND m.status = vn.weconex.aptis.classroom.domain.ClassroomEntities$ClassroomMember$MemberStatus.ACTIVE
            """)
    boolean isActiveMember(
            @Param("classroomId") String classroomId, @Param("userId") String userId);

    /** Số lớp đang tham gia của từng lớp, gom cho bảng admin. */
    @Query("""
            SELECT m.classroomId, COUNT(m) FROM ClassroomMember m
            WHERE m.status = vn.weconex.aptis.classroom.domain.ClassroomEntities$ClassroomMember$MemberStatus.ACTIVE
              AND m.classroomId IN :classroomIds
            GROUP BY m.classroomId
            """)
    List<Object[]> countActiveByClassroomIds(@Param("classroomIds") List<String> classroomIds);
}
