package vn.weconex.aptis.auth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.auth.domain.UserProfile;

public interface UserProfileRepository extends JpaRepository<UserProfile, String> {

    /** Lấy tên hiển thị hàng loạt, dùng cho các bảng danh sách. */
    List<UserProfile> findByUserIdIn(List<String> userIds);
}
