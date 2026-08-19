package vn.weconex.aptis.practice.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.PartScoringRule;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.PartScoringRuleRepository;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.AttemptComponentScore;
import vn.weconex.aptis.practice.domain.AttemptPartScore;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.repository.AttemptComponentScoreRepository;
import vn.weconex.aptis.practice.repository.AttemptPartScoreRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;

/**
 * Tổng hợp điểm theo Part và học phần sau khi nộp bài (PHẦN IV §38.10).
 *
 * <p>Chỉ cần cho thi thử — luyện theo Part chỉ có một Part nên bảng tổng hợp
 * không thêm thông tin gì. Vẫn tính cho mọi mode để báo cáo nhất quán.
 */
@Component
@RequiredArgsConstructor
public class AttemptScoreAggregator {

    private final QuestionSetRepository questionSetRepository;
    private final PartRepository partRepository;
    private final AttemptPartScoreRepository partScoreRepository;
    private final AttemptComponentScoreRepository componentScoreRepository;
    private final PartScoringRuleRepository scoringRuleRepository;
    private final TestAttemptRepository attemptRepository;

    /**
     * Xóa điểm cũ rồi ghi lại — chấm lại một attempt (sau khi AI chấm xong) phải
     * ra kết quả đúng chứ không cộng dồn.
     */
    @Transactional
    public void aggregate(String attemptId, AttemptDocument document) {
        // flush() bắt buộc: Hibernate sắp INSERT trước DELETE trong cùng
        // transaction, nên không flush thì bản ghi mới đụng
        // uk_attempt_part_score với bản cũ chưa bị xóa.
        partScoreRepository.deleteAll(partScoreRepository.findByAttemptId(attemptId));
        componentScoreRepository.deleteAll(componentScoreRepository.findByAttemptId(attemptId));
        partScoreRepository.flush();
        componentScoreRepository.flush();

        List<String> questionSetIds = document.getQuestionSets().stream()
                .map(AttemptDocument.QuestionSetEntry::getQuestionSetId)
                .toList();
        if (questionSetIds.isEmpty()) {
            return;
        }

        // questionSetId -> partId, và partId -> componentId
        Map<String, String> partOf = new HashMap<>();
        for (QuestionSet questionSet : questionSetRepository.findAllById(questionSetIds)) {
            partOf.put(questionSet.getId(), questionSet.getPart().getId());
        }

        Map<String, String> componentOf = new HashMap<>();
        for (Part part : partRepository.findAllById(partOf.values().stream().distinct().toList())) {
            componentOf.put(part.getId(), part.getComponent().getId());
        }

        Map<String, AttemptPartScore> partScores = new LinkedHashMap<>();

        for (AttemptDocument.QuestionSetEntry entry : document.getQuestionSets()) {
            String partId = partOf.get(entry.getQuestionSetId());
            if (partId == null) {
                continue;
            }

            AttemptDocument.Score score = entry.getScore();
            BigDecimal raw = score == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(score.getRawScore());
            BigDecimal max = score == null
                    ? maxScoreOf(entry)
                    : BigDecimal.valueOf(score.getMaxScore());

            int correct = 0;
            int incorrect = 0;
            if (score != null) {
                for (AttemptDocument.ItemScore itemScore : score.getItemScores()) {
                    if (itemScore.isCorrect()) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                }
            }

            partScores
                    .computeIfAbsent(partId, id -> AttemptPartScore.of(attemptId, id))
                    .add(raw, max, correct, incorrect);

        }

        TestAttempt attempt = attemptRepository.findById(attemptId).orElse(null);
        boolean officialComposition = attempt != null
                && attempt.getMode() == vn.weconex.aptis.common.util.Enums.PracticeMode.MOCK_TEST;

        Map<String, EffectiveScoringRule> rules = resolveRules(
                document, new ArrayList<>(partScores.keySet()));

        if (officialComposition) {
            partScores.forEach((partId, score) -> {
                EffectiveScoringRule rule = rules.get(partId);
                if (rule != null) {
                    BigDecimal[] normalized = normalize(
                            score.getRawScore(), score.getMaxScore(), rule);
                    score.replaceScore(normalized[0], normalized[1]);
                }
            });
        }

        Map<String, AttemptComponentScore> componentScores = new LinkedHashMap<>();
        partScores.forEach((partId, score) -> {
            String componentId = componentOf.get(partId);
            if (componentId != null) {
                componentScores
                        .computeIfAbsent(componentId, id -> AttemptComponentScore.of(attemptId, id))
                        .add(score.getRawScore(), score.getMaxScore());
            }
        });

        // CEFR theo học phần: ước lượng từ phần trăm điểm
        componentScores.values().forEach(score ->
                score.setCefrLevel(estimateCefr(score.getPercentageScore())));

        partScoreRepository.saveAll(new ArrayList<>(partScores.values()));
        componentScoreRepository.saveAll(new ArrayList<>(componentScores.values()));

        if (officialComposition && attempt != null) {
            boolean multiSkill = attempt.getComponentId() == null;
            BigDecimal totalRaw = BigDecimal.ZERO;
            BigDecimal totalMax = BigDecimal.ZERO;
            for (Map.Entry<String, AttemptPartScore> entry : partScores.entrySet()) {
                EffectiveScoringRule rule = rules.get(entry.getKey());
                if (!multiSkill || rule == null || rule.includedInOverall()) {
                    totalRaw = totalRaw.add(entry.getValue().getRawScore());
                    totalMax = totalMax.add(entry.getValue().getMaxScore());
                }
            }
            attempt.updateScore(totalRaw, totalMax);
            attempt.setCefrLevel(estimateCefr(attempt.getPercentageScore()));
            attemptRepository.save(attempt);
        }
    }

