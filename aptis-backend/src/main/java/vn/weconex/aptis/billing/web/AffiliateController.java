package vn.weconex.aptis.billing.web;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout.PayoutStatus;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateReferral;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateSettings;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.repository.AffiliateCommissionRepository;
import vn.weconex.aptis.billing.repository.AffiliatePayoutRepository;
import vn.weconex.aptis.billing.repository.AffiliateReferralRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.service.AffiliateService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;

/** Trang giới thiệu của học viên. */
@RestController
@RequestMapping("/api/v1/affiliate")
@RequiredArgsConstructor
public class AffiliateController {

    private final AffiliateService affiliateService;
    private final AffiliateReferralRepository referralRepository;
    private final AffiliateCommissionRepository commissionRepository;
    private final AffiliatePayoutRepository payoutRepository;
    private final OrderRepository orderRepository;
    private final SubscriptionPlanRepository planRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    /** Thông tin mã và số dư của chính mình. */
    @GetMapping("/me")
    @Transactional
    public AffiliateDtos.MyAffiliateResponse me() {
        String userId = currentUser.requireUserId();
        AffiliateSettings config = affiliateService.settings();
        Optional<AffiliateAccount> account = affiliateService.ensureAccount(userId);
        AffiliateService.Balance balance = affiliateService.balanceOf(userId);

        boolean hasOpenPayout = payoutRepository.existsByAffiliateUserIdAndStatusIn(
                userId, List.of(PayoutStatus.REQUESTED, PayoutStatus.APPROVED));

        return new AffiliateDtos.MyAffiliateResponse(
                account.map(AffiliateAccount::getCode).orElse(null),
                account.isPresent(),
                // Mức riêng của chính người này, không phải mức chung: người
                // được thoả thuận 25% mà trang báo 10% thì họ tưởng bị tính sai.
                account.map(a -> a.effectiveCommissionPercent(config.getCommissionPercent()))
                        .orElseGet(config::getCommissionPercent),
                account.map(a -> a.effectiveDiscountPercent(config.getDiscountPercent()))
                        .orElseGet(config::getDiscountPercent),
                config.getMinPayoutAmount(),
                account.map(AffiliateAccount::getTotalEarned).orElse(0L),
                account.map(AffiliateAccount::getTotalPaid).orElse(0L),
                balance.pending(),
                balance.available(),
                balance.locked(),
                referralRepository.countByAffiliateUserId(userId),
                hasOpenPayout);
    }

    /**
     * Kiểm mã trước khi đặt đơn.
     *
     * <p>Trả 200 kèm {@code valid=false} thay vì ném lỗi: người dùng gõ dở mã
     * cũng gọi API này, không nên đỏ màn hình mỗi lần gõ thiếu ký tự.
     */
    @GetMapping("/check")
    @Transactional(readOnly = true)
    public AffiliateDtos.CheckAffiliateResponse check(
            @RequestParam String code, @RequestParam String planId) {

        SubscriptionPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", planId));

        try {
            AffiliateService.AppliedReferral applied =
                    affiliateService.apply(currentUser.requireUserId(), code, plan.getPriceAmount());
            return new AffiliateDtos.CheckAffiliateResponse(
                    applied.isApplied(), applied.code(), applied.discountAmount(), null);
        } catch (ApiException ex) {
            return new AffiliateDtos.CheckAffiliateResponse(false, null, 0L, ex.getMessage());
        }
    }

    /** Danh sách người mình đã giới thiệu. */
    @GetMapping("/referrals")
    @Transactional(readOnly = true)
    public PageResponse<AffiliateDtos.ReferralResponse> referrals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String userId = currentUser.requireUserId();
        Page<AffiliateReferral> referrals = referralRepository
                .findByAffiliateUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        List<String> referredIds = referrals.getContent().stream()
                .map(AffiliateReferral::getReferredUserId).toList();
        Map<String, User> users = usersById(referredIds);
        Map<String, String> names = namesById(referredIds);

        // Tổng hoa hồng theo từng người được giới thiệu, gom một lần thay vì
        // truy vấn trong vòng lặp.
        Map<String, Long> earnedByUser = commissionRepository
                .findByAffiliateUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 1000))
                .getContent().stream()
                .collect(Collectors.groupingBy(
                        AffiliateCommission::getReferredUserId,
                        Collectors.summingLong(AffiliateCommission::getAmount)));

        return PageResponse.of(referrals.map(referral -> {
            User user = users.get(referral.getReferredUserId());
            return new AffiliateDtos.ReferralResponse(
                    referral.getId(),
                    names.getOrDefault(referral.getReferredUserId(), ""),
                    user == null ? "" : maskEmail(user.getEmail()),
                    referral.getCreatedAt(),
                    earnedByUser.getOrDefault(referral.getReferredUserId(), 0L));
        }));
    }

    /** Lịch sử hoa hồng. */
    @GetMapping("/commissions")
    @Transactional(readOnly = true)
    public PageResponse<AffiliateDtos.CommissionResponse> commissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AffiliateCommission> commissions = commissionRepository
                .findByAffiliateUserIdOrderByCreatedAtDesc(
                        currentUser.requireUserId(), PageRequest.of(page, size));

        Map<String, Order> orders = orderRepository
                .findAllById(commissions.getContent().stream()
                        .map(AffiliateCommission::getOrderId).toList())
                .stream()
                .collect(Collectors.toMap(Order::getId, Function.identity()));

        Map<String, User> users = usersById(
                commissions.getContent().stream()
                        .map(AffiliateCommission::getReferredUserId).toList());

        return PageResponse.of(commissions.map(commission -> {
            Order order = orders.get(commission.getOrderId());
            User user = users.get(commission.getReferredUserId());
            return new AffiliateDtos.CommissionResponse(
                    commission.getId(),
                    order == null ? "" : order.getOrderCode(),
                    user == null ? "" : maskEmail(user.getEmail()),
                    commission.getBaseAmount(),
                    commission.getAmount(),
                    commission.getCommissionPercent(),
                    commission.getStatus().name(),
                    commission.getAvailableAt(),
                    commission.getCreatedAt());
        }));
    }

    @GetMapping("/payouts")
    @Transactional(readOnly = true)
    public PageResponse<AffiliateDtos.PayoutResponse> payouts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(payoutRepository
                .findByAffiliateUserIdOrderByCreatedAtDesc(
                        currentUser.requireUserId(), PageRequest.of(page, size))
                .map(AffiliateController::toPayoutDto));
    }

    @PostMapping("/payouts")
    @ResponseStatus(HttpStatus.CREATED)
    public AffiliateDtos.PayoutResponse requestPayout(
            @Valid @RequestBody AffiliateDtos.CreatePayoutRequest request) {

        AffiliatePayout payout = affiliateService.requestPayout(
                currentUser.requireUserId(),
                request.bankName(),
                request.bankAccountNumber(),
                request.bankAccountName(),
                request.note());
        return toPayoutDto(payout);
    }

    /** Tên hiển thị theo userId; thiếu hồ sơ thì trả rỗng. */
    private Map<String, String> namesById(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return profileRepository.findByUserIdIn(ids).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));
    }

    private Map<String, User> usersById(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /**
     * Che bớt email người được giới thiệu.
     *
     * <p>Người giới thiệu cần biết ai đã dùng mã của mình, nhưng không nên thấy
     * đủ email của người khác.
     */
    private static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return email;
        }
        String name = email.substring(0, at);
        String visible = name.substring(0, Math.min(2, name.length()));
        return visible + "***" + email.substring(at);
    }

    private static AffiliateDtos.PayoutResponse toPayoutDto(AffiliatePayout payout) {
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
