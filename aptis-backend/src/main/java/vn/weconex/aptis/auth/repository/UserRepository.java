package vn.weconex.aptis.auth.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.auth.domain.User;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    /**
     * Nạp sẵn roles + permissions để phát token mà không phát sinh N+1.
     */
    @Query("""
            SELECT u FROM User u
            LEFT JOIN FETCH u.roles r
            LEFT JOIN FETCH r.permissions
            WHERE u.email = :email
            """)
    Optional<User> findByEmailWithAuthorities(@Param("email") String email);

    @Query("""
            SELECT u FROM User u
            LEFT JOIN FETCH u.roles r
            LEFT JOIN FETCH r.permissions
            WHERE u.id = :id
            """)
    Optional<User> findByIdWithAuthorities(@Param("id") String id);

    /**
     * Nhiều người kèm vai trò — một truy vấn cho cả trang bình luận thay vì một
     * truy vấn mỗi tác giả. DISTINCT vì JOIN FETCH nhân dòng theo số vai trò.
     */
    @Query("""
            SELECT DISTINCT u FROM User u
            LEFT JOIN FETCH u.roles
            WHERE u.id IN :ids
            """)
    List<User> findAllByIdInWithRoles(@Param("ids") List<String> ids);
}
