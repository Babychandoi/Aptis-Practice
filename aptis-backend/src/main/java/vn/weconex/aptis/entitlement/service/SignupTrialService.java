package vn.weconex.aptis.entitlement.service;

import java.time.Instant;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.User.SignupTrialStatus;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.auth.service.AbuseEventService;
import vn.weconex.aptis.auth.service.AbuseIdentityHasher;

@Service
@RequiredArgsConstructor
public class SignupTrialService {
    private final JdbcTemplate jdbc;
    private final EntityManager entityManager;
    private final AptisProperties properties;
    private final AbuseIdentityHasher hasher;
    private final AbuseEventService events;

    /** Verified authentication only; IP is evidence, never the trial quota key. */
    @Transactional
    public void onAuthenticated(User user, String browserHash, String clientIp, boolean refresh) {
        // Flush newly-created Google accounts before inserting the FK. Lock the
        // account as well as the unique browser row: parallel logins cannot claim twice.
        entityManager.flush();
        var row = jdbc.queryForMap("SELECT signup_trial_status, signup_trial_browser_hash FROM users WHERE id = ? FOR UPDATE", user.getId());
        SignupTrialStatus state = SignupTrialStatus.valueOf((String) row.get("signup_trial_status"));
        user.setSignupTrialStatus(state);
        user.setSignupTrialBrowserHash((String) row.get("signup_trial_browser_hash"));
        boolean validBrowser = browserHash != null && browserHash.matches("[a-f0-9]{64}");
        if (!refresh || user.getSignupTrialBrowserHash() == null) {
            events.record(user.getId(), validBrowser ? browserHash : null, hasher.ipHash(clientIp).orElse(null), refresh ? "REFRESH" : "LOGIN");
        }
        if (state == SignupTrialStatus.GRANTED || state == SignupTrialStatus.BROWSER_USED) return;
        if (state == SignupTrialStatus.LEGACY && user.getSignupTrialBrowserHash() != null) return;
        if (state != SignupTrialStatus.LEGACY && !properties.entitlement().withinSignupTrial(user.getCreatedAt(), Instant.now())) return;
        if (!validBrowser) {
            if (state != SignupTrialStatus.LEGACY) decide(user, SignupTrialStatus.BROWSER_UNAVAILABLE, null);
            return;
        }
        jdbc.update("""
                INSERT INTO signup_trial_browser_claims(browser_hash, user_id, claimed_at) VALUES (?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE browser_hash = browser_hash
                """, browserHash, user.getId());
        String owner = jdbc.queryForObject("SELECT user_id FROM signup_trial_browser_claims WHERE browser_hash = ? FOR UPDATE", String.class, browserHash);
        if (state == SignupTrialStatus.LEGACY) { decide(user, state, browserHash); return; }
        decide(user, user.getId().equals(owner) ? SignupTrialStatus.GRANTED : SignupTrialStatus.BROWSER_USED, browserHash);
    }

    private void decide(User user, SignupTrialStatus status, String hash) {
        jdbc.update("UPDATE users SET signup_trial_status = ?, signup_trial_browser_hash = ? WHERE id = ?", status.name(), hash, user.getId());
        user.setSignupTrialStatus(status);
        user.setSignupTrialBrowserHash(hash);
    }
}
