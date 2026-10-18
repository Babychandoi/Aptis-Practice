package vn.weconex.aptis.auth.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/** Atomic all-or-none counters across instances; does not limit existing logins. */
@Service
public class RegistrationRateLimiter {
    private static final DefaultRedisScript<Long> SCRIPT=new DefaultRedisScript<>("""
            local wait = 0
            for i,key in ipairs(KEYS) do
              if tonumber(redis.call('GET',key) or '0') >= tonumber(ARGV[i*2-1]) then
                local ttl = redis.call('TTL',key)
                if ttl < 0 then redis.call('EXPIRE',key,ARGV[i*2]); ttl = tonumber(ARGV[i*2]) end
                wait = math.max(wait,ttl,1)
              end
            end
            if wait > 0 then return wait end
            for i,key in ipairs(KEYS) do
              local count = redis.call('INCR',key)
              if count == 1 or redis.call('TTL',key) < 0 then redis.call('EXPIRE',key,ARGV[i*2]) end
            end
            return 0
            """,Long.class);
    private final StringRedisTemplate redis;
    private final AbuseIdentityHasher hasher;
    private final AbuseEventService events;
    private final int browserTenMinutes,browserDay,ipHour;
    public RegistrationRateLimiter(StringRedisTemplate redis,AbuseIdentityHasher hasher,AbuseEventService events,
            @Value("${aptis.abuse.registration.browser-ten-minutes:3}") int browserTenMinutes,
            @Value("${aptis.abuse.registration.browser-day:10}") int browserDay,
            @Value("${aptis.abuse.registration.ip-hour:60}") int ipHour){
        this.redis=redis;this.hasher=hasher;this.events=events;
        if(browserTenMinutes<1||browserDay<1||ipHour<1)throw new IllegalArgumentException("Registration limits must be positive");
        this.browserTenMinutes=browserTenMinutes;this.browserDay=browserDay;this.ipHour=ipHour;
    }
    public void check(String browserHash,String clientIp){
        if(browserHash==null||!browserHash.matches("[a-f0-9]{64}"))throw new ApiException(ErrorCode.VALIDATION_FAILED,"Không xác định được mã trình duyệt; hãy tải lại trang.");
        String ip=hasher.ipHash(clientIp).orElse(null);
        List<String> keys=new ArrayList<>(List.of("abuse:register:browser:10m:"+browserHash,"abuse:register:browser:day:"+browserHash));
        List<String> args=new ArrayList<>(List.of(""+browserTenMinutes,"600",""+browserDay,"86400"));
        if(ip!=null){keys.add("abuse:register:ip:hour:"+ip);args.add(""+ipHour);args.add("3600");}
        Long retryAfter;
        try{retryAfter=redis.execute(SCRIPT,keys,args.toArray());}
        catch(org.springframework.dao.DataAccessException ex){throw unavailable();}
        if(retryAfter==null)throw unavailable();
        if(retryAfter>0){
            try{if(Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("abuse:limited:event:"+(ip==null?browserHash:ip),"1",Duration.ofMinutes(1))))events.limited(browserHash,ip);}
            catch(org.springframework.dao.DataAccessException ignored){/* enforcement already succeeded */}
            long minutes=Math.max(1,(retryAfter+59)/60);
            String wait=minutes>=60?((minutes+59)/60)+" giờ":minutes+" phút";
            throw new ApiException(ErrorCode.RATE_LIMITED,"Bạn đã thử tạo tài khoản quá nhanh. Vui lòng chờ khoảng "+wait+" rồi thử lại.",Map.of("retryAfterSeconds",retryAfter));
        }
    }
    private ApiException unavailable(){return new ApiException(ErrorCode.SERVICE_UNAVAILABLE,"Đăng ký đang tạm thời bận, vui lòng thử lại sau.");}
}