    /** Scale raw item points onto the persisted Aptis part scale. */
    static BigDecimal[] normalize(
            BigDecimal raw, BigDecimal sourceMax, PartScoringRule rule) {
        return normalize(raw, sourceMax, new EffectiveScoringRule(
                rule.getMaxScore(), rule.getPerfectBonus(), rule.isIncludedInOverall()));
    }

    private static BigDecimal[] normalize(
            BigDecimal raw, BigDecimal sourceMax, EffectiveScoringRule rule) {
        BigDecimal targetMax = rule.maxScore();
        if (sourceMax == null || sourceMax.signum() <= 0) {
            return new BigDecimal[] {BigDecimal.ZERO, targetMax};
        }

        // Một số dạng bài (đặc biệt Reading Part 3) đã chấm điểm từng ý
        // trực tiếp trên thang điểm của Part: 2 điểm/match và cộng 2 điểm
        // thưởng khi đúng đủ 7 ý, tức rawScore/maxScore đã là 14/16 hoặc
        // 16/16. Không được scale lần nữa trong trường hợp này, nếu không
        // 2 điểm sẽ bị biến thành 1.75 do công thức 14/16 * 2.
        if (sourceMax.compareTo(targetMax) == 0) {
            return new BigDecimal[] {
                    raw.max(BigDecimal.ZERO).min(targetMax),
                    targetMax
            };
        }

        BigDecimal bonus = rule.perfectBonus() == null
                ? BigDecimal.ZERO : rule.perfectBonus();
        BigDecimal baseMax = targetMax.subtract(bonus).max(BigDecimal.ZERO);
        BigDecimal earned = raw.max(BigDecimal.ZERO)
                .min(sourceMax)
                .multiply(baseMax)
                .divide(sourceMax, 2, java.math.RoundingMode.HALF_UP);
        if (raw.compareTo(sourceMax) >= 0) {
            earned = earned.add(bonus);
        }
        return new BigDecimal[] {earned.min(targetMax), targetMax};
    }

    /**
     * Ưu tiên rule đã đóng băng trong Mongo. Chỉ attempt cũ chưa có snapshot mới đọc
     * cấu hình hiện tại trong MySQL để giữ tương thích dữ liệu.
     */
    private Map<String, EffectiveScoringRule> resolveRules(
            AttemptDocument document, List<String> partIds) {
        Map<String, EffectiveScoringRule> result = new HashMap<>();
        AttemptDocument.ConfigSnapshot config = document.getConfigSnapshot();
        if (config != null && config.getPartScoringRules() != null) {
            config.getPartScoringRules().forEach((partId, snapshot) -> {
                BigDecimal maxScore = decimal(snapshot.getMaxScore());
                if (maxScore != null) {
                    result.put(partId, new EffectiveScoringRule(
                            maxScore,
                            decimal(snapshot.getPerfectBonus()),
                            snapshot.isIncludedInOverall()));
                }
            });
        }

        boolean legacyAttempt = config == null || config.getScoringRuleSnapshotVersion() == null;
        List<String> missingPartIds = legacyAttempt ? partIds.stream()
                .filter(partId -> !result.containsKey(partId))
                .toList() : List.of();
        if (!missingPartIds.isEmpty()) {
            for (PartScoringRule rule : scoringRuleRepository.findByPartIdIn(missingPartIds)) {
                result.put(rule.getPart().getId(), new EffectiveScoringRule(
                        rule.getMaxScore(), rule.getPerfectBonus(), rule.isIncludedInOverall()));
            }
        }
        return result;
    }

    private static BigDecimal decimal(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return new BigDecimal(value);
    }

    private record EffectiveScoringRule(
            BigDecimal maxScore,
            BigDecimal perfectBonus,
            boolean includedInOverall) {
    }

    /**
     * Ước lượng CEFR từ phần trăm điểm.
     *
     * <p>Đây là thang quy đổi tạm để hiển thị, KHÔNG phải thang chính thức của
     * Aptis (British Council không công bố công thức). Khi có dữ liệu đối chiếu
     * thật thì thay bằng bảng quy đổi theo từng học phần.
     */
    public static String estimateCefrLevel(BigDecimal percentage) {
        CefrLevel level = estimateCefr(percentage);
        return level == null ? null : level.name();
    }

    private static CefrLevel estimateCefr(BigDecimal percentage) {
        if (percentage == null) {
            return null;
        }
        double value = percentage.doubleValue();
        if (value >= 90) {
            return CefrLevel.C2;
        }
        if (value >= 78) {
            return CefrLevel.C1;
        }
        if (value >= 62) {
            return CefrLevel.B2;
        }
        if (value >= 45) {
            return CefrLevel.B1;
        }
        if (value >= 28) {
            return CefrLevel.A2;
        }
        return CefrLevel.A1;
    }

    /** Bộ chưa chấm (chờ AI) vẫn phải cộng maxScore để phần trăm không sai. */
    private static BigDecimal maxScoreOf(AttemptDocument.QuestionSetEntry entry) {
        if (entry.getSnapshot() == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(entry.getSnapshot().getItems().stream()
                .mapToDouble(item -> item.getMaxScore())
                .sum());
    }
}
