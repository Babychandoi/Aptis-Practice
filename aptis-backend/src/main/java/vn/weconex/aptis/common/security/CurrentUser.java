package vn.weconex.aptis.common.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Truy cập principal hiện tại. Service layer dùng bean này thay vì đọc
 * SecurityContextHolder trực tiếp để dễ test.
 */
@Component
public class CurrentUser {

    public Optional<AuthPrincipal> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
            return Optional.empty();
        }
        return Optional.of(principal);
    }

    public AuthPrincipal require() {
        return find().orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED, "Chưa đăng nhập"));
    }

    public String requireUserId() {
        return require().userId();
    }
}
