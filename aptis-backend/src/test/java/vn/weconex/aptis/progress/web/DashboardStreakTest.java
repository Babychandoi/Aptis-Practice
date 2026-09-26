package vn.weconex.aptis.progress.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DashboardStreakTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    @Test
    void demNgayLienTiepToiHomNay() {
        assertThat(DashboardController.streakOf(Map.of(TODAY, 60L, TODAY.minusDays(1), 60L, TODAY.minusDays(2), 60L), TODAY)).isEqualTo(3);
    }

    @Test
    void homNayChuaHocVanGiuChuoiToiHomQua() {
        assertThat(DashboardController.streakOf(Map.of(TODAY.minusDays(1), 60L, TODAY.minusDays(2), 60L), TODAY)).isEqualTo(2);
    }

    @Test
    void dutMotNgayLaChuoiDungLai() {
        assertThat(DashboardController.streakOf(Map.of(TODAY, 60L, TODAY.minusDays(2), 60L), TODAY)).isEqualTo(1);
    }

    @Test
    void chuaHocGiLaKhong() {
        assertThat(DashboardController.streakOf(Map.of(), TODAY)).isZero();
    }
}
