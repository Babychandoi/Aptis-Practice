package vn.weconex.aptis.news.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.news.domain.NewsPostBlueprint;

public interface NewsPostBlueprintRepository
        extends JpaRepository<NewsPostBlueprint, NewsPostBlueprint.Key> {

    List<NewsPostBlueprint> findByPostIdOrderByDisplayOrder(String postId);

    @Modifying
    @Query("DELETE FROM NewsPostBlueprint l WHERE l.postId = :postId")
    void deleteByPostId(@Param("postId") String postId);
}
