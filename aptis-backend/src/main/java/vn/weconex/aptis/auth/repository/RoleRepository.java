package vn.weconex.aptis.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.auth.domain.Role;

public interface RoleRepository extends JpaRepository<Role, String> {

    Optional<Role> findByCode(String code);
}
