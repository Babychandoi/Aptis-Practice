# Đưa hệ thống lên domain qua Cloudflare Tunnel

Đưa `aptispractices.io.vn` ra Internet từ chính máy đang chạy Docker, không cần
IP public và không mở port nào trên router.

Kết quả:

| Địa chỉ | Trỏ vào | Nội dung |
|---|---|---|
| `https://aptispractices.io.vn` | `frontend:80` | Web app + API (`/api/`) cùng origin |
| `https://cdn.aptispractices.io.vn` | `minio:9000` | Audio/ảnh đề thi qua presigned URL |

## Vì sao cần hai hostname

Backend **không** proxy nội dung file. Nó ký một *presigned URL* rồi để trình
duyệt tải trực tiếp từ MinIO, nên MinIO phải có mặt trên Internet bằng đúng host
đã dùng để ký. Ký bằng `localhost:9000` thì link chỉ sống trên máy này; người
dùng ở máy khác bấm vào là lỗi.

Đó là lý do `MINIO_PUBLIC_ENDPOINT` phải bằng `https://cdn.aptispractices.io.vn`,
trong khi backend vẫn gọi `http://minio:9000` qua network nội bộ.

## ⚠️ Chọn đúng tài khoản Cloudflare

Máy này có nhiều tài khoản Cloudflare. `cloudflared` đã đăng nhập bằng
`~/.cloudflared/cert.pem` thuộc tài khoản chứa zone **`luatpoip.com`**, nhưng
`aptispractices.io.vn` nằm ở **tài khoản khác** — nameserver của hai domain khác
nhau (`leia`/`gordon` so với `donovan`/`cora`).

Hệ quả nếu làm bằng dòng lệnh với cert hiện tại: `cloudflared tunnel route dns`
**không báo lỗi** mà lặng lẽ nối hostname vào zone mặc định, tạo ra record rác
kiểu `aptispractices.io.vn.luatpoip.com`. Đã xảy ra một lần và đã được dọn.

Vì vậy Bước 1–2 phải làm trên **dashboard của tài khoản chứa
`aptispractices.io.vn`**, không dùng cloudflared CLI trên máy này.

## Bước 1 — Tạo tunnel trên Cloudflare

Đăng nhập đúng tài khoản chứa `aptispractices.io.vn`, rồi:

Dashboard: **Zero Trust → Networks → Tunnels → Create a tunnel** → chọn
**Cloudflared** → đặt tên (ví dụ `aptis-practices`) → **Save**.

Trang tiếp theo hiện lệnh cài kèm một token dài. **Chỉ copy phần token** (chuỗi
sau `--token`), không cần chạy lệnh đó — ta sẽ chạy cloudflared bằng Docker.

Kiểm tra nhanh mình đang ở đúng tài khoản: tab **Websites** phải thấy
`aptispractices.io.vn` trong danh sách.

## Bước 2 — Khai hai public hostname

Vẫn trong tunnel vừa tạo, tab **Public Hostname** → **Add a public hostname**.

Bản ghi thứ nhất — web app:

| Trường | Giá trị |
|---|---|
| Subdomain | *(để trống)* |
| Domain | `aptispractices.io.vn` |
| Service Type | `HTTP` |
| URL | `frontend:80` |

Bản ghi thứ hai — asset:

| Trường | Giá trị |
|---|---|
| Subdomain | `cdn` |
| Domain | `aptispractices.io.vn` |
| Service Type | `HTTP` |
| URL | `minio:9000` |

`HTTP` ở đây là chặng *trong* docker network, không phải chặng ra Internet:
Cloudflare vẫn phục vụ người dùng bằng HTTPS. Vì tunnel là kết nối đi ra, chặng
này không phơi ra ngoài.

Cloudflare tự tạo DNS record `CNAME` proxied cho cả hai — không phải thêm tay.

### Additional application settings cho `cdn`

