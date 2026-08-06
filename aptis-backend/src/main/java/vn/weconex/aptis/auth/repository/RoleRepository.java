package vn.weconex.aptis.auth.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.auth.domain.Role;

public interface RoleRepository extends JpaRepository<Role, String> {

    Optional<Role> findByCode(String code);

    List<Role> findAllByCodeIn(Collection<String> codes);
}
