package vn.weconex.aptis.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.auth.domain.AuthIdentity;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentity, String> {

    Optional<AuthIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByUserIdAndProvider(String userId, String provider);
}
