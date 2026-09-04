package vn.weconex.aptis.news.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.news.domain.NewsComment;

public interface NewsCommentRepository extends JpaRepository<NewsComment, String> {

    /**
     * Bình luận gốc của một bài, cũ trước để mạch hội thoại đọc xuôi.
     *
     * <p>Lấy cả PENDING và HIDDEN rồi để tầng service quyết ai thấy gì: người
     * viết phải thấy bình luận của chính mình, kể cả khi bị ẩn.
     */
    @Query("""
            SELECT c FROM NewsComment c
            WHERE c.postId = :postId AND c.parentId IS NULL
              AND c.status <> vn.weconex.aptis.news.domain.NewsComment$CommentStatus.DELETED
            ORDER BY c.createdAt ASC
            """)
    Page<NewsComment> findRoots(@Param("postId") String postId, Pageable pageable);

    /** Trả lời của một loạt bình luận gốc — một truy vấn cho cả trang. */
    @Query("""
            SELECT c FROM NewsComment c
            WHERE c.parentId IN :parentIds
              AND c.status <> vn.weconex.aptis.news.domain.NewsComment$CommentStatus.DELETED
            ORDER BY c.createdAt ASC
            """)
    List<NewsComment> findReplies(@Param("parentIds") List<String> parentIds);

    @Query("""
            SELECT COUNT(c) FROM NewsComment c
            WHERE c.postId = :postId
              AND c.status = vn.weconex.aptis.news.domain.NewsComment$CommentStatus.VISIBLE
            """)
    long countVisible(@Param("postId") String postId);

    @Query("""
            SELECT COUNT(c) FROM NewsComment c
            WHERE c.postId = :postId
              AND c.status = vn.weconex.aptis.news.domain.NewsComment$CommentStatus.PENDING
            """)
    long countPendingOfPost(@Param("postId") String postId);

    /** Hàng đợi kiểm duyệt trong trang quản trị. */
    Page<NewsComment> findByStatusOrderByCreatedAtAsc(
            NewsComment.CommentStatus status, Pageable pageable);

    long countByStatus(NewsComment.CommentStatus status);

    @Modifying
    @Query("UPDATE NewsComment c SET c.replyCount = c.replyCount + :delta WHERE c.id = :id")
    void addReplyCount(@Param("id") String id, @Param("delta") int delta);

    /**
     * Chống gửi trùng: cùng người, cùng bài, cùng nội dung trong ít phút.
     *
     * <p>Học viên bấm gửi hai lần khi mạng chậm là chuyện thường; không chặn thì
     * bài viết đầy bình luận đôi.
     */
    @Query("""
            SELECT COUNT(c) FROM NewsComment c
            WHERE c.userId = :userId AND c.postId = :postId AND c.body = :body
              AND c.createdAt > :since
            """)
    long countDuplicates(
            @Param("userId") String userId,
            @Param("postId") String postId,
            @Param("body") String body,
            @Param("since") java.time.Instant since);
}
