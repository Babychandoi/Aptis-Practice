package vn.weconex.aptis.billing.web;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission.CommissionStatus;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout.PayoutStatus;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateSettings;
import vn.weconex.aptis.billing.repository.AffiliateAccountRepository;
import vn.weconex.aptis.billing.repository.AffiliateCommissionRepository;
import vn.weconex.aptis.billing.repository.AffiliatePayoutRepository;
import vn.weconex.aptis.billing.repository.AffiliateReferralRepository;
import vn.weconex.aptis.billing.repository.AffiliateSettingsRepository;
import vn.weconex.aptis.billing.service.AffiliateService;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;

/** Theo dõi và duyệt chương trình giới thiệu, phía quản trị. */
@RestController
@RequestMapping("/api/v1/admin/affiliate")
@RequiredArgsConstructor
public class AdminAffiliateController {

    /** Số dòng tối đa trong bảng xếp hạng ở trang tổng quan. */
    private static final int TOP_LIMIT = 20;

    private final AffiliateService affiliateService;
    private final AffiliateAccountRepository accountRepository;
    private final AffiliateReferralRepository referralRepository;
    private final AffiliateCommissionRepository commissionRepository;
    private final AffiliatePayoutRepository payoutRepository;
    private final AffiliateSettingsRepository settingsRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    /** Số liệu tổng quan + bảng xếp hạng người giới thiệu. */
    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('affiliate:read')")
    @Transactional(readOnly = true)
    public AffiliateDtos.AdminAffiliateOverviewResponse overview() {
        List<AffiliateAccount> accounts = accountRepository.findAll();

        long totalCommission = accounts.stream()
                .mapToLong(AffiliateAccount::getTotalEarned).sum();
        long totalPaid = accounts.stream()
                .mapToLong(AffiliateAccount::getTotalPaid).sum();

        List<AffiliatePayout> openPayouts = payoutRepository
                .findByStatusOrderByCreatedAtDesc(PayoutStatus.REQUESTED, PageRequest.of(0, 500))
                .getContent();

        List<AffiliateAccount> top = accounts.stream()
                .sorted(Comparator.comparingLong(AffiliateAccount::getTotalEarned).reversed())
                .limit(TOP_LIMIT)
                .toList();

        return new AffiliateDtos.AdminAffiliateOverviewResponse(
                accounts.size(),
                referralRepository.count(),
                totalCommission,
                totalPaid,
                openPayouts.size(),
                openPayouts.stream().mapToLong(AffiliatePayout::getAmount).sum(),
                toRows(top));
    }

    /** Danh sách người giới thiệu, phân trang. */
    @GetMapping("/accounts")
    @PreAuthorize("hasAuthority('affiliate:read')")
    @Transactional(readOnly = true)
    public PageResponse<AffiliateDtos.AdminAffiliateRowResponse> accounts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AffiliateAccount> accounts = accountRepository.findAll(PageRequest.of(page, size));

        // Dựng cả trang một lần rồi tra theo userId: toRows() gom sẵn user và
        // hồ sơ, gọi lẻ từng dòng sẽ thành N+1.
        Map<String, AffiliateDtos.AdminAffiliateRowResponse> rows = toRows(accounts.getContent())
                .stream()
                .collect(Collectors.toMap(
                        AffiliateDtos.AdminAffiliateRowResponse::userId, Function.identity()));

