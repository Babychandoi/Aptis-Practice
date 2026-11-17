package vn.weconex.aptis.studyplan;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.studyplan.StudyPlanner.Activity;
import vn.weconex.aptis.studyplan.StudyPlanner.Day;
import vn.weconex.aptis.studyplan.StudyPlanner.Phase;
import vn.weconex.aptis.studyplan.StudyPlanner.Skill;
import vn.weconex.aptis.studyplan.StudyPlanner.TaskType;

import static org.assertj.core.api.Assertions.assertThat;

class StudyPlannerTest {

    private static final LocalDate START = LocalDate.of(2026, 11, 17);

    private static Map<Skill, Double> scores(double gv, double l, double r, double s, double w) {
        Map<Skill, Double> m = new EnumMap<>(Skill.class);
        m.put(Skill.GRAMMAR_VOCABULARY, gv);
        m.put(Skill.LISTENING, l);
        m.put(Skill.READING, r);
        m.put(Skill.SPEAKING, s);
        m.put(Skill.WRITING, w);
        return m;
    }

    private static final Activity NOTHING = new Activity() {
        public int answeredSets(LocalDate d, Skill s, int p) { return 0; }
        public int monthlyFocus(LocalDate d, String k) { return 0; }
        public boolean skillTest(LocalDate d, Skill s) { return false; }
        public boolean fullMock(LocalDate d) { return false; }
        public boolean viewed(LocalDate d, String k) { return false; }
    };

    @Test
    void chiaBaChangTheoSoNgay() {
        var spans = StudyPlanner.phases(START, START.plusDays(56));
        assertThat(spans).extracting(StudyPlanner.PhaseSpan::phase)
                .containsExactly(Phase.FOUNDATION, Phase.ACCELERATE, Phase.SPRINT);
        assertThat(spans.stream().mapToInt(StudyPlanner.PhaseSpan::days).sum()).isEqualTo(56);
        assertThat(spans.get(2).days()).isBetween(5, 10);
        assertThat(spans.get(2).to()).isEqualTo(START.plusDays(55));
        // Dưới 3 tuần: bỏ chặng nền tảng.
        assertThat(StudyPlanner.phases(START, START.plusDays(14))).extracting(StudyPlanner.PhaseSpan::phase)
                .containsExactly(Phase.ACCELERATE, Phase.SPRINT);
        // Dưới 1 tuần: chỉ còn nước rút.
        assertThat(StudyPlanner.phases(START, START.plusDays(4))).extracting(StudyPlanner.PhaseSpan::phase)
                .containsExactly(Phase.SPRINT);
    }

