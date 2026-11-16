package vn.weconex.aptis.content.service;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.content.web.DailyWarmUpDtos.MarathonQuestion;

import static org.assertj.core.api.Assertions.assertThat;

class DailyWarmUpServiceTest {

    private static MarathonQuestion q(String id, String group) {
        return new MarathonQuestion(id, group, "Q " + id, null, List.of(), List.of(), List.of("s"), List.of(), List.of());
    }

    @Test
    void lichXenKeGoVaSpeakingNhuWebsite() {
        // 11/11 là ngày 0: Speaking Part 1; 12/11 gõ; 13/11 Speaking Part 2 …
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 11))).isEqualTo(1);
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 12))).isNull();
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 13))).isEqualTo(2);
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 16))).isNull();
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 17))).isEqualTo(4);
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 19))).isEqualTo(1);
        // Trước mốc vẫn tính được, không ra Part âm.
        assertThat(DailyWarmUpService.speakingPartOf(LocalDate.of(2026, 11, 9))).isEqualTo(4);
    }

    @Test
    void part1LayBaCauLienNhau() {
        List<MarathonQuestion> all = List.of(q("a", null), q("b", null), q("c", null), q("d", null), q("e", null));
        LocalDate day = LocalDate.of(2026, 11, 11); // epochDay 20768 → 20768 % 3 = 2
        assertThat(DailyWarmUpService.pickMarathon(all, 1, day)).extracting(MarathonQuestion::id)
                .containsExactly("c", "d", "e");
    }

    @Test
    void partKhacLayMotNhom() {
        List<MarathonQuestion> all = List.of(q("a1", "A"), q("a2", "A"), q("b1", "B"), q("b2", "B"), q("b3", "B"));
        LocalDate day = LocalDate.of(2026, 11, 13); // epochDay 20770 chẵn → nhóm A
        assertThat(DailyWarmUpService.pickMarathon(all, 2, day)).extracting(MarathonQuestion::id)
                .containsExactly("a1", "a2");
        assertThat(DailyWarmUpService.pickMarathon(all, 2, day.plusDays(1))).extracting(MarathonQuestion::id)
                .containsExactly("b1", "b2", "b3");
        assertThat(DailyWarmUpService.pickMarathon(List.of(), 2, day)).isEmpty();
    }
}
