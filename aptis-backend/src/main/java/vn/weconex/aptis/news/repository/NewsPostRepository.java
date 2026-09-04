package vn.weconex.aptis.news.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.news.domain.NewsPost;

public interface NewsPostRepository
        extends JpaRepository<NewsPost, String>, JpaSpecificationExecutor<NewsPost> {

    Optional<NewsPost> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /**
     * Bảng tin của học viên: bài ghim lên đầu, còn lại mới trước.
     *
     * <p>Sắp bằng câu truy vấn chứ không bằng {@code Sort} của Pageable để thứ
     * tự ghim luôn đúng, không phụ thuộc client truyền gì.
     */
    @Query("""
            SELECT p FROM NewsPost p
            WHERE p.status = vn.weconex.aptis.news.domain.NewsPost$PostStatus.PUBLISHED
            ORDER BY p.pinned DESC, p.publishedAt DESC
            """)
    Page<NewsPost> findPublishedFeed(Pageable pageable);

    /** Tăng lượt xem không nạp entity: tránh ghi đè trường khác khi có nhiều người đọc cùng lúc. */
    @Modifying
    @Query("UPDATE NewsPost p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") String id);
}
