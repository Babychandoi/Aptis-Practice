package vn.weconex.aptis.auth.web;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.Permission;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.entitlement.service.EntitlementService;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final EntitlementService entitlementService;
    private final CurrentUser currentUser;

    @GetMapping
    @Transactional(readOnly = true)
    public AuthDtos.MeResponse me() {
        String userId = currentUser.requireUserId();

        User user = userRepository.findByIdWithAuthorities(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));

        UserProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> UserProfile.forUser(userId));

        Set<String> roles = new HashSet<>();
        Set<String> permissions = new HashSet<>();
        for (Role role : user.getRoles()) {
            roles.add(role.getCode());
            role.getPermissions().stream().map(Permission::getCode).forEach(permissions::add);
        }

        // Đọc entitlement từ DB, không lấy từ claim trong token —
        // quyền có thể đã bị thu hồi sau khi token được phát
        boolean premiumActive = entitlementService.hasPremiumAccess(userId);
        Instant premiumEndsAt = entitlementService.premiumEndsAt(userId).orElse(null);

        return new AuthDtos.MeResponse(
                user.getId(),
                user.getEmail(),
                user.getStatus().name(),
                roles,
                permissions,
                user.getEmailVerifiedAt() != null,
                toProfileResponse(profile),
                premiumActive,
                premiumEndsAt);
    }

    @PatchMapping("/profile")
    @Transactional
    public AuthDtos.ProfileResponse updateProfile(
            @Valid @RequestBody AuthDtos.UpdateProfileRequest request) {

        String userId = currentUser.requireUserId();
        UserProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> UserProfile.forUser(userId));

        if (request.fullName() != null) {
            profile.setFullName(request.fullName());
        }
        if (request.displayName() != null) {
            profile.setDisplayName(request.displayName());
        }
        if (request.dateOfBirth() != null) {
            profile.setDateOfBirth(request.dateOfBirth());
        }
        if (request.gender() != null) {
            profile.setGender(UserProfile.Gender.valueOf(request.gender()));
        }
        if (request.targetCefrLevel() != null) {
            profile.setTargetCefrLevel(request.targetCefrLevel());
        }
        if (request.targetExamDate() != null) {
            profile.setTargetExamDate(request.targetExamDate());
        }
        if (request.timezone() != null) {
            profile.setTimezone(request.timezone());
        }
        if (request.locale() != null) {
            profile.setLocale(request.locale());
        }

        return toProfileResponse(profileRepository.save(profile));
    }

    private static AuthDtos.ProfileResponse toProfileResponse(UserProfile profile) {
        return new AuthDtos.ProfileResponse(
                profile.getFullName(),
                profile.getDisplayName(),
                // Object key thô; client xin signed URL riêng qua Asset API
                profile.getAvatarObjectKey(),
                profile.getDateOfBirth(),
                profile.getGender().name(),
                profile.getTargetCefrLevel(),
                profile.getTargetExamDate(),
                profile.getTimezone(),
                profile.getLocale());
    }
}
