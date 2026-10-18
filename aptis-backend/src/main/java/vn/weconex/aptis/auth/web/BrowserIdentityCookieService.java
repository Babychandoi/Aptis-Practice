package vn.weconex.aptis.auth.web;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.auth.service.AbuseIdentityHasher;
import vn.weconex.aptis.common.config.AptisProperties;

/** Signed browser ID independent of login/logout and client-supplied deviceId. */
@Component @RequiredArgsConstructor
public class BrowserIdentityCookieService {
    private final AptisProperties properties;
    private final AbuseIdentityHasher hasher;
    private final SecureRandom random=new SecureRandom();
    public String resolveOrIssue(HttpServletRequest request,HttpServletResponse response){
        String value=null;int matches=0;
        if(request.getCookies()!=null)for(var cookie:request.getCookies())if(name().equals(cookie.getName())){value=cookie.getValue();matches++;}
        if(matches==1&&value!=null&&value.matches("[A-Za-z0-9_-]{43}\\.[a-f0-9]{64}")){
            String nonce=value.substring(0,43),signature=value.substring(44);
            if(MessageDigest.isEqual(signature.getBytes(StandardCharsets.US_ASCII),hasher.signCookie(nonce).getBytes(StandardCharsets.US_ASCII)))return hasher.browserHash(nonce);
        }
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        String nonce=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(name(),nonce+"."+hasher.signCookie(nonce))
                .httpOnly(true).secure(properties.refreshCookie().secure()).sameSite("Lax").path("/").maxAge(Duration.ofDays(365)).build().toString());
        return hasher.browserHash(nonce);
    }
    private String name(){return properties.refreshCookie().secure()?"__Host-aptis_bid":"aptis_bid";}
}
