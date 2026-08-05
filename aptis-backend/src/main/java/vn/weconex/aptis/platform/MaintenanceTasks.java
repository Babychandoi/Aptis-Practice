package vn.weconex.aptis.platform;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.repository.RefreshTokenRepository;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.platform.importexport.ExportJob;
import vn.weconex.aptis.platform.importexport.ExportJobRepository;
import vn.weconex.aptis.platform.importexport.ExportPurger;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;

/**
 * Việc dọn dẹp cần transaction, tách khỏi {@link ScheduledJobs}.
 *
 * <p>Bean riêng là bắt buộc: gọi method {@code @Transactional} từ lambda trong
 * cùng class sẽ bỏ qua proxy Spring và chạy ngoài transaction, nên thay đổi
 * không được commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceTasks {

    private static final Duration TOKEN_RETENTION = Duration.ofDays(30);

    private final TestAttemptRepository attemptRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ExportJobRepository exportJobRepository;
    private final ExportPurger exportPurger;

    @Transactional
    public int expireOverdueAttempts() {
        List<TestAttempt> expired = attemptRepository.findExpired(
                List.of(AttemptStatus.CREATED, AttemptStatus.IN_PROGRESS), Instant.now());

        for (TestAttempt attempt : expired) {
            attempt.setStatus(AttemptStatus.EXPIRED);
        }
        return expired.size();
    }

    /**
     * Giữ token hết hạn thêm 30 ngày để còn điều tra được nếu có sự cố bảo mật.
     */
    @Transactional
    public int deleteStaleRefreshTokens() {
        return refreshTokenRepository.deleteExpiredBefore(Instant.now().minus(TOKEN_RETENTION));
    }

    /**
     * Xóa file báo cáo đã quá hạn khỏi MinIO. Báo cáo chứa dữ liệu học viên nên
     * không giữ quá {@code expires_at}.
     *
     * <p>Bản ghi job vẫn giữ lại (để còn biết ai đã xuất gì), chỉ xóa file và bỏ
     * tham chiếu asset.
     */
    public int purgeExpiredExports(int batchSize) {
        List<ExportJob> expired = exportJobRepository.findExpiredWithFile(
                ExportJob.ExportStatus.COMPLETED, Instant.now(), PageRequest.of(0, batchSize));

        int purged = 0;
        for (ExportJob job : expired) {
            // Mỗi job một transaction riêng (bean khác nên đi qua proxy): xóa
            // trên MinIO không rollback được, một job hỏng không được kéo theo
            // các job đã dọn xong.
            if (exportPurger.purgeOne(job.getId())) {
                purged++;
            }
        }
        return purged;
    }
}
