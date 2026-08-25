package vn.weconex.aptis.practice.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.practice.domain.AttemptComponentProgress;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.repository.AttemptComponentProgressRepository;

/**
 * Quản lý tiến độ theo kỹ năng của lượt thi đủ 5 kỹ năng.
 *
 * <p>Đề thật cấp cho mỗi kỹ năng một khoảng thời gian riêng (Nói 12', Nghe 40',
 * Ngữ pháp &amp; Từ vựng 25', Đọc 35', Viết 50'), làm xong kỹ năng nào là nộp và
 * khóa kỹ năng đó — không sửa, không xem lại. Điểm chỉ hiện khi đã nộp đủ.
 *
 * <p>Chỉ áp dụng cho lượt {@code MOCK_TEST} không gắn component. Luyện từng part
 * vẫn dùng mốc hết giờ của cả lượt như cũ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ComponentProgressService {

    /**
     * Thời lượng chuẩn từng kỹ năng (giây), dùng khi blueprint riêng của kỹ năng
     * đó chưa đặt duration. Theo Aptis ESOL General.
     */
    private static final Map<String, Integer> DEFAULT_DURATION_SECONDS = Map.of(
            "SPEAKING", 12 * 60,
            "LISTENING", 40 * 60,
            "GRAMMAR_VOCABULARY", 25 * 60,
            "READING", 35 * 60,
            "WRITING", 50 * 60);

    private final AttemptComponentProgressRepository progressRepository;
    private final ComponentRepository componentRepository;
    private final vn.weconex.aptis.practice.repository.BlueprintPartRuleRepository ruleRepository;
    private final vn.weconex.aptis.catalog.repository.PartRepository partRepository;

    /** Lượt này có chia thời gian theo kỹ năng không. */
    public boolean appliesTo(TestAttempt attempt) {
        return attempt.getMode() == PracticeMode.MOCK_TEST && attempt.getComponentId() == null;
    }

    /**
     * Sinh tiến độ 5 kỹ năng ở trạng thái chưa bắt đầu.
     *
     * <p>Gọi lại nhiều lần là idempotent: đã có dữ liệu thì trả về nguyên trạng,
     * không mở lại đồng hồ.
     */
    @Transactional
    public List<AttemptComponentProgress> initialise(TestAttempt attempt, String examVersionId) {
        List<AttemptComponentProgress> existing =
                progressRepository.findByAttemptIdOrderByDisplayOrder(attempt.getId());
        if (!existing.isEmpty()) {
            return existing;
        }

        List<Component> components =
                componentRepository.findByExamVersionIdAndActiveTrueOrderByDisplayOrder(examVersionId);
        if (components.isEmpty()) {
            return List.of();
        }

        // Chỉ giữ kỹ năng mà đề này THẬT SỰ có part. Đề rút gọn (ví dụ
        // MOCK_SHORT_FREE_V1 chỉ gồm Grammar + Reading) cũng là MOCK_TEST không
        // gắn component, nên nếu sinh đủ 5 kỹ năng thì học viên bị hỏi Nói/Nghe/
        // Viết trong khi đề không có phần đó.
        java.util.Set<String> componentIdsInBlueprint = componentIdsOf(attempt);
        if (!componentIdsInBlueprint.isEmpty()) {
            components = components.stream()
                    .filter(c -> componentIdsInBlueprint.contains(c.getId()))
                    .toList();
            if (components.isEmpty()) {
                log.warn("Lượt {} không khớp kỹ năng nào của blueprint", attempt.getId());
                return List.of();
            }
        }

        List<AttemptComponentProgress> rows = new ArrayList<>();
        for (Component component : components) {
            AttemptComponentProgress row = new AttemptComponentProgress();
            row.setAttemptId(attempt.getId());
            row.setComponentId(component.getId());
            row.setDisplayOrder(component.getDisplayOrder());
            row.setDurationSeconds(durationOf(component));
            rows.add(row);
        }

        // Không kỹ năng nào chạy đồng hồ ngay: học viên phải qua màn giới thiệu
        // rồi bấm bắt đầu (beginComponent). Nếu mở sẵn thì giờ đã trôi trong khi
        // học viên còn đang đọc hướng dẫn.
        return progressRepository.saveAll(rows);
    }

    /**
     * Kỹ năng mà blueprint của lượt này có part.
     *
     * <p>Trả về rỗng khi lượt không gắn blueprint — lúc đó giữ hành vi cũ là
     * sinh đủ mọi kỹ năng, vì không có căn cứ nào để lọc.
     */
    private java.util.Set<String> componentIdsOf(TestAttempt attempt) {
        if (attempt.getBlueprintId() == null) {
            return java.util.Set.of();
        }
        List<String> partIds = ruleRepository
                .findByBlueprintIdOrderByDisplayOrder(attempt.getBlueprintId())
                .stream()
                .map(vn.weconex.aptis.practice.domain.BlueprintPartRule::getPartId)
                .toList();
        if (partIds.isEmpty()) {
            return java.util.Set.of();
        }
        // getComponent() là lazy nhưng chỉ đọc id nên Hibernate dùng proxy, không
        // phát thêm truy vấn.
        return partRepository.findAllById(partIds).stream()
                .map(part -> part.getComponent().getId())
                .collect(java.util.stream.Collectors.toSet());
    }

    private int durationOf(Component component) {
        String code = component.getCode() == null ? "" : component.getCode().toUpperCase();
        Integer fromCatalog = component.getDurationSeconds();
        if (fromCatalog != null && fromCatalog > 0) {
            return fromCatalog;
        }
        Integer fallback = DEFAULT_DURATION_SECONDS.get(code);
        if (fallback == null) {
            log.warn("Kỹ năng {} chưa có thời lượng chuẩn, tạm dùng 30 phút", code);
            return 30 * 60;
        }
        return fallback;
    }

    @Transactional(readOnly = true)
    public List<AttemptComponentProgress> list(String attemptId) {
        return progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId);
    }

    /**
     * Đóng những kỹ năng đã quá giờ mà client chưa kịp nộp, rồi mở kỹ năng kế.
     *
     * <p>Gọi ở đầu mọi thao tác đọc/ghi thay vì chạy job nền: người dùng đóng tab
     * giữa chừng thì lần vào lại vẫn thấy đúng trạng thái.
     *
     * @return true nếu có thay đổi
     */
    @Transactional
    public boolean closeOverdue(String attemptId) {
        List<AttemptComponentProgress> rows =
                progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId);
        if (rows.isEmpty()) {
            return false;
        }

        Instant now = Instant.now();
        boolean changed = false;

        // Lặp: đóng kỹ năng quá giờ có thể mở kỹ năng kế, mà kỹ năng kế cũng có
        // thể đã quá giờ (người dùng bỏ đi rất lâu).
        for (AttemptComponentProgress row : rows) {
            if (!row.isOverdue(now)) {
                continue;
            }
            row.setSubmittedAt(row.getExpiresAt());
            changed = true;
        }

        if (changed) {
            progressRepository.saveAll(rows);
        }
        return changed;
    }

    /**
     * Nộp một kỹ năng và mở kỹ năng kế tiếp.
     *
     * @return true nếu đây là kỹ năng cuối — người gọi cần nộp cả lượt để chấm
     */
    @Transactional
    public boolean submitComponent(String attemptId, String componentId) {
        List<AttemptComponentProgress> rows =
                progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId);
        AttemptComponentProgress target = rows.stream()
                .filter(row -> row.getComponentId().equals(componentId))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.ATTEMPT_INVALID_STATE, "Kỹ năng không thuộc lượt thi này"));

        if (target.isSubmitted()) {
            // Timer and the explicit submit request can arrive at the same time.
            // Returning the current terminal state makes this operation idempotent
            // and lets the caller finalise the whole attempt when this was the last
            // component.
            return rows.stream().allMatch(AttemptComponentProgress::isSubmitted);
        }
        if (target.getStartedAt() == null) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_INVALID_STATE, "Chưa tới lượt làm kỹ năng này");
        }

        // KHÔNG tự mở kỹ năng kế: đồng hồ của nó chỉ được chạy khi học viên đã
        // vào màn kỹ năng đó và bấm bắt đầu. Nếu mở sẵn, thí sinh còn đang ở màn
        // kỹ năng cũ mà giờ đã trôi.
        target.setSubmittedAt(Instant.now());
        progressRepository.saveAll(rows);

        return rows.stream().allMatch(AttemptComponentProgress::isSubmitted);
    }

    /**
     * Bắt đầu kỹ năng kế tiếp: học viên đã đọc màn giới thiệu và bấm vào làm.
     *
     * <p>Đây là lúc duy nhất đồng hồ của kỹ năng được chạy. Gọi lại khi kỹ năng
     * đã mở là idempotent — không gia hạn thêm giờ.
     */
    @Transactional
    public AttemptComponentProgress beginComponent(String attemptId, String componentId) {
        List<AttemptComponentProgress> rows =
                progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId);

        AttemptComponentProgress target = rows.stream()
                .filter(row -> row.getComponentId().equals(componentId))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.ATTEMPT_INVALID_STATE, "Kỹ năng không thuộc lượt thi này"));

        if (target.isSubmitted()) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_INVALID_STATE, "Kỹ năng này đã nộp");
        }
        if (target.getStartedAt() != null) {
            return target;
        }

        // Phải làm đúng thứ tự: mọi kỹ năng trước đó đều đã nộp.
        boolean previousDone = rows.stream()
                .filter(row -> row.getDisplayOrder() < target.getDisplayOrder())
                .allMatch(AttemptComponentProgress::isSubmitted);
        if (!previousDone) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_INVALID_STATE, "Chưa hoàn thành kỹ năng trước đó");
        }

        Instant now = Instant.now();
        target.open(now, now.plusSeconds(target.getDurationSeconds()));
        return progressRepository.save(target);
    }

    /** Kỹ năng kế tiếp chưa làm, để client hiện màn chuẩn bị. */
    @Transactional(readOnly = true)
    public Optional<AttemptComponentProgress> nextPending(String attemptId) {
        return progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                .filter(row -> row.getStartedAt() == null && !row.isSubmitted())
                .findFirst();
    }

    /**
     * Kỹ năng đang được phép làm, hoặc rỗng nếu đã nộp hết.
     */
    @Transactional(readOnly = true)
    public Optional<AttemptComponentProgress> currentOpen(String attemptId) {
        return progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                .filter(AttemptComponentProgress::isOpen)
                .findFirst();
    }

    /** componentId -> đã nộp chưa; dùng để chặn ghi và ẩn đáp án. */
    @Transactional(readOnly = true)
    public Map<String, Boolean> submittedByComponent(String attemptId) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (AttemptComponentProgress row
                : progressRepository.findByAttemptIdOrderByDisplayOrder(attemptId)) {
            result.put(row.getComponentId(), row.isSubmitted());
        }
        return result;
    }
}
