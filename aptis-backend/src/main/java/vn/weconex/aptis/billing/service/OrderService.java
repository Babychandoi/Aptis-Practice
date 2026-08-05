package vn.weconex.aptis.billing.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.billing.domain.BillingEntities.OrderItem;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;
import vn.weconex.aptis.billing.repository.OrderItemRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.billing.web.BillingDtos;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.OrderStatus;

/**
 * Tạo đơn hàng. Giá LUÔN lấy từ bảng subscription_plans, không nhận từ client
 * (PHẦN VII §51).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final int ORDER_EXPIRY_MINUTES = 30;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final SubscriptionPlanRepository planRepository;
    private final PromotionService promotionService;

    /**
     * Idempotent theo {@code Idempotency-Key}: gọi lại cùng key trả về đơn cũ
     * thay vì tạo đơn trùng.
     */
    @Transactional
    public Order createOrder(String userId, String idempotencyKey, BillingDtos.CreateOrderRequest request) {
        var existing = orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            Order order = existing.get();
            if (!order.getUserId().equals(userId)) {
                // Key trùng của user khác: không tiết lộ đơn người khác
                throw new ApiException(ErrorCode.CONFLICT, "Idempotency key đã được dùng");
            }
            return order;
        }

        SubscriptionPlan plan = planRepository.findById(request.planId())
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", request.planId()));

        if (!plan.isPurchasable()) {
            throw new ApiException(
                    ErrorCode.PLAN_NOT_AVAILABLE,
                    "Gói dịch vụ không còn được bán",
                    Map.of("planCode", plan.getCode()));
        }

        long subtotal = plan.getPriceAmount();

        // Số tiền giảm tính ở backend từ bảng promotion_codes; client chỉ gửi mã.
        // Chưa ghi nhận sử dụng ở đây — chờ đơn thanh toán xong (§13).
        PromotionService.AppliedDiscount applied =
                promotionService.apply(userId, request.promotionCode(), subtotal);

        long discount = applied.discountAmount();
        long total = subtotal - discount;

        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setOrderCode(generateOrderCode());
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotalAmount(subtotal);
        order.setDiscountAmount(discount);
        order.setTotalAmount(total);
        order.setCurrency(plan.getCurrency());
        if (applied.isApplied()) {
            order.setPromotionCodeId(applied.code().getId());
        }
        order.setIdempotencyKey(idempotencyKey);
        order.setExpiresAt(Instant.now().plus(ORDER_EXPIRY_MINUTES, ChronoUnit.MINUTES));
        orderRepository.save(order);

        OrderItem item = new OrderItem();
        item.setOrderId(order.getId());
        item.setItemType(OrderItem.ItemType.SUBSCRIPTION_PLAN);
        item.setItemId(plan.getId());
        item.setItemName(plan.getName());
        item.setQuantity(1);
        item.setUnitPrice(subtotal);
        item.setDiscountAmount(discount);
        item.setTotalAmount(total);
        orderItemRepository.save(item);

        log.info("Đã tạo order {} cho user {} gói {}", order.getOrderCode(), userId, plan.getCode());
        return order;
    }

    @Transactional(readOnly = true)
    public Order requireOwnedOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order", orderId));

        if (!order.getUserId().equals(userId)) {
            throw ApiException.forbidden("Đơn hàng không thuộc người dùng");
        }
        return order;
    }

    @Transactional(readOnly = true)
    public List<OrderItem> itemsOf(String orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    /**
     * Job dọn đơn quá hạn chưa thanh toán.
     */
    @Transactional
    public int expireOverdueOrders() {
        List<Order> overdue = orderRepository.findExpiredOrders(
                List.of(OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT), Instant.now());

        for (Order order : overdue) {
            order.setStatus(OrderStatus.EXPIRED);
        }
        return overdue.size();
    }

    /**
     * Mã đơn dễ đọc cho hỗ trợ khách hàng, vẫn đủ ngẫu nhiên để không đoán được.
     */
    private static String generateOrderCode() {
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "AP" + Instant.now().toEpochMilli() % 100000000L + random;
    }
}
