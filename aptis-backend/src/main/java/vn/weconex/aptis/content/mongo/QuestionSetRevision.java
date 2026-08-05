package vn.weconex.aptis.content.mongo;

import java.time.Instant;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Lịch sử chỉnh sửa nội dung câu hỏi (PHẦN II §24).
 *
 * <p>Mỗi lần publish tạo một revision mới. Bản ghi là bất biến — dùng để đối
 * soát nội dung mà attempt cũ đã snapshot, và để xem ai sửa gì lúc nào.
 */
@Document(collection = "question_set_revisions")
@Getter
@Setter
@NoArgsConstructor
public class QuestionSetRevision {

    @Id
    private String id;

    private String questionSetId;
    private int revision;

    /** Bản copy đầy đủ của nội dung tại revision này, CÒN answer key. */
    private QuestionSetDocument document;

    private String changeSummary;
    private String createdBy;
    private Instant createdAt;

    public static QuestionSetRevision of(
            QuestionSetDocument document, String changeSummary, String createdBy) {

        QuestionSetRevision revision = new QuestionSetRevision();
        // id gộp questionSetId + revision để tra cứu trực tiếp không cần query
        revision.id = document.getQuestionSetId() + ":" + document.getRevision();
        revision.questionSetId = document.getQuestionSetId();
        revision.revision = document.getRevision();
        revision.document = document;
        revision.changeSummary = changeSummary;
        revision.createdBy = createdBy;
        revision.createdAt = Instant.now();
        return revision;
    }
}
