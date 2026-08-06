package vn.weconex.aptis.practice.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.practice.service.AdminSkillTestService;

@RestController
@RequestMapping("/api/v1/admin/skill-tests")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('blueprint:write')")
public class AdminSkillTestController {
    private final AdminSkillTestService service;

    @GetMapping
    public List<AdminSkillTestDtos.Response> list(@RequestParam(required = false) String componentId) {
        return service.list(componentId);
    }

    @PostMapping
    public AdminSkillTestDtos.Response create(@Valid @RequestBody AdminSkillTestDtos.CreateRequest request) {
        return service.create(request);
    }

    @PostMapping("/batch")
    public List<AdminSkillTestDtos.Response> createBatch(
            @Valid @RequestBody AdminSkillTestDtos.BatchCreateRequest request) {
        return service.createBatch(request);
    }

    @PostMapping("/{id}/archive")
    public AdminSkillTestDtos.Response archive(@PathVariable String id) {
        return service.archive(id);
    }
}
