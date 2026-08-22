package vn.weconex.aptis.auth.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.auth.web.AdminUserDtos;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.UserStatus;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;
import vn.weconex.aptis.platform.audit.AuditService;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final Set<UserStatus> MANAGEABLE_STATUSES = Set.of(UserStatus.ACTIVE, UserStatus.SUSPENDED);

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final RoleRepository roleRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final AuditService auditService;
    private final AptisProperties properties;

    @Transactional(readOnly = true)
    public Page<AdminUserDtos.AdminUserResponse> search(
            String query, UserStatus status, Pageable pageable) {

        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return userRepository.findAll((root, ignored, cb) -> {
            Predicate predicate = cb.conjunction();
            if (!term.isEmpty()) {
                String like = "%" + term + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("phone"), "")), like)));
            }
            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }
            return predicate;
        }, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AdminUserDtos.AdminRoleResponse> roles() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getCode))
                .map(role -> new AdminUserDtos.AdminRoleResponse(
                        role.getCode(), role.getName(), role.getDescription()))
                .toList();
    }

    @Transactional
    public AdminUserDtos.AdminUserResponse updateStatus(
            String actorId, String userId, UserStatus status) {

        if (!MANAGEABLE_STATUSES.contains(status)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Chỉ có thể kích hoạt hoặc tạm khóa tài khoản");
        }
        if (actorId.equals(userId) && status != UserStatus.ACTIVE) {
            throw ApiException.forbidden("Không thể tự khóa tài khoản đang đăng nhập");
        }

        User user = requireUser(userId);
        UserStatus before = user.getStatus();
        user.setStatus(status);
        if (status == UserStatus.ACTIVE) {
            user.setLockedUntil(null);
            user.setFailedLoginCount(0);
        }
        userRepository.save(user);
        auditService.record(actorId, "USER_STATUS_UPDATE", "USER", userId,
                Map.of("status", before.name()), Map.of("status", status.name()));
        return toResponse(user);
    }

    @Transactional
    public AdminUserDtos.AdminUserResponse updateRoles(
            String actorId, String userId, Set<String> requestedCodes) {

        Set<String> codes = requestedCodes.stream()
                .map(code -> code.trim().toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        List<Role> roles = roleRepository.findAllByCodeIn(codes);
        if (roles.size() != codes.size()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Có vai trò không hợp lệ");
        }
        if (actorId.equals(userId)
                && codes.stream().noneMatch(code -> code.equals(Role.ADMIN) || code.equals(Role.SUPER_ADMIN))) {
            throw ApiException.forbidden("Không thể tự gỡ quyền quản trị đang sử dụng");
        }

        User user = requireUser(userId);
        Set<String> before = user.getRoles().stream().map(Role::getCode).collect(java.util.stream.Collectors.toSet());
        user.setRoles(new HashSet<>(roles));
        userRepository.save(user);
        auditService.record(actorId, "USER_ROLES_UPDATE", "USER", userId,
                Map.of("roles", before), Map.of("roles", codes));
        return toResponse(user);
    }

    private User requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));
    }

    private AdminUserDtos.AdminUserResponse toResponse(User user) {
        UserProfile profile = profileRepository.findById(user.getId()).orElse(null);
        var entitlements = entitlementRepository.findAllActive(user.getId(), Instant.now());

        // Lấy mã từ config chứ không so với hằng "PREMIUM": mã thật là
        // PREMIUM_CONTENT_ACCESS, nên so sánh cứng làm cột Premium trong trang
        // quản lý tài khoản LUÔN hiện Free kể cả người đã nâng cấp.
        String premiumCode = properties.entitlement().premiumCode();

        Instant premiumEndsAt = entitlements.stream()
                .filter(item -> premiumCode.equals(item.getEntitlementCode()))
                .map(item -> item.getEndsAt())
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        boolean premiumActive = entitlements.stream()
                .anyMatch(item -> premiumCode.equals(item.getEntitlementCode()));

        return new AdminUserDtos.AdminUserResponse(
                user.getId(), user.getEmail(), user.getPhone(), user.getStatus(),
                user.getEmailVerifiedAt() != null,
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getDisplayName(),
                user.getRoles().stream().map(Role::getCode).sorted().toList(),
                premiumActive, premiumEndsAt, user.getCreatedAt(), user.getLastLoginAt());
    }
}
