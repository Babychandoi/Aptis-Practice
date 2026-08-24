package vn.weconex.aptis.auth.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.auth.domain.Role;

public interface RoleRepository extends JpaRepository<Role, String> {

    Optional<Role> findByCode(String code);

    /**
     * Nạp kèm permissions để phát JWT được ngay trong cùng request.
     *
     * <p>Dùng khi vừa gán role cho user mới (đăng nhập Google lần đầu): user đó
     * không đi qua {@code findByIdWithAuthorities} nên role lấy bằng
     * {@link #findByCode} còn permissions ở dạng lazy, tới lúc phát token thì
     * session đã đóng và nổ LazyInitializationException.
     */
    @Query("""
            SELECT r FROM Role r
            LEFT JOIN FETCH r.permissions
            WHERE r.code = :code
            """)
    Optional<Role> findByCodeWithPermissions(@Param("code") String code);

    List<Role> findAllByCodeIn(Collection<String> codes);
}
