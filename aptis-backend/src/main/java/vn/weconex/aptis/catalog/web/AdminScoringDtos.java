package vn.weconex.aptis.catalog.web;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public final class AdminScoringDtos {
    private AdminScoringDtos() {}

    public record RuleResponse(
            String id, String componentCode, String componentName,
            String partId, String partCode, String partName,
            double maxScore, Double pointsPerCorrect, double perfectBonus,
            boolean includedInOverall, int componentOrder, int partOrder) {}

    public record UpdateRule(
            @NotNull String id,
            @NotNull @Positive Double maxScore,
            @Positive Double pointsPerCorrect,
            @NotNull @PositiveOrZero Double perfectBonus) {}

    public record UpdateRequest(@NotEmpty @Valid List<UpdateRule> rules) {}
}
