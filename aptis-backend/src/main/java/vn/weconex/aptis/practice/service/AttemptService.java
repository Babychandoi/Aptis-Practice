package vn.weconex.aptis.practice.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.AttemptItemStatus;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.ContentAccessService;
import vn.weconex.aptis.content.service.QuestionSetSanitizer;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.evaluation.repository.EvaluationDocumentRepository;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.domain.TestBlueprint;
import vn.weconex.aptis.practice.mongo.AttemptDocument;
import vn.weconex.aptis.practice.mongo.AttemptDocumentRepository;
import vn.weconex.aptis.practice.repository.AttemptQuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.scoring.ScoringService;
import vn.weconex.aptis.practice.web.PracticeDtos;

/**
 * Vòng đời một lượt làm bài: tạo -> start -> lưu câu trả lời -> nộp -> chấm.
 *
 * <p>MySQL và MongoDB được ghi tuần tự, không có distributed transaction
 * (PHẦN II §2.4). Thứ tự: ghi Mongo trước, MySQL sau — nếu MySQL lỗi thì
 * document Mongo mồ côi và bị job dọn, an toàn hơn là MySQL có attempt mà
 * Mongo thiếu snapshot (học viên gặp đề rỗng).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttemptService {

    private static final List<AttemptStatus> OPEN_STATUSES =
            List.of(AttemptStatus.CREATED, AttemptStatus.IN_PROGRESS);

    private final TestAttemptRepository attemptRepository;
    private final AttemptQuestionSetRepository attemptQuestionSetRepository;
    private final AttemptDocumentRepository attemptDocumentRepository;
    private final QuestionSetRepository questionSetRepository;
    private final QuestionSetSelector questionSetSelector;
    private final AttemptSnapshotFactory snapshotFactory;
    private final ContentAccessService contentAccessService;
    private final EntitlementService entitlementService;
    private final QuestionSetSanitizer sanitizer;
    private final ScoringService scoringService;
    private final MockTestService mockTestService;
    private final AttemptScoreAggregator scoreAggregator;
    private final EvaluationQueue evaluationQueue;
    private final EvaluationDocumentRepository evaluationDocumentRepository;
    private final AptisProperties properties;

    // -----------------------------------------------------------------
    // Tạo lượt
    // -----------------------------------------------------------------

    @Transactional
    public TestAttempt createPartAttempt(String userId, PracticeDtos.CreatePartAttemptRequest request) {
        boolean hasPremium = entitlementService.hasPremiumAccess(userId);

        Optional<Integer> mergeSize = properties.practice().mergeSizeOf(request.partId());

        // Luyện theo Part là học hết ngân hàng đề, không phải một lượt ngắn: lấy
        // tất cả bộ PUBLISHED rồi để giao diện phân trang từng đề. Chỉ giới hạn
        // khi client chủ động xin số lượng cụ thể (ví dụ ôn nhanh 5 đề).
        int size = Optional.ofNullable(request.questionSetCount())
                // Part gộp câu: client xin N đề nghĩa là cần N * mergeSize câu
                .map(count -> count * mergeSize.orElse(1))
                .orElseGet(() -> (int) questionSetRepository.countByPartIdAndStatus(
                        request.partId(), ContentStatus.PUBLISHED));

        List<QuestionSet> selected = questionSetSelector.selectForPart(
                userId, request.partId(), size, hasPremium,
                request.onlyNew(), request.onlyIncorrect());

        if (selected.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Không tìm thấy bộ câu hỏi phù hợp cho Part " + request.partId(),
                    Map.of("partId", request.partId(), "requested", size));
        }

        // Kiểm tra lại quyền từng bộ: selector đã lọc theo hasPremium nhưng
        // override có thể đổi kết quả cho từng bộ cụ thể
        Map<String, ContentAccessService.AccessDecision> decisions =
                contentAccessService.evaluateAll(userId, selected);
        List<QuestionSet> allowed = selected.stream()
                .filter(qs -> decisions.get(qs.getId()).allowed())
                .toList();

        if (allowed.isEmpty()) {
            throw ApiException.premiumRequired();
        }
        // Đề gộp phải đủ số câu, thiếu thì báo rõ thay vì tạo đề ngắn
        if (mergeSize.isPresent() && allowed.size() < mergeSize.get()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Ngân hàng chưa đủ câu hỏi cho Part này: cần ít nhất %d, hiện có %d"
                            .formatted(mergeSize.get(), allowed.size()),
                    Map.of("partId", request.partId(),
                            "required", mergeSize.get(),
                            "available", allowed.size()));
        }

        TestAttempt attempt = new TestAttempt();
        attempt.setUserId(userId);
        attempt.setPartId(request.partId());
        attempt.setComponentId(allowed.get(0).getPart().getComponent().getId());
        attempt.setMode(PracticeMode.PART_PRACTICE);
        attempt.setAccessLevelUsed(hasPremium ? AccessLevel.PREMIUM : AccessLevel.FREE);

        Integer duration = request.timed()
                ? allowed.get(0).getPart().getDefaultDurationSeconds()
                : null;

        return persistAttempt(attempt, allowed, duration);
    }

    @Transactional
    public TestAttempt createCustomAttempt(String userId, PracticeDtos.CreateCustomAttemptRequest request) {
        boolean hasPremium = entitlementService.hasPremiumAccess(userId);

        int max = properties.practice().maxCustomPracticeSize();
        Map<String, Integer> partCounts = Optional.ofNullable(request.partQuestionSetCounts())
                .orElse(Map.of());

        List<QuestionSet> selected;
        if (!partCounts.isEmpty()) {
            int requestedTotal = partCounts.values().stream().mapToInt(Integer::intValue).sum();
            if (requestedTotal > max) {
                throw new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "Số bộ câu hỏi của bài test vượt quá giới hạn " + max);
            }

            selected = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : partCounts.entrySet()) {
                List<QuestionSet> partSelection = questionSetSelector.selectForPart(
                        userId,
                        entry.getKey(),
                        entry.getValue(),
                        hasPremium,
                        request.onlyNew(),
                        request.onlyIncorrect());
                if (partSelection.size() < entry.getValue()) {
                    throw new ApiException(
                            ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                            "Part chưa đủ bộ câu hỏi để tạo bài test hoàn chỉnh",
                            Map.of(
                                    "partId", entry.getKey(),
                                    "required", entry.getValue(),
                                    "available", partSelection.size()));
                }
                selected.addAll(partSelection);
            }
            // Snapshot phải luôn theo đúng thứ tự Part của cấu trúc bài thi.
            selected.sort(Comparator.comparingInt(qs -> qs.getPart().getDisplayOrder()));
        } else {
            int size = Math.min(Optional.ofNullable(request.questionSetCount()).orElse(10), max);
            selected = questionSetSelector.selectForCustom(userId, request, size, hasPremium);
        }

        if (selected.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Không có bộ câu hỏi khớp bộ lọc đã chọn");
        }

        Map<String, ContentAccessService.AccessDecision> decisions =
                contentAccessService.evaluateAll(userId, selected);
        List<QuestionSet> allowed = selected.stream()
                .filter(qs -> decisions.get(qs.getId()).allowed())
                .toList();

        if (allowed.isEmpty()) {
            throw ApiException.premiumRequired();
        }
        if (!partCounts.isEmpty() && allowed.size() != selected.size()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Không đủ nội dung có quyền truy cập để tạo bài test hoàn chỉnh");
        }

        TestAttempt attempt = new TestAttempt();
        attempt.setUserId(userId);
        attempt.setMode(PracticeMode.CUSTOM_PRACTICE);
        attempt.setAccessLevelUsed(hasPremium ? AccessLevel.PREMIUM : AccessLevel.FREE);
        String selectedComponentId = selected.get(0).getPart().getComponent().getId();
        if (selected.stream().allMatch(qs -> selectedComponentId.equals(qs.getPart().getComponent().getId()))) {
            attempt.setComponentId(selectedComponentId);
        }

        Integer duration = request.timed() ? estimateDuration(allowed) : null;
        return persistAttempt(attempt, allowed, duration);
    }

    /**
     * Ghi Mongo trước, MySQL sau. Xem javadoc của class về lý do thứ tự.
     */
    private TestAttempt persistAttempt(
            TestAttempt attempt, List<QuestionSet> questionSets, Integer durationSeconds) {

        // Gán id trước để dùng chung cho cả Mongo document và MySQL row
        attempt.setId(java.util.UUID.randomUUID().toString());
        // Mã ngắn dùng ở URL; cột NOT NULL nên phải có trước khi lưu
        attempt.setPublicCode(TestAttempt.newPublicCode());

        // Factory tự gộp câu cho các Part được cấu hình (Speaking/Writing Part 1)
        AttemptSnapshotFactory.Snapshot snapshot =
                snapshotFactory.build(attempt, questionSets, durationSeconds);

        attempt.setTotalItems(snapshot.totalItems());
        attempt.setDurationSeconds(durationSeconds);
        attempt.setMaxScore(snapshot.questionSetRows().stream()
                .map(AttemptQuestionSet::getMaxScore)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        attemptDocumentRepository.save(snapshot.document());
        TestAttempt saved = attemptRepository.save(attempt);
        attemptQuestionSetRepository.saveAll(snapshot.questionSetRows());

        log.debug("Đã tạo attempt {} với {} bộ câu hỏi",
                saved.getId(), snapshot.questionSetRows().size());
        return saved;
    }

    /**
     * Tạo lượt thi thử từ blueprint (PHẦN IV §38).
     *
     * <p>Khác luyện tập: nội dung chọn theo rule từng Part, thời gian lấy từ
     * blueprint, và không nối lại lượt cũ — mỗi lần thi là một đề mới.
     */
    @Transactional
    public TestAttempt createMockTestAttempt(String userId, String blueprintId) {
        MockTestService.SelectedContent selected =
                mockTestService.selectContent(userId, blueprintId);

        TestBlueprint blueprint = selected.blueprint();

        TestAttempt attempt = new TestAttempt();
        attempt.setUserId(userId);
        attempt.setBlueprintId(blueprint.getId());
        attempt.setComponentId(blueprint.getComponentId());
        attempt.setMode(PracticeMode.MOCK_TEST);
        attempt.setAccessLevelUsed(selected.accessLevelUsed());

        return persistAttempt(attempt, selected.questionSets(), blueprint.getDurationSeconds());
    }

    // -----------------------------------------------------------------
    // Start / đọc
    // -----------------------------------------------------------------

    @Transactional
    public TestAttempt start(String userId, String attemptId) {
        TestAttempt attempt = requireOwned(userId, attemptId);

        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            return attempt; // start lại là idempotent
        }
        if (attempt.getStatus() != AttemptStatus.CREATED) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_INVALID_STATE,
                    "Lượt làm bài đã ở trạng thái " + attempt.getStatus());
        }

        Instant expiresAt = null;
        if (attempt.getDurationSeconds() != null) {
            expiresAt = Instant.now()
                    .plusSeconds(attempt.getDurationSeconds())
                    .plus(properties.practice().attemptExpiryGrace());
        }
        attempt.start(attempt.getDurationSeconds(), expiresAt);

        AttemptDocument document = requireDocument(attemptId);
        document.setStatus(AttemptStatus.IN_PROGRESS.name());
        document.setUpdatedAt(Instant.now());
        attemptDocumentRepository.save(document);

        return attemptRepository.save(attempt);
    }

    /**
     * Nội dung trả về đã lược answer key khi lượt chưa nộp (PHẦN VII §51).
     */
    @Transactional(readOnly = true)
    public PracticeDtos.AttemptResponse getAttempt(String userId, String attemptId) {
        TestAttempt attempt = requireOwned(userId, attemptId);
        AttemptDocument document = requireDocument(attemptId);

        boolean attemptSubmitted = isSubmitted(attempt.getStatus());
        Long shuffleSeed = document.getConfigSnapshot().getShuffleSeed();

        // Luyện tập được xem câu trả lời mẫu ngay trong lúc làm (explanation của
        // Speaking/Writing là bài mẫu để học theo). Thi thử thì không, để giống
        // điều kiện thi thật.
        boolean revealSampleAnswer = attempt.getMode() != PracticeMode.MOCK_TEST;

        Map<String, AttemptQuestionSet> rows =
                attemptQuestionSetRepository.findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                        .collect(Collectors.toMap(AttemptQuestionSet::getId, Function.identity()));

        // Nạp hotness và năm ra thi một lượt cho mọi bộ trong đề, tránh truy vấn
        // từng bộ. Client dùng để hiện số ngọn lửa và lọc "đề nhiều lửa" / theo năm.
        List<QuestionSet> questionSets = questionSetRepository
                .findAllById(document.getQuestionSets().stream()
                        .map(AttemptDocument.QuestionSetEntry::getQuestionSetId)
                        .distinct()
                        .toList());
        Map<String, Integer> hotnessById = questionSets.stream()
                .filter(qs -> qs.getHotness() != null)
                .collect(Collectors.toMap(QuestionSet::getId, qs -> qs.getHotness().intValue()));
        Map<String, Integer> examYearById = questionSets.stream()
                .filter(qs -> qs.getExamYear() != null)
                .collect(Collectors.toMap(QuestionSet::getId, qs -> (int) qs.getExamYear()));

        List<PracticeDtos.AttemptQuestionSetResponse> entries = document.getQuestionSets().stream()
                .sorted(java.util.Comparator.comparingInt(AttemptDocument.QuestionSetEntry::getDisplayOrder))
                .map(entry -> {
                    AttemptQuestionSet row = rows.get(entry.getAttemptQuestionSetId());

                    // Tiết lộ đáp án theo TỪNG bộ, không theo cả lượt: bộ đã nộp
                    // riêng (SCORED) phải thấy đáp án ngay, các bộ chưa nộp vẫn
                    // bị lược (PHẦN VII §51).
                    boolean revealAnswers = attemptSubmitted
                            || (row != null && row.getStatus() == AttemptItemStatus.SCORED);

                    QuestionSetDocument content = sanitizer.sanitize(
                            entry.getSnapshot(),
                            revealAnswers,
                            revealAnswers || revealSampleAnswer,
                            shuffleSeed);

                    return new PracticeDtos.AttemptQuestionSetResponse(
                            entry.getAttemptQuestionSetId(),
                            entry.getQuestionSetId(),
                            entry.getDisplayOrder(),
                            row == null ? AttemptItemStatus.NOT_STARTED.name() : row.getStatus().name(),
                            row == null ? 0 : row.getMaxScore().doubleValue(),
                            row == null || row.getAwardedScore() == null
                                    ? null : row.getAwardedScore().doubleValue(),
                            row == null ? 0 : row.getAudioPlayCount(),
                            entry.getSnapshot().getSettings().getMaxAudioPlays(),
                            hotnessById.get(entry.getQuestionSetId()),
                            examYearById.get(entry.getQuestionSetId()),
                            content,
                            toSavedResponse(entry.getResponse()));
                })
                .toList();

        return new PracticeDtos.AttemptResponse(
                attempt.getId(),
                attempt.getMode().name(),
                attempt.getStatus().name(),
                attempt.getAccessLevelUsed().name(),
                attempt.getComponentId(),
                attempt.getPartId(),
                attempt.getBlueprintId(),
                attempt.getStartedAt(),
                attempt.getSubmittedAt(),
                attempt.getExpiresAt(),
                attempt.getDurationSeconds(),
                attempt.getTimeSpentSeconds(),
                attempt.getTotalItems(),
                attempt.getAnsweredItems(),
                entries);
    }

    // -----------------------------------------------------------------
    // Lưu câu trả lời (autosave)
    // -----------------------------------------------------------------

    @Transactional
    public void saveResponses(
            String userId,
            String attemptId,
            String questionSetId,
            PracticeDtos.SaveResponsesRequest request) {

        TestAttempt attempt = requireOwned(userId, attemptId);
        requireAcceptingResponses(attempt);

        AttemptQuestionSet row = attemptQuestionSetRepository
                .findByAttemptIdAndQuestionSetId(attemptId, questionSetId)
                .orElseThrow(() -> ApiException.notFound("AttemptQuestionSet", questionSetId));

        AttemptDocument document = requireDocument(attemptId);
        AttemptDocument.QuestionSetEntry entry = document.findEntry(row.getId());
        if (entry == null) {
            throw new ApiException(
                    ErrorCode.QUESTION_SET_CONTENT_MISSING,
                    "Snapshot thiếu entry " + row.getId());
        }

        // Chỉ nhận itemId có trong snapshot — chặn client gửi item lạ
        var validItemIds = entry.getSnapshot().getItems().stream()
                .map(QuestionSetDocument.Item::getId)
                .collect(Collectors.toSet());

        AttemptDocument.Response response = entry.getResponse();
        if (response.getStartedAt() == null) {
            response.setStartedAt(Instant.now());
        }

        for (PracticeDtos.ItemResponsePayload payload : request.itemResponses()) {
            if (!validItemIds.contains(payload.itemId())) {
                throw new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "itemId không thuộc bộ câu hỏi: " + payload.itemId());
            }
            response.upsert(toItemResponse(payload));
        }

        response.setStatus(AttemptItemStatus.ANSWERED.name());
        response.setAnsweredAt(Instant.now());
        if (request.timeSpentSeconds() != null) {
            response.setTimeSpentSeconds(request.timeSpentSeconds());
        }

        document.setUpdatedAt(Instant.now());
        attemptDocumentRepository.save(document);

        row.markAnswered();
        attemptQuestionSetRepository.save(row);

        // answered_items đếm theo item đã trả lời trên toàn attempt
        attempt.setAnsweredItems(countAnsweredItems(document));
        attemptRepository.save(attempt);
    }

    // -----------------------------------------------------------------
    // Nộp bài và chấm
    // -----------------------------------------------------------------

    /**
     * Chấm riêng MỘT bộ câu hỏi giữa lượt, để học viên xem kết quả từng đề mà
     * không phải nộp cả lượt.
     *
     * <p>Không đổi trạng thái attempt: lượt vẫn IN_PROGRESS và các bộ còn lại
     * vẫn làm tiếp được. Khi nộp cả lượt, {@code submit} chấm lại toàn bộ —
     * {@code scoreEntry} gán lại điểm chứ không cộng dồn nên tổng vẫn đúng.
     *
     * <p>Chỉ trả answer key của đúng bộ này; các bộ khác vẫn bị sanitizer lược
     * (PHẦN VII §51).
     */
    @Transactional
    public PracticeDtos.QuestionSetScoreResponse scoreQuestionSet(
            String userId, String attemptId, String questionSetId) {

        TestAttempt attempt = attemptRepository.findByIdForUpdate(attemptId)
                .orElseThrow(() -> ApiException.notFound("TestAttempt", attemptId));

        if (!attempt.isOwnedBy(userId)) {
            throw new ApiException(ErrorCode.ATTEMPT_NOT_OWNED, "Lượt làm bài không thuộc người dùng");
        }
        if (isSubmitted(attempt.getStatus())) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_ALREADY_SUBMITTED,
                    "Lượt làm bài đã nộp, xem kết quả ở trang kết quả");
        }
        if (attempt.getStatus() == AttemptStatus.CREATED) {
            throw new ApiException(ErrorCode.ATTEMPT_NOT_STARTED, "Lượt làm bài chưa bắt đầu");
        }

        AttemptQuestionSet row = attemptQuestionSetRepository
                .findByAttemptIdAndQuestionSetId(attemptId, questionSetId)
                .orElseThrow(() -> ApiException.notFound("AttemptQuestionSet", questionSetId));

        AttemptDocument document = requireDocument(attemptId);
        AttemptDocument.QuestionSetEntry entry = document.findEntry(row.getId());
        if (entry == null) {
            throw new ApiException(
                    ErrorCode.QUESTION_SET_CONTENT_MISSING,
                    "Snapshot thiếu entry " + row.getId());
        }

        // Speaking/Writing cần AI hoặc giáo viên, không có điểm ngay được
        if (scoringService.requiresManualEvaluation(entry.getSnapshot())) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Bộ câu hỏi này được chấm sau khi nộp bài, không xem điểm ngay được",
                    Map.of("questionSetId", questionSetId));
        }

        AttemptDocument.Score score = scoringService.scoreEntry(entry)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "Không chấm được bộ câu hỏi này",
                        Map.of("questionSetId", questionSetId)));

        row.applyScore(BigDecimal.valueOf(score.getRawScore()));

        document.setUpdatedAt(Instant.now());
        attemptDocumentRepository.save(document);
        attemptQuestionSetRepository.save(row);

        int correctItems = (int) score.getItemScores().stream()
                .filter(AttemptDocument.ItemScore::isCorrect)
                .count();

        // revealAnswers = true nhưng CHỈ cho bộ này
        QuestionSetDocument revealed = sanitizer.sanitize(
                entry.getSnapshot(), true, document.getConfigSnapshot().getShuffleSeed());

        log.debug("Đã chấm riêng bộ {} của attempt {}: {}/{}",
                questionSetId, attemptId, score.getRawScore(), score.getMaxScore());

        return new PracticeDtos.QuestionSetScoreResponse(
                questionSetId,
                score.getRawScore(),
                score.getMaxScore(),
                correctItems,
                entry.getSnapshot().getItems().size(),
                score.getItemScores().stream()
                        .map(itemScore -> new PracticeDtos.ItemScoreResponse(
                                itemScore.getItemId(),
                                itemScore.getRawScore(),
                                itemScore.getMaxScore(),
                                itemScore.isCorrect()))
                        .toList(),
                revealed);
    }

    /**
     * Chấm phần tự động ngay; Speaking/Writing để lại cho evaluation job nên
     * attempt có thể dừng ở SCORING thay vì COMPLETED.
     */
    @Transactional
    public TestAttempt submit(String userId, String attemptId) {
        TestAttempt attempt = attemptRepository.findByIdForUpdate(attemptId)
                .orElseThrow(() -> ApiException.notFound("TestAttempt", attemptId));

        if (!attempt.isOwnedBy(userId)) {
            throw new ApiException(ErrorCode.ATTEMPT_NOT_OWNED, "Lượt làm bài không thuộc người dùng");
        }
        if (isSubmitted(attempt.getStatus())) {
            throw new ApiException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED, "Lượt làm bài đã được nộp");
        }
        if (attempt.getStatus() == AttemptStatus.CREATED) {
            throw new ApiException(ErrorCode.ATTEMPT_NOT_STARTED, "Lượt làm bài chưa bắt đầu");
        }

        AttemptDocument document = requireDocument(attemptId);

        // Tổng thời gian client đã báo qua autosave từng bộ câu hỏi
        int reportedSeconds = document.getQuestionSets().stream()
                .mapToInt(e -> e.getResponse().getTimeSpentSeconds())
                .sum();
        attempt.submit(reportedSeconds);

        Map<String, AttemptQuestionSet> rows =
                attemptQuestionSetRepository.findByAttemptIdOrderByDisplayOrder(attemptId).stream()
                        .collect(Collectors.toMap(AttemptQuestionSet::getId, Function.identity()));

        BigDecimal totalRaw = BigDecimal.ZERO;
        int correctItems = 0;
        int incorrectItems = 0;
        boolean needsManualEvaluation = false;

        List<AttemptQuestionSet> updatedRows = new ArrayList<>();

        for (AttemptDocument.QuestionSetEntry entry : document.getQuestionSets()) {
            Optional<AttemptDocument.Score> scored = scoringService.scoreEntry(entry);
            AttemptQuestionSet row = rows.get(entry.getAttemptQuestionSetId());

            if (scored.isPresent()) {
                AttemptDocument.Score score = scored.get();
                totalRaw = totalRaw.add(BigDecimal.valueOf(score.getRawScore()));

                for (AttemptDocument.ItemScore itemScore : score.getItemScores()) {
                    if (itemScore.isCorrect()) {
                        correctItems++;
                    } else {
                        incorrectItems++;
                    }
                }

                if (row != null) {
                    row.applyScore(BigDecimal.valueOf(score.getRawScore()));
                    updatedRows.add(row);
                }
            }

            if (scoringService.requiresManualEvaluation(entry.getSnapshot())) {
                needsManualEvaluation = true;
            }
        }

        attempt.setCorrectItems(correctItems);
        attempt.setIncorrectItems(incorrectItems);

        if (needsManualEvaluation) {
            // Điểm tổng chỉ chốt sau khi AI/giáo viên chấm xong
            attempt.markScoring();
            attempt.setRawScore(totalRaw);
        } else {
            attempt.complete(totalRaw, attempt.getMaxScore());
        }

        document.setStatus(attempt.getStatus().name());
        document.setUpdatedAt(Instant.now());
        attemptDocumentRepository.save(document);

        attemptQuestionSetRepository.saveAll(updatedRows);
        TestAttempt saved = attemptRepository.save(attempt);

        // Điểm theo Part/học phần cho báo cáo thi thử
        scoreAggregator.aggregate(attemptId, document);

        // Speaking/Writing: đưa vào hàng đợi chấm AI
        if (needsManualEvaluation) {
            evaluationQueue.enqueueForAttempt(saved, document, rows);
        }

        return saved;
    }

    /**
     * Kết quả chấm của một lượt. Chỉ chủ lượt đọc được.
     *
     * <p>Khi giáo viên đã chấm lại, chỉ trả bản của giáo viên: học viên cần thấy
     * đúng một điểm, còn bản AI giữ lại để nội bộ đối soát.
     */
    @Transactional(readOnly = true)
    public List<PracticeDtos.EvaluationResultResponse> evaluationResults(
            String userId, String attemptId) {

        requireOwned(userId, attemptId);

        List<vn.weconex.aptis.evaluation.mongo.EvaluationDocument> documents =
                evaluationDocumentRepository.findByAttemptId(attemptId);

        // Với mỗi bộ câu hỏi, ưu tiên bản TEACHER nếu có
        Map<String, vn.weconex.aptis.evaluation.mongo.EvaluationDocument> latest =
                new java.util.LinkedHashMap<>();

        for (var document : documents) {
            latest.merge(document.getQuestionSetId(), document, (existing, candidate) ->
                    "TEACHER".equals(candidate.getEvaluator().getType())
                            ? candidate
                            : existing);
        }

        return latest.values().stream()
                .map(document -> new PracticeDtos.EvaluationResultResponse(
                        document.getQuestionSetId(),
                        document.getEvaluator().getType(),
                        document.getEvaluator().getModel(),
                        document.getTotalScore(),
                        document.getMaxScore(),
                        document.getCefrLevel(),
                        document.getInput().getTranscript(),
                        document.getCriteria().stream()
                                .map(c -> new PracticeDtos.CriterionScoreResponse(
                                        c.getCode(), c.getName(), c.getScore(),
                                        c.getMaxScore(), c.getFeedback()))
                                .toList(),
                        new PracticeDtos.FeedbackResponse(
                                document.getFeedback().getSummary(),
                                document.getFeedback().getStrengths(),
                                document.getFeedback().getWeaknesses(),
                                document.getFeedback().getSuggestions(),
                                document.getFeedback().getCorrectedVersion())))
                .toList();
    }

    // -----------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public TestAttempt requireOwned(String userId, String attemptId) {
        TestAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("TestAttempt", attemptId));

        if (!attempt.isOwnedBy(userId)) {
            // Trả NOT_OWNED thay vì NOT_FOUND để log phân biệt được,
            // client vẫn nhận 403 chung
            throw new ApiException(ErrorCode.ATTEMPT_NOT_OWNED, "Lượt làm bài không thuộc người dùng");
        }
        return attempt;
    }

    private void requireAcceptingResponses(TestAttempt attempt) {
        if (!attempt.getStatus().acceptsResponses()) {
            throw new ApiException(
                    ErrorCode.ATTEMPT_INVALID_STATE,
                    "Không thể lưu câu trả lời khi lượt ở trạng thái " + attempt.getStatus());
        }
        if (attempt.isExpired(Instant.now())) {
            throw new ApiException(ErrorCode.ATTEMPT_EXPIRED, "Lượt làm bài đã hết thời gian");
        }
    }

    private AttemptDocument requireDocument(String attemptId) {
        return attemptDocumentRepository.findByAttemptId(attemptId)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.QUESTION_SET_CONTENT_MISSING,
                        "Thiếu snapshot MongoDB cho attempt " + attemptId));
    }

    private static boolean isSubmitted(AttemptStatus status) {
        return status == AttemptStatus.SUBMITTED
                || status == AttemptStatus.SCORING
                || status == AttemptStatus.COMPLETED;
    }

    private static int countAnsweredItems(AttemptDocument document) {
        return document.getQuestionSets().stream()
                .mapToInt(e -> e.getResponse().getItemResponses().size())
                .sum();
    }

    private Integer estimateDuration(List<QuestionSet> questionSets) {
        int seconds = questionSets.stream()
                .mapToInt(qs -> Optional.ofNullable(qs.getEstimatedSeconds()).orElse(60))
                .sum();
        return seconds > 0 ? seconds : null;
    }

    private static PracticeDtos.SavedResponse toSavedResponse(AttemptDocument.Response response) {
        if (response == null) {
            return null;
        }
        List<PracticeDtos.ItemResponsePayload> items = response.getItemResponses().stream()
                .map(r -> new PracticeDtos.ItemResponsePayload(
                        r.getItemId(),
                        r.getResponseType(),
                        r.getSelectedOptionId(),
                        r.getSelectedOptionIds(),
                        r.getMatches(),
                        r.getOrderedOptionIds(),
                        r.getTextValue(),
                        r.getRecordingAssetId()))
                .toList();

        return new PracticeDtos.SavedResponse(
                response.getStatus(), response.getAnsweredAt(), items);
    }

    private static AttemptDocument.ItemResponse toItemResponse(
            PracticeDtos.ItemResponsePayload payload) {

        AttemptDocument.ItemResponse response = new AttemptDocument.ItemResponse();
        response.setItemId(payload.itemId());
        response.setResponseType(payload.responseType());
        response.setSelectedOptionId(payload.selectedOptionId());
        response.setSelectedOptionIds(
                payload.selectedOptionIds() == null ? List.of() : payload.selectedOptionIds());
        response.setMatches(payload.matches() == null ? Map.of() : payload.matches());
        response.setOrderedOptionIds(
                payload.orderedOptionIds() == null ? List.of() : payload.orderedOptionIds());
        response.setTextValue(payload.textValue());
        response.setRecordingAssetId(payload.recordingAssetId());
        response.setAnsweredAt(Instant.now());
        return response;
    }
}
