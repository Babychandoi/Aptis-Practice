package vn.weconex.aptis.evaluation.mongo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Tiêu chí chấm Speaking/Writing (PHẦN II §25).
 */
@Document(collection = "rubric_definitions")
@Getter
@Setter
@NoArgsConstructor
public class RubricDefinition {

    @Id
    private String id;

    private String code;
    private String componentCode;
    private String partCode;
    private int version;
    private double maxScore;

    private List<Criterion> criteria = new ArrayList<>();
    private String status;

    private Instant createdAt;
    private Instant updatedAt;

    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Criterion {
        @Field("code")
        private String code;

        private String name;
        private double weight;
        private double maxScore;

        /** Mô tả mức điểm: "1" -> "...", "3" -> "...", "5" -> "..." */
        private Map<String, String> descriptors = new LinkedHashMap<>();
    }
}
