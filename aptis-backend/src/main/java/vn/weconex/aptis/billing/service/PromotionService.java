package vn.weconex.aptis.billing.service;

import java.time.Instant;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.PromotionCode;
import vn.weconex.aptis.billing.domain.PromotionRedemption;
import vn.weconex.aptis.billing.repository.PromotionCodeRepository;
import vn.weconex.aptis.billing.repository.PromotionRedemptionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Áp dụng mã giảm giá (PHẦN I §13).
 *
 * <p>Mã được khóa (SELECT FOR UPDATE) khi áp dụng để hai đơn đồng thời không
 * cùng dùng lần cuối của một mã có giới hạn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionCodeRepository promotionCodeRepository;
    private final PromotionRedemptionRepository redemptionRepository;

    /**
     * Kết quả áp mã. {@code code} = null nghĩa là không dùng mã nào.
     */
    public record AppliedDiscount(PromotionCode code, long discountAmount) {

        public static AppliedDiscount none() {
            return new AppliedDiscount(null, 0);
        }

        public boolean isApplied() {
            return code != null && discountAmount > 0;
        }
    }

    /**
     * Kiểm tra và tính tiền giảm khi tạo đơn.
     *
     * <p>Khóa bản ghi mã (SELECT FOR UPDATE) để hai đơn đồng thời không cùng
     * dùng lần cuối của một mã có giới hạn.
     *
     * <p>Việc tăng số lần dùng để dành cho {@link #recordRedemption} — chỉ gọi
     * khi đơn đã thanh toán thành công, tránh mã bị "đốt" bởi đơn hủy.
     */
    @Transactional
    public AppliedDiscount apply(String userId, String rawCode, long subtotal) {
        return evaluate(userId, rawCode, subtotal, true);
    }

    /**
     * Xem trước tiền giảm mà không khóa bản ghi — dùng cho endpoint check.
     *
     * <p>Không khóa nên kết quả chỉ mang tính tham khảo: mã có thể hết lượt giữa
     * lúc xem và lúc tạo đơn. Đơn thật vẫn kiểm tra lại qua {@link #apply}.
     *
     * <p>Cố tình KHÔNG có {@code @Transactional}: caller bắt {@link ApiException}
     * để trả 200 kèm lý do, nhưng nếu method này mở transaction riêng thì
     * exception sẽ đánh dấu nó rollback-only và Spring ném
     * UnexpectedRollbackException khi commit transaction ngoài.
     */
    public AppliedDiscount preview(String userId, String rawCode, long subtotal) {
        return evaluate(userId, rawCode, subtotal, false);
    }

    private AppliedDiscount evaluate(
            String userId, String rawCode, long subtotal, boolean lockForUpdate) {

        if (rawCode == null || rawCode.isBlank()) {
            return AppliedDiscount.none();
        }

        String normalized = rawCode.strip().toUpperCase();
        PromotionCode promotion = (lockForUpdate
                ? promotionCodeRepository.findByCodeForUpdate(normalized)
                : promotionCodeRepository.findByCode(normalized))
                .orElseThrow(() -> new ApiException(
                        ErrorCode.PROMOTION_CODE_INVALID,
                        "Mã giảm giá không tồn tại",
                        Map.of("code", normalized)));

        if (!promotion.isRedeemableAt(Instant.now())) {
            throw new ApiException(
                    ErrorCode.PROMOTION_CODE_INVALID,
                    "Mã giảm giá không còn hiệu lực",
                    Map.of("code", normalized, "status", promotion.getStatus()));
        }
        if (promotion.isExhausted()) {
            throw new ApiException(
                    ErrorCode.PROMOTION_CODE_EXHAUSTED,
                    "Mã giảm giá đã hết lượt sử dụng",
                    Map.of("code", normalized));
        }
        if (promotion.getMinOrderAmount() != null && subtotal < promotion.getMinOrderAmount()) {
            throw new ApiException(
                    ErrorCode.PROMOTION_CODE_INVALID,
                    "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã",
                    Map.of("code", normalized, "minOrderAmount", promotion.getMinOrderAmount()));
        }
        if (promotion.getMaxUsesPerUser() != null) {
            long used = redemptionRepository.countByPromotionCodeIdAndUserId(
                    promotion.getId(), userId);
            if (used >= promotion.getMaxUsesPerUser()) {
                throw new ApiException(
                        ErrorCode.PROMOTION_CODE_EXHAUSTED,
                        "Bạn đã dùng hết số lần cho phép của mã này",
                        Map.of("code", normalized, "maxUsesPerUser", promotion.getMaxUsesPerUser()));
            }
        }

        long discount = promotion.computeDiscount(subtotal);
        if (discount <= 0) {
            throw new ApiException(
                    ErrorCode.PROMOTION_CODE_INVALID,
                    "Mã giảm giá không áp dụng được cho đơn này",
                    Map.of("code", normalized));
        }

        return new AppliedDiscount(promotion, discount);
    }

    /**
     * Ghi nhận đã dùng mã sau khi đơn thanh toán thành công. Idempotent theo
     * (order, code) để webhook gửi lặp không đếm hai lần.
     */
    @Transactional
    public void recordRedemption(String promotionCodeId, String userId, String orderId, long amount) {
        if (redemptionRepository.findByOrderIdAndPromotionCodeId(orderId, promotionCodeId)
                .isPresent()) {
            return;
        }

        PromotionCode promotion = promotionCodeRepository.findById(promotionCodeId)
                .orElseThrow(() -> ApiException.notFound("PromotionCode", promotionCodeId));

        promotion.recordRedemption();
        redemptionRepository.save(
                PromotionRedemption.of(promotionCodeId, userId, orderId, amount));

        log.info("Đã ghi nhận dùng mã {} cho đơn {} (giảm {})",
                promotion.getCode(), orderId, amount);
    }
}
