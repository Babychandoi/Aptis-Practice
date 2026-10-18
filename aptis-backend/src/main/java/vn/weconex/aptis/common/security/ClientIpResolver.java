package vn.weconex.aptis.common.security;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.entitlement.service.TrialIpFingerprint;

/** Only the internal reverse proxy may supply an authoritative client IP. */
@Component
public class ClientIpResolver {
    private final List<IpAddressMatcher> trustedProxies;

    public ClientIpResolver(@Value("${aptis.security.trusted-proxy-cidrs:127.0.0.1/32,::1/128}") List<String> cidrs) {
        trustedProxies = cidrs.stream().filter(s -> !s.isBlank()).map(String::strip).map(IpAddressMatcher::new).toList();
    }

    public String resolve(HttpServletRequest request) {
        String peer = request.getRemoteAddr();
        if (peer != null && trustedProxies.stream().anyMatch(proxy -> proxy.matches(peer))) {
            // Nginx overwrites this header. Never trust CF/XFF straight from a browser.
            String client = request.getHeader("X-Aptis-Client-IP");
            if (TrialIpFingerprint.address(client).isPresent()) return client;
        }
        return peer;
    }
}
