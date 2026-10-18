package vn.weconex.aptis.entitlement.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;

class TrialIpFingerprintTest {
    @Test void canonicalizesMappedIpv4AndHashesWithoutStoringTheIp() {
        String hash = TrialIpFingerprint.of("203.0.113.42").orElseThrow();
        assertThat(hash).hasSize(64).doesNotContain("203.0.113");
        assertThat(TrialIpFingerprint.of("::ffff:203.0.113.42")).contains(hash);
        assertThat(TrialIpFingerprint.of("203.0.113.43")).isNotEqualTo(java.util.Optional.of(hash));
    }
    @Test void ipv6PrivacyAddressesInOne64BitNetworkShareOneQuota() {
        var first = TrialIpFingerprint.of("2001:db8:1234:abcd:1111::1");
        assertThat(first).isEqualTo(TrialIpFingerprint.of("2001:0DB8:1234:ABCD:ffff:eeee:dddd:cccc"));
        assertThat(first).isNotEqualTo(TrialIpFingerprint.of("2001:db8:1234:abce::1"));
    }
    @ParameterizedTest @NullAndEmptySource
    @ValueSource(strings = {"localhost", "example.com", "1.2.3", "1.2.3.999", "01.2.3.4", "1.2.3.4, 5.6.7.8", " 1.2.3.4", "[2001:db8::1]", "fe80::1%eth0",
        "127.0.0.1", "::1", "0.0.0.0", "::", "172.18.0.1", "192.168.0.1", "10.0.0.1", "169.254.1.2", "fd00::1", "fe80::1", "224.1.2.3", "255.255.255.255", "100.64.0.1"})
    void rejectsHostnamesMalformedAndInternalIps(String ip) { assertThat(TrialIpFingerprint.of(ip)).isEmpty(); }
}
