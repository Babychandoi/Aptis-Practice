package vn.weconex.aptis.catalog.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.PartScoringRule;
import vn.weconex.aptis.catalog.repository.PartScoringRuleRepository;
import vn.weconex.aptis.catalog.web.AdminScoringDtos;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

@Service
@RequiredArgsConstructor
public class PartScoringService {
    private static final BigDecimal COMPONENT_TOTAL = new BigDecimal("50.00");
    private static final BigDecimal OVERALL_TOTAL = new BigDecimal("200.00");
    private final PartScoringRuleRepository repository;

    @Transactional(readOnly = true)
    public List<AdminScoringDtos.RuleResponse> list() {
        return repository.findAllByOrderByPartComponentDisplayOrderAscPartDisplayOrderAsc()
                .stream().map(PartScoringService::toResponse).toList();
    }

    @Transactional
    public List<AdminScoringDtos.RuleResponse> update(AdminScoringDtos.UpdateRequest request) {
        Map<String, AdminScoringDtos.UpdateRule> changes = new LinkedHashMap<>();
        request.rules().forEach(rule -> changes.put(rule.id(), rule));
        List<PartScoringRule> all = repository.findAllByOrderByPartComponentDisplayOrderAscPartDisplayOrderAsc();
        if (changes.size() != all.size() || all.stream().anyMatch(rule -> !changes.containsKey(rule.getId()))) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Phải gửi đầy đủ cấu hình của tất cả các Part.", Map.of());
        }
        all.forEach(rule -> {
            var change = changes.get(rule.getId());
            rule.setMaxScore(BigDecimal.valueOf(change.maxScore()));
            rule.setPointsPerCorrect(change.pointsPerCorrect() == null ? null : BigDecimal.valueOf(change.pointsPerCorrect()));
            rule.setPerfectBonus(BigDecimal.valueOf(change.perfectBonus()));
        });
        validateTotals(all);
        repository.saveAll(all);
        return all.stream().map(PartScoringService::toResponse).toList();
    }

    private static void validateTotals(List<PartScoringRule> rules) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        rules.forEach(rule -> totals.merge(rule.getPart().getComponent().getCode(), rule.getMaxScore(), BigDecimal::add));
        totals.forEach((component, total) -> {
            if (total.compareTo(COMPONENT_TOTAL) != 0) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED,
                        component + " phải có tổng điểm bằng 50 (hiện tại " + total.stripTrailingZeros().toPlainString() + ").", Map.of());
            }
        });
        BigDecimal overall = rules.stream().filter(PartScoringRule::isIncludedInOverall)
                .map(PartScoringRule::getMaxScore).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (overall.compareTo(OVERALL_TOTAL) != 0) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Tổng Overall của Listening, Speaking, Reading và Writing phải bằng 200.", Map.of());
        }
    }

    private static AdminScoringDtos.RuleResponse toResponse(PartScoringRule rule) {
        var part = rule.getPart();
        var component = part.getComponent();
        return new AdminScoringDtos.RuleResponse(rule.getId(), component.getCode(), component.getName(),
                part.getId(), part.getCode(), part.getName(), rule.getMaxScore().doubleValue(),
                rule.getPointsPerCorrect() == null ? null : rule.getPointsPerCorrect().doubleValue(),
                rule.getPerfectBonus().doubleValue(), rule.isIncludedInOverall(),
                component.getDisplayOrder(), part.getDisplayOrder());
    }
}
