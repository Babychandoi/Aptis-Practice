package vn.weconex.aptis.platform.importexport;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExportJobRepository extends JpaRepository<ExportJob, String> {

    List<ExportJob> findByStatusOrderByQueuedAt(ExportJob.ExportStatus status);

    Page<ExportJob> findByRequestedByOrderByQueuedAtDesc(String requestedBy, Pageable pageable);

    /**
     * Job đã quá hạn nhưng file vẫn còn trên MinIO — cần dọn.
     *
     * <p>Lọc {@code resultAssetId IS NOT NULL} để không quét lại job đã dọn:
     * job dọn xong sẽ xóa tham chiếu asset.
     */
    @Query("""
            SELECT j FROM ExportJob j
            WHERE j.status = :status
              AND j.expiresAt IS NOT NULL
              AND j.expiresAt < :now
              AND j.resultAssetId IS NOT NULL
            ORDER BY j.expiresAt ASC
            """)
    List<ExportJob> findExpiredWithFile(
            @Param("status") ExportJob.ExportStatus status,
            @Param("now") Instant now,
            Pageable pageable);
}
