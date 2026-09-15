package vn.weconex.aptis.classroom.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;

/** Cấu hình chương trình giáo viên — bảng một dòng, id = 1. */
public interface TeacherSettingsRepository extends JpaRepository<TeacherSettings, Byte> {
}
