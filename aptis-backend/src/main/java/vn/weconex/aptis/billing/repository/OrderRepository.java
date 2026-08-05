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

    Optional<Order> findByOrderCode(String orderCode);

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    Page<Order> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

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
