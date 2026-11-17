package vn.weconex.aptis.platform.syncjob;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Tình trạng các job cập nhật đề, cho màn quản trị. */
@RestController
@RequestMapping("/api/v1/admin/sync-health")
@RequiredArgsConstructor
public class AdminSyncHealthController {

    private final SyncHealthService service;

    @GetMapping
    @PreAuthorize("hasAuthority('analytics:read')")
    public SyncHealthService.Health health() {
        return service.check();
    }
}
