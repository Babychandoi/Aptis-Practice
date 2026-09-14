package vn.weconex.aptis.billing.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateCommission.CommissionStatus;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliatePayout.PayoutStatus;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateReferral;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateSettings;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.billing.repository.AffiliateAccountRepository;
import vn.weconex.aptis.billing.repository.AffiliateCommissionRepository;
import vn.weconex.aptis.billing.repository.AffiliatePayoutRepository;
import vn.weconex.aptis.billing.repository.AffiliateReferralRepository;
import vn.weconex.aptis.billing.repository.AffiliateSettingsRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Chương trình giới thiệu hai chiều.
 *
 * <p>Luồng tiền: người dùng nhập mã lúc đặt đơn → được giảm giá ngay, còn chủ
 * mã chỉ được ghi nhận hoa hồng khi đơn chuyển PAID (admin xác nhận trong đối
 * soát). Hoa hồng vào trạng thái PENDING nếu cấu hình có thời gian giữ, rồi mới
 * thành AVAILABLE để rút.
 *
 * <p>Điều kiện cấp mã: đã mua ít nhất một đơn thành công. Mục đích là chỉ người
 * đã thực sự dùng sản phẩm mới đi giới thiệu.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AffiliateService {

    /** Bỏ các ký tự dễ đọc nhầm (0/O, 1/I/L) vì mã còn được đọc qua điện thoại. */
    private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final int MAX_CODE_ATTEMPTS = 10;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AffiliateSettingsRepository settingsRepository;
    private final AffiliateAccountRepository accountRepository;
    private final AffiliateReferralRepository referralRepository;
    private final AffiliateCommissionRepository commissionRepository;
    private final AffiliatePayoutRepository payoutRepository;
    private final OrderRepository orderRepository;

    /** Kết quả áp mã giới thiệu lúc tạo đơn. */
    public record AppliedReferral(String code, String affiliateUserId, long discountAmount) {

        public boolean isApplied() {
            return affiliateUserId != null;
        }

        public static AppliedReferral none() {
            return new AppliedReferral(null, null, 0L);
        }
    }

    @Transactional(readOnly = true)
    public AffiliateSettings settings() {
        return settingsRepository.findById((byte) 1)
                .orElseThrow(() -> new IllegalStateException("Thiếu dòng cấu hình affiliate"));
    }

    // ---------------------------------------------------------------
    // Cấp mã
    // ---------------------------------------------------------------

    /**
     * Mã của một người, tự cấp nếu đủ điều kiện.
     *
     * <p>Trả về {@link Optional#empty()} khi người này chưa mua đơn nào — trang
     * cá nhân dựa vào đó để hiện lời mời "mua một gói bất kỳ để nhận mã".
     */
    @Transactional
    public Optional<AffiliateAccount> ensureAccount(String userId) {
        Optional<AffiliateAccount> existing = accountRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return existing;
        }

        if (!hasPaidOrder(userId)) {
            return Optional.empty();
        }

        AffiliateAccount account = new AffiliateAccount();
        account.setId(UUID.randomUUID().toString());
        account.setUserId(userId);
        account.setCode(generateUniqueCode());
        accountRepository.save(account);

        log.info("Cấp mã giới thiệu {} cho user {}", account.getCode(), userId);
        return Optional.of(account);
    }

    private boolean hasPaidOrder(String userId) {
        return orderRepository.existsByUserIdAndStatus(userId, OrderStatus.PAID);
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = randomCode();
            if (!accountRepository.existsByCode(code)) {
                return code;
            }
        }
        // 31^8 khả năng mà đụng 10 lần liên tiếp thì có gì đó sai, không im lặng
        // sinh tiếp vô hạn.
        throw new IllegalStateException("Không sinh được mã giới thiệu duy nhất");
    }

    private static String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    // ---------------------------------------------------------------
    // Áp mã lúc đặt đơn
    // ---------------------------------------------------------------

    /**
     * Kiểm mã và tính tiền giảm cho người mua.
     *
     * <p>Mã sai thì báo lỗi rõ thay vì lặng lẽ bỏ qua: người dùng gõ mã bạn bè
     * cho mà không được giảm sẽ nghĩ hệ thống lừa mình.
     *
     * @param subtotal giá gốc của đơn, trước mọi khoản giảm
     */
    @Transactional(readOnly = true)
    public AppliedReferral apply(String userId, String rawCode, long subtotal) {
        if (rawCode == null || rawCode.isBlank()) {
            return AppliedReferral.none();
        }

        AffiliateSettings config = settings();
        if (!config.isEnabled()) {
            throw new ApiException(ErrorCode.AFFILIATE_CODE_INVALID, "Chương trình giới thiệu đang tạm dừng");
        }

        String code = rawCode.trim().toUpperCase();
        AffiliateAccount account = accountRepository.findByCode(code)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.AFFILIATE_CODE_INVALID,
                        "Mã giới thiệu không tồn tại",
                        Map.of("code", code)));

        if (account.getStatus() != AffiliateAccount.AccountStatus.ACTIVE) {
            throw new ApiException(ErrorCode.AFFILIATE_CODE_INVALID, "Mã giới thiệu đã bị khóa");
        }

        if (account.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.AFFILIATE_CODE_INVALID, "Không dùng được mã của chính mình");
        }

        // Đã thuộc về người giới thiệu khác thì không cho đổi chủ: nếu không,
        // người mua có thể nhập mã người khác ở đơn gia hạn để "chuyển" hoa hồng.
        Optional<AffiliateReferral> bound = referralRepository.findByReferredUserId(userId);
        if (bound.isPresent() && !bound.get().getAffiliateUserId().equals(account.getUserId())) {
            throw new ApiException(
                    ErrorCode.AFFILIATE_CODE_INVALID,
                    "Tài khoản đã được giới thiệu bởi người khác");
        }

        // Không recurring: người đã mua rồi thì đơn sau không còn được giảm nữa.
        if (!config.isRecurring() && hasPaidOrder(userId)) {
            throw new ApiException(
                    ErrorCode.AFFILIATE_CODE_INVALID,
                    "Mã giới thiệu chỉ áp dụng cho đơn đầu tiên");
        }

        long discount = Math.min(subtotal, percentOf(subtotal, config.getDiscountPercent()));
        return new AppliedReferral(code, account.getUserId(), discount);
    }

    /**
     * Ghi nhận quan hệ giới thiệu ngay khi đơn được tạo.
     *
     * <p>Gắn ở bước tạo đơn chứ không chờ thanh toán: đơn có thể hết hạn rồi
     * mua lại, mà quan hệ giới thiệu thì vẫn nên giữ.
     */
    @Transactional
    public void recordReferral(String referredUserId, String affiliateUserId, String orderId) {
        if (referralRepository.findByReferredUserId(referredUserId).isPresent()) {
            return;
        }

        AffiliateReferral referral = new AffiliateReferral();
        referral.setId(UUID.randomUUID().toString());
        referral.setAffiliateUserId(affiliateUserId);
        referral.setReferredUserId(referredUserId);
        referral.setFirstOrderId(orderId);
        referralRepository.save(referral);
    }

    // ---------------------------------------------------------------
    // Ghi nhận hoa hồng khi đơn PAID
    // ---------------------------------------------------------------

    /**
     * Sinh hoa hồng cho một đơn vừa được xác nhận thanh toán.
     *
     * <p>Gọi từ luồng kích hoạt đơn. Ràng buộc UNIQUE trên {@code order_id} là
     * chốt chặn cuối: admin bấm xác nhận hai lần cũng chỉ ra một khoản.
     */
    @Transactional
    public void onOrderPaid(Order order) {
        if (order.getAffiliateUserId() == null) {
            return;
        }
        if (commissionRepository.findByOrderId(order.getId()).isPresent()) {
            return;
        }

        AffiliateSettings config = settings();
        if (!config.isEnabled()) {
            return;
        }

        // Người giới thiệu tự mua bằng mã của mình đã bị chặn lúc áp mã, nhưng
        // kiểm lại ở đây vì dữ liệu cũ có thể đã lọt.
        if (order.getAffiliateUserId().equals(order.getUserId())) {
            log.warn("Bỏ qua hoa hồng tự giới thiệu ở đơn {}", order.getOrderCode());
            return;
        }

        long base = config.isCommissionOnGross()
                ? order.getSubtotalAmount()
                : order.getTotalAmount();
        long amount = percentOf(base, config.getCommissionPercent());
        if (amount <= 0) {
            return;
        }

        boolean holds = config.getHoldDays() > 0;
        Instant availableAt = holds
                ? Instant.now().plus(config.getHoldDays(), ChronoUnit.DAYS)
                : null;

        AffiliateCommission commission = new AffiliateCommission();
        commission.setId(UUID.randomUUID().toString());
        commission.setAffiliateUserId(order.getAffiliateUserId());
        commission.setReferredUserId(order.getUserId());
        commission.setOrderId(order.getId());
        commission.setCommissionPercent(config.getCommissionPercent());
        commission.setBaseAmount(base);
        commission.setAmount(amount);
        commission.setStatus(holds ? CommissionStatus.PENDING : CommissionStatus.AVAILABLE);
        commission.setAvailableAt(availableAt);
        commissionRepository.save(commission);

        // Người giới thiệu có thể chưa có mã (được gắn từ đơn cũ rồi mã bị xóa)
        // — vẫn cộng tiền, nhưng tạo lại bản ghi để trang cá nhân hiển thị được.
        AffiliateAccount account = accountRepository
                .findByUserIdForUpdate(order.getAffiliateUserId())
                .orElseGet(() -> {
                    AffiliateAccount created = new AffiliateAccount();
                    created.setId(UUID.randomUUID().toString());
                    created.setUserId(order.getAffiliateUserId());
                    created.setCode(generateUniqueCode());
                    return accountRepository.save(created);
                });
        account.setTotalEarned(account.getTotalEarned() + amount);

        log.info("Ghi nhận hoa hồng {}đ cho user {} từ đơn {}",
                amount, order.getAffiliateUserId(), order.getOrderCode());
    }

    /**
     * Thu hồi hoa hồng khi đơn bị hoàn tiền.
     *
     * <p>Chỉ thu được khoản chưa chi trả. Khoản đã PAID thì giữ nguyên và ghi
     * log — đòi lại tiền đã chuyển là việc ngoài hệ thống.
     */
    @Transactional
    public void onOrderRefunded(String orderId) {
        commissionRepository.findByOrderId(orderId).ifPresent(commission -> {
            if (commission.getStatus() == CommissionStatus.PAID) {
                log.warn("Đơn {} hoàn tiền nhưng hoa hồng {} đã chi trả, cần xử lý thủ công",
                        orderId, commission.getId());
                return;
            }
            if (commission.getStatus() == CommissionStatus.CANCELLED) {
                return;
            }

            commission.setStatus(CommissionStatus.CANCELLED);
            accountRepository.findByUserIdForUpdate(commission.getAffiliateUserId())
                    .ifPresent(account -> account.setTotalEarned(
                            Math.max(0, account.getTotalEarned() - commission.getAmount())));
        });
    }

    /** Job: mở khóa các khoản đã hết thời gian giữ. */
    @Transactional
    public int releaseDueCommissions() {
        List<AffiliateCommission> due = commissionRepository.findDueForRelease();
        for (AffiliateCommission commission : due) {
            commission.setStatus(CommissionStatus.AVAILABLE);
        }
        return due.size();
    }

    // ---------------------------------------------------------------
    // Rút tiền
    // ---------------------------------------------------------------

    /** Số dư theo từng trạng thái, dùng cho thẻ số liệu. */
    public record Balance(long pending, long available, long locked, long paid) {
    }

    @Transactional(readOnly = true)
    public Balance balanceOf(String userId) {
        Map<CommissionStatus, Long> sums = new EnumMap<>(CommissionStatus.class);
        for (Object[] row : commissionRepository.sumByStatus(userId)) {
            sums.put((CommissionStatus) row[0], ((Number) row[1]).longValue());
        }
        return new Balance(
                sums.getOrDefault(CommissionStatus.PENDING, 0L),
                sums.getOrDefault(CommissionStatus.AVAILABLE, 0L),
                sums.getOrDefault(CommissionStatus.LOCKED, 0L),
                sums.getOrDefault(CommissionStatus.PAID, 0L));
    }

    /**
     * Gửi yêu cầu rút toàn bộ số dư đang rút được.
     *
     * <p>Rút hết chứ không cho chọn số tiền: đơn giản cho người dùng, và tránh
     * phải chia lẻ một khoản hoa hồng ra nhiều lần rút.
     */
    @Transactional
    public AffiliatePayout requestPayout(
            String userId, String bankName, String accountNumber, String accountName, String note) {

        boolean pendingExists = payoutRepository.existsByAffiliateUserIdAndStatusIn(
                userId, List.of(PayoutStatus.REQUESTED, PayoutStatus.APPROVED));
        if (pendingExists) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Bạn còn một yêu cầu rút chưa xử lý xong");
        }

        List<AffiliateCommission> available = commissionRepository.findAvailableForUpdate(userId);
        long total = available.stream().mapToLong(AffiliateCommission::getAmount).sum();

        AffiliateSettings config = settings();
        if (total < config.getMinPayoutAmount()) {
            throw new ApiException(
                    ErrorCode.AFFILIATE_NOT_ELIGIBLE,
                    "Số dư chưa đạt mức rút tối thiểu",
                    Map.of("balance", total, "minimum", config.getMinPayoutAmount()));
        }

        AffiliatePayout payout = new AffiliatePayout();
        payout.setId(UUID.randomUUID().toString());
        payout.setAffiliateUserId(userId);
        payout.setAmount(total);
        payout.setBankName(bankName);
        payout.setBankAccountNumber(accountNumber);
        payout.setBankAccountName(accountName);
        payout.setNote(note);
        payoutRepository.save(payout);

        // Khóa từng khoản vào yêu cầu này để không rút được hai lần.
        for (AffiliateCommission commission : available) {
            commission.setStatus(CommissionStatus.LOCKED);
            commission.setPayoutId(payout.getId());
        }

        log.info("User {} yêu cầu rút {}đ ({} khoản)", userId, total, available.size());
        return payout;
    }

    /** Admin duyệt — tiền vẫn chưa chuyển, chỉ xác nhận sẽ chi. */
    @Transactional
    public AffiliatePayout approvePayout(String actorId, String payoutId, String adminNote) {
        AffiliatePayout payout = requirePayout(payoutId);
        requireStatus(payout, PayoutStatus.REQUESTED);

        payout.setStatus(PayoutStatus.APPROVED);
        payout.setReviewedBy(actorId);
        payout.setReviewedAt(Instant.now());
        payout.setAdminNote(adminNote);
        return payout;
    }

    /** Admin từ chối — trả các khoản về trạng thái rút được. */
    @Transactional
    public AffiliatePayout rejectPayout(String actorId, String payoutId, String adminNote) {
        AffiliatePayout payout = requirePayout(payoutId);
        if (payout.getStatus() == PayoutStatus.PAID) {
            throw new ApiException(ErrorCode.CONFLICT, "Yêu cầu đã chi trả, không từ chối được");
        }

        payout.setStatus(PayoutStatus.REJECTED);
        payout.setReviewedBy(actorId);
        payout.setReviewedAt(Instant.now());
        payout.setAdminNote(adminNote);

        for (AffiliateCommission commission : commissionRepository.findByPayoutId(payoutId)) {
            commission.setStatus(CommissionStatus.AVAILABLE);
            commission.setPayoutId(null);
        }
        return payout;
    }

    /** Admin xác nhận đã chuyển khoản. */
    @Transactional
    public AffiliatePayout markPayoutPaid(String actorId, String payoutId, String adminNote) {
        AffiliatePayout payout = requirePayout(payoutId);
        requireStatus(payout, PayoutStatus.APPROVED);

        payout.setStatus(PayoutStatus.PAID);
        payout.setPaidAt(Instant.now());
        if (adminNote != null && !adminNote.isBlank()) {
            payout.setAdminNote(adminNote);
        }

        for (AffiliateCommission commission : commissionRepository.findByPayoutId(payoutId)) {
            commission.setStatus(CommissionStatus.PAID);
        }

        accountRepository.findByUserIdForUpdate(payout.getAffiliateUserId())
                .ifPresent(account -> account.setTotalPaid(
                        account.getTotalPaid() + payout.getAmount()));

        log.info("Đã chi trả {}đ cho user {}", payout.getAmount(), payout.getAffiliateUserId());
        return payout;
    }

    private AffiliatePayout requirePayout(String payoutId) {
        return payoutRepository.findById(payoutId)
                .orElseThrow(() -> ApiException.notFound("AffiliatePayout", payoutId));
    }

    private static void requireStatus(AffiliatePayout payout, PayoutStatus expected) {
        if (payout.getStatus() != expected) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Yêu cầu không ở trạng thái phù hợp",
                    Map.of("status", payout.getStatus().name(), "expected", expected.name()));
        }
    }

    /** Làm tròn xuống để tổng chi không bao giờ vượt số tính được. */
    private static long percentOf(long amount, int percent) {
        return amount * percent / 100;
    }
}
