package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import vn.weconex.aptis.billing.domain.Refund;

public interface RefundRepository extends JpaRepository<Refund, String> {

    List<Refund> findByOrderId(String orderId);

    /**
     * Khớp webhook hoàn tiền với bản ghi đang chờ. Mã hoàn tiền do cổng cấp lúc
     * nhận yêu cầu, ta đã lưu lại nên webhook về là tra được.
     *
     * <p>Trả về danh sách chứ không phải một bản ghi: cổng lỗi (hoặc adapter
     * viết sai) có thể cấp trùng mã cho hai lần hoàn của cùng một đơn. Lấy đại
     * một bản ghi khi đó sẽ xác nhận nhầm lần hoàn khác — thà không xử lý còn
     * hơn thu hồi quyền sai.
     */
    List<Refund> findAllByProviderRefundId(String providerRefundId);

    /**
     * Khóa bản ghi trước khi áp dụng kết quả webhook: hai webhook trùng gửi
     * song song không được cùng thu hồi quyền hai lần.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM Refund r WHERE r.id = :id")
    Optional<Refund> findByIdForUpdate(
            @org.springframework.data.repository.query.Param("id") String id);

    Page<Refund> findByStatusOrderByRequestedAtDesc(Refund.RefundStatus status, Pageable pageable);

    Page<Refund> findAllByOrderByRequestedAtDesc(Pageable pageable);

    /** Tổng số tiền đã hoàn thành công của một đơn — để không hoàn quá. */
    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(r.amount), 0) FROM Refund r
            WHERE r.orderId = :orderId AND r.status = :status
            """)
    long sumRefundedAmount(
            @org.springframework.data.repository.query.Param("orderId") String orderId,
            @org.springframework.data.repository.query.Param("status") Refund.RefundStatus status);
}
