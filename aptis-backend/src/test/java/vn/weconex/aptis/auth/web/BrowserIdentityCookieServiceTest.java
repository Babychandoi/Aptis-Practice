package vn.weconex.aptis.auth.web;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import vn.weconex.aptis.auth.service.AbuseIdentityHasher;
import vn.weconex.aptis.common.config.AptisProperties;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BrowserIdentityCookieServiceTest {
    private BrowserIdentityCookieService service(boolean secure){
        var props=mock(AptisProperties.class);
        when(props.refreshCookie()).thenReturn(new AptisProperties.RefreshCookie("refresh",secure,"Lax",null));
        when(props.jwt()).thenReturn(new AptisProperties.Jwt("test-key-not-used-outside-tests-12345678901234567890","test",null,null));
        return new BrowserIdentityCookieService(props,new AbuseIdentityHasher(props,""));
    }
    @Test void createsSecureSignedHttpOnlyHostCookieAndOnlyReturnsHash(){
        var s=service(true);var response=new MockHttpServletResponse();
        String hash=s.resolveOrIssue(new MockHttpServletRequest(),response);
        String cookie=response.getHeader("Set-Cookie");
        assertThat(cookie).startsWith("__Host-aptis_bid=").contains("Path=/","Secure","HttpOnly","SameSite=Lax","Max-Age=31536000").doesNotContain("Domain=");
        assertThat(hash).matches("[a-f0-9]{64}");
        assertThat(cookie).doesNotContain(hash);
    }
    @Test void validCookieIsStableAcrossAccountSwitchesAndDoesNotGetReissued(){
        var s=service(true);var first=new MockHttpServletResponse();String hash=s.resolveOrIssue(new MockHttpServletRequest(),first);
        var request=new MockHttpServletRequest();request.setCookies(new Cookie("__Host-aptis_bid",value(first)));
        var response=new MockHttpServletResponse();
        assertThat(s.resolveOrIssue(request,response)).isEqualTo(hash);assertThat(response.getHeader("Set-Cookie")).isNull();
    }
    @Test void forgedSignatureAndClientDeviceIdAreNotTrusted(){
        var s=service(true);var first=new MockHttpServletResponse();String original=s.resolveOrIssue(new MockHttpServletRequest(),first);
        String cookie=value(first);cookie=cookie.substring(0,cookie.length()-1)+(cookie.endsWith("a")?"b":"a");
        var request=new MockHttpServletRequest();request.setCookies(new Cookie("__Host-aptis_bid",cookie));request.addHeader("deviceId",original);
        assertThat(s.resolveOrIssue(request,new MockHttpServletResponse())).isNotEqualTo(original);
    }
    @Test void duplicateCookiesAreRejectedAndLocalDevHasItsOwnCookieName(){
        var s=service(false);var first=new MockHttpServletResponse();String original=s.resolveOrIssue(new MockHttpServletRequest(),first);
        assertThat(first.getHeader("Set-Cookie")).startsWith("aptis_bid=").doesNotContain("Secure");
        var request=new MockHttpServletRequest();request.setCookies(new Cookie("aptis_bid",value(first)),new Cookie("aptis_bid",value(first)));
        assertThat(s.resolveOrIssue(request,new MockHttpServletResponse())).isNotEqualTo(original);
    }
    private String value(MockHttpServletResponse response){return response.getHeader("Set-Cookie").split(";",2)[0].split("=",2)[1];}
}
