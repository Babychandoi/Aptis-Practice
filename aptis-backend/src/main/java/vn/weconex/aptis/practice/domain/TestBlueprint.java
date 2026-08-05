package vn.weconex.aptis.practice.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.common.util.Enums.PublishStatus;

/**
 * Cấu hình đề thi thử (PHẦN I §14).
 *
 * <p>Blueprint mô tả đề gồm bao nhiêu bộ câu hỏi ở mỗi Part và chọn theo chiến
 * lược nào; nội dung cụ thể được chọn lúc học viên bắt đầu làm.
 */
@Entity
@Table(name = "test_blueprints")
@Getter
@Setter
@NoArgsConstructor
public class TestBlueprint extends BaseEntity {

    @Column(name = "exam_version_id", columnDefinition = "CHAR(36)", nullable = false)
    private String examVersionId;

    /** NULL = đề gồm nhiều học phần (thi thử đầy đủ). */
    @Column(name = "component_id", columnDefinition = "CHAR(36)")
    private String componentId;

    @Column(name = "code", length = 100, nullable = false)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 20, nullable = false)
    private PracticeMode mode = PracticeMode.MOCK_TEST;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", length = 10, nullable = false)
    private AccessLevel accessLevel = AccessLevel.PREMIUM;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private PublishStatus status = PublishStatus.DRAFT;

    public boolean isAvailable() {
        return status == PublishStatus.PUBLISHED;
    }

    public boolean isFree() {
        return accessLevel == AccessLevel.FREE;
    }
}
