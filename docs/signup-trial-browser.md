# Chống lặp dùng thử — Browser ID, IP hỗ trợ và rate limit

## Chính sách chốt ngày 13/10/2026

Mỗi mã trình duyệt do server cấp chỉ nhận dùng thử một lần. Hạn vẫn là 1 ngày từ ngày tạo tài khoản; đổi tài khoản hoặc đăng nhập lại không cộng thời gian. Khác mã trình duyệt cùng IP vẫn được thử độc lập. Không khóa cả Wi-Fi, không tự khóa tài khoản theo điểm nghi vấn, không ảnh hưởng entitlement Premium/AI Voice đã mua hoặc admin cấp.

Cookie `__Host-aptis_bid` (production HTTPS): 32 byte ngẫu nhiên, chữ ký HMAC-SHA256, Secure, HttpOnly, Path=/, SameSite=Lax, không Domain, Max-Age 365 ngày. Dev HTTP dùng `aptis_bid`. Không dùng deviceId do client gửi làm bằng chứng. Cookie không bị xóa khi logout. Hash lưu DB khác chữ ký cookie và khác HMAC IP (purpose separation). HMAC dùng khóa riêng ABUSE_HASH_SECRET; nếu chưa cấu hình thì fallback JWT_SECRET cho môi trường phát triển. Production đã tạo khóa riêng trong .env, không in giá trị hoặc đưa vào Git. Giữ khóa ổn định; đổi khóa sẽ mất liên kết với các định danh cũ.

Không phải mã phần cứng: xóa cookie, ẩn danh hoặc đổi browser profile vẫn có thể tạo ID mới; hai người chung profile có thể bị tính chung. IP/fingerprint không chứng minh cùng người. Bản này không thu Canvas/WebGL/fingerprint, không gọi dịch vụ VPN, không bật Turnstile hoặc gửi tín hiệu sang bên thứ ba.

## Trạng thái và dữ liệu

- V67 mới chưa từng được áp dụng lên prod trước tính năng này. `users.signup_trial_status`: LEGACY, PENDING, GRANTED, BROWSER_USED, BROWSER_UNAVAILABLE. User mới PENDING; cookie hợp lệ được kiểm sau khi xác thực và đăng nhập thành công (password/Google).
- `signup_trial_browser_claims`: browser_hash UNIQUE, user_id chủ lượt, claimed_at. Khóa user + upsert/SELECT FOR UPDATE quota trong cùng transaction; cột quyết định của User không để Hibernate ghi đè trạng thái từ snapshot cũ.
- Tài khoản trước V67 giữ LEGACY và hạn cũ. Cookie được liên kết ở lần login/refresh hợp lệ tiếp theo, kể cả trial cũ đã hết, để không nhận lại bằng tài khoản mới. Không suy diễn browser ID từ IP lịch sử. Mỗi legacy account liên kết một browser ban đầu; không tiêu hao quota trên tất cả máy họ từng đăng nhập.
- GRANTED/BROWSER_USED là quyết định cố định cho account; đổi cookie không reset quyết định đó. Cookie mới cho account khác vẫn có thể lách, là giới hạn kỹ thuật đã nêu.
- `auth_abuse_events`: REGISTER, LOGIN, REFRESH khởi tạo liên kết, REGISTER_LIMITED. Chỉ lưu user_id, HMAC browser/IP và thời điểm, không thêm email/IP thô/UA vào bảng mới. IP v4 exact, IPv6 /64 chỉ để gom tín hiệu mạng/rate limit, không làm quota trial.
- Event giới hạn đăng ký gộp tối đa một lần/phút theo IP (hoặc browser nếu không có IP), tránh bot làm phình MySQL. Event được giữ 30 ngày, job mỗi giờ xóa tối đa 10000 record cũ. Claim dùng thử được giữ riêng để quota không reset theo thời hạn log. Refresh sau liên kết không tạo thêm event liên tục.

EntitlementService, `/me`, lọc/cột Premium admin và email nhắc trial đều kiểm trạng thái đủ điều kiện LEGACY/GRANTED. Paid entitlement luôn độc lập. `/me` chỉ trả trạng thái, không tiết lộ tài khoản chủ lượt hoặc hash.

## Giới hạn đăng ký

Redis Lua check/increment nguyên tử, nhiều instance dùng chung counters có TTL:

| Chiều | Mặc định | Cấu hình |
|---|---|---|
| Browser | 3 lượt thử / 10 phút | REGISTER_BROWSER_TEN_MINUTES |
| Browser | 10 lượt thử / 24 giờ | REGISTER_BROWSER_DAY |
| IP/prefix mạng | 60 lượt thử / giờ | REGISTER_IP_HOUR |

