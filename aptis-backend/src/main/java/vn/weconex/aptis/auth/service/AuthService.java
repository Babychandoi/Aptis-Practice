package vn.weconex.aptis.auth.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.OneTimeToken;
import vn.weconex.aptis.auth.domain.Permission;
import vn.weconex.aptis.auth.domain.RefreshToken;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.EmailVerificationTokenRepository;
import vn.weconex.aptis.auth.repository.PasswordResetTokenRepository;
import vn.weconex.aptis.auth.repository.RefreshTokenRepository;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.auth.web.AuthDtos;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.JwtService;
import vn.weconex.aptis.common.util.Enums.UserStatus;

/**
 * Đăng ký, đăng nhập, refresh, đặt lại mật khẩu (PHẦN IV §29-30).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationRepository;
    private final PasswordResetTokenRepository passwordResetRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenHasher tokenHasher;
    private final TokenRevoker tokenRevoker;
    private final JwtService jwtService;
    private final AuthMailSender mailSender;
    private final AptisProperties properties;

    // -----------------------------------------------------------------
    // Đăng ký
    // -----------------------------------------------------------------

    @Transactional
    public void register(AuthDtos.RegisterRequest request) {
        String email = request.email().toLowerCase().strip();

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_USED, "Email đã được sử dụng");
        }

        User user = User.register(email, passwordEncoder.encode(request.password()));
        userRepository.save(user);

        UserProfile profile = UserProfile.forUser(user.getId());
        profile.setFullName(request.fullName());
        profileRepository.save(profile);

        // Role STUDENT được gán ngay; quyền nội dung FREE đi kèm role này
        Role student = roleRepository.findByCode(Role.STUDENT)
                .orElseThrow(() -> new IllegalStateException("Thiếu role STUDENT trong seed data"));
        user.getRoles().add(student);

        String rawToken = issueEmailVerificationToken(user.getId());
        mailSender.sendVerificationEmail(email, rawToken);
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        OneTimeToken.EmailVerification token = emailVerificationRepository
                .findByTokenHash(tokenHasher.hash(rawToken))
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_INVALID, "Token không hợp lệ"));

        if (!token.isUsable()) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "Token đã dùng hoặc hết hạn");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> ApiException.notFound("User", token.getUserId()));

        token.markUsed();
        user.markEmailVerified();
    }

    // -----------------------------------------------------------------
    // Đăng nhập
    // -----------------------------------------------------------------

    @Transactional
    public AuthDtos.TokenResponse login(
            AuthDtos.LoginRequest request, String userAgent, String ipAddress) {

        String email = request.email().toLowerCase().strip();
        User user = userRepository.findByEmailWithAuthorities(email)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.INVALID_CREDENTIALS, "Email hoặc mật khẩu không đúng"));

        if (user.isCurrentlyLocked()) {
            throw new ApiException(
                    ErrorCode.ACCOUNT_LOCKED, "Tài khoản đang bị khóa tạm thời");
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED, "Email chưa được xác thực");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(
                    ErrorCode.ACCOUNT_SUSPENDED, "Tài khoản không ở trạng thái hoạt động");
        }

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {

            boolean locked = user.recordFailedLogin(
                    properties.security().maxFailedLoginAttempts(),
                    properties.security().lockDuration());

            if (locked) {
                log.warn("Khóa tạm tài khoản {} do sai mật khẩu nhiều lần", user.getId());
                throw new ApiException(
                        ErrorCode.ACCOUNT_LOCKED, "Sai mật khẩu quá nhiều lần, tài khoản bị khóa tạm");
            }
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, "Email hoặc mật khẩu không đúng");
        }

        user.recordSuccessfulLogin();
        return issueTokenPair(user, request.deviceId(), userAgent, ipAddress);
    }

    /**
     * Rotate refresh token. Nếu token đã bị thu hồi mà vẫn được dùng lại thì
     * coi như bị đánh cắp: thu hồi toàn bộ token của user (PHẦN IV §30).
     */
    @Transactional
    public AuthDtos.TokenResponse refresh(String rawRefreshToken, String userAgent, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Thiếu refresh token");
        }
        RefreshToken existing = refreshTokenRepository
                .findByTokenHash(tokenHasher.hash(rawRefreshToken))
                .orElseThrow(() -> new ApiException(
                        ErrorCode.TOKEN_INVALID, "Refresh token không hợp lệ"));

        if (existing.getRevokedAt() != null) {
            log.warn("Refresh token đã thu hồi được dùng lại, thu hồi toàn bộ token của user {}",
                    existing.getUserId());
            // Gọi qua bean riêng với REQUIRES_NEW: exception bên dưới sẽ rollback
            // transaction hiện tại, nếu thu hồi nằm cùng transaction thì nó cũng
            // bị rollback và token bị đánh cắp vẫn dùng được.
            tokenRevoker.revokeAllForUserInNewTransaction(existing.getUserId());
            throw new ApiException(
                    ErrorCode.REFRESH_TOKEN_REUSED, "Refresh token đã bị thu hồi");
        }
        if (!existing.isActive()) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "Refresh token đã hết hạn");
        }

        User user = userRepository.findByIdWithAuthorities(existing.getUserId())
                .orElseThrow(() -> ApiException.notFound("User", existing.getUserId()));

        if (!user.canLogin()) {
            throw new ApiException(ErrorCode.ACCOUNT_SUSPENDED, "Tài khoản không còn hoạt động");
        }

        IssuedPair pair = issueTokenPairInternal(
                user, existing.getDeviceId(), userAgent, ipAddress);

        // Trỏ token cũ sang token mới để lần sau phát hiện được reuse
        existing.rotateTo(pair.refreshTokenId());

        return pair.response();
    }

    @Transactional
    public void logout(String userId, AuthDtos.LogoutRequest request) {
        if (request.allDevices()) {
            refreshTokenRepository.revokeAllForUser(userId, Instant.now());
            return;
        }
        if (request.refreshToken() == null || request.refreshToken().isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenHasher.hash(request.refreshToken()))
                // Chỉ cho thu hồi token của chính mình
                .filter(token -> token.getUserId().equals(userId))
                .ifPresent(RefreshToken::revoke);
    }

    // -----------------------------------------------------------------
    // Đặt lại mật khẩu
    // -----------------------------------------------------------------

    /**
     * Luôn trả thành công dù email không tồn tại, để không tiết lộ email nào
     * đã đăng ký.
     */
    @Transactional
    public void forgotPassword(String rawEmail) {
        String email = rawEmail.toLowerCase().strip();
        userRepository.findByEmail(email).ifPresent(user -> {
            passwordResetRepository.invalidateAllForUser(user.getId(), Instant.now());

            String rawToken = tokenHasher.generateToken();
            passwordResetRepository.save(OneTimeToken.PasswordReset.create(
                    user.getId(),
                    tokenHasher.hash(rawToken),
                    Instant.now().plus(properties.security().passwordResetTtl())));

            mailSender.sendPasswordResetEmail(email, rawToken);
        });
    }

    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        OneTimeToken.PasswordReset token = passwordResetRepository
                .findByTokenHash(tokenHasher.hash(request.token()))
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_INVALID, "Token không hợp lệ"));

        if (!token.isUsable()) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "Token đã dùng hoặc hết hạn");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> ApiException.notFound("User", token.getUserId()));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        token.markUsed();

        // Đổi mật khẩu thu hồi mọi phiên đang mở
        refreshTokenRepository.revokeAllForUser(user.getId(), Instant.now());
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        userRepository.findByEmail(email.toLowerCase().strip())
                .filter(user -> user.getStatus() == UserStatus.PENDING_VERIFICATION)
                .ifPresent(user -> {
                    String rawToken = issueEmailVerificationToken(user.getId());
                    mailSender.sendVerificationEmail(user.getEmail(), rawToken);
                });
    }

    // -----------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------

    private String issueEmailVerificationToken(String userId) {
        emailVerificationRepository.invalidateAllForUser(userId, Instant.now());

        String rawToken = tokenHasher.generateToken();
        emailVerificationRepository.save(OneTimeToken.EmailVerification.create(
                userId,
                tokenHasher.hash(rawToken),
                Instant.now().plus(properties.security().emailVerificationTtl())));
        return rawToken;
    }

    private AuthDtos.TokenResponse issueTokenPair(
            User user, String deviceId, String userAgent, String ipAddress) {

        return issueTokenPairInternal(user, deviceId, userAgent, ipAddress).response();
    }

    /**
     * Trả kèm id của refresh token vừa lưu để luồng rotate liên kết được
     * token cũ -> token mới mà không phải tra lại theo hash.
     */
    private IssuedPair issueTokenPairInternal(
            User user, String deviceId, String userAgent, String ipAddress) {

        Set<String> roles = new HashSet<>();
        Set<String> permissions = new HashSet<>();
        for (Role role : user.getRoles()) {
            roles.add(role.getCode());
            for (Permission permission : role.getPermissions()) {
                permissions.add(permission.getCode());
            }
        }

        JwtService.IssuedToken access = jwtService.issueAccessToken(user.getId(), roles, permissions);

        String rawRefresh = tokenHasher.generateToken();
        RefreshToken saved = refreshTokenRepository.save(RefreshToken.issue(
                user.getId(),
                tokenHasher.hash(rawRefresh),
                Instant.now().plus(properties.jwt().refreshTokenTtl()),
                deviceId,
                userAgent,
                ipAddress));

        return new IssuedPair(
                AuthDtos.TokenResponse.of(
                        access.token(), rawRefresh, access.expiresInSeconds(), access.expiresAt()),
                saved.getId());
    }

    private record IssuedPair(AuthDtos.TokenResponse response, String refreshTokenId) {
    }
}
