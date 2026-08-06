package vn.weconex.aptis.catalog.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.catalog.service.PartScoringService;

@RestController
@RequestMapping("/api/v1/admin/scoring-rules")
@RequiredArgsConstructor
public class AdminScoringController {
    private final PartScoringService service;

    @GetMapping
    @PreAuthorize("hasAuthority('question_set:read')")
    public List<AdminScoringDtos.RuleResponse> list() {
        return service.list();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('question_set:write')")
    public List<AdminScoringDtos.RuleResponse> update(
            @Valid @RequestBody AdminScoringDtos.UpdateRequest request) {
        return service.update(request);
    }
}
