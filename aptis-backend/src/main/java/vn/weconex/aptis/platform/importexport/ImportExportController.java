package vn.weconex.aptis.platform.importexport;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;

/**
 * Import câu hỏi và export báo cáo (API §50).
 *
 * <p>Cả hai đều bất đồng bộ: API trả job id, client poll trạng thái. File kết
 * quả tải qua Asset API để dùng chung cơ chế signed URL.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class ImportExportController {

    private final ImportJobRepository importJobRepository;
    private final ExportJobRepository exportJobRepository;
    private final ObjectMapper objectMapper;
    private final CurrentUser currentUser;

    // ---------- Import ----------

    @PostMapping("/import-jobs")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public ImportExportDtos.ImportJobResponse createImportJob(
            @Valid @RequestBody ImportExportDtos.CreateImportJobRequest request) {

        ImportJob job = importJobRepository.save(ImportJob.queue(
                currentUser.requireUserId(),
                request.sourceAssetId(),
                request.importType() == null
                        ? ImportJob.ImportType.QUESTION_SET_EXCEL
                        : request.importType()));

        return ImportExportDtos.ImportJobResponse.from(job);
    }

    @GetMapping("/import-jobs/{id}")
    @PreAuthorize("hasAuthority('question_set:write')")
    public ImportExportDtos.ImportJobResponse importJob(@PathVariable String id) {
        return ImportExportDtos.ImportJobResponse.from(
                importJobRepository.findById(id)
                        .orElseThrow(() -> ApiException.notFound("ImportJob", id)));
    }

    @GetMapping("/import-jobs")
    @PreAuthorize("hasAuthority('question_set:write')")
    public PageResponse<ImportExportDtos.ImportJobResponse> importJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(
                importJobRepository.findAllByOrderByQueuedAtDesc(
                        PageRequest.of(page, Math.min(size, 100))),
                ImportExportDtos.ImportJobResponse::from);
    }

    // ---------- Export ----------

    @PostMapping("/export-jobs")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAuthority('report:read')")
    @Transactional
    public ImportExportDtos.ExportJobResponse createExportJob(
            @Valid @RequestBody ImportExportDtos.CreateExportJobRequest request) {

        String paramsJson = null;
        if (request.params() != null && !request.params().isEmpty()) {
            try {
                paramsJson = objectMapper.writeValueAsString(request.params());
            } catch (Exception ex) {
                throw new ApiException(
                        vn.weconex.aptis.common.exception.ErrorCode.VALIDATION_FAILED,
                        "Tham số báo cáo không hợp lệ");
            }
        }

        ExportJob job = exportJobRepository.save(ExportJob.queue(
                currentUser.requireUserId(), request.exportType(), paramsJson));

        return ImportExportDtos.ExportJobResponse.from(job);
    }

    @GetMapping("/export-jobs/{id}")
    @PreAuthorize("hasAuthority('report:read')")
    public ImportExportDtos.ExportJobResponse exportJob(@PathVariable String id) {
        return ImportExportDtos.ExportJobResponse.from(
                exportJobRepository.findById(id)
                        .orElseThrow(() -> ApiException.notFound("ExportJob", id)));
    }

    @GetMapping("/export-jobs")
    @PreAuthorize("hasAuthority('report:read')")
    public PageResponse<ImportExportDtos.ExportJobResponse> exportJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return PageResponse.of(
                exportJobRepository.findByRequestedByOrderByQueuedAtDesc(
                        currentUser.requireUserId(), PageRequest.of(page, Math.min(size, 100))),
                ImportExportDtos.ExportJobResponse::from);
    }
}
