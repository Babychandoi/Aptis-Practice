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
import vn.weconex.aptis.billing.domain.BankTransferRequest;

public interface BankTransferRequestRepository
        extends JpaRepository<BankTransferRequest, String> {

    Optional<BankTransferRequest> findByOrderId(String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM BankTransferRequest r WHERE r.orderId = :orderId")
    Optional<BankTransferRequest> findByOrderIdForUpdate(@Param("orderId") String orderId);

    boolean existsByTransferCode(String transferCode);

    /** Tra theo mã nội dung chuyển khoản — quản trị đối soát sao kê. */
    Optional<BankTransferRequest> findByTransferCode(String transferCode);

    Page<BankTransferRequest> findByStatusOrderByCreatedAtDesc(
            BankTransferRequest.TransferStatus status, Pageable pageable);

    Page<BankTransferRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Khóa trước khi xác nhận: hai quản trị bấm cùng lúc không được kích hoạt
     * subscription hai lần.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM BankTransferRequest r WHERE r.id = :id")
    Optional<BankTransferRequest> findByIdForUpdate(@Param("id") String id);

    /** Yêu cầu quá hạn mà chưa ai xử lý. */
    @Query("""
            SELECT r FROM BankTransferRequest r
            WHERE r.status IN :statuses
              AND r.expiresAt IS NOT NULL
              AND r.expiresAt < :now
            """)
    List<BankTransferRequest> findOverdue(
            @Param("statuses") List<BankTransferRequest.TransferStatus> statuses,
            @Param("now") Instant now);
}
