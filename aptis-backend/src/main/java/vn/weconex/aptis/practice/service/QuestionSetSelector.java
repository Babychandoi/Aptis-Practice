package vn.weconex.aptis.practice.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.web.PracticeDtos;
import vn.weconex.aptis.progress.repository.UserQuestionStatsRepository;

/**
 * Chọn bộ câu hỏi cho lượt luyện tập (PHẦN IX).
 *
 * <p>Thứ tự ưu tiên: chưa làm -> đến lịch ôn -> mastery thấp -> lâu chưa gặp.
 * Câu vừa làm trong {@code avoidRepeatWindow} bị loại trừ, nhưng nếu ngân hàng
 * quá nhỏ thì bỏ ràng buộc này để vẫn tạo được bài (§57 — không đảm bảo tuyệt đối).
 */
@Component
@RequiredArgsConstructor
public class QuestionSetSelector {

    /** MySQL không nhận IN (), dùng sentinel khi danh sách loại trừ rỗng. */
    private static final List<String> NO_EXCLUSION = List.of("-");

    private final QuestionSetRepository questionSetRepository;
    private final UserQuestionStatsRepository statsRepository;
    private final AptisProperties properties;

    public List<QuestionSet> selectForPart(
            String userId,
            String partId,
            int size,
            boolean hasPremium,
            boolean onlyNew,
            boolean onlyIncorrect) {

        if (onlyIncorrect) {
            List<String> incorrectIds =
                    statsRepository.findIncorrectQuestionSetIdsByPart(userId, partId, size);
            return loadPublishedInOrder(incorrectIds);
        }

        List<String> excluded = recentlyUsed(userId);
        List<String> ids = questionSetRepository.selectForPartPractice(
                userId, partId, hasPremium, excluded, size);

        // Ngân hàng nhỏ: thử lại không loại trừ để học viên vẫn luyện được
        if (ids.size() < size && !excluded.equals(NO_EXCLUSION)) {
            ids = questionSetRepository.selectForPartPractice(
                    userId, partId, hasPremium, NO_EXCLUSION, size);
        }

        List<QuestionSet> result = loadPublishedInOrder(ids);
        if (onlyNew) {
            var attempted = statsRepository.findAttemptedQuestionSetIds(userId, ids);
            result = result.stream()
                    .filter(qs -> !attempted.contains(qs.getId()))
                    .toList();
        }
        return result;
    }

    /**
     * Luyện tùy chọn: lọc bằng Specification rồi sắp xếp theo cùng thứ tự ưu tiên.
     */
    public List<QuestionSet> selectForCustom(
            String userId,
            PracticeDtos.CreateCustomAttemptRequest request,
            int size,
            boolean hasPremium) {

        var spec = QuestionSetSpecifications.forCustomPractice(request, hasPremium);
        // Lấy nhiều hơn size để còn dư sau khi lọc theo lịch sử làm bài
        var candidates = questionSetRepository.findAll(
                spec,
                org.springframework.data.domain.PageRequest.of(0, Math.max(size * 4, 40)))
                .getContent();

        if (candidates.isEmpty()) {
            return List.of();
        }

        List<String> candidateIds = candidates.stream().map(QuestionSet::getId).toList();
        Map<String, UserQuestionStatsRepository.StatsView> stats =
                statsRepository.findStatsFor(userId, candidateIds).stream()
                        .collect(Collectors.toMap(
                                UserQuestionStatsRepository.StatsView::getQuestionSetId,
                                Function.identity()));

        List<QuestionSet> filtered = new ArrayList<>();
        for (QuestionSet qs : candidates) {
            var stat = stats.get(qs.getId());
            if (request.onlyNew() && stat != null) {
                continue;
            }
            if (request.onlyIncorrect() && (stat == null || stat.getIncorrectCount() == 0)) {
                continue;
            }
            filtered.add(qs);
        }

        if (request.shuffle()) {
            java.util.Collections.shuffle(filtered);
        } else {
            filtered.sort(priorityComparator(stats));
        }

        return filtered.stream().limit(size).toList();
    }

    /**
     * Cùng thứ tự với query native ở PHẦN IX §56, áp dụng trên dữ liệu đã nạp.
     */
    private Comparator<QuestionSet> priorityComparator(
            Map<String, UserQuestionStatsRepository.StatsView> stats) {

        Instant now = Instant.now();
        return Comparator
                // Chưa làm lên đầu
                .comparingInt((QuestionSet qs) -> stats.containsKey(qs.getId()) ? 1 : 0)
                // Đến lịch ôn
                .thenComparingInt(qs -> {
                    var stat = stats.get(qs.getId());
                    boolean due = stat != null
                            && stat.getNextReviewAt() != null
                            && !stat.getNextReviewAt().isAfter(now);
                    return due ? 0 : 1;
                })
                // Mastery thấp trước
                .thenComparingDouble(qs -> {
                    var stat = stats.get(qs.getId());
                    return stat == null ? 0 : stat.getMasteryScore();
                })
                // Lâu chưa gặp trước
                .thenComparing(qs -> {
                    var stat = stats.get(qs.getId());
                    return stat == null || stat.getLastAttemptedAt() == null
                            ? Instant.EPOCH
                            : stat.getLastAttemptedAt();
                });
    }

    private List<String> recentlyUsed(String userId) {
        Instant since = Instant.now().minus(properties.practice().avoidRepeatWindow());
        List<String> ids = questionSetRepository.findRecentlyUsedQuestionSetIds(userId, since);
        return ids.isEmpty() ? NO_EXCLUSION : ids;
    }

    /**
     * Nạp entity và giữ đúng thứ tự ưu tiên mà query đã trả về —
     * {@code findAllById} không đảm bảo thứ tự.
     */
    private List<QuestionSet> loadPublishedInOrder(List<String> orderedIds) {
        if (orderedIds.isEmpty()) {
            return List.of();
        }

        Map<String, QuestionSet> byId = questionSetRepository.findAllById(orderedIds).stream()
                .filter(qs -> qs.getStatus() == ContentStatus.PUBLISHED)
                .collect(Collectors.toMap(QuestionSet::getId, Function.identity()));

        return orderedIds.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }
}