Mở phần này ở bản ghi `cdn` và bật **Disable Chunked Encoding**. MinIO trả
`Content-Length` chính xác; chunked encoding chồng lên đó thỉnh thoảng làm hỏng
file audio tải về.

## Bước 3 — Điền cấu hình vào `.env`

Thêm ba dòng vào `.env` (file này đã nằm trong `.gitignore`, token sẽ không bị
commit):

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=<token copy ở Bước 1>
PUBLIC_ORIGIN=https://aptispractices.io.vn
MINIO_PUBLIC_ORIGIN=https://cdn.aptispractices.io.vn
```

## Bước 4 — Rebuild frontend và chạy

`nginx.conf` đã đổi (xem "Giao thức qua proxy" bên dưới) nên phải build lại image
frontend, không chỉ restart:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build frontend
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
```

Đặt bí danh cho gọn, vì **mọi** lệnh compose sau này đều phải có cả hai file —
thiếu file thứ hai là backend quay về cấu hình localhost:

```bash
alias dcp='docker compose -f docker-compose.yml -f docker-compose.tunnel.yml'
```

## Bước 5 — Kiểm chứng

```bash
# Tunnel đã kết nối (mong đợi: "Registered tunnel connection")
docker logs aptis-cloudflared | tail -20

# Web app
curl -sI https://aptispractices.io.vn | head -3

# API trả lỗi xác thực bằng tiếng Việt — chứng tỏ đã tới backend, không phải
# nginx trả index.html
curl -s https://aptispractices.io.vn/api/v1/catalog/parts

# Backend nhận đúng giao thức HTTPS
docker compose exec -T backend env | grep -E 'MINIO_PUBLIC_ENDPOINT|CORS_ORIGINS'
```

Kiểm tra quan trọng nhất là **phát được audio trong một đề thi**: đăng nhập, mở
một bài Listening và bấm play. Đó là đường đi duy nhất chạm vào presigned URL,
nên nó xác nhận `MINIO_PUBLIC_ORIGIN` đã đúng. Nếu audio không chạy, mở DevTools
tab Network xem link asset đang trỏ tới host nào.

## Cấu hình Cloudflare nên bật

**SSL/TLS → Overview**: để **Full**. Với tunnel, chặng Cloudflare→máy bạn đã đi
trong kết nối mã hoá của cloudflared, nên **không cần Origin Certificate** và
cũng không cần đặt Full (strict) — không có origin nào để xác thực cert. Đây là
điểm khác so với deploy trên VPS.

**SSL/TLS → Edge Certificates**: bật **Always Use HTTPS** và
**Automatic HTTPS Rewrites**.

⚠️ Đừng bật **Authenticated Origin Pulls** — không áp dụng cho tunnel và sẽ làm
request lỗi.

**Speed → Optimization**: KHÔNG bật Rocket Loader. Nó đổi thứ tự thực thi
JavaScript và hay làm hỏng SPA React.

**Caching**: mặc định Cloudflare không cache HTML nên SPA vẫn nhận bản mới sau
mỗi lần deploy. File trong `/assets/` có hash trong tên và nginx đã đặt
`immutable`, nên cache được lâu là đúng.

### Giới hạn upload 100 MB

Cloudflare free chặn request body lớn hơn 100 MB. Không ảnh hưởng ở đây: ghi âm
Speaking và file import đi bằng presigned URL **trực tiếp lên `cdn`**, mà đường
đó cũng qua Cloudflare — nên giới hạn áp cho từng file, không phải tổng. File
ghi âm một câu Speaking chỉ vài MB nên còn rất xa ngưỡng.

## Giao thức qua proxy — vì sao `nginx.conf` phải sửa

Trước đây nginx gửi `X-Forwarded-Proto $scheme` xuống backend. Khi có proxy
ngoài, chặng tunnel→nginx là HTTP nên `$scheme` = `http`, và backend kết luận cả
request là HTTP dù người dùng vào bằng HTTPS. Hệ quả thấy được: **link trong
email xác thực và đặt lại mật khẩu sinh ra `http://`**, bấm vào bị Cloudflare
redirect hoặc trình duyệt cảnh báo.

