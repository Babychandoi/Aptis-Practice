-- Server-issued browser quota. Existing accounts keep their original rights;
-- unrelated people sharing an IP are not denied their trial.
ALTER TABLE users
    ADD COLUMN signup_trial_status VARCHAR(24) NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN signup_trial_browser_hash CHAR(64) NULL,
    ADD KEY idx_users_signup_trial_browser (signup_trial_browser_hash);
CREATE TABLE signup_trial_browser_claims (
    browser_hash CHAR(64) NOT NULL,
    user_id CHAR(36) NOT NULL,
    claimed_at DATETIME NOT NULL,
    PRIMARY KEY (browser_hash),
    KEY idx_signup_trial_browser_user (user_id),
    CONSTRAINT fk_signup_trial_browser_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE auth_abuse_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id CHAR(36) NULL,
    browser_hash CHAR(64) NULL,
    ip_hash CHAR(64) NULL,
    event_type VARCHAR(24) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_abuse_browser_user_time (browser_hash, user_id, created_at),
    KEY idx_abuse_ip_user_time (ip_hash, user_id, created_at),
    KEY idx_abuse_time (created_at),
    CONSTRAINT fk_auth_abuse_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Historical IPs cannot reconstruct browser IDs. Old accounts are associated
-- on next successful login/refresh, not assigned invented device identities.
