package vn.weconex.aptis.entitlement.service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.assertj.core.api.Assertions.assertThat;

/** Exercises the upgrade path with historical rows, not only an empty schema. */
@Testcontainers(disabledWithoutDocker = true)
class SignupTrialMigrationTest {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("aptis").withUsername("aptis").withPassword("aptis").withUrlParam("serverTimezone", "UTC");

    @Test void upgradePreservesExistingAccountsAndDoesNotInventBrowserClaimsFromIpHistory() throws Exception {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).target("66").load().migrate();
        String first=UUID.randomUUID().toString(), second=UUID.randomUUID().toString(), staff=UUID.randomUUID().toString();
        Instant created=Instant.parse("2026-01-01T00:00:00Z");
        try(Connection c=DriverManager.getConnection(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword())) {
            user(c,first,created,"STUDENT"); user(c,second,created,"STUDENT"); user(c,staff,created,"SUPER_ADMIN");
            token(c,first,"203.0.113.88",created.plusSeconds(60));
            token(c,second,"::ffff:203.0.113.88",created.plusSeconds(120));
            token(c,first,"2001:db8:5678:abcd::1",created.plusSeconds(180));
            token(c,second,"2001:0db8:5678:abcd:ffff::2",created.plusSeconds(240));
            token(c,second,"203.0.113.89",created.plusSeconds(86_401)); // outside original one-day trial
            token(c,staff,"203.0.113.90",created.plusSeconds(300)); // staff never consume a trial quota
        }
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).load().migrate();
        try(Connection c=DriverManager.getConnection(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword())) {
            var count=c.createStatement().executeQuery("SELECT COUNT(*) FROM signup_trial_browser_claims");count.next();assertThat(count.getInt(1)).isZero();
            var events=c.createStatement().executeQuery("SELECT COUNT(*) FROM auth_abuse_events");events.next();assertThat(events.getInt(1)).isZero();
            var statuses=c.createStatement().executeQuery("SELECT DISTINCT signup_trial_status FROM users");
            while(statuses.next()) assertThat(statuses.getString(1)).isEqualTo("LEGACY");
        }
    }
    private static void user(Connection c,String id,Instant created,String role) throws Exception {
        try(PreparedStatement p=c.prepareStatement("INSERT INTO users(id,email,status,email_verified_at,created_at,updated_at) VALUES (?,?,'ACTIVE',?,?,?)")) {
            p.setString(1,id);p.setString(2,id+"@test.local");for(int i=3;i<=5;i++)p.setTimestamp(i,Timestamp.from(created));p.executeUpdate();
        }
        try(var p=c.prepareStatement("INSERT INTO user_roles(user_id,role_id,assigned_at) SELECT ?,id,? FROM roles WHERE code=?")) {
            p.setString(1,id);p.setTimestamp(2,Timestamp.from(created));p.setString(3,role);p.executeUpdate();
        }
    }
    private static void token(Connection c,String user,String ip,Instant issued) throws Exception {
        try(var p=c.prepareStatement("INSERT INTO refresh_tokens(id,user_id,token_hash,ip_address,expires_at,created_at) VALUES (?,?,?,?,?,?)")) {
            p.setString(1,UUID.randomUUID().toString());p.setString(2,user);p.setString(3,UUID.randomUUID().toString());p.setString(4,ip);
            p.setTimestamp(5,Timestamp.from(issued.plusSeconds(30*86_400)));p.setTimestamp(6,Timestamp.from(issued));p.executeUpdate();
        }
    }
}