Bản sửa thêm một `map` ưu tiên `X-Forwarded-Proto` do Cloudflare đặt, chỉ rơi về
`$scheme` khi không có header đó — nên chạy local không qua tunnel vẫn đúng.

Backend đã có `forward-headers-strategy: framework` trong `application.yml` nên
tự đọc các header này, không cần sửa gì thêm.

## Bảo mật — PHẢI làm trước Bước 4

### `JWT_SECRET` đang là giá trị dev công khai (nghiêm trọng)

`JWT_SECRET` trong `.env` hiện đúng bằng chuỗi mẫu ghi thẳng trong
`docker-compose.yml` — nó là base64 của `dev-only-secret-do-not-use-in-production…`.
Chuỗi này nằm trong repo nên **bất kỳ ai đọc được repo đều tự ký được access
token của tài khoản admin** và vào thẳng khu quản trị. Chạy localhost thì không
sao, nhưng mở ra Internet là lỗ hổng chiếm quyền toàn hệ thống.

Sinh một khóa mới rồi thay vào dòng `JWT_SECRET=` trong `.env`:
```bash
docker run --rm alpine:3 sh -c "head -c 48 /dev/urandom | base64 -w0"
```

Đổi secret làm **mọi refresh token hiện có mất hiệu lực** — ai đang đăng nhập sẽ
bị đăng xuất. Không mất dữ liệu, chỉ cần đăng nhập lại, nên đổi ngay bây giờ rẻ
hơn đổi sau.

### Mật khẩu hạ tầng vẫn là mặc định

- `MYSQL_PASSWORD` đang là `aptis`
- MinIO đang là `minioadmin/minioadmin`

Hai thứ này chỉ nghe trong docker network và trên `127.0.0.1`, không đi qua
tunnel, nên **không** phơi ra Internet như `JWT_SECRET`. Vẫn nên đổi trước khi có
dữ liệu người dùng thật — ai vào được máy này là vào được database.

Đổi MinIO key phải đổi đồng thời ở `docker-compose.yml` và mọi script
backup/restore dùng `MINIO_ACCESS_KEY`, nếu không backup sẽ lặng lẽ ra archive
rỗng.

Ngoài ra, các port trên host (`3307`, `27017`, `9000`, `9001`) đang nghe trên
`0.0.0.0`. Tunnel không cần chúng, nên đổi sang dạng `127.0.0.1:3307:3306` để chỉ
localhost vào được — xem ghi chú cuối `docker-compose.tunnel.yml`.

Nếu muốn thêm một lớp nữa: **Zero Trust → Access → Applications** cho phép đặt
đăng nhập trước cả app, hữu ích khi còn đang thử nghiệm chưa muốn ai vào.

## Đưa MinIO console ra ngoài (không nên)

Console (port 9001) là trang quản trị toàn bộ file. Đừng khai public hostname cho
nó. Cần dùng thì vào `http://localhost:9001` ngay trên máy này.

## Máy tắt thì sao

Tunnel chạy trong Docker với `restart: unless-stopped` nên nó tự lên lại khi
Docker Desktop khởi động. Nhưng Docker Desktop trên Windows **không** tự chạy khi
boot nếu chưa bật — vào Settings → General → "Start Docker Desktop when you sign
in". Lưu ý nó chỉ chạy sau khi *đăng nhập* Windows, nên máy khởi động lại mà chưa
ai đăng nhập thì site vẫn tắt.

Đây là giới hạn thật của việc host trên máy cá nhân: máy sleep, mất điện hay mất
mạng là site sập. Khi đã có người dùng thật thì nên chuyển sang VPS — lúc đó vẫn
dùng lại được tunnel y như vậy, chỉ đổi chỗ chạy cloudflared.

## Trở lại chạy local

Bỏ file overlay là xong, không cần sửa gì:

```bash
docker compose down
docker compose up -d
```
