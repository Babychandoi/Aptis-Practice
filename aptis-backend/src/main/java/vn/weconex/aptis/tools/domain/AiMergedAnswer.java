package vn.weconex.aptis.tools.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/** Một lần gộp đề Speaking Part 4 bằng AI. */
@Entity
@Table(name = "ai_merged_answers")
@Getter @Setter @NoArgsConstructor
public class AiMergedAnswer extends BaseEntity {

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    /** Mã đề đã sắp xếp, nối bằng dấu phẩy. */
    @Column(name = "set_key", length = 200, nullable = false)
    private String setKey;

    @Column(name = "question_set_ids", columnDefinition = "json", nullable = false)
    private String questionSetIds;

    @Column(name = "result", columnDefinition = "json", nullable = false)
    private String result;

    @Column(name = "model", length = 120)
    private String model;
}
