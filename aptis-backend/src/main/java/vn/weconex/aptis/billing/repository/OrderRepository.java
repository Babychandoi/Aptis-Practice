package vn.weconex.aptis.billing.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.BillingEntities.Order;
import vn.weconex.aptis.common.util.Enums.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, String> {

    /** Dùng cho affiliate: chỉ người đã mua thành công mới được cấp mã. */
    boolean existsByUserIdAndStatus(String userId, OrderStatus status);

    /** Mọi người từng mua thành công — dùng để cấp mã hàng loạt. */
    @Query("SELECT DISTINCT o.userId FROM PurchaseOrder o WHERE o.status = :status")
    List<String> findUserIdsWithStatus(@Param("status") OrderStatus status);

    /** Số đơn được tạo từ mốc thời gian — dùng cho phễu chuyển đổi. */
    @Query("SELECT COUNT(o) FROM PurchaseOrder o WHERE o.createdAt >= :from")
    long countCreatedSince(@Param("from") Instant from);

    /** Số đơn thanh toán thành công từ mốc thời gian. */
    @Query("""
            SELECT COUNT(o) FROM PurchaseOrder o
            WHERE o.paidAt >= :from AND o.status = vn.weconex.aptis.common.util.Enums.OrderStatus.PAID
            """)
    long countPaidSince(@Param("from") Instant from);

    Optional<Order> findByOrderCode(String orderCode);

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    Page<Order> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    /** Đếm đơn theo trạng thái cho các ô đếm ở trang Đơn hàng. */
    @Query("SELECT o.status, COUNT(o) FROM PurchaseOrder o GROUP BY o.status")
    List<Object[]> countGroupByStatus();

    /**
     * Khóa order trước khi kích hoạt Premium (§34 bước 1) để webhook gửi lại
     * nhiều lần không tạo nhiều subscription.
     *
     * <p>Tên entity là PurchaseOrder vì "Order" là từ khóa JPQL.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM PurchaseOrder o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") String id);

    @Query("""
            SELECT o FROM PurchaseOrder o
            WHERE o.status IN :openStatuses
              AND o.expiresAt IS NOT NULL
              AND o.expiresAt < :now
            """)
    List<Order> findExpiredOrders(
            @Param("openStatuses") List<OrderStatus> openStatuses, @Param("now") Instant now);
}
