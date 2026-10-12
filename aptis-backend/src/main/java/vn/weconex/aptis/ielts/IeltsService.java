package vn.weconex.aptis.ielts;

import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.exception.*;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.Enums.AssetType;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.ielts.IeltsModels.*;

@Service @RequiredArgsConstructor
public class IeltsService {
    private final IeltsExamRepository exams;
    private final IeltsAttemptRepository attempts;
    private final CurrentUser user;
    private final EntitlementService entitlement;
    private final AssetRepository assets;
    private final MinioStorageClient storage;

    private boolean admin() { return user.require().hasRole("ADMIN") || user.require().hasRole("SUPER_ADMIN"); }
    private void teacher() {
        if (!admin() && !user.require().hasRole("TEACHER")) throw ApiException.forbidden("Cần quyền giáo viên");
    }
    private static PageRequest page(int page) { return PageRequest.of(Math.max(0, page), 24, Sort.by("updatedAt").descending()); }
    public Page<ExamSummary> catalog(Track track, int page) {
        return exams.findByPublishedTrueAndTrack(track, page(page)).map(IeltsService::summary);
    }
    public Page<Exam> authored(int page) { teacher(); return exams.findByAuthorId(user.requireUserId(), page(page)); }
    public static ExamSummary summary(Exam exam) {
        return new ExamSummary(exam.getId(), exam.getTitle(), exam.getTrack(), exam.isFullLength(), exam.isPremium(),
            exam.getGroups().stream().map(Group::skill).distinct().toList(),
            exam.getGroups().stream().mapToInt(g -> g.questions().size()).sum());
    }
    public Exam saveExam(String id, Exam input) {
        teacher(); validate(input);
        Exam exam = id == null ? new Exam() : exams.findById(id).orElseThrow(() -> ApiException.notFound("Exam", id));
        if (id != null && !admin() && !user.requireUserId().equals(exam.getAuthorId())) throw ApiException.forbidden("Không sở hữu đề");
        if (id != null && !Objects.equals(exam.getVersion(), input.getVersion())) throw new ApiException(ErrorCode.CONFLICT, "Đề đã được cập nhật");
        exam.setId(id == null ? UUID.randomUUID().toString() : id);
        if (id == null) exam.setAuthorId(user.requireUserId());
        exam.setTitle(input.getTitle().strip()); exam.setTrack(input.getTrack());
        exam.setFullLength(input.isFullLength()); exam.setPremium(input.isPremium());
        exam.setPublished(input.isPublished()); exam.setGroups(List.copyOf(input.getGroups()));
        exam.setUpdatedAt(Instant.now());
        return exams.save(exam);
    }
    public void validate(Exam exam) {
        if (exam.getTitle() == null || exam.getTitle().isBlank() || exam.getTitle().length() > 200 || exam.getTrack() == null
            || exam.getGroups() == null || exam.getGroups().isEmpty() || exam.getGroups().size() > 12) invalid("Thông tin đề không hợp lệ");
        Set<String> ids = new HashSet<>();
        Set<String> parts = new HashSet<>();
        int total = 0;
        for (Group group : exam.getGroups()) {
            if (group == null || group.id() == null || !group.id().matches("[A-Za-z0-9_-]{1,64}") || !ids.add("g:" + group.id()) || group.skill() == null
                || group.part() < 1 || group.part() > (group.skill() == Skill.LISTENING ? 4 : group.skill() == Skill.WRITING ? 2 : 3)
                || !parts.add(group.skill() + ":" + group.part()) || group.questions() == null || group.questions().isEmpty()) invalid("Nhóm câu hỏi không hợp lệ");
            if (group.passage() != null && group.passage().length() > 50000) invalid("Passage quá dài");
            if (group.assetId() != null && !group.assetId().isBlank()) contentAsset(group.assetId());
            if (exam.isPublished() && group.skill() == Skill.LISTENING && (group.assetId() == null || group.assetId().isBlank())) invalid("Listening cần audio");
            for (Question q : group.questions()) {
                if (++total > 100 || q == null || q.id() == null || !q.id().matches("[A-Za-z0-9_-]{1,64}") || !ids.add("q:" + q.id()) || q.type() == null
                    || q.prompt() == null || (exam.isPublished() && q.prompt().isBlank()) || q.prompt().length() > 10000
                    || q.options() == null) invalid("Câu hỏi không hợp lệ");
                boolean writing = group.skill() == Skill.WRITING, speaking = group.skill() == Skill.SPEAKING;
                if ((writing && q.type() != Type.LONG_TEXT) || (speaking && q.type() != Type.AUDIO_RECORDING)
                    || (!writing && !speaking && IeltsScoring.productive(q))) invalid("Dạng câu hỏi không phù hợp kỹ năng");
                if (writing && !Objects.equals(q.minWords(), group.part() == 1 ? 150 : 250)) invalid("Writing Task 1 cần tối thiểu 150 từ; Task 2 cần 250 từ");
                if (q.maxWords() != null && (q.maxWords() < 1 || q.maxWords() > 100)) invalid("Giới hạn từ không hợp lệ");
                if (q.minWords() != null && (q.minWords() < 1 || q.minWords() > 1000)) invalid("Số từ tối thiểu không hợp lệ");
                if (q.responseSeconds() != null && (q.responseSeconds() < 1 || q.responseSeconds() > 300)) invalid("Giới hạn ghi âm không hợp lệ");
                if (IeltsScoring.productive(q)) continue;
                if (!exam.isPublished()) continue;
                if (q.answers() == null || q.answers().isEmpty() || q.answers().stream().anyMatch(a -> a == null || a.isBlank())) invalid("Thiếu đáp án");
                if (exam.isFullLength() && q.type() == Type.MULTIPLE_CHOICE && q.answers().size() != 1)
                    invalid("Đề đầy đủ cần tách mỗi numbered slot thành một question có một đáp án");
                if (q.type() == Type.SHORT_TEXT) continue;
                if (q.options() == null || q.options().size() < 2 || q.options().size() > 30) invalid("Thiếu lựa chọn");
                Set<String> options = new HashSet<>();
                for (Option option : q.options()) if (option == null || option.id() == null || option.text() == null || !options.add(option.id())) invalid("Lựa chọn trùng hoặc thiếu");
                if (!options.containsAll(q.answers()) || new HashSet<>(q.answers()).size() != q.answers().size()
                    || (q.type() != Type.MULTIPLE_CHOICE && q.answers().size() != 1)) invalid("Đáp án không nằm trong lựa chọn");
            }
        }
        if (exam.isFullLength() && exam.isPublished()) {
            for (Skill skill : exam.getGroups().stream().map(Group::skill).distinct().toList()) {
                List<Group> groups = exam.getGroups().stream().filter(g -> g.skill() == skill).toList();
                int count = groups.stream().mapToInt(g -> g.questions().size()).sum();
                if (skill == Skill.LISTENING && (groups.size() != 4 || count != 40 || groups.stream().anyMatch(g -> g.questions().size() != 10))) invalid("Listening đầy đủ cần 4 part × 10 câu");
                if (skill == Skill.READING && (groups.size() != 3 || count != 40)) invalid("Reading đầy đủ cần 3 section và 40 câu");
                if (skill == Skill.WRITING && (groups.size() != 2 || count != 2)) invalid("Writing đầy đủ cần 2 task");
                if (skill == Skill.SPEAKING && groups.size() != 3) invalid("Speaking đầy đủ cần 3 part");
            }
        }
    }
    private void contentAsset(String id) {
        var asset = assets.findById(id).orElseThrow(() -> ApiException.notFound("Asset", id));
        if (!asset.isReady() || (asset.getAssetType() != AssetType.AUDIO && asset.getAssetType() != AssetType.IMAGE)) invalid("File đề chưa sẵn sàng");
        if (!admin() && !user.requireUserId().equals(asset.getCreatedBy())) throw ApiException.forbidden("Không sở hữu file đề");
    }
    private static void invalid(String message) { throw new ApiException(ErrorCode.VALIDATION_FAILED, message); }
    public AttemptView start(String examId) {
        if (examId == null || examId.isBlank()) invalid("Thiếu mã đề");
        Exam exam = exams.findById(examId).orElseThrow(() -> ApiException.notFound("Exam", examId));
        if (!exam.isPublished()) throw new ApiException(ErrorCode.CONTENT_NOT_PUBLISHED);
        if (exam.isPremium() && !entitlement.hasPremiumAccess(user.requireUserId())) throw ApiException.premiumRequired();
        Attempt attempt = new Attempt();
        attempt.setId(UUID.randomUUID().toString()); attempt.setUserId(user.requireUserId());
        attempt.setExamId(examId); attempt.setExamAuthorId(exam.getAuthorId());
        attempt.setTitle(exam.getTitle()); attempt.setTrack(exam.getTrack()); attempt.setFullLength(exam.isFullLength());
        attempt.setSnapshot(List.copyOf(exam.getGroups())); attempt.setCreatedAt(Instant.now());
        next(attempt); return view(attempts.save(attempt));
    }
    private static void next(Attempt attempt) {
        Skill next = Arrays.stream(Skill.values()).filter(s -> !attempt.getSubmittedSkills().contains(s)
            && attempt.getSnapshot().stream().anyMatch(g -> g.skill() == s)).findFirst().orElse(null);
        attempt.setActiveSkill(next);
        if (next == null) {
            attempt.setDeadline(null);
            attempt.setStatus(IeltsScoring.scores(attempt).values().stream().anyMatch(s -> "PENDING_REVIEW".equals(s.state())) ? Status.PENDING_REVIEW : Status.COMPLETED);
        } else {
            int seconds = switch (next) { case LISTENING -> 1920; case READING, WRITING -> 3600; case SPEAKING -> 840; };
            attempt.setDeadline(Instant.now().plusSeconds(seconds));
        }
    }
    private Attempt owned(String id) {
        Attempt attempt = attempts.findById(id).orElseThrow(() -> ApiException.notFound("Attempt", id));
        if (!user.requireUserId().equals(attempt.getUserId())) throw new ApiException(ErrorCode.ATTEMPT_NOT_OWNED);
        return attempt;
    }
    public AttemptView get(String id) { return view(owned(id)); }
    public Page<AttemptSummary> history(int page) {
        return attempts.findByUserIdOrderByCreatedAtDesc(user.requireUserId(), PageRequest.of(Math.max(0, page), 24)).map(this::attemptSummary);
    }
    private AttemptSummary attemptSummary(Attempt a) {
        var scores = IeltsScoring.scores(a);
        return new AttemptSummary(a.getId(), a.getTitle(), a.getTrack(), a.getStatus(), a.getCreatedAt(), scores, IeltsScoring.overall(scores));
    }
    public AttemptView saveResponses(String id, Long version, Map<String, Response> responses) {
        Attempt attempt = owned(id);
        if (attempt.getStatus() != Status.IN_PROGRESS) throw new ApiException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED);
        if (Instant.now().isAfter(attempt.getDeadline())) throw new ApiException(ErrorCode.ATTEMPT_EXPIRED);
        if (!Objects.equals(version, attempt.getVersion())) throw new ApiException(ErrorCode.CONFLICT, "Bài làm đã đổi, tải lại trước khi lưu");
        if (responses == null || responses.size() > 100) invalid("Câu trả lời không hợp lệ");
        Map<String, Question> allowed = new HashMap<>();
        attempt.getSnapshot().stream().filter(g -> g.skill() == attempt.getActiveSkill()).flatMap(g -> g.questions().stream()).forEach(q -> allowed.put(q.id(), q));
        for (var entry : responses.entrySet()) {
            Question q = allowed.get(entry.getKey()); Response r = entry.getValue();
            if (q == null || r == null || (r.text() != null && r.text().length() > 20000)
                || (r.selected() != null && r.selected().size() > 30)) invalid("Câu trả lời ngoài kỹ năng đang làm");
            if (r.recordingAssetId() != null && !r.recordingAssetId().isBlank()) {
                if (q.type() != Type.AUDIO_RECORDING) invalid("Câu này không nhận ghi âm");
                var asset = assets.findById(r.recordingAssetId()).orElseThrow(() -> ApiException.notFound("Asset", r.recordingAssetId()));
                if (!asset.isReady() || asset.getAssetType() != AssetType.USER_RECORDING
                    || !user.requireUserId().equals(asset.getOwnerUserId())) throw ApiException.forbidden("Ghi âm không thuộc học viên");
            }
        }
        attempt.getResponses().putAll(responses); return view(attempts.save(attempt));
    }
    public AttemptView submitSkill(String id, Skill skill) {
        if (skill == null) invalid("Thiếu kỹ năng cần nộp");
        Attempt attempt = owned(id);
        if (attempt.getSubmittedSkills().contains(skill)) return view(attempt);
        if (attempt.getStatus() != Status.IN_PROGRESS || attempt.getActiveSkill() != skill) throw new ApiException(ErrorCode.ATTEMPT_INVALID_STATE);
        attempt.getSubmittedSkills().add(skill); next(attempt); return view(attempts.save(attempt));
    }
    public Page<AttemptSummary> reviewQueue(int page) {
        teacher();
        PageRequest paging = PageRequest.of(Math.max(0, page), 24, Sort.by("createdAt").descending());
        return (admin() ? attempts.findByStatus(Status.PENDING_REVIEW, paging)
            : attempts.findByExamAuthorIdAndStatus(user.requireUserId(), Status.PENDING_REVIEW, paging)).map(this::attemptSummary);
    }
    public AttemptView getForReview(String id) { return view(reviewable(id)); }
    private Attempt reviewable(String id) {
        teacher(); Attempt attempt = attempts.findById(id).orElseThrow(() -> ApiException.notFound("Attempt", id));
        if (!admin() && !user.requireUserId().equals(attempt.getExamAuthorId())) throw ApiException.forbidden("Không có quyền chấm bài này");
        if (attempt.getStatus() == Status.IN_PROGRESS) throw new ApiException(ErrorCode.RESULT_NOT_READY);
        return attempt;
    }
    public AttemptView review(String id, String questionId, Map<String, Double> criteria, String feedback) {
        Attempt attempt = reviewable(id);
        Group group = attempt.getSnapshot().stream().filter(g -> g.questions().stream().anyMatch(q -> q.id().equals(questionId))).findFirst().orElseThrow(() -> ApiException.notFound("Question", questionId));
        Question q = group.questions().stream().filter(i -> i.id().equals(questionId)).findFirst().orElseThrow();
        if (!IeltsScoring.productive(q) || criteria == null || !criteria.keySet().equals(IeltsScoring.rubric(q, group.part()))
            || criteria.values().stream().anyMatch(v -> v == null || !Double.isFinite(v) || v < 0 || v > 9 || v * 2 != Math.floor(v * 2))) invalid("Rubric cần đủ 4 tiêu chí band 0–9, bước 0.5");
        if (feedback == null || feedback.isBlank() || feedback.length() > 10000) invalid("Cần nhận xét chấm bài");
        attempt.getReviews().put(questionId, new Review(Map.copyOf(criteria), feedback, user.requireUserId(), Instant.now()));
        next(attempt); return view(attempts.save(attempt));
    }
    public Map<String, String> media(String id, String assetId, boolean reviewing) {
        Attempt attempt = reviewing ? reviewable(id) : owned(id);
        boolean referenced = attempt.getSnapshot().stream().anyMatch(g -> assetId.equals(g.assetId()))
            || attempt.getResponses().values().stream().anyMatch(r -> assetId.equals(r.recordingAssetId()));
        if (!referenced) throw ApiException.forbidden("File không nằm trong bài làm");
        var asset = assets.findById(assetId).orElseThrow(() -> ApiException.notFound("Asset", assetId));
        if (!asset.isReady()) throw new ApiException(ErrorCode.ASSET_NOT_READY);
        return Map.of("url", storage.presignedDownloadUrl(asset.getBucketName(), asset.getObjectKey()), "mimeType", asset.getMimeType());
    }
    public AttemptView view(Attempt attempt) {
        boolean finished = attempt.getStatus() != Status.IN_PROGRESS;
        List<PublicGroup> groups = attempt.getSnapshot().stream()
            .filter(g -> finished || g.skill() == attempt.getActiveSkill())
            .map(g -> new PublicGroup(g.id(), g.skill(), g.part(), g.title(), g.instructions(), g.passage(), g.assetId(),
                g.questions().stream().map(q -> new PublicQuestion(q.id(), q.type(), q.prompt(), q.options(), q.maxWords(), q.minWords(), q.responseSeconds())).toList())).toList();
        Map<String, QuestionResult> answers = new LinkedHashMap<>();
        if (finished) attempt.getSnapshot().forEach(g -> g.questions().stream().filter(q -> !IeltsScoring.productive(q)).forEach(q ->
            answers.put(q.id(), new QuestionResult(q.answers(), q.explanation(), IeltsScoring.correct(q, attempt.getResponses().get(q.id()))))));
        var scores = IeltsScoring.scores(attempt);
        return new AttemptView(attempt.getId(), attempt.getTitle(), attempt.getTrack(), attempt.getStatus(), attempt.isFullLength(), groups,
            Collections.unmodifiableMap(attempt.getResponses()), attempt.getActiveSkill(), attempt.getDeadline(), attempt.getVersion(), scores,
            IeltsScoring.overall(scores), answers, finished ? Collections.unmodifiableMap(attempt.getReviews()) : Map.of());
    }
}
