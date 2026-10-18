package vn.weconex.aptis.common.security;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {
    private final ClientIpResolver resolver = new ClientIpResolver(List.of("172.18.0.0/16", "127.0.0.1/32"));
    @Test void publicPeerCannotSpoofHeaders() {
        var request = new MockHttpServletRequest(); request.setRemoteAddr("203.0.113.8");
        request.addHeader("X-Aptis-Client-IP", "203.0.113.9"); request.addHeader("CF-Connecting-IP", "203.0.113.10");
        request.addHeader("X-Forwarded-For", "203.0.113.11");
        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.8");
    }
    @Test void trustsOnlySanitizedProxyHeader() {
        var request = new MockHttpServletRequest(); request.setRemoteAddr("172.18.0.7");
        request.addHeader("X-Aptis-Client-IP", "2001:db8::42"); request.addHeader("X-Forwarded-For", "203.0.113.9");
        assertThat(resolver.resolve(request)).isEqualTo("2001:db8::42");
    }
    @Test void missingOrMalformedHeaderFallsBackToTheActualPeer() {
        var request = new MockHttpServletRequest(); request.setRemoteAddr("172.18.0.7");
        request.addHeader("X-Forwarded-For", "203.0.113.9");
        assertThat(resolver.resolve(request)).isEqualTo("172.18.0.7");
        request.addHeader("X-Aptis-Client-IP", "example.com");
        assertThat(resolver.resolve(request)).isEqualTo("172.18.0.7");
    }
}
