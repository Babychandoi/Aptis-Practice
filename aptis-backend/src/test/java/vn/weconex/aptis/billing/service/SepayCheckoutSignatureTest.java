package vn.weconex.aptis.billing.service;

import java.util.LinkedHashMap;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SepayCheckoutSignatureTest {
    @Test void matchesOfficialSdkOrderedHmacBase64Fixture() {
        var fields=new LinkedHashMap<String,String>();
        fields.put("merchant","SP-TEST-FIXTURE");fields.put("operation","PURCHASE");fields.put("payment_method","BANK_TRANSFER");
        fields.put("order_invoice_number","APTISSB00000000000000000000000000000000");fields.put("order_amount","10000");fields.put("currency","VND");
        assertThat(SepayCheckoutSignature.sign(fields,"spsk_test_fixture_not_a_real_key"))
                .isEqualTo("iF96we/oRoosisVlyn1EeipaYqzl52CgEHmrx7jP3FM=");
    }
    @Test void testCredentialsCannotEnableProductionAndShortKeyFailsClosed() {
        var client=new SepayGatewayClient(new com.fasterxml.jackson.databind.ObjectMapper(),true,"production","SP-TEST-FIXTURE","spsk_test_fixture_not_a_real_key","");
        assertThat(client.configured()).isFalse();
        assertThatThrownBy(client::requireReady).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        var live=new SepayGatewayClient(new com.fasterxml.jackson.databind.ObjectMapper(),true,"production","SP-LIVE-FIXTURE","spsk_live_short","");
        assertThat(live.configured()).isFalse();
    }
    @Test void liveIpnKeyMustMatchServerConfiguration() {
        var client=new SepayGatewayClient(new com.fasterxml.jackson.databind.ObjectMapper(),true,"production","SP-LIVE-FIXTURE","spsk_live_test_fixture_not_a_real_key","");
        assertThat(client.configured()).isTrue();
        assertThatCode(()->client.authenticate("spsk_live_test_fixture_not_a_real_key")).doesNotThrowAnyException();
        assertThatThrownBy(()->client.authenticate("wrong-key")).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
    }
}
