package vn.weconex.aptis.ielts;

import java.text.Normalizer;
import java.util.*;
import vn.weconex.aptis.ielts.IeltsModels.*;

/** All raw conversions are PRACTICE ESTIMATES: actual test boundaries vary. */
public final class IeltsScoring {
    private IeltsScoring() {}
    private static final int[] LISTENING = {0,1,2,4,6,8,10,13,16,18,23,26,30,32,35,37,39};
    private static final int[] ACADEMIC = {0,1,3,4,6,8,10,13,15,19,23,27,30,33,35,37,39};
    private static final int[] GENERAL = {0,1,3,6,9,12,15,19,23,27,30,32,34,36,37,39,40};
    public static double rawBand(int correct, Skill skill, Track track) {
        if (correct < 0 || correct > 40 || (skill != Skill.LISTENING && skill != Skill.READING))
            throw new IllegalArgumentException("A complete 40-question receptive skill is required");
        int[] limits = skill == Skill.LISTENING ? LISTENING : track == Track.ACADEMIC ? ACADEMIC : GENERAL;
        if (correct == 0) return 0;
        double band = 1;
        for (int i = 2; i < limits.length; i++) if (correct >= limits[i]) band = 1 + i * .5;
        return Math.min(9, band);
    }
    public static double roundBand(double value) {
        if (!Double.isFinite(value) || value < 0 || value > 9) throw new IllegalArgumentException("Invalid band");
        return Math.round(value * 2) / 2.0;
    }
    public static int words(String text) {
        return text == null || text.isBlank() ? 0 : text.strip().split("\\s+").length;
    }
    public static String normalized(String text) {
        return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFKC)
            .strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
    public static boolean correct(Question q, Response response) {
        if (response == null || q.answers() == null || q.answers().isEmpty()) return false;
        if (q.type() == Type.SHORT_TEXT) {
            String text = response.text();
            return words(text) > 0 && (q.maxWords() == null || words(text) <= q.maxWords())
                && q.answers().stream().anyMatch(a -> normalized(a).equals(normalized(text)));
        }
        List<String> selected = response.selected() == null ? List.of() : response.selected();
        return !selected.isEmpty() && selected.size() == new HashSet<>(selected).size()
            && new HashSet<>(selected).equals(new HashSet<>(q.answers()));
    }
    public static boolean productive(Question q) {
        return q.type() == Type.LONG_TEXT || q.type() == Type.AUDIO_RECORDING;
    }
    public static Set<String> rubric(Question q, int part) {
        return q.type() == Type.AUDIO_RECORDING
            ? Set.of("fluencyCoherence", "lexicalResource", "grammarAccuracy", "pronunciation")
            : Set.of(part == 1 ? "taskAchievement" : "taskResponse", "coherenceCohesion", "lexicalResource", "grammarAccuracy");
    }
    public static double reviewMean(Review review) {
        return review.criteria().values().stream().mapToDouble(Double::doubleValue).average().orElseThrow();
    }
    public static Map<Skill, SkillResult> scores(Attempt attempt) {
        Map<Skill, SkillResult> result = new EnumMap<>(Skill.class);
        for (Skill skill : Skill.values()) {
            List<Group> groups = attempt.getSnapshot().stream().filter(g -> g.skill() == skill).toList();
            List<Question> questions = groups.stream().flatMap(g -> g.questions().stream()).toList();
            if (questions.isEmpty()) continue;
            if (!attempt.getSubmittedSkills().contains(skill)) {
                result.put(skill, new SkillResult(null, questions.size(), null, "IN_PROGRESS")); continue;
            }
            if (skill == Skill.LISTENING || skill == Skill.READING) {
                int correct = (int) questions.stream().filter(q -> correct(q, attempt.getResponses().get(q.id()))).count();
                result.put(skill, new SkillResult(correct, questions.size(),
                    attempt.isFullLength() && questions.size() == 40 ? rawBand(correct, skill, attempt.getTrack()) : null,
                    attempt.isFullLength() ? "ESTIMATED" : "PRACTICE"));
            } else if (questions.stream().anyMatch(q -> !attempt.getReviews().containsKey(q.id()))) {
                result.put(skill, new SkillResult(null, questions.size(), null, "PENDING_REVIEW"));
            } else {
                double sum = 0, weights = 0;
                for (Group g : groups) for (Question q : g.questions()) {
                    double weight = skill == Skill.WRITING && g.part() == 2 ? 2 : 1;
                    sum += reviewMean(attempt.getReviews().get(q.id())) * weight;
                    weights += weight;
                }
                result.put(skill, new SkillResult(null, questions.size(), roundBand(sum / weights), "TEACHER_ESTIMATE"));
            }
        }
        return result;
    }
    public static Double overall(Map<Skill, SkillResult> scores) {
        if (scores.size() != 4 || scores.values().stream().anyMatch(s -> s.band() == null)) return null;
        return roundBand(scores.values().stream().mapToDouble(SkillResult::band).average().orElseThrow());
    }
}