    @Test
    void kyNangThieuNhieuDiemDuocXepNhieuThoiGianHon() {
        // Mục tiêu B2 (38): Writing thiếu 18, Reading đã đạt.
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(36, 32, 40, 30, 20));
        Map<Skill, Integer> minutes = new EnumMap<>(Skill.class);
        for (Day d : StudyPlanner.days(in)) {
            for (var t : d.tasks()) {
                if ((t.type() == TaskType.PART_PRACTICE || t.type() == TaskType.MONTHLY_FOCUS) && t.skill() != null) {
                    minutes.merge(t.skill(), t.minutes(), Integer::sum);
                }
            }
        }
        assertThat(minutes.get(Skill.WRITING)).isGreaterThan(minutes.get(Skill.SPEAKING));
        assertThat(minutes.get(Skill.SPEAKING)).isGreaterThan(minutes.get(Skill.READING));
        // Kỹ năng đã đạt vẫn được giữ một ít.
        assertThat(minutes.get(Skill.READING)).isPositive();
    }

    @Test
    void ngayNaoCungCoKhoiDongVaDuNoiDungTheoChang() {
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30));
        List<Day> days = StudyPlanner.days(in);
        assertThat(days).hasSize(56);
        assertThat(days).allSatisfy(d -> assertThat(d.tasks().get(0).type()).isEqualTo(TaskType.WARMUP));
        assertThat(days.get(0).tasks()).extracting(StudyPlanner.Task::type).contains(TaskType.TIPS, TaskType.PART_PRACTICE, TaskType.GRAMMAR);
        assertThat(days.stream().filter(d -> d.phase() == Phase.ACCELERATE).flatMap(d -> d.tasks().stream()))
                .extracting(StudyPlanner.Task::type).contains(TaskType.MONTHLY_FOCUS, TaskType.SKILL_TEST, TaskType.FULL_MOCK);
        assertThat(days.stream().filter(d -> d.phase() == Phase.SPRINT).limit(days.stream().filter(d -> d.phase() == Phase.SPRINT).count() - 1))
                .allSatisfy(d -> assertThat(d.tasks()).extracting(StudyPlanner.Task::type).contains(TaskType.PREDICTION_PRACTICE));
        // Ngữ pháp và từ vựng xen kẽ.
        assertThat(days.get(1).tasks()).extracting(StudyPlanner.Task::type).contains(TaskType.VOCAB);
        // Hôm trước ngày thi chỉ ôn nhẹ.
        assertThat(days.get(55).tasks()).extracting(StudyPlanner.Task::type).contains(TaskType.REST).doesNotContain(TaskType.FULL_MOCK);
    }

    @Test
    void danhDauXongVaDonViecHomQua() {
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 20));
        LocalDate today = START.plusDays(1);
        var day0 = StudyPlanner.days(in).get(0);
        var practice = day0.tasks().stream().filter(t -> t.type() == TaskType.PART_PRACTICE).findFirst().orElseThrow();
        Activity didGrammarToday = new Activity() {
            public int answeredSets(LocalDate d, Skill s, int p) { return d.equals(today) && s == Skill.GRAMMAR_VOCABULARY ? 12 : 0; }
            public int sessionAnswered(String k) { return 0; }
            public int monthlyFocus(LocalDate d, String k) { return 0; }
            public boolean skillTest(LocalDate d, Skill s) { return false; }
            public boolean fullMock(LocalDate d) { return false; }
            public boolean viewed(LocalDate d, String k) { return false; }
        };
        var sum = StudyPlanner.summarize(in, today, didGrammarToday, null);
        assertThat(sum.today()).anySatisfy(t -> {
            assertThat(t.task().type()).isIn(TaskType.GRAMMAR, TaskType.VOCAB);
            assertThat(t.done()).isTrue();
        });
        // Việc luyện hôm qua chưa làm được dồn sang hôm nay.
        assertThat(sum.today()).anySatisfy(t -> {
            assertThat(t.carried()).isTrue();
            assertThat(t.task().skill()).isEqualTo(practice.skill());
        });
        assertThat(sum.progressPercent()).isBetween(1, 99);
        assertThat(sum.week()).hasSize(7);
    }

    @Test
    void taiKhoanMienPhiChiXemTuanDau() {
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30));
        assertThat(StudyPlanner.summarize(in, START.plusDays(6), NOTHING, 7).todayLocked()).isFalse();
        var locked = StudyPlanner.summarize(in, START.plusDays(7), NOTHING, 7);
        assertThat(locked.todayLocked()).isTrue();
        assertThat(locked.today()).isEmpty();
    }

    @Test
    void uuTienPartDiemThapNhungKhongLapMai() {
        var empty = new java.util.ArrayDeque<Integer>();
        // Chưa có dữ liệu: đúng vòng xoay mặc định.
        assertThat(StudyPlanner.choosePart(Skill.LISTENING, Map.of(), empty)).isEqualTo(2);
        // Part 4 đúng ít nhất thì luyện Part 4 trước.
        Map<Integer, Double> acc = Map.of(1, 0.9, 2, 0.8, 3, 0.7, 4, 0.3);
        assertThat(StudyPlanner.choosePart(Skill.LISTENING, acc, empty)).isEqualTo(4);
        // Vừa luyện Part 4 hai lần thì nhường Part khác.
        var recent = new java.util.ArrayDeque<>(List.of(4, 4));
        assertThat(StudyPlanner.choosePart(Skill.LISTENING, acc, recent)).isEqualTo(3);

        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30),
                Map.of(Skill.READING, Map.of(1, 0.95, 2, 0.9, 3, 0.85, 4, 0.2)), Map.of());
        long readingPart4 = StudyPlanner.days(in).stream().flatMap(d -> d.tasks().stream())
                .filter(t -> t.skill() == Skill.READING && t.type() == TaskType.PART_PRACTICE && t.part() == 4).count();
        long readingPart1 = StudyPlanner.days(in).stream().flatMap(d -> d.tasks().stream())
                .filter(t -> t.skill() == Skill.READING && t.type() == TaskType.PART_PRACTICE && t.part() == 1).count();
        assertThat(readingPart4).isGreaterThan(readingPart1);
    }

    @Test
    void ngayDaChotGiuNguyenKhiDiemDoi() {
        var before = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 20));
        List<Day> plan = StudyPlanner.days(before);
        Map<LocalDate, List<StudyPlanner.Task>> frozen = Map.of(
                plan.get(0).date(), plan.get(0).tasks(), plan.get(1).date(), plan.get(1).tasks());
        // Writing tăng vọt, Reading tụt: lộ trình đổi, nhưng hai ngày đã chốt giữ nguyên.
        var after = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 10, 30, 40), Map.of(), frozen);
        List<Day> replanned = StudyPlanner.days(after);
        assertThat(replanned.get(0).tasks()).isEqualTo(plan.get(0).tasks());
        assertThat(replanned.get(1).tasks()).isEqualTo(plan.get(1).tasks());
        assertThat(replanned.subList(2, 20)).isNotEqualTo(plan.subList(2, 20));
        assertThat(replanned.stream().skip(2).flatMap(d -> d.tasks().stream()).filter(t -> t.skill() == Skill.READING).count())
                .isGreaterThan(plan.stream().skip(2).flatMap(d -> d.tasks().stream()).filter(t -> t.skill() == Skill.READING).count());
    }

    @Test
    void nhacLamBaiTestKhiQua14Ngay() {
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 20));
        LocalDate day15 = START.plusDays(15);
        // Chọn ngày thường (không có sẵn bài test).
        LocalDate normal = StudyPlanner.days(in).stream().map(Day::date)
                .filter(d -> !d.isBefore(day15))
                .filter(d -> StudyPlanner.days(in).get((int) java.time.temporal.ChronoUnit.DAYS.between(START, d)).tasks().stream()
                        .noneMatch(t -> t.type() == TaskType.SKILL_TEST || t.type() == TaskType.FULL_MOCK))
                .findFirst().orElseThrow();
        var overdue = StudyPlanner.summarize(in, normal, NOTHING, null, null);
        assertThat(overdue.testOverdue()).isTrue();
        assertThat(overdue.today()).anySatisfy(t -> {
            assertThat(t.task().type()).isEqualTo(TaskType.SKILL_TEST);
            assertThat(t.task().skill()).isEqualTo(Skill.WRITING);
        });
        // Vừa làm bài test hôm qua thì không nhắc.
        assertThat(StudyPlanner.summarize(in, normal, NOTHING, null, normal.minusDays(1)).testOverdue()).isFalse();
        // Mới bắt đầu lộ trình cũng không nhắc.
        assertThat(StudyPlanner.summarize(in, START.plusDays(3), NOTHING, null, null).testOverdue()).isFalse();
    }

    @Test
    void ngayNghiKhongCoViecVaKhongDonViec() {
        // START là thứ Ba (17/11/2026); nghỉ Chủ nhật.
        var in = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30),
                Map.of(), Map.of(), java.util.Set.of(7), 0);
        List<Day> days = StudyPlanner.days(in);
        Day sunday = days.stream().filter(d -> d.date().getDayOfWeek() == java.time.DayOfWeek.SUNDAY).findFirst().orElseThrow();
        assertThat(sunday.tasks()).extracting(StudyPlanner.Task::type).containsExactly(TaskType.DAY_OFF);
        var sum = StudyPlanner.summarize(in, sunday.date(), NOTHING, null);
        assertThat(sum.today()).noneMatch(StudyPlanner.TaskStatus::carried);
        // Ngày nghỉ không tính vào việc phải làm.
        assertThat(sum.week().stream().filter(w -> w.date().equals(sunday.date())).findFirst().orElseThrow().total()).isZero();
    }

    @Test
    void onCauSaiKhiCoDuDeSai() {
        var none = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30), Map.of(), Map.of(), java.util.Set.of(), 0);
        var some = new StudyPlanner.Input(START, START.plusDays(56), 60, 38, scores(30, 30, 30, 30, 30), Map.of(), Map.of(), java.util.Set.of(), 12);
        assertThat(StudyPlanner.days(none).stream().flatMap(d -> d.tasks().stream())).noneMatch(t -> t.type() == TaskType.REVIEW);
        var reviews = StudyPlanner.days(some).stream().flatMap(d -> d.tasks().stream()).filter(t -> t.type() == TaskType.REVIEW).toList();
        assertThat(reviews).isNotEmpty();
        assertThat(reviews).allSatisfy(t -> assertThat(t.count()).isEqualTo(5));
    }

    @Test
    void phienLuyenUuTienDeDuDoanRoiDeSai() {
        java.time.Instant now = java.time.Instant.parse("2026-11-17T10:00:00Z");
        List<String> all = List.of("a", "b", "c", "d", "e", "f", "g", "h");
        Map<String, StudySessionPicker.Last> history = Map.of(
                "b", new StudySessionPicker.Last(0.2, now.minusSeconds(86400 * 10)),   // sai lâu rồi
                "c", new StudySessionPicker.Last(1.0, now.minusSeconds(3600)),          // vừa làm đúng → gác lại
                "d", new StudySessionPicker.Last(0.9, now.minusSeconds(86400 * 10)));   // làm đúng lâu rồi
        // Nền tảng: 20% đề dự đoán (1/5), sau đó đề sai, rồi đề mới.
        var foundation = StudySessionPicker.compose(5, Phase.FOUNDATION, false, List.of("h", "c"), List.of(), all, history, now);
        assertThat(foundation).containsExactly("h", "b", "a", "e", "f");
        // Nước rút: toàn bộ đề dự đoán trước (bỏ đề vừa làm đúng).
        var sprint = StudySessionPicker.compose(3, Phase.SPRINT, false, List.of("h", "c", "g"), List.of(), all, history, now);
        assertThat(sprint).startsWith("h", "g");
        // Việc "Đề trọng điểm": đề trọng điểm đứng trước đề sai/đề mới.
        var focus = StudySessionPicker.compose(3, Phase.ACCELERATE, true, List.of(), List.of("f", "g"), all, history, now);
        assertThat(focus).startsWith("f", "g");
        // Thiếu đề thì dùng cả đề vừa làm đúng.
        assertThat(StudySessionPicker.compose(8, Phase.FOUNDATION, false, List.of(), List.of(), all, history, now)).hasSize(8);
    }

    @Test
    void uocLuongKhaNangDatMucTieu() {
        assertThat(StudyPlanService.likelihood(0, 30, 0, 0, 1)).isEqualTo("NEW");
        assertThat(StudyPlanService.likelihood(30, 20, 0, 5, 2)).isEqualTo("NEW");
        assertThat(StudyPlanService.likelihood(0, 30, 0, 0, 5)).isEqualTo("HIGH");
        assertThat(StudyPlanService.likelihood(10, 40, 20, 21, 10)).isEqualTo("HIGH");
        assertThat(StudyPlanService.likelihood(20, 30, 20, 21, 10)).isEqualTo("MEDIUM");
        assertThat(StudyPlanService.likelihood(30, 20, 3, 21, 10)).isEqualTo("LOW");
    }

    @Test
    void trangDeTrongDiemTheoPartKho() {
        assertThat(StudyPlanner.monthlyFocusPage(Skill.READING, 2)).isEqualTo("reading-2-3");
        assertThat(StudyPlanner.monthlyFocusPage(Skill.READING, 4)).isEqualTo("reading-5");
        assertThat(StudyPlanner.monthlyFocusPage(Skill.LISTENING, 3)).isEqualTo("listening-3");
    }
}
