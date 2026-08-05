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
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.AttemptComponentScore;
import vn.weconex.aptis.practice.domain.AttemptPartScore;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.repository.AttemptComponentScoreRepository;
import vn.weconex.aptis.practice.repository.AttemptPartScoreRepository;

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
        Map<String, AttemptComponentScore> componentScores = new LinkedHashMap<>();

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

            String componentId = componentOf.get(partId);
            if (componentId != null) {
                componentScores
                        .computeIfAbsent(componentId, id -> AttemptComponentScore.of(attemptId, id))
                        .add(raw, max);
            }
        }

        // CEFR theo học phần: ước lượng từ phần trăm điểm
        componentScores.values().forEach(score ->
                score.setCefrLevel(estimateCefr(score.getPercentageScore())));

        partScoreRepository.saveAll(new ArrayList<>(partScores.values()));
        componentScoreRepository.saveAll(new ArrayList<>(componentScores.values()));
    }

    /**
     * Ước lượng CEFR từ phần trăm điểm.
     *
     * <p>Đây là thang quy đổi tạm để hiển thị, KHÔNG phải thang chính thức của
     * Aptis (British Council không công bố công thức). Khi có dữ liệu đối chiếu
     * thật thì thay bằng bảng quy đổi theo từng học phần.
     */
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
