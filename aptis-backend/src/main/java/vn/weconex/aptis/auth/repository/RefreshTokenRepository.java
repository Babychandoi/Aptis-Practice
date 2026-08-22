package vn.weconex.aptis.auth.repository;

import java.time.Instant;
import java.util.List;
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

    /**
     * Thu hồi phiên cũ khi có đăng nhập mới, đánh dấu lý do SUPERSEDED.
     *
     * <p>Phải phân biệt với thu hồi thường: máy cũ sẽ gọi refresh bằng token vừa
     * bị đẩy ra, và nếu không có nhãn này thì luồng chống đánh cắp coi đó là
     * token bị trộm rồi thu hồi luôn phiên mới vừa đăng nhập.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE RefreshToken t
            SET t.revokedAt = :now, t.revokeReason = 'SUPERSEDED'
            WHERE t.userId = :userId AND t.revokedAt IS NULL
            """)
    int supersedeAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") Instant before);

    /**
     * Thời điểm phát refresh token gần nhất của từng user — dùng làm mốc "lần
     * cuối còn ở web".
     *
     * <p>Chính xác hơn {@code users.last_login_at}: refresh token sống 30 ngày
     * nên người dùng vào web hằng ngày mà không phải đăng nhập lại, và cột
     * last_login_at đứng im. Mỗi lần app làm mới access token (15 phút một lần
     * khi đang mở) sẽ sinh một bản ghi mới ở đây.
     *
     * <p>Nhận danh sách userId để trang admin chỉ tốn MỘT truy vấn cho cả trang,
     * thay vì một truy vấn mỗi dòng.
     */
    @Query("""
            SELECT t.userId, MAX(t.createdAt)
            FROM RefreshToken t
            WHERE t.userId IN :userIds
            GROUP BY t.userId
            """)
    List<Object[]> findLastActivityByUserIds(@Param("userIds") List<String> userIds);
}
