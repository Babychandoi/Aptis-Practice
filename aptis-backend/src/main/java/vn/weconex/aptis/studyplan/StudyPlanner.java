package vn.weconex.aptis.studyplan;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Sinh lộ trình học từ mục tiêu, ngày thi, số phút mỗi ngày và điểm hiện tại.
 *
 * <p>Không đọc DB: cùng đầu vào thì ra cùng lộ trình. Việc của ngày đã qua được chốt lại
 * (xem V77) và truyền vào qua {@link Input#frozen()}; ngày chưa tới xếp tiếp từ đó. Việc
 * đã làm hay chưa đối chiếu với {@link Activity} (bài đã làm trong ngày).
 *
 * <p>Ba chặng: Nền tảng (luyện theo Part kỹ năng thiếu điểm nhất + mẹo), Tăng tốc
 * (Đề trọng điểm tháng, mỗi tuần một bài test kỹ năng yếu và một đề đủ 5 kỹ năng),
 * Nước rút 5-10 ngày cuối (làm đề dự đoán mỗi ngày, cách hai ngày một đề đủ 5 kỹ năng).
 *
 * <p>Các việc luyện ({@link #SESSION_TYPES}) mở thành một phiên: hệ thống chọn sẵn đúng
 * số đề theo độ ưu tiên (StudySessionPicker) nên học viên không phải tự chọn.
 */
public final class StudyPlanner {

    public enum Skill { GRAMMAR_VOCABULARY, LISTENING, READING, SPEAKING, WRITING }

    public enum Phase { FOUNDATION, ACCELERATE, SPRINT }

    public enum TaskType {
        WARMUP, GRAMMAR, VOCAB, PART_PRACTICE, TIPS, MONTHLY_FOCUS, REVIEW, SKILL_TEST, FULL_MOCK,
        /** Bản cũ: chỉ mở trang dự đoán. Giữ để đọc được ngày đã chốt trước đợt 2. */
        PREDICTION,
        PREDICTION_PRACTICE,
        /** Xem nhận xét AI của bài Speaking/Writing vừa chấm — thêm lúc xem, không chốt. */
        FEEDBACK,
        REST,
        /** Ngày nghỉ trong tuần do học viên chọn. */
        DAY_OFF
    }

    /** Việc mở thành phiên luyện với đề hệ thống chọn sẵn. */
    public static final Set<TaskType> SESSION_TYPES = Set.of(TaskType.GRAMMAR, TaskType.VOCAB, TaskType.PART_PRACTICE,
            TaskType.MONTHLY_FOCUS, TaskType.REVIEW, TaskType.PREDICTION_PRACTICE);

    /** Điểm sàn (thang 50) của từng bậc mục tiêu — cùng mốc trang chủ dùng. */
    public static final Map<String, Integer> LEVEL_FLOOR = Map.of("B1", 26, "B2", 38, "C1", 46);

    static final List<Skill> MAIN = List.of(Skill.LISTENING, Skill.READING, Skill.SPEAKING, Skill.WRITING);
    /** Khoảng cách giả định khi chưa rõ điểm một kỹ năng. */
    static final double UNKNOWN_GAP = 8;
    static final int WARMUP_MINUTES = 5;
    static final int GRAMMAR_MINUTES = 8;
    static final int GRAMMAR_SETS = 10;
    static final int VOCAB_SETS = 3;
    static final int REVIEW_SETS = 5;
    static final int REVIEW_MINUTES = 10;
    /** Có từ chừng này đề đang sai mới xếp việc ôn. */
    static final int REVIEW_MIN_WEAK = 3;
    static final int SKILL_TEST_MINUTES = 50;
    static final int FULL_MOCK_MINUTES = 160;
    static final int PREDICTION_SETS = 3;
    static final int PREDICTION_MINUTES = 15;
    static final int TIPS_MINUTES = 5;
    /** Quá số ngày này không có bài test kỹ năng / đề thi thử thì nhắc làm. */
    public static final int TEST_REMINDER_DAYS = 14;
    /** Tỉ lệ đúng giả định của Part chưa làm bài nào. */
    static final double DEFAULT_ACCURACY = 0.6;
    /** Phạt mỗi lần Part đã được chọn trong ba lần gần nhất, để không lặp mãi một Part. */
    static final double RECENT_PENALTY = 0.25;

    /** Thứ tự Part luyện xoay vòng: Part dễ mất điểm trước. */
    private static final Map<Skill, int[]> PART_ORDER = Map.of(
            Skill.LISTENING, new int[] {2, 3, 4, 1},
            Skill.READING, new int[] {2, 3, 4, 1},
            Skill.SPEAKING, new int[] {1, 2, 3, 4},
            Skill.WRITING, new int[] {1, 2, 3, 4});

    /** Số phút trung bình cho một đề của từng Part. */
    private static final Map<Skill, int[]> MINUTES_PER_SET = Map.of(
            Skill.LISTENING, new int[] {1, 4, 4, 4},
            Skill.READING, new int[] {4, 4, 6, 8},
            Skill.SPEAKING, new int[] {2, 3, 3, 4},
            Skill.WRITING, new int[] {2, 5, 8, 15});

    /**
     * @param partAccuracy tỉ lệ điểm (0-1) từng Part của học viên; thiếu = chưa rõ
     * @param frozen       việc đã chốt của các ngày trước (xem V77) — dùng nguyên, không xếp lại
     * @param restDays     ngày nghỉ trong tuần (ISO: 1 = thứ Hai … 7 = Chủ nhật)
     * @param weakSets     số đề học viên đang làm sai, để xếp việc ôn
     */
    public record Input(LocalDate start, LocalDate exam, int minutesPerDay, int targetScore, Map<Skill, Double> current,
                        Map<Skill, Map<Integer, Double>> partAccuracy, Map<LocalDate, List<Task>> frozen,
                        Set<Integer> restDays, int weakSets) {
        public Input(LocalDate start, LocalDate exam, int minutesPerDay, int targetScore, Map<Skill, Double> current) {
            this(start, exam, minutesPerDay, targetScore, current, Map.of(), Map.of(), Set.of(), 0);
        }

        public Input(LocalDate start, LocalDate exam, int minutesPerDay, int targetScore, Map<Skill, Double> current,
                     Map<Skill, Map<Integer, Double>> partAccuracy, Map<LocalDate, List<Task>> frozen) {
            this(start, exam, minutesPerDay, targetScore, current, partAccuracy, frozen, Set.of(), 0);
        }
    }

    public record Task(String key, TaskType type, Skill skill, Integer part, int count, int minutes) {
    }

    public record Day(LocalDate date, int index, Phase phase, List<Task> tasks) {
    }

    public record PhaseSpan(Phase phase, LocalDate from, LocalDate to, int days) {
    }

    /** Bài đã làm theo ngày (giờ Việt Nam), để đánh dấu việc xong. */
    public interface Activity {
        /** Số đề đã làm của một Part trong ngày (luyện theo Part, phiên lộ trình, bài giao…). */
        int answeredSets(LocalDate day, Skill skill, int part);

        /** Số đề đã làm trên một trang Đề trọng điểm tháng trong ngày. */
        int monthlyFocus(LocalDate day, String pageKey);

        /** Đã nộp một bài test cả kỹ năng đó trong ngày. */
        boolean skillTest(LocalDate day, Skill skill);

        /** Đã nộp một đề thi đủ 5 kỹ năng trong ngày. */
        boolean fullMock(LocalDate day);

        /** Đã mở trang (theo khóa thống kê lượt xem) trong ngày. */
        boolean viewed(LocalDate day, String pageKey);

        /** Số đề đã làm trong phiên luyện của việc này; chưa mở phiên thì 0. */
        default int sessionAnswered(String taskKey) {
            return 0;
        }
    }

    public record TaskStatus(Task task, boolean done, boolean carried) {
    }

    public record DayStatus(LocalDate date, Phase phase, int total, int done, boolean locked) {
    }

    public record Summary(
            List<PhaseSpan> phases,
            Phase phase,
            int dayIndex,
            int totalDays,
            int daysLeft,
            int progressPercent,
            List<TaskStatus> today,
            boolean todayLocked,
            List<DayStatus> week,
            Map<Skill, Double> gaps,
            /** Việc xếp cho hôm nay (chưa gồm việc dồn/nhắc) — để chốt lại. Null ngoài lộ trình. */
            Day todayPlan,
            /** Quá {@link #TEST_REMINDER_DAYS} ngày chưa có bài test nào. */
            boolean testOverdue,
            /** Việc đã làm / được giao trong 7 ngày gần nhất (tính cả hôm nay). */
            int last7Done,
            int last7Total) {
    }

    private StudyPlanner() {
    }

    // ------------------------------------------------------------------ chặng

    /** Chia các ngày từ {@code start} tới trước ngày thi thành ba chặng. */
    public static List<PhaseSpan> phases(LocalDate start, LocalDate exam) {
        int total = (int) Math.max(1, ChronoUnit.DAYS.between(start, exam));
        int sprint = total < 7 ? total : (int) Math.min(10, Math.max(5, Math.round(total * 0.15)));
        int accelerate = total < 21 ? total - sprint : (int) Math.round(total * 0.35);
        int foundation = total - sprint - accelerate;
        List<PhaseSpan> out = new ArrayList<>();
        LocalDate at = start;
        for (var entry : List.of(Map.entry(Phase.FOUNDATION, foundation), Map.entry(Phase.ACCELERATE, accelerate),
                Map.entry(Phase.SPRINT, sprint))) {
            if (entry.getValue() <= 0) {
                continue;
            }
            out.add(new PhaseSpan(entry.getKey(), at, at.plusDays(entry.getValue() - 1L), entry.getValue()));
            at = at.plusDays(entry.getValue());
        }
        return out;
    }

    /** Khoảng cách tới mục tiêu của từng kỹ năng (>= 0); chưa rõ điểm thì giả định. */
    public static Map<Skill, Double> gaps(Input in) {
        Map<Skill, Double> out = new EnumMap<>(Skill.class);
        for (Skill s : Skill.values()) {
            Double score = in.current().get(s);
            out.put(s, score == null ? UNKNOWN_GAP : Math.max(0, in.targetScore() - score));
        }
        return out;
    }

    // ------------------------------------------------------------------ việc từng ngày

    /** Việc của mọi ngày trong lộ trình, theo thứ tự. */
    public static List<Day> days(Input in) {
        List<PhaseSpan> spans = phases(in.start(), in.exam());
        Map<Skill, Double> gaps = gaps(in);
        double weightSum = MAIN.stream().mapToDouble(s -> gaps.get(s) + 2).sum();
        List<Skill> weakest = weakest(gaps);

        Map<Skill, Double> allocated = new EnumMap<>(Skill.class);
        // Ba Part gần nhất đã giao của từng kỹ năng, để xoay Part.
        Map<Skill, Deque<Integer>> recent = new EnumMap<>(Skill.class);
        MAIN.forEach(s -> { allocated.put(s, 0.0); recent.put(s, new ArrayDeque<>()); });
        Set<Skill> tipsGiven = new HashSet<>();
        double totalAllocated = 0;
        // Số ngày thường đã qua: xen kẽ Grammar / Vocabulary và cách ba ngày ôn câu sai.
        int normalDays = 0;

        int budget = Math.max(15, in.minutesPerDay() - WARMUP_MINUTES - GRAMMAR_MINUTES);
        List<Day> out = new ArrayList<>();
        int index = 0;
        for (PhaseSpan span : spans) {
            // Nhịp tuần (bài test, thi thử) đếm theo ngày học, bỏ qua ngày nghỉ.
            int j = 0;
            for (int k = 0; k < span.days(); k++, index++) {
                LocalDate date = span.from().plusDays(k);
                // Ngày đã chốt: giữ nguyên việc đã giao, chỉ ghi nhận vào trạng thái phân bổ.
                List<Task> kept = in.frozen().get(date);
                if (kept != null) {
                    boolean off = kept.stream().anyMatch(t -> t.type() == TaskType.DAY_OFF);
                    boolean normal = false;
                    for (Task t : kept) {
                        if (t.type() == TaskType.GRAMMAR || t.type() == TaskType.VOCAB) {
                            normal = true;
                        }
                        if (t.skill() == null || !MAIN.contains(t.skill())) {
                            continue;
                        }
                        if (t.type() == TaskType.PART_PRACTICE || t.type() == TaskType.MONTHLY_FOCUS) {
                            allocated.merge(t.skill(), (double) t.minutes(), Double::sum);
                            totalAllocated += t.minutes();
                            remember(recent.get(t.skill()), t.part());
                        } else if (t.type() == TaskType.TIPS) {
                            tipsGiven.add(t.skill());
                        }
                    }
                    if (!off) {
                        j++;
                    }
                    if (normal) {
                        normalDays++;
                    }
                    out.add(new Day(date, index, span.phase(), List.copyOf(kept)));
                    continue;
                }
                boolean lastDay = span.phase() == Phase.SPRINT && k == span.days() - 1 && span.days() > 1;
                if (in.restDays().contains(date.getDayOfWeek().getValue()) && !lastDay) {
                    out.add(new Day(date, index, span.phase(), List.of(task(date, TaskType.DAY_OFF, null, null, 1, 0))));
                    continue;
                }
                List<Task> tasks = new ArrayList<>();
                tasks.add(task(date, TaskType.WARMUP, null, null, 1, WARMUP_MINUTES));
                boolean special = false;
                if (span.phase() == Phase.FOUNDATION && j % 7 == 6) {
                    tasks.add(task(date, TaskType.SKILL_TEST, weakest.get((j / 7) % 2), null, 1, SKILL_TEST_MINUTES));
                    special = true;
                } else if (span.phase() == Phase.ACCELERATE && j % 7 == 3) {
                    tasks.add(task(date, TaskType.SKILL_TEST, weakest.get((j / 7) % 2), null, 1, SKILL_TEST_MINUTES));
                    special = true;
                } else if (span.phase() == Phase.ACCELERATE && j % 7 == 6) {
                    tasks.add(task(date, TaskType.FULL_MOCK, null, null, 1, FULL_MOCK_MINUTES));
                    special = true;
                } else if (span.phase() == Phase.SPRINT) {
                    if (lastDay) {
                        // Hôm trước ngày thi: chỉ ôn nhẹ, nghỉ ngơi.
                        tasks.add(task(date, TaskType.REST, null, null, 1, 0));
                        special = true;
                    } else {
                        // Mỗi ngày làm đề của chủ đề đang được dự đoán, xen kẽ Listening / Reading.
                        tasks.add(task(date, TaskType.PREDICTION_PRACTICE, j % 2 == 0 ? Skill.LISTENING : Skill.READING,
                                null, PREDICTION_SETS, PREDICTION_MINUTES));
                        if (j % 3 == 0) {
                            tasks.add(task(date, TaskType.FULL_MOCK, null, null, 1, FULL_MOCK_MINUTES));
                            special = true;
                        }
                    }
                }
                j++;
                if (!special) {
                    // Ngữ pháp và từ vựng xen kẽ nhau, cùng một khoảng thời gian.
                    tasks.add(normalDays % 2 == 0
                            ? task(date, TaskType.GRAMMAR, Skill.GRAMMAR_VOCABULARY, 1, GRAMMAR_SETS, GRAMMAR_MINUTES)
                            : task(date, TaskType.VOCAB, Skill.GRAMMAR_VOCABULARY, 2, VOCAB_SETS, GRAMMAR_MINUTES));
                    int slots = budget >= 40 ? 2 : 1;
                    double per = (double) budget / slots;
                    double goal = totalAllocated + budget;
                    List<Skill> pick = new ArrayList<>(MAIN);
                    final Map<Skill, Double> allocatedNow = allocated;
                    pick.sort(Comparator.comparingDouble((Skill s) ->
                                    -((gaps.get(s) + 2) / weightSum * goal - allocatedNow.get(s)))
                            .thenComparing(MAIN::indexOf));
                    for (Skill s : pick.subList(0, slots)) {
                        int part = choosePart(s, in.partAccuracy().getOrDefault(s, Map.of()), recent.get(s));
                        remember(recent.get(s), part);
                        int count = (int) Math.max(1, Math.round(per / MINUTES_PER_SET.get(s)[part - 1]));
                        if (span.phase() == Phase.FOUNDATION) {
                            if (tipsGiven.add(s)) {
                                tasks.add(task(date, TaskType.TIPS, s, part, 1, TIPS_MINUTES));
                            }
                            tasks.add(task(date, TaskType.PART_PRACTICE, s, part, count, (int) Math.round(per)));
                        } else {
                            tasks.add(task(date, TaskType.MONTHLY_FOCUS, s, part, count, (int) Math.round(per)));
                        }
                        allocated.merge(s, per, Double::sum);
                    }
                    totalAllocated += budget;
                    // Cách ba ngày ôn lại các đề đang làm sai.
                    if (in.weakSets() >= REVIEW_MIN_WEAK && normalDays % 3 == 2) {
                        tasks.add(task(date, TaskType.REVIEW, null, null, Math.min(REVIEW_SETS, in.weakSets()), REVIEW_MINUTES));
                    }
                    normalDays++;
                }
                out.add(new Day(date, index, span.phase(), List.copyOf(tasks)));
            }
        }
        return out;
    }

    /** Kỹ năng chính xếp từ thiếu nhiều điểm nhất. */
    static List<Skill> weakest(Map<Skill, Double> gaps) {
        List<Skill> out = new ArrayList<>(MAIN);
        out.sort(Comparator.comparingDouble((Skill s) -> -gaps.get(s)).thenComparing(MAIN::indexOf));
        return out;
    }

    /**
     * Part luyện tiếp theo: Part có tỉ lệ đúng thấp nhất, cộng phạt cho Part vừa luyện gần
     * đây. Chưa có dữ liệu thì mọi Part bằng nhau và ra đúng vòng xoay mặc định.
     */
    static int choosePart(Skill skill, Map<Integer, Double> accuracy, Deque<Integer> recentParts) {
        int best = PART_ORDER.get(skill)[0];
        double bestScore = Double.MAX_VALUE;
        for (int p : PART_ORDER.get(skill)) {
            double score = accuracy.getOrDefault(p, DEFAULT_ACCURACY);
            for (int r : recentParts) {
                if (r == p) {
                    score += RECENT_PENALTY;
                }
            }
            if (score < bestScore - 1e-9) {
                bestScore = score;
                best = p;
            }
        }
        return best;
    }

    private static void remember(Deque<Integer> recentParts, Integer part) {
        if (part == null) {
            return;
        }
        recentParts.addLast(part);
        while (recentParts.size() > 3) {
            recentParts.removeFirst();
        }
    }

    private static Task task(LocalDate date, TaskType type, Skill skill, Integer part, int count, int minutes) {
        String key = date + ":" + type + (skill == null ? "" : ":" + skill) + (part == null ? "" : ":" + part);
        return new Task(key, type, skill, part, count, minutes);
    }

    /** Khóa trang Đề trọng điểm tháng ứng với một Part của kho. */
    public static String monthlyFocusPage(Skill skill, int part) {
        return switch (skill) {
            case LISTENING -> "listening-" + part;
            case SPEAKING -> "speaking-" + part;
            case READING -> switch (part) {
                case 1 -> "reading-1";
                case 2 -> "reading-2-3";
                case 3 -> "reading-4";
                default -> "reading-5";
            };
            case WRITING -> "writing";
            default -> "";
        };
    }

    /** Việc đã làm xong trong ngày {@code day} chưa. Khởi động do trình duyệt tự đánh dấu. */
    public static boolean isDone(Task t, LocalDate day, Activity a) {
        return switch (t.type()) {
            case WARMUP, REST, DAY_OFF -> false;
            case GRAMMAR -> a.sessionAnswered(t.key()) >= t.count()
                    || a.answeredSets(day, Skill.GRAMMAR_VOCABULARY, 1) >= t.count();
            case VOCAB -> a.sessionAnswered(t.key()) >= t.count()
                    || a.answeredSets(day, Skill.GRAMMAR_VOCABULARY, 2) >= t.count();
            case PART_PRACTICE, MONTHLY_FOCUS -> a.sessionAnswered(t.key()) >= t.count()
                    || a.answeredSets(day, t.skill(), t.part())
                    + a.monthlyFocus(day, monthlyFocusPage(t.skill(), t.part())) >= t.count();
            case REVIEW, PREDICTION_PRACTICE -> a.sessionAnswered(t.key()) >= t.count();
            case TIPS -> a.viewed(day, "study-tips");
            case SKILL_TEST -> a.skillTest(day, t.skill());
            case FULL_MOCK -> a.fullMock(day);
            case PREDICTION -> a.viewed(day, "exam-prediction") || a.viewed(day, "news-post");
            case FEEDBACK -> a.viewed(day, "attempt-result");
        };
    }

    /** Việc tính vào tiến độ (khởi động và nghỉ không chấm được ở server). */
    static boolean counted(Task t) {
        return t.type() != TaskType.WARMUP && t.type() != TaskType.REST && t.type() != TaskType.DAY_OFF;
    }

    // ------------------------------------------------------------------ tổng hợp

    /**
     * Tình hình lộ trình tại ngày {@code today}.
     *
     * @param freeDays số ngày đầu xem được khi chưa có Premium; null = không giới hạn.
     */
    public static Summary summarize(Input in, LocalDate today, Activity activity, Integer freeDays) {
        return summarize(in, today, activity, freeDays, null);
    }

    /**
     * @param lastTest ngày gần nhất (trước hôm nay) có nộp bài test kỹ năng hoặc đề thi thử;
     *                 null = chưa có. Quá {@link #TEST_REMINDER_DAYS} ngày thì thêm việc nhắc.
     */
    public static Summary summarize(Input in, LocalDate today, Activity activity, Integer freeDays, LocalDate lastTest) {
        List<PhaseSpan> spans = phases(in.start(), in.exam());
        List<Day> days = days(in);
        int total = days.size();
        int todayIndex = (int) ChronoUnit.DAYS.between(in.start(), today);
        Day todayPlan = todayIndex >= 0 && todayIndex < total ? days.get(todayIndex) : null;
        boolean locked = freeDays != null && todayIndex >= freeDays;

        int doneCount = 0;
        int totalCount = 0;
        int last7Done = 0;
        int last7Total = 0;
        LocalDate weekAgo = today.minusDays(6);
        for (Day d : days) {
            if (d.date().isAfter(today)) {
                break;
            }
            for (Task t : d.tasks()) {
                if (!counted(t)) {
                    continue;
                }
                boolean done = isDone(t, d.date(), activity);
                totalCount++;
                if (done) {
                    doneCount++;
                }
                if (!d.date().isBefore(weekAgo)) {
                    last7Total++;
                    if (done) {
                        last7Done++;
                    }
                }
            }
        }

        List<TaskStatus> todayTasks = new ArrayList<>();
        boolean dayOff = todayPlan != null && todayPlan.tasks().stream().anyMatch(t -> t.type() == TaskType.DAY_OFF);
        if (todayPlan != null && !locked) {
            for (Task t : todayPlan.tasks()) {
                todayTasks.add(new TaskStatus(t, isDone(t, today, activity), false));
            }
            // Việc hôm qua chưa làm dồn sang, tối đa hai việc luyện. Ngày nghỉ thì không dồn.
            if (todayIndex > 0 && !dayOff) {
                Day yesterday = days.get(todayIndex - 1);
                int carried = 0;
                for (Task t : yesterday.tasks()) {
                    boolean practice = t.type() == TaskType.PART_PRACTICE || t.type() == TaskType.MONTHLY_FOCUS
                            || t.type() == TaskType.SKILL_TEST;
                    if (carried >= 2 || !practice || isDone(t, yesterday.date(), activity)) {
                        continue;
                    }
                    Task moved = new Task("carry:" + t.key(), t.type(), t.skill(), t.part(), t.count(), t.minutes());
                    todayTasks.add(new TaskStatus(moved, isDone(moved, today, activity), true));
                    carried++;
                }
            }
        }

        // Lâu không có bài test: thêm bài test kỹ năng yếu nhất vào hôm nay (trừ ngày đã có
        // bài test/thi thử, ngày nghỉ).
        LocalDate ref = lastTest == null || lastTest.isBefore(in.start()) ? in.start() : lastTest;
        boolean overdue = todayPlan != null && ChronoUnit.DAYS.between(ref, today) >= TEST_REMINDER_DAYS
                && todayPlan.tasks().stream().noneMatch(t -> t.type() == TaskType.SKILL_TEST
                        || t.type() == TaskType.FULL_MOCK || t.type() == TaskType.REST || t.type() == TaskType.DAY_OFF);
        if (overdue && !locked) {
            Skill weak = weakest(gaps(in)).get(0);
            Task remind = new Task("remind:" + today + ":SKILL_TEST:" + weak, TaskType.SKILL_TEST, weak, null, 1, SKILL_TEST_MINUTES);
            todayTasks.add(new TaskStatus(remind, isDone(remind, today, activity), false));
        }

        List<DayStatus> week = new ArrayList<>();
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        for (int i = 0; i < 7; i++) {
            LocalDate date = monday.plusDays(i);
            int idx = (int) ChronoUnit.DAYS.between(in.start(), date);
            if (idx < 0 || idx >= total) {
                week.add(new DayStatus(date, null, 0, 0, false));
                continue;
            }
            Day d = days.get(idx);
            int n = 0;
            int done = 0;
            for (Task t : d.tasks()) {
                if (counted(t)) {
                    n++;
                    if (!date.isAfter(today) && isDone(t, date, activity)) {
                        done++;
                    }
                }
            }
            week.add(new DayStatus(date, d.phase(), n, done, freeDays != null && idx >= freeDays));
        }

        Phase phase = todayPlan != null ? todayPlan.phase()
                : todayIndex < 0 ? Phase.FOUNDATION : Phase.SPRINT;
        int daysLeft = (int) Math.max(0, ChronoUnit.DAYS.between(today, in.exam()));
        int progress = totalCount == 0 ? 0 : Math.round(doneCount * 100f / totalCount);
        return new Summary(spans, phase, todayIndex, total, daysLeft, progress, todayTasks, locked, week,
                new LinkedHashMap<>(gaps(in)), todayPlan, overdue, last7Done, last7Total);
    }
}