Áp dụng register password và Google tạo account mới. Login tài khoản hiện có, refresh và thanh toán không bị rate limit này. Request email đã dùng cũng tính là một lượt thử; request sai validation chưa vào service thì không tính. Vượt mức trả 429 RATE_LIMITED, Retry-After và details.retryAfterSeconds; không tạo account, không ban vĩnh viễn. Redis lỗi: đăng ký mới trả 503 tạm thời, không âm thầm bỏ qua guard; login hiện có không gọi limiter. Counters all-or-none, quota IP hết không làm tăng quota browser; không tạo key chung khi IP không xác định được. Redis hiện dùng standalone (không thiết kế CROSSSLOT cho Redis Cluster).

## IP thật

Nginx chỉ tin CF-Connecting-IP/CF-Connecting-IPv6 từ peer `cloudflared` do Docker DNS xác định. Ghi đè X-Aptis-Client-IP/XFF, không tin header do trình duyệt tự khai. Script `docker/15-client-ip.sh` cập nhật trust map khi tunnel đổi IP/cold boot và reload nhẹ nginx. Backend chỉ tin header mới từ TRUSTED_PROXY_CIDRS. IP nội bộ/không hợp lệ không thành quota mạng chung.

Production compose override bind host ports frontend/backend về 127.0.0.1, tên miền vẫn qua tunnel và localhost vẫn dùng được. Không mở lối trực tiếp từ LAN/Internet giả header. Nếu Docker đổi bridge ngoài 172.16/12, cấu hình CIDR proxy đúng; tuyệt đối không đặt 0.0.0.0/0. Compose cần hỗ trợ !override (2.24.4+); môi trường hiện 5.1.3.

## Admin và UX

Trang Quản lý người dùng có “Kiểm tra lạm dụng dùng thử / tài khoản liên quan”. GET `/api/v1/admin/users/abuse-signals` yêu cầu role admin và user:read; danh sách giới hạn 15 nhóm mỗi loại, 10 account mỗi nhóm. Tách cùng browser với chỉ trùng mạng; không gộp/xóa/khóa tự động. Click email để lọc account trong trang. Admin có thể dùng cơ chế cấp Premium hiện tại để xử lý người dùng chung máy hợp lệ.

Đăng ký/đăng nhập giải thích cookie, điều kiện dùng thử và thời gian chờ. Account BROWSER_USED chưa có Premium thấy banner và link mua; subscriber đang có Premium không thấy thông báo bị hạn chế.

## Kiểm thử

```powershell
cd aptis-backend
mvn '-Dtest=BrowserIdentityCookieServiceTest,TrialIpFingerprintTest,ClientIpResolverTest,SignupTrialIntegrationTest,SignupTrialMigrationTest' test
```

Integration MySQL/Mongo/Redis riêng; mock mail, Google và MinIO. Test same cookie khác IP, khác cookie cùng IP, race hai account và race một account, missing browser, paid Premium/AI, legacy, chưa verify, Redis TTL/all-or-none, HTTP cookie/logout/deviceId giả, 429/Retry-After và RBAC admin. Migration từ V66 có dữ liệu cũ kiểm giữ LEGACY, không phát minh claim từ IP.

```powershell
./scripts/check-trial-ip-proxy.ps1
```

Test proxy tạo network/container `aptis-ipcheck-*` riêng với upstream echo giả, không dùng backend/DB/tunnel prod; kiểm IP v4/v6 thật, header giả và đổi/xóa trust khi peer đổi IP; dọn đúng tài nguyên tạo ra.

## Xác nhận triển khai production — 13/10/2026

Đã build và triển khai backend/frontend qua `scripts/deploy-prod.sh --no-build backend frontend`; cả hai service healthy, Flyway đã áp dụng V67. Tại thời điểm deploy, các chỉ số phiên làm bài, hoạt động/đăng nhập 15 phút và AI Voice đều bằng 0.

- 293 test backend đã chọn và 70 test frontend đều đạt; build, ESLint các file frontend thay đổi và kiểm tra proxy IP cũng đạt. Một test plan có lỗi kỳ vọng cũ (5 gói so với 11 gói hiện có) được loại khỏi lượt backend này: `SchemaConsistencyTest#seedsPurchasablePlans`.
- Đối chiếu trước/sau deploy: 260 user, 88 entitlement và 261 liên kết role giữ nguyên; chữ ký dữ liệu user/entitlement không đổi. Tất cả user cũ giữ LEGACY; không tạo account hay tiêu hao trial thật trên production để kiểm thử.
- Smoke test HTTPS bằng trình duyệt mobile đạt: cookie ký hợp lệ, Secure/HttpOnly/host-only, ổn định qua request và không đọc được từ JavaScript; auth config không cache; endpoint admin từ chối khách; trang đăng ký/đăng nhập không lỗi runtime hoặc tràn ngang.
- Kiểm tra hồi quy SEO production đạt cho cả 7 bài đã xuất bản, ảnh/meta/sitemap, điều hướng khách và trang 404.

Kiểm tra production chỉ đọc, không đăng ký tài khoản:

```powershell
node scripts/check-browser-trial.mjs
node scripts/check-news-seo.mjs
```

Tham chiếu: [Cloudflare visitor headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), [MDN cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies).
