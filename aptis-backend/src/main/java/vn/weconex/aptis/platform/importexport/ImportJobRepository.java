package vn.weconex.aptis.platform.importexport;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportJobRepository extends JpaRepository<ImportJob, String> {

    List<ImportJob> findByStatusOrderByQueuedAt(ImportJob.ImportStatus status);

    Page<ImportJob> findAllByOrderByQueuedAtDesc(Pageable pageable);
}
