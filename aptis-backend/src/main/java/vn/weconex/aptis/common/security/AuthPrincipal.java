package vn.weconex.aptis.common.security;

import java.util.Set;

/**
 * Người dùng hiện tại, lấy từ access token. Không chứa trạng thái Premium —
 * quyền Premium luôn phải kiểm tra lại ở DB (PHẦN V §42) vì entitlement
 * có thể bị thu hồi trong lúc token còn hiệu lực.
 */
public record AuthPrincipal(String userId, Set<String> roles, Set<String> permissions) {

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }

    public boolean isStaff() {
        return roles.stream().anyMatch(r -> !"STUDENT".equals(r));
    }
}
