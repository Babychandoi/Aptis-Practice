package vn.weconex.aptis.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.AuthIdentity;
import vn.weconex.aptis.auth.domain.OneTimeToken;
import vn.weconex.aptis.auth.domain.Permission;
import vn.weconex.aptis.auth.domain.RefreshToken;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.AuthIdentityRepository;
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

    /**
     * Khoan dung khi nhiều tab đua nhau refresh: token vừa rotate trong khoảng
     * này được coi là request chậm chân, không phải bị đánh cắp.
     */
    private static final Duration ROTATION_GRACE = Duration.ofSeconds(30);

    /**
     * Trần gửi lại email xác thực. Đặt 3 lần/giờ: đủ cho người dùng thật thử
     * lại vài lần, nhưng không cho vét hết quota gửi thư (Gmail giới hạn ~500
     * thư/ngày cho toàn hệ thống).
     */
    private static final Duration RESEND_WINDOW = Duration.ofHours(1);
    private static final long MAX_RESEND_PER_WINDOW = 3;

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
    private final AuthIdentityRepository authIdentityRepository;
    private final GoogleTokenVerifier googleTokenVerifier;
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
     * Đăng nhập/đăng ký bằng Google.
     *
     * <p>Google đã xác thực email nên bỏ hẳn bước xác thực qua thư — đây là lý
     * do chính thêm luồng này: người dùng không còn kẹt ở email vào Spam.
     *
     * <p>Ba trường hợp:
     * <ol>
     *   <li>Đã liên kết Google trước đó → đăng nhập luôn.</li>
     *   <li>Email đã có tài khoản (đăng ký bằng mật khẩu) → gộp: tạo liên kết và
     *       đánh dấu email đã xác thực. An toàn vì Google xác nhận người đang
     *       đăng nhập sở hữu chính email đó; đây cũng là đường thoát cho những
     *       người đăng ký rồi không nhận được thư xác thực.</li>
     *   <li>Chưa có gì → tạo tài khoản mới ở trạng thái ACTIVE luôn.</li>
     * </ol>
     */
    @Transactional
    public AuthDtos.TokenResponse loginWithGoogle(
            String idToken, String deviceId, String userAgent, String ipAddress) {

        GoogleTokenVerifier.GoogleUser google = googleTokenVerifier.verify(idToken);

        User user = authIdentityRepository
                .findByProviderAndProviderUserId(AuthIdentity.GOOGLE, google.subject())
                .flatMap(identity -> userRepository.findByIdWithAuthorities(identity.getUserId()))
                .orElseGet(() -> linkOrCreateGoogleUser(google));

        // Tài khoản bị khoá/vô hiệu thì Google cũng không mở được — nếu bỏ qua
        // kiểm tra này thì đăng nhập Google thành cửa sau vượt lệnh khoá.
        if (user.isCurrentlyLocked()) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED, "Tài khoản đang bị khóa tạm thời");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(
                    ErrorCode.ACCOUNT_SUSPENDED, "Tài khoản không ở trạng thái hoạt động");
        }

        user.recordSuccessfulLogin();
        return issueTokenPair(user, deviceId, userAgent, ipAddress);
    }

    private User linkOrCreateGoogleUser(GoogleTokenVerifier.GoogleUser google) {
        User user = userRepository.findByEmailWithAuthorities(google.email())
                .orElseGet(() -> createGoogleUser(google));

        // Tài khoản cũ chưa xác thực email: Google vừa xác nhận người này sở hữu
        // email đó, nên coi như đã xác thực.
        if (user.getEmailVerifiedAt() == null) {
            user.markEmailVerified();
            log.info("Xác thực email {} qua đăng nhập Google", google.email());
        }

        authIdentityRepository.save(
                AuthIdentity.google(user.getId(), google.subject(), google.email()));
        return user;
    }

    private User createGoogleUser(GoogleTokenVerifier.GoogleUser google) {
        // passwordHash = null: tài khoản này chỉ đăng nhập bằng Google. Muốn
        // dùng mật khẩu thì đi qua luồng "quên mật khẩu" để tự đặt.
        User user = User.register(google.email(), null);
        user.markEmailVerified();
        userRepository.save(user);

        UserProfile profile = UserProfile.forUser(user.getId());
        profile.setFullName(google.name());
        profileRepository.save(profile);

        Role student = roleRepository.findByCode(Role.STUDENT)
                .orElseThrow(() -> new IllegalStateException("Thiếu role STUDENT trong seed data"));
        user.getRoles().add(student);

        log.info("Tạo tài khoản mới qua Google: {}", google.email());
        return user;
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
            // Bị đẩy ra vì đăng nhập ở nơi khác thì KHÔNG phải dấu hiệu bị đánh
            // cắp: máy cũ vẫn còn cookie và sẽ tự gọi refresh. Thu hồi cả nhà ở
            // đây sẽ đăng xuất luôn phiên vừa đăng nhập — đã gặp đúng lỗi đó.
            if (RefreshToken.SUPERSEDED.equals(existing.getRevokeReason())) {
                throw new ApiException(
                        ErrorCode.SESSION_REPLACED,
                        "Tài khoản đã được đăng nhập ở thiết bị khác");
            }

            // Nhiều tab cùng mở sẽ đua nhau gọi refresh: tab đầu rotate token,
            // tab sau gửi đúng token vừa bị rotate. Đó KHÔNG phải đánh cắp —
            // token bị đánh cắp thật thì không có replacedByTokenId, còn token
            // rotate hợp lệ luôn có.
            //
            // Chỉ khoan dung trong cửa sổ ngắn: token rotate từ lâu mà còn được
            // dùng thì đúng là dấu hiệu bị trộm.
            if (existing.getReplacedByTokenId() != null
                    && existing.getRevokedAt().isAfter(Instant.now().minus(ROTATION_GRACE))) {
                log.debug("Refresh token vừa rotate được dùng lại (nhiều tab), user {}",
                        existing.getUserId());
                throw new ApiException(
                        ErrorCode.TOKEN_EXPIRED,
                        "Phiên vừa được làm mới, hãy thử lại");
            }

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

    /**
     * Gửi lại email xác thực khi liên kết cũ hết hạn hoặc thư bị mất.
     *
     * <p>Không báo lỗi khi email không tồn tại hoặc đã xác thực rồi — giống
     * {@link #forgotPassword}, để endpoint này không dùng được để dò xem email
     * nào đã đăng ký.
     *
     * <p>{@code issueEmailVerificationToken} vô hiệu hoá token cũ trước khi tạo
     * mới, nên liên kết trong thư trước hết tác dụng — người dùng bấm nhầm thư
     * cũ sẽ thấy "hết hạn" thay vì kích hoạt sai.
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        userRepository.findByEmail(email.toLowerCase().strip())
                .filter(user -> user.getStatus() == UserStatus.PENDING_VERIFICATION)
                .ifPresent(user -> {
                    // Chặn bấm liên tục: endpoint công khai nên nếu không giới
                    // hạn thì một người có thể vét hết quota gửi thư trong ngày.
                    //
                    // Im lặng bỏ qua thay vì báo lỗi — người dùng thật bấm hai
                    // lần vì chưa thấy thư, hiện lỗi đỏ chỉ làm họ lo thêm khi
                    // thư đầu vẫn đang trên đường tới.
                    long recent = emailVerificationRepository.countIssuedSince(
                            user.getId(), Instant.now().minus(RESEND_WINDOW));
                    if (recent >= MAX_RESEND_PER_WINDOW) {
                        log.info("Bỏ qua gửi lại email xác thực cho {}: đã phát {} token trong {}",
                                user.getEmail(), recent, RESEND_WINDOW);
                        return;
                    }

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

    /**
     * Mỗi tài khoản chỉ giữ một phiên: đăng nhập mới thu hồi refresh token cũ,
     * nên máy đang mở bị đẩy về trang đăng nhập.
     *
     * <p>Đặt ở đây thay vì trong {@code login} để cả đăng nhập Google cũng đi
     * qua — quên một luồng là mở sẵn đường lách.
     *
     * <p>Nhân viên vận hành được miễn: admin hay phải mở nhiều máy cùng lúc, và
     * đây là chống chia sẻ tài khoản học viên chứ không phải chính sách bảo mật
     * nội bộ.
     *
     * <p>Giới hạn cần biết: access token còn hiệu lực 15 phút, nên máy bị đẩy ra
     * vẫn gọi API được tới khi token đó hết hạn. Thu hồi ngay lập tức đòi kiểm
     * tra danh sách đen ở mỗi request — đánh đổi không đáng cho mục đích này.
     */
    private AuthDtos.TokenResponse issueTokenPair(
            User user, String deviceId, String userAgent, String ipAddress) {

        if (properties.security().singleSession() && !isStaff(user)) {
            int revoked = refreshTokenRepository.supersedeAllForUser(user.getId(), Instant.now());
            if (revoked > 0) {
                log.info("Đăng nhập mới của {} đã thu hồi {} phiên cũ", user.getEmail(), revoked);
            }
        }

        return issueTokenPairInternal(user, deviceId, userAgent, ipAddress).response();
    }

    private static boolean isStaff(User user) {
        return user.getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> !Role.STUDENT.equals(code));
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
