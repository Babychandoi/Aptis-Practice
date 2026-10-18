package vn.weconex.aptis.auth.service;

import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bounded read-only evidence, not an identity verdict or an automatic account ban. */
@Service @RequiredArgsConstructor
public class AdminAbuseService {
    private final JdbcTemplate jdbc;
    public record RelatedAccount(String id,String email,String signupTrialStatus,Instant createdAt){}
    public record Group(String reference,String reason,int accountCount,List<RelatedAccount> accounts){}
    public record Summary(long limitedEvents24h,List<Group> browserGroups,List<Group> ipGroups){}

    @Transactional(readOnly=true)
    public Summary summary(){
        var browsers=jdbc.query("""
                SELECT c.browser_hash,COUNT(DISTINCT u.id) AS accounts
                FROM signup_trial_browser_claims c
                JOIN users u ON u.signup_trial_browser_hash=c.browser_hash OR u.id=c.user_id
                GROUP BY c.browser_hash HAVING COUNT(DISTINCT u.id)>1
                ORDER BY MAX(u.created_at) DESC LIMIT 15
                """,(r,n)->group(r.getString(1),r.getInt(2),true));
        var ips=jdbc.query("""
                SELECT ip_hash,COUNT(DISTINCT user_id) AS accounts
                FROM auth_abuse_events WHERE ip_hash IS NOT NULL AND user_id IS NOT NULL
                  AND created_at>UTC_TIMESTAMP()-INTERVAL 30 DAY
                GROUP BY ip_hash HAVING COUNT(DISTINCT user_id)>1
                ORDER BY MAX(created_at) DESC LIMIT 15
                """,(r,n)->group(r.getString(1),r.getInt(2),false));
        Long limited=jdbc.queryForObject("SELECT COUNT(*) FROM auth_abuse_events WHERE event_type='REGISTER_LIMITED' AND created_at>UTC_TIMESTAMP()-INTERVAL 1 DAY",Long.class);
        return new Summary(limited==null?0:limited,browsers,ips);
    }
    private Group group(String hash,int count,boolean browser){
        String sql=browser?"""
                SELECT DISTINCT u.id,u.email,u.signup_trial_status,u.created_at FROM users u
                WHERE u.signup_trial_browser_hash=? OR u.id IN (SELECT user_id FROM signup_trial_browser_claims WHERE browser_hash=?)
                ORDER BY u.created_at DESC LIMIT 10
                """:"""
                SELECT DISTINCT u.id,u.email,u.signup_trial_status,u.created_at FROM users u
                JOIN auth_abuse_events e ON e.user_id=u.id
                WHERE e.ip_hash=? AND e.created_at>UTC_TIMESTAMP()-INTERVAL 30 DAY
                ORDER BY u.created_at DESC LIMIT 10
                """;
        Object[] args=browser?new Object[]{hash,hash}:new Object[]{hash};
        var accounts=jdbc.query(sql,(r,n)->new RelatedAccount(r.getString(1),r.getString(2),r.getString(3),r.getTimestamp(4).toInstant()),args);
        return new Group((browser?"B-":"N-")+hash.substring(0,10),browser?"SHARED_BROWSER":"SHARED_NETWORK",count,accounts);
    }
}
