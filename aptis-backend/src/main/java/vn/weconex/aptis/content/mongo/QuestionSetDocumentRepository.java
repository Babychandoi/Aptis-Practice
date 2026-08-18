package vn.weconex.aptis.content.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface QuestionSetDocumentRepository extends MongoRepository<QuestionSetDocument, String> {

    Optional<QuestionSetDocument> findByQuestionSetIdAndRevision(String questionSetId, int revision);

    List<QuestionSetDocument> findByQuestionSetIdIn(List<String> questionSetIds);

    /**
     * Bộ câu hỏi nào đang tham chiếu asset này.
     *
     * <p>Dùng để kiểm tra entitlement trước khi cấp signed URL: asset nội dung
     * không có chủ sở hữu nên phải suy quyền ngược từ bộ câu hỏi chứa nó.
     *
     * <p>Chỉ chiếu {@code questionSetId} — nội dung đầy đủ của bộ câu hỏi rất
     * nặng và ở đây không cần đến. Index tương ứng: {@code assets.assetId}.
     */
    @Query(value = "{ 'assets.assetId': ?0 }", fields = "{ 'questionSetId': 1 }")
    List<QuestionSetDocument> findByAssetId(String assetId);
}
