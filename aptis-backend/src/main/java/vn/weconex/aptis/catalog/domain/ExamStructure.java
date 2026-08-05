package vn.weconex.aptis.catalog.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Enums.PublishStatus;

/**
 * Nhóm entity mô tả cấu trúc kỳ thi:
 * ExamProduct -> ExamVersion -> Component -> Part.
 */
public final class ExamStructure {

    private ExamStructure() {
    }

    @Entity(name = "ExamProduct")
    @Table(name = "exam_products")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ExamProduct extends BaseEntity {

        @Column(name = "code", length = 50, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        @Column(name = "is_active", nullable = false)
        private boolean active = true;
    }

    @Entity(name = "ExamVersion")
    @Table(name = "exam_versions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ExamVersion extends BaseEntity {

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(name = "exam_product_id", nullable = false, columnDefinition = "CHAR(36)")
        private ExamProduct examProduct;

        @Column(name = "code", length = 100, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "valid_from")
        private LocalDate validFrom;

        @Column(name = "valid_to")
        private LocalDate validTo;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PublishStatus status = PublishStatus.DRAFT;
    }

    @Entity(name = "Component")
    @Table(name = "components")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Component extends BaseEntity {

        public static final String GRAMMAR_VOCABULARY = "GRAMMAR_VOCABULARY";
        public static final String READING = "READING";
        public static final String LISTENING = "LISTENING";
        public static final String SPEAKING = "SPEAKING";
        public static final String WRITING = "WRITING";

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(name = "exam_version_id", nullable = false, columnDefinition = "CHAR(36)")
        private ExamVersion examVersion;

        @Column(name = "code", length = 50, nullable = false)
        private String code;

        @Column(name = "name", length = 100, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        @Column(name = "display_order", nullable = false)
        private int displayOrder;

        @Column(name = "duration_seconds")
        private Integer durationSeconds;

        @Column(name = "max_score", precision = 8, scale = 2)
        private BigDecimal maxScore;

        @Column(name = "is_active", nullable = false)
        private boolean active = true;

        /** Speaking/Writing cần chấm bằng AI hoặc giáo viên. */
        public boolean requiresManualEvaluation() {
            return SPEAKING.equals(code) || WRITING.equals(code);
        }
    }

    @Entity(name = "Part")
    @Table(name = "parts")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Part extends BaseEntity {

        @ManyToOne(fetch = FetchType.LAZY, optional = false)
        @JoinColumn(name = "component_id", nullable = false, columnDefinition = "CHAR(36)")
        private Component component;

        @Column(name = "code", length = 50, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        @Column(name = "instructions", columnDefinition = "TEXT")
        private String instructions;

        @Column(name = "display_order", nullable = false)
        private int displayOrder;

        @Column(name = "default_duration_seconds")
        private Integer defaultDurationSeconds;

        @Column(name = "is_active", nullable = false)
        private boolean active = true;
    }

    @Entity(name = "TaskType")
    @Table(name = "task_types")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class TaskType extends BaseEntity {

        @Column(name = "code", length = 100, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "renderer_key", length = 100, nullable = false)
        private String rendererKey;

        /** NULL = không chấm tự động được (Speaking/Writing). */
        @Column(name = "validator_key", length = 100)
        private String validatorKey;

        @Column(name = "response_type", length = 50, nullable = false)
        private String responseType;

        @Column(name = "schema_version", nullable = false)
        private int schemaVersion = 1;

        @Column(name = "is_active", nullable = false)
        private boolean active = true;

        public boolean isAutoScorable() {
            return validatorKey != null;
        }
    }

    @Entity(name = "Topic")
    @Table(name = "topics")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Topic extends BaseEntity {

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "parent_id", columnDefinition = "CHAR(36)")
        private Topic parent;

        @Column(name = "code", length = 100, nullable = false)
        private String code;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        @Column(name = "is_active", nullable = false)
        private boolean active = true;
    }
}
