package vn.weconex.aptis.billing.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateAccount;

/**
 * Mức hoa hồng / giảm giá riêng của từng người giới thiệu.
 *
 * <p>Đây là chỗ sai thì trả sai tiền cho người thật, nên khoá lại từng nhánh:
 * chưa cấu hình thì phải rơi về mức chung, đã cấu hình thì mức riêng phải thắng,
 * và 0% phải khác với "chưa đặt".
 */
class AffiliatePerAccountRateTest {

    private static final int MUC_CHUNG_HOA_HONG = 10;
    private static final int MUC_CHUNG_GIAM = 5;

    private static AffiliateAccount account(Integer hoaHong, Integer giam) {
        AffiliateAccount account = new AffiliateAccount();
        account.setCommissionPercent(hoaHong);
        account.setDiscountPercent(giam);
        return account;
    }

    @Test
    @DisplayName("Chưa đặt mức riêng thì theo tỉ lệ chung")
    void chuaDatThiTheoMucChung() {
        AffiliateAccount a = account(null, null);

        assertThat(a.effectiveCommissionPercent(MUC_CHUNG_HOA_HONG)).isEqualTo(10);
        assertThat(a.effectiveDiscountPercent(MUC_CHUNG_GIAM)).isEqualTo(5);
    }

    @Test
    @DisplayName("Đã đặt mức riêng thì mức riêng thắng")
    void mucRiengThangMucChung() {
        // Giáo viên được thoả thuận 25/15 thay vì 10/5 của chương trình chung.
        AffiliateAccount giaoVien = account(25, 15);

        assertThat(giaoVien.effectiveCommissionPercent(MUC_CHUNG_HOA_HONG)).isEqualTo(25);
        assertThat(giaoVien.effectiveDiscountPercent(MUC_CHUNG_GIAM)).isEqualTo(15);
    }

    @Test
    @DisplayName("Đặt riêng 0% khác với chưa đặt")
    void khongPhanTramKhacVoiChuaDat() {
        // Thoả thuận hợp lệ: chỉ cho học viên được giảm, người giới thiệu không
        // lấy hoa hồng. Nếu coi 0 như "chưa đặt" thì hệ thống sẽ trả nhầm 10%.
        AffiliateAccount chiGiamGia = account(0, 20);

        assertThat(chiGiamGia.effectiveCommissionPercent(MUC_CHUNG_HOA_HONG)).isZero();
        assertThat(chiGiamGia.effectiveDiscountPercent(MUC_CHUNG_GIAM)).isEqualTo(20);
    }

    @Test
    @DisplayName("Đặt riêng một bên, bên kia vẫn theo mức chung")
    void datMotBenThiBenKiaVanChung() {
        AffiliateAccount chiHoaHong = account(30, null);

        assertThat(chiHoaHong.effectiveCommissionPercent(MUC_CHUNG_HOA_HONG)).isEqualTo(30);
        assertThat(chiHoaHong.effectiveDiscountPercent(MUC_CHUNG_GIAM)).isEqualTo(5);
    }

    @Test
    @DisplayName("Đổi mức chung không ảnh hưởng người đã có mức riêng")
    void doiMucChungKhongDungToiMucRieng() {
        AffiliateAccount rieng = account(25, 15);
        AffiliateAccount theoChung = account(null, null);

        // Admin hạ mức chung từ 10 xuống 8.
        assertThat(rieng.effectiveCommissionPercent(8)).isEqualTo(25);
        assertThat(theoChung.effectiveCommissionPercent(8)).isEqualTo(8);
    }

    @Test
    @DisplayName("Tiền tính theo mức riêng của người giới thiệu")
    void tienTinhTheoMucRieng() {
        long giaGoc = 500_000L;
        AffiliateAccount giaoVien = account(25, 15);

        long giam = giaGoc * giaoVien.effectiveDiscountPercent(MUC_CHUNG_GIAM) / 100;
        long hoaHong = giaGoc * giaoVien.effectiveCommissionPercent(MUC_CHUNG_HOA_HONG) / 100;

        assertThat(giam).isEqualTo(75_000L);
        assertThat(hoaHong).isEqualTo(125_000L);
        // Thực thu 300k trên gói 500k — mức 25/15 là rất cao, ghi lại ở đây để
        // ai đặt con số kiểu này biết phần còn lại của nền tảng còn bao nhiêu.
        assertThat(giaGoc - giam - hoaHong).isEqualTo(300_000L);
    }
}
