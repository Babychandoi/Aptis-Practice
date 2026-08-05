package vn.weconex.aptis.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.auth.domain.UserProfile;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
}
