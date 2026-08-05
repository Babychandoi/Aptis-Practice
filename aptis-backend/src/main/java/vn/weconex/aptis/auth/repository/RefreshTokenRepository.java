package vn.weconex.aptis.auth.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.auth.domain.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Đăng xuất tất cả thiết bị / thu hồi khi đổi mật khẩu.
     */
    /**
     * flushAutomatically + clearAutomatically là bắt buộc: bulk UPDATE đi thẳng
     * xuống DB, không đồng bộ với persistence context. Nếu thiếu, token vừa
     * được tạo trong cùng transaction sẽ giữ trạng thái cũ trong bộ nhớ và vẫn
     * dùng được sau khi đã bị thu hồi — vô hiệu hóa cơ chế chống đánh cắp token.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE RefreshToken t
            SET t.revokedAt = :now
            WHERE t.userId = :userId AND t.revokedAt IS NULL
            """)
    int revokeAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") Instant before);
}