        return PageResponse.of(accounts, account -> rows.get(account.getUserId()));
    }

    /**
     * Danh sách yêu cầu rút tiền để duyệt.
     *
     * <p>Mặc định chỉ hiện yêu cầu đang chờ — đó là việc admin cần làm; truyền
     * {@code status} để xem lịch sử.
     */
    @GetMapping("/payouts")
    @PreAuthorize("hasAuthority('affiliate:read')")
    @Transactional(readOnly = true)
    public PageResponse<AffiliateDtos.AdminPayoutResponse> payouts(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var pageable = PageRequest.of(page, size);
        Page<AffiliatePayout> payouts = status == null || status.isBlank()
                ? payoutRepository.findAllByOrderByCreatedAtDesc(pageable)
                : payoutRepository.findByStatusOrderByCreatedAtDesc(
                        PayoutStatus.valueOf(status), pageable);

        List<String> userIds = payouts.getContent().stream()
                .map(AffiliatePayout::getAffiliateUserId).distinct().toList();
        Map<String, User> users = usersById(userIds);
        Map<String, String> names = namesById(userIds);

        // Số khoản hoa hồng trong mỗi yêu cầu, gom một lần cho cả trang.
        Map<String, Integer> countByPayout = payouts.getContent().stream()
                .collect(Collectors.toMap(
                        AffiliatePayout::getId,
                        payout -> commissionRepository.findByPayoutId(payout.getId()).size()));

        return PageResponse.of(payouts.map(payout -> {
            User user = users.get(payout.getAffiliateUserId());
            return new AffiliateDtos.AdminPayoutResponse(
                    payout.getId(),
                    payout.getAffiliateUserId(),
                    names.getOrDefault(payout.getAffiliateUserId(), ""),
                    user == null ? "" : user.getEmail(),
                    payout.getAmount(),
                    payout.getStatus().name(),
                    payout.getBankName(),
                    payout.getBankAccountNumber(),
                    payout.getBankAccountName(),
                    payout.getNote(),
                    payout.getAdminNote(),
                    countByPayout.getOrDefault(payout.getId(), 0),
                    payout.getCreatedAt(),
                    payout.getReviewedAt(),
                    payout.getPaidAt());
        }));
    }

    @PostMapping("/payouts/{payoutId}/approve")
    @PreAuthorize("hasAuthority('affiliate:manage')")
    public AffiliateDtos.PayoutResponse approve(
            @PathVariable String payoutId,
            @Valid @RequestBody AffiliateDtos.ReviewPayoutRequest request) {

        return toDto(affiliateService.approvePayout(
                currentUser.requireUserId(), payoutId, request.adminNote()));
    }

    @PostMapping("/payouts/{payoutId}/reject")
    @PreAuthorize("hasAuthority('affiliate:manage')")
    public AffiliateDtos.PayoutResponse reject(
            @PathVariable String payoutId,
            @Valid @RequestBody AffiliateDtos.ReviewPayoutRequest request) {

        return toDto(affiliateService.rejectPayout(
                currentUser.requireUserId(), payoutId, request.adminNote()));
    }

    /** Xác nhận đã chuyển khoản xong. */
    @PostMapping("/payouts/{payoutId}/paid")
    @PreAuthorize("hasAuthority('affiliate:manage')")
    public AffiliateDtos.PayoutResponse markPaid(
            @PathVariable String payoutId,
            @Valid @RequestBody AffiliateDtos.ReviewPayoutRequest request) {

        return toDto(affiliateService.markPayoutPaid(
                currentUser.requireUserId(), payoutId, request.adminNote()));
    }

    /**
     * Cấp mã cho mọi người đã đủ điều kiện nhưng chưa có.
     *
     * <p>Job định kỳ cũng làm việc này, nhưng có nút bấm để không phải chờ khi
     * vừa bật tính năng hoặc vừa cấp Premium tay cho ai đó.
     */
    @PostMapping("/backfill")
    @PreAuthorize("hasAuthority('affiliate:manage')")
    public Map<String, Integer> backfill() {
        return Map.of("granted", affiliateService.backfillAccounts());
    }

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('affiliate:read')")
    @Transactional(readOnly = true)
    public AffiliateDtos.AffiliateSettingsResponse settings() {
        AffiliateSettings config = affiliateService.settings();
        return new AffiliateDtos.AffiliateSettingsResponse(
                config.getCommissionPercent(),
                config.getDiscountPercent(),
                config.isRecurring(),
                config.isCommissionOnGross(),
                config.getMinPayoutAmount(),
                config.getHoldDays(),
                config.isEnabled());
    }

    /**
     * Đổi tỉ lệ hoa hồng.
     *
     * <p>Chỉ ảnh hưởng đơn phát sinh SAU thời điểm đổi — hoa hồng đã ghi nhận
     * giữ nguyên tỉ lệ cũ đã chụp lại trong bản ghi.
     */
    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('affiliate:manage')")
    @Transactional
    public AffiliateDtos.AffiliateSettingsResponse updateSettings(
            @Valid @RequestBody AffiliateDtos.UpdateAffiliateSettingsRequest request) {

        AffiliateSettings config = affiliateService.settings();
        config.setCommissionPercent(clampPercent(request.commissionPercent()));
        config.setDiscountPercent(clampPercent(request.discountPercent()));
        config.setRecurring(request.recurring());
        config.setCommissionOnGross(request.commissionOnGross());
        config.setMinPayoutAmount(Math.max(0, request.minPayoutAmount()));
        config.setHoldDays(Math.max(0, request.holdDays()));
        config.setEnabled(request.enabled());
        config.setUpdatedAt(Instant.now());
        settingsRepository.save(config);

        return settings();
    }

    private List<AffiliateDtos.AdminAffiliateRowResponse> toRows(List<AffiliateAccount> accounts) {
        if (accounts.isEmpty()) {
            return List.of();
        }

        List<String> userIds = accounts.stream().map(AffiliateAccount::getUserId).toList();
        Map<String, User> users = usersById(userIds);
        Map<String, String> names = namesById(userIds);

        return accounts.stream().map(account -> {
            User user = users.get(account.getUserId());
            AffiliateService.Balance balance = affiliateService.balanceOf(account.getUserId());

            long paidOrders = commissionRepository
                    .findByAffiliateUserIdOrderByCreatedAtDesc(
                            account.getUserId(), PageRequest.of(0, 1000))
                    .getContent().stream()
                    .filter(c -> c.getStatus() != CommissionStatus.CANCELLED)
                    .map(AffiliateCommission::getOrderId)
                    .distinct()
                    .count();

            return new AffiliateDtos.AdminAffiliateRowResponse(
                    account.getUserId(),
                    names.getOrDefault(account.getUserId(), ""),
                    user == null ? "" : user.getEmail(),
                    account.getCode(),
                    referralRepository.countByAffiliateUserId(account.getUserId()),
                    paidOrders,
                    account.getTotalEarned(),
                    account.getTotalPaid(),
                    balance.available(),
                    account.getStatus().name());
        }).toList();
    }

    private Map<String, User> usersById(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private Map<String, String> namesById(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return profileRepository.findByUserIdIn(ids).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));
    }

    private static int clampPercent(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private static AffiliateDtos.PayoutResponse toDto(AffiliatePayout payout) {
        return new AffiliateDtos.PayoutResponse(
                payout.getId(),
                payout.getAmount(),
                payout.getStatus().name(),
                payout.getBankName(),
                payout.getBankAccountNumber(),
                payout.getBankAccountName(),
                payout.getNote(),
                payout.getAdminNote(),
                payout.getCreatedAt(),
                payout.getReviewedAt(),
                payout.getPaidAt());
    }
}
