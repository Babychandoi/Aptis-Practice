package vn.weconex.aptis.tools.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import vn.weconex.aptis.tools.domain.AiMergedAnswer;

/** Đề Speaking Part 4 đã phát hành của hệ thống — nguồn cho công cụ gộp đề. */
public interface SpeakingPart4Repository extends JpaRepository<AiMergedAnswer, String> {

    /**
     * Trả Object[]{id, revision hiện hành, tiêu đề}.
     *
     * <p>Bỏ đề của giáo viên (owner_teacher_id): đó là đề riêng của lớp, không
     * phải nội dung chung mà học viên nào cũng được xem.
     */
    @Query(value = """
            SELECT qs.id, qs.current_revision, qs.title
            FROM question_sets qs
            JOIN parts p ON p.id = qs.part_id
            JOIN components c ON c.id = p.component_id
            WHERE c.code = 'SPEAKING' AND p.code = 'PART_4'
              AND qs.status = 'PUBLISHED' AND qs.owner_teacher_id IS NULL
            ORDER BY qs.hotness DESC, qs.title
            """, nativeQuery = true)
    List<Object[]> publishedSets();
}
