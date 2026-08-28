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
import vn.weconex.aptis.auth.repository.RefreshTokenRepository;
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
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final AptisProperties properties;

    @Transactional(readOnly = true)
    public Page<AdminUserDtos.AdminUserResponse> search(
            String query,
            UserStatus status,
            AdminUserDtos.AccessState access,
            Pageable pageable) {

        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        // Lọc quyền phải làm ở DB chứ không lọc sau khi phân trang: lọc trên 20
        // dòng của một trang thì tổng số và số trang đều sai.
        Instant now = Instant.now();
        Instant trialFrom = now.minus(java.time.Duration.ofDays(
                Math.max(properties.entitlement().signupTrialDays(), 0)));

        Page<User> page = userRepository.findAll((root, ignored, cb) -> {
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
            if (access != null) {
                predicate = cb.and(predicate, accessPredicate(root, ignored, cb, access, now, trialFrom));
            }
            return predicate;
        }, pageable);

        // Một truy vấn cho cả trang thay vì một truy vấn mỗi dòng: 20 dòng x 1
        // query là 20 lần round-trip DB chỉ để lấy một cột thời gian.
        Map<String, Instant> lastActivity = loadLastActivity(
                page.getContent().stream().map(User::getId).toList());

        return page.map(user -> toResponse(user, lastActivity.get(user.getId())));
    }

    /**
     * Điều kiện lọc theo nguồn quyền.
     *
     * <p>Dùng thử KHÔNG có bản ghi riêng — quyền suy ra từ users.created_at (xem
     * EntitlementService#withinSignupTrial), nên ở đây phải diễn đạt lại chính
     * quy tắc đó: có entitlement là PAID, còn lại chia theo created_at.
     */
    private Predicate accessPredicate(
            jakarta.persistence.criteria.Root<User> root,
            jakarta.persistence.criteria.CriteriaQuery<?> criteriaQuery,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            AdminUserDtos.AccessState access,
            Instant now,
            Instant trialFrom) {

        jakarta.persistence.criteria.Subquery<String> paid =
                criteriaQuery.subquery(String.class);
        var ent = paid.from(vn.weconex.aptis.entitlement.domain.UserEntitlement.class);
        paid.select(ent.get("userId"))
                .where(cb.and(
                        cb.equal(ent.get("userId"), root.get("id")),
                        cb.equal(ent.get("entitlementCode"), properties.entitlement().premiumCode()),
                        cb.isNull(ent.get("revokedAt")),
                        cb.or(cb.isNull(ent.get("endsAt")), cb.greaterThan(ent.get("endsAt"), now))));

        Predicate hasPaid = cb.exists(paid);
        Predicate withinTrial = cb.greaterThanOrEqualTo(root.get("createdAt"), trialFrom);

        return switch (access) {
            case PAID -> hasPaid;
            case TRIAL -> cb.and(cb.not(hasPaid), withinTrial);
            case EXPIRED -> cb.and(cb.not(hasPaid), cb.not(withinTrial));
        };
    }

    /** Cho một user lẻ (sau khi đổi trạng thái/vai trò). */
    private Instant lastActivityOf(String userId) {
        return loadLastActivity(List.of(userId)).get(userId);
    }

    /** Rỗng thì bỏ qua truy vấn: {@code IN ()} là cú pháp không hợp lệ. */
    private Map<String, Instant> loadLastActivity(List<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Instant> result = new java.util.HashMap<>();
        for (Object[] row : refreshTokenRepository.findLastActivityByUserIds(userIds)) {
            result.put((String) row[0], (Instant) row[1]);
        }
        return result;
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
        return toResponse(user, lastActivityOf(user.getId()));
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
        return toResponse(user, lastActivityOf(user.getId()));
    }

    private User requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));
    }

    private AdminUserDtos.AdminUserResponse toResponse(User user, Instant lastActivityAt) {
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
        boolean paid = entitlements.stream()
                .anyMatch(item -> premiumCode.equals(item.getEntitlementCode()));

        // Còn dùng thử thì premiumActive vẫn true — cột Premium trong trang quản
        // trị phải khớp với quyền thật mà học viên đang có, không chỉ với đơn hàng.
        boolean withinTrial = !paid
                && properties.entitlement().withinSignupTrial(user.getCreatedAt(), Instant.now());
        boolean premiumActive = paid || withinTrial;

        AdminUserDtos.AccessState accessState = paid
                ? AdminUserDtos.AccessState.PAID
                : withinTrial ? AdminUserDtos.AccessState.TRIAL : AdminUserDtos.AccessState.EXPIRED;

        Instant trialEndsAt = withinTrial
                ? user.getCreatedAt().plus(java.time.Duration.ofDays(
                        properties.entitlement().signupTrialDays()))
                : null;

        return new AdminUserDtos.AdminUserResponse(
                user.getId(), user.getEmail(), user.getPhone(), user.getStatus(),
                user.getEmailVerifiedAt() != null,
                profile == null ? null : profile.getFullName(),
                profile == null ? null : profile.getDisplayName(),
                user.getRoles().stream().map(Role::getCode).sorted().toList(),
                premiumActive, premiumEndsAt, accessState, trialEndsAt,
                user.getCreatedAt(), user.getLastLoginAt(),
                lastActivityAt);
    }
}
