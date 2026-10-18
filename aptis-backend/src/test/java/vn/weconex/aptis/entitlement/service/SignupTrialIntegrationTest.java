package vn.weconex.aptis.entitlement.service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.User.SignupTrialStatus;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.auth.service.AuthMailSender;
import vn.weconex.aptis.auth.service.AuthService;
import vn.weconex.aptis.auth.service.GoogleTokenVerifier;
import vn.weconex.aptis.auth.web.AuthDtos;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.platform.notification.NotificationSender;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real MySQL/Flyway/JPA/transaction races, no production DB or real email. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"aptis.scheduler.lock.enabled=true", "aptis.entitlement.signup-trial-days=1"})
@AutoConfigureMockMvc
class SignupTrialIntegrationTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("aptis").withUsername("aptis").withPassword("aptis").withUrlParam("serverTimezone", "UTC");
    @Container static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7");
    @Container static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", MYSQL::getJdbcUrl); r.add("spring.datasource.username", MYSQL::getUsername);
        r.add("spring.datasource.password", MYSQL::getPassword); r.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
        r.add("spring.data.redis.host", REDIS::getHost); r.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
    @MockBean MinioStorageClient minio;
    @MockBean AuthMailSender mail;
    @MockBean NotificationSender notifications;
    @MockBean GoogleTokenVerifier google;
    @Autowired AuthService auth;
    @Autowired EntitlementService access;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired MockMvc mvc;
    @Autowired vn.weconex.aptis.auth.service.AbuseIdentityHasher hasher;
    @Autowired vn.weconex.aptis.auth.service.RegistrationRateLimiter limiter;
    @Autowired vn.weconex.aptis.auth.service.AdminAbuseService adminAbuse;
    @Autowired org.springframework.data.redis.core.StringRedisTemplate redis;
    private static final String PASSWORD = "test-password-123";

    private User student() { return student(SignupTrialStatus.PENDING); }
    private User student(SignupTrialStatus trialStatus) {
        return new TransactionTemplate(transactionManager).execute(ignored -> {
            User user = User.register(UUID.randomUUID() + "@test.local", encoder.encode(PASSWORD));
            user.markEmailVerified(); user.setSignupTrialStatus(trialStatus);
            user.getRoles().add(roles.findByCode(Role.STUDENT).orElseThrow());
            return users.saveAndFlush(user);
        });
    }
    private AuthDtos.TokenResponse login(User u, String browser) { return login(u,browser,"203.0.113.10"); }
    private AuthDtos.TokenResponse login(User u,String browser,String ip) { return auth.login(new AuthDtos.LoginRequest(u.getEmail(), PASSWORD, "untrusted-deviceId"),"test-browser",ip,browser==null?null:hasher.browserHash(browser)); }
    private SignupTrialStatus state(User u) { return users.findById(u.getId()).orElseThrow().getSignupTrialStatus(); }
    private int claimsFor(User u) { return jdbc.queryForObject("SELECT COUNT(*) FROM signup_trial_browser_claims WHERE user_id=?", Integer.class, u.getId()); }

    @Test void oneBrowserGetsOneTrialAndChangingNetworksDoesNotResetTheDecision() throws Exception {
        User first = student(), second = student();
        login(first, "203.0.113.10");
        Instant end = access.signupTrialEndsAt(first.getId()).orElseThrow();
        var token = login(second, "203.0.113.10");
        assertThat(state(first)).isEqualTo(SignupTrialStatus.GRANTED);
        assertThat(state(second)).isEqualTo(SignupTrialStatus.BROWSER_USED);
        assertThat(access.hasPremiumAccess(first.getId())).isTrue();
        assertThat(access.hasPremiumAccess(second.getId())).isFalse();
        assertThat(access.signupTrialEndsAt(second.getId())).isEmpty();
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token.accessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("premiumActive").value(false))
                .andExpect(jsonPath("premiumFromTrial").value(false)).andExpect(jsonPath("signupTrialStatus").value("BROWSER_USED"));
        login(first, "203.0.113.10","198.51.100.10"); login(second, "another-cookie","198.51.100.11");
        assertThat(state(second)).isEqualTo(SignupTrialStatus.BROWSER_USED);
        assertThat(claimsFor(first)).isEqualTo(1);
        assertThat(access.signupTrialEndsAt(first.getId())).contains(end);
    }
    @Test void unrelatedBrowsersOnTheSameWifiStillGetIndependentTrials() {
        User first = student(), second = student(), third = student();
        login(first,"cookie-a","2001:db8:abcd:1000::1"); login(second,"cookie-b","2001:db8:abcd:1000::1"); login(third,"cookie-a","203.0.113.40");
        assertThat(state(second)).isEqualTo(SignupTrialStatus.GRANTED);
        assertThat(state(third)).isEqualTo(SignupTrialStatus.BROWSER_USED);
    }
    @Test void simultaneousAccountsCannotBothClaimTheSameBrowser() throws Exception {
        User first = student(), second = student(); CountDownLatch start = new CountDownLatch(1);
        var a = CompletableFuture.runAsync(() -> { await(start); login(first, "203.0.113.20"); });
        var b = CompletableFuture.runAsync(() -> { await(start); login(second, "203.0.113.20"); });
        start.countDown(); CompletableFuture.allOf(a,b).get(30, java.util.concurrent.TimeUnit.SECONDS);
        assertThat(java.util.List.of(state(first),state(second))).containsExactlyInAnyOrder(SignupTrialStatus.GRANTED, SignupTrialStatus.BROWSER_USED);
        assertThat(claimsFor(first)+claimsFor(second)).isEqualTo(1);
    }
    @Test void simultaneousLoginsOfOneAccountDoNotClaimTwoBrowsers() throws Exception {
        User first = student(); CountDownLatch start = new CountDownLatch(1);
        var a = CompletableFuture.runAsync(() -> { await(start); login(first, "203.0.113.21"); });
        var b = CompletableFuture.runAsync(() -> { await(start); login(first, "203.0.113.22"); });
        start.countDown(); CompletableFuture.allOf(a,b).get(30, java.util.concurrent.TimeUnit.SECONDS);
        assertThat(state(first)).isEqualTo(SignupTrialStatus.GRANTED);
        assertThat(claimsFor(first)).isEqualTo(1);
    }
    @Test void missingBrowserDoesNotConsumeAGlobalQuotaAndCanBeRetried() {
        User first = student(), second = student();
        login(first, null); login(second, null);
        assertThat(state(first)).isEqualTo(SignupTrialStatus.BROWSER_UNAVAILABLE);
        assertThat(claimsFor(first)+claimsFor(second)).isZero();
        assertThat(access.hasPremiumAccess(first.getId())).isFalse();
        login(first, "203.0.113.30"); login(second, "203.0.113.30");
        assertThat(state(first)).isEqualTo(SignupTrialStatus.GRANTED);
        assertThat(state(second)).isEqualTo(SignupTrialStatus.BROWSER_USED);
    }
    @Test void paidPremiumAndAiVoiceStayIndependentFromTheBrowserRestriction() {
        User first = student(), second = student(); login(first, "203.0.113.40"); login(second, "203.0.113.40");
        assertThat(access.hasAiConversationAccess(first.getId())).isFalse();
        access.grant(UserEntitlement.grant(second.getId(), UserEntitlement.PREMIUM_CONTENT_ACCESS, EntitlementSourceType.ADMIN_GRANT,
                null, Instant.now(), Instant.now().plus(Duration.ofDays(30))));
        access.grant(UserEntitlement.grant(second.getId(), UserEntitlement.AI_CONVERSATION_ACCESS, EntitlementSourceType.ADMIN_GRANT,
                null, Instant.now(), Instant.now().plus(Duration.ofDays(7))));
        assertThat(state(second)).isEqualTo(SignupTrialStatus.BROWSER_USED);
        assertThat(access.hasPremiumAccess(second.getId())).isTrue();
        assertThat(access.hasAiConversationAccess(second.getId())).isTrue();
        assertThat(access.withinSignupTrial(second.getId())).isFalse();
    }
    @Test void existingTrialsKeepTheirOriginalExpiryButReserveTheBrowserForFutureSignups() {
        User first = student(SignupTrialStatus.LEGACY), old = student(SignupTrialStatus.LEGACY), fresh = student();
        Instant end = access.signupTrialEndsAt(old.getId()).orElseThrow();
        login(first,"203.0.113.50"); login(old,"203.0.113.50"); login(fresh,"203.0.113.50");
        assertThat(access.hasPremiumAccess(old.getId())).isTrue(); assertThat(access.signupTrialEndsAt(old.getId())).contains(end);
        assertThat(state(fresh)).isEqualTo(SignupTrialStatus.BROWSER_USED);
    }
    @Test void googleSignupsUseTheSameQuotaAsPasswordAccounts() {
        User first = student(); login(first,"203.0.113.60");
        String email = UUID.randomUUID()+"@test.local";
        when(google.verify("mock-google-id-token")).thenReturn(new GoogleTokenVerifier.GoogleUser(UUID.randomUUID().toString(),email,"Test"));
        auth.loginWithGoogle("mock-google-id-token",null,"test-browser","203.0.113.60",hasher.browserHash("203.0.113.60"));
        User created = users.findByEmail(email).orElseThrow();
        assertThat(state(created)).isEqualTo(SignupTrialStatus.BROWSER_USED); assertThat(access.hasPremiumAccess(created.getId())).isFalse();
    }
    @Test void unverifiedRegistrationDoesNotReserveABrowser() {
        String email = UUID.randomUUID()+"@test.local";
        auth.register(new AuthDtos.RegisterRequest(email,PASSWORD,"Test"),hasher.browserHash("203.0.113.70"),"203.0.113.70");
        User registered = users.findByEmail(email).orElseThrow();
        assertThat(state(registered)).isEqualTo(SignupTrialStatus.PENDING); assertThat(claimsFor(registered)).isZero();
        assertThatThrownBy(() -> login(registered,"203.0.113.70")).hasMessageContaining("chưa được xác thực");
        var verification = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(mail).sendVerificationEmail(eq(email),verification.capture()); auth.verifyEmail(verification.getValue());
        login(registered,"203.0.113.70"); assertThat(state(registered)).isEqualTo(SignupTrialStatus.GRANTED);
    }
    @Test void registrationLimitHasCooldownAndDoesNotBlockExistingLogins() {
        String browser=hasher.browserHash("rate-test-browser");
        for(int i=0;i<3;i++) auth.register(new AuthDtos.RegisterRequest(UUID.randomUUID()+"@test.local",PASSWORD,"Test"),browser,"203.0.113.200");
        assertThatThrownBy(()->auth.register(new AuthDtos.RegisterRequest(UUID.randomUUID()+"@test.local",PASSWORD,"Test"),browser,"203.0.113.200"))
                .isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class)
                .satisfies(ex->assertThat(((vn.weconex.aptis.common.exception.ApiException)ex).code()).isEqualTo(vn.weconex.aptis.common.exception.ErrorCode.RATE_LIMITED));
        User existing=student(); login(existing,"rate-test-browser","203.0.113.200");
        assertThat(state(existing)).isEqualTo(SignupTrialStatus.GRANTED);
    }
    @Test void ipBurstLimitIsTemporaryAndCountersAreAtomic() {
        for(int i=0;i<60;i++) limiter.check(hasher.browserHash("burst-"+i),"203.0.113.201");
        String fresh=hasher.browserHash("burst-denied");
        assertThatThrownBy(()->limiter.check(fresh,"203.0.113.201")).isInstanceOf(vn.weconex.aptis.common.exception.ApiException.class);
        assertThat(redis.opsForValue().get("abuse:register:browser:10m:"+fresh)).isNull();
        assertThat(redis.getExpire("abuse:register:ip:hour:"+hasher.ipHash("203.0.113.201").orElseThrow())).isBetween(1L,3600L);
    }
    @Test void legacyRefreshAssociatesBrowserWithoutRevokingTheOldTrial() {
        User old=student(SignupTrialStatus.LEGACY),fresh=student();
        var original=login(old,"legacy-refresh-a");
        auth.refresh(original.refreshToken(),"test-browser","203.0.113.80",hasher.browserHash("legacy-refresh-a"));
        login(fresh,"legacy-refresh-a");
        assertThat(state(old)).isEqualTo(SignupTrialStatus.LEGACY);
        assertThat(state(fresh)).isEqualTo(SignupTrialStatus.BROWSER_USED);
    }
    @Test void adminEvidenceIsReadOnlyAndProtectedFromStudents() throws Exception {
        User a=student(),b=student();login(a,"admin-evidence");var token=login(b,"admin-evidence");
        assertThat(adminAbuse.summary().browserGroups()).anySatisfy(group->assertThat(group.accounts()).extracting(vn.weconex.aptis.auth.service.AdminAbuseService.RelatedAccount::id).contains(a.getId(),b.getId()));
        assertThat(adminAbuse.summary().ipGroups()).isNotEmpty();
        mvc.perform(get("/api/v1/admin/users/abuse-signals").header("Authorization","Bearer "+token.accessToken())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/users/abuse-signals").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin").authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("user:read"), new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk()).andExpect(jsonPath("browserGroups").isArray());
    }
    @Test void httpControllerUsesSignedCookieNotClientDeviceIdAndLogoutKeepsTheBrowserIdentity() throws Exception {
        User first=student(),second=student();
        var config=mvc.perform(get("/api/v1/auth/config")).andExpect(status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control","no-store")).andReturn();
        String pair=config.getResponse().getHeader("Set-Cookie").split(";",2)[0];
        var cookie=new jakarta.servlet.http.Cookie(pair.split("=",2)[0],pair.split("=",2)[1]);
        var mapper=new com.fasterxml.jackson.databind.ObjectMapper();
        var firstResponse=mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/login").cookie(cookie).contentType("application/json")
                .content(mapper.writeValueAsString(new AuthDtos.LoginRequest(first.getEmail(),PASSWORD,"device-A"))))
                .andExpect(status().isOk()).andReturn();
        String token=mapper.readTree(firstResponse.getResponse().getContentAsString()).get("accessToken").asText();
        var logout=mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/logout").cookie(cookie).header("Authorization","Bearer "+token)
                .contentType("application/json").content("{\"allDevices\":true}"))
                .andExpect(status().isNoContent()).andReturn();
        assertThat(logout.getResponse().getHeaders("Set-Cookie")).noneMatch(value->value.startsWith(cookie.getName()+"="));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/login").cookie(cookie).contentType("application/json")
                .content(mapper.writeValueAsString(new AuthDtos.LoginRequest(second.getEmail(),PASSWORD,"device-B"))))
                .andExpect(status().isOk());
        assertThat(state(first)).isEqualTo(SignupTrialStatus.GRANTED);
        assertThat(state(second)).isEqualTo(SignupTrialStatus.BROWSER_USED);
    }
    @Test void registrationHttp429IncludesRetryAfterButExistingLoginIsStillAllowed() throws Exception {
        User existing=student();
        var config=mvc.perform(get("/api/v1/auth/config")).andReturn();
        String pair=config.getResponse().getHeader("Set-Cookie").split(";",2)[0];
        var cookie=new jakarta.servlet.http.Cookie(pair.split("=",2)[0],pair.split("=",2)[1]);
        var mapper=new com.fasterxml.jackson.databind.ObjectMapper();
        String body=mapper.writeValueAsString(new AuthDtos.RegisterRequest(existing.getEmail(),PASSWORD,"Test"));
        for(int i=0;i<3;i++)mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/register").cookie(cookie).contentType("application/json").content(body)).andExpect(status().isConflict());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/register").cookie(cookie).contentType("application/json").content(body))
                .andExpect(status().isTooManyRequests()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().exists("Retry-After"))
                .andExpect(jsonPath("code").value("RATE_LIMITED")).andExpect(jsonPath("details.retryAfterSeconds").isNumber());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/auth/login").cookie(cookie).contentType("application/json")
                .content(mapper.writeValueAsString(new AuthDtos.LoginRequest(existing.getEmail(),PASSWORD,null)))).andExpect(status().isOk());
    }
    private static void await(CountDownLatch latch) { try { latch.await(); } catch(InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); } }
}
