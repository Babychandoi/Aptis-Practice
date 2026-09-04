package vn.weconex.aptis.news.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.news.domain.NewsPostQuestionSet;

public interface NewsPostQuestionSetRepository
        extends JpaRepository<NewsPostQuestionSet, NewsPostQuestionSet.Key> {

    List<NewsPostQuestionSet> findByPostIdOrderByDisplayOrder(String postId);

    @Modifying
    @Query("DELETE FROM NewsPostQuestionSet l WHERE l.postId = :postId")
    void deleteByPostId(@Param("postId") String postId);

    /** Bài nào đang dùng bộ đề này — để cảnh báo trước khi xoá đề. */
    @Query("SELECT l.postId FROM NewsPostQuestionSet l WHERE l.questionSetId = :questionSetId")
    List<String> findPostIdsByQuestionSetId(@Param("questionSetId") String questionSetId);
}
