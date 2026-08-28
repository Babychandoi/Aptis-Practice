package vn.weconex.aptis.auth.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.service.AdminUserService;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.Enums.UserStatus;
import vn.weconex.aptis.common.util.PageResponse;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService service;
    private final CurrentUser currentUser;

    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public PageResponse<AdminUserDtos.AdminUserResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) AdminUserDtos.AccessState access,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(service.search(q, status, access,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('user:read')")
    public List<AdminUserDtos.AdminRoleResponse> roles() {
        return service.roles();
    }

    @PatchMapping("/{userId}/status")
    @PreAuthorize("hasAuthority('user:write')")
    public AdminUserDtos.AdminUserResponse updateStatus(
            @PathVariable String userId,
            @Valid @RequestBody AdminUserDtos.UpdateStatusRequest request) {
        return service.updateStatus(currentUser.requireUserId(), userId, request.status());
    }

    @PutMapping("/{userId}/roles")
    @PreAuthorize("hasAuthority('user:write')")
    public AdminUserDtos.AdminUserResponse updateRoles(
            @PathVariable String userId,
            @Valid @RequestBody AdminUserDtos.UpdateRolesRequest request) {
        return service.updateRoles(currentUser.requireUserId(), userId, request.roles());
    }
}
