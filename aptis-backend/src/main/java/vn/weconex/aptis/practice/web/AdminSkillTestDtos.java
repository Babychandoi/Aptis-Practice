package vn.weconex.aptis.practice.web;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.common.util.Enums.AccessLevel;

public final class AdminSkillTestDtos {
    private AdminSkillTestDtos() {}

    public record CreateRequest(
            @NotBlank String componentId,
            @NotBlank @Size(max = 100) String code,
            @NotBlank @Size(max = 255) String name,
            String description,
            @NotNull AccessLevel accessLevel,
            @Positive Integer durationSeconds,
            @NotBlank String assemblyMode,
            @NotEmpty @Valid List<PartSelection> parts) {}

    public record PartSelection(@NotBlank String partId, String questionSetId) {}

    public record BatchCreateRequest(
            @NotBlank String componentId,
            @NotNull AccessLevel accessLevel,
            @Positive Integer durationSeconds,
            @Positive Integer quantity) {}

    public record Response(
            String id, String componentId, String componentCode, String componentName,
            String code, String name, String description, String accessLevel,
            Integer durationSeconds, String status, String assemblyMode,
            List<RuleResponse> parts) {}

    public record RuleResponse(
            String partId, String partName, int displayOrder,
            String selectionStrategy, String questionSetId, String questionSetTitle) {}
}
