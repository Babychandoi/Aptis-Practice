package vn.weconex.aptis.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Slf4j
public class AbuseEventService {
    private final JdbcTemplate jdbc;
    public void record(String userId,String browser,String ip,String event){
        jdbc.update("INSERT INTO auth_abuse_events(user_id,browser_hash,ip_hash,event_type,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP())",userId,browser,ip,event);
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void limited(String browser,String ip){
        try{record(null,browser,ip,"REGISTER_LIMITED");}catch(org.springframework.dao.DataAccessException ex){log.warn("Unable to record registration limit telemetry");}
    }
    public int purgeExpired(){return jdbc.update("DELETE FROM auth_abuse_events WHERE created_at < UTC_TIMESTAMP() - INTERVAL 30 DAY LIMIT 10000");}
}
