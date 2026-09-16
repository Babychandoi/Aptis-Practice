# Đưa bản dev ra `dev.aptispractices.io.vn`

Mục đích: test từ xa (điện thoại, máy khác, gửi cho người khác xem) mà không
đụng tới trang thật đang có học viên dùng.

Bản dev chạy **tunnel riêng**, không dùng chung với production. Hai tunnel độc
lập nên restart dev, sập dev hay gỡ dev đi đều không ảnh hưởng trang thật.

| Địa chỉ | Trỏ vào | Dùng cho |
|---|---|---|
| `https://dev.aptispractices.io.vn` | `frontend:80` | Giao diện và API bản dev |
| `https://cdn-dev.aptispractices.io.vn` | `minio:9000` | Ảnh và audio của đề |

Cần hai bản ghi vì presigned URL của MinIO ký kèm cả host. Ký bằng
`localhost:9002` thì ảnh và audio chết ngay khi mở từ máy khác, còn gộp chung
một domain dưới dạng đường dẫn con thì sai chữ ký.

## Bước 1 — Tạo tunnel mới cho dev

Vào **Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel**, chọn
**Cloudflared**, đặt tên dễ phân biệt, ví dụ `aptis-dev`.

> Phải là tunnel MỚI. Dùng lại tunnel của production thì mỗi lần sửa cấu hình
> dev đều phải restart container đang phục vụ học viên thật.

Ở màn hình cài đặt, chọn tab **Docker** và copy phần token — chuỗi rất dài đứng
sau `--token`. Không cần chạy lệnh Cloudflare gợi ý; compose ở dưới đã lo.

## Bước 2 — Thêm hai public hostname

Trong tunnel `aptis-dev` vừa tạo, mở tab **Public Hostname** và thêm:

Bản ghi thứ nhất — ứng dụng:

| Trường | Giá trị |
|---|---|
| Subdomain | `dev` |
| Domain | `aptispractices.io.vn` |
| Service Type | `HTTP` |
| URL | `frontend:80` |

Bản ghi thứ hai — asset:

| Trường | Giá trị |
|---|---|
| Subdomain | `cdn-dev` |
| Domain | `aptispractices.io.vn` |
| Service Type | `HTTP` |
| URL | `minio:9000` |

`frontend` và `minio` là tên service trong docker network của stack dev —
cloudflared chạy cùng network nên gọi thẳng được bằng tên.

### Additional application settings cho `cdn-dev`

Mở phần này ở bản ghi `cdn-dev` và bật **Disable Chunked Encoding**, giống
production. MinIO trả `Content-Length` chính xác; chunked encoding chồng lên đó
thỉnh thoảng làm hỏng file audio tải về.

## Bước 3 — Chặn người lạ bằng Cloudflare Access

Bản dev có tính năng chưa xong và dữ liệu giả, không nên để ai vào cũng được.

Vào **Zero Trust → Access → Applications → Add an application → Self-hosted**:

| Trường | Giá trị |
|---|---|
| Application name | `Aptis Dev` |
| Session duration | tuỳ, 24 giờ là hợp lý |
| Subdomain / Domain | `dev` / `aptispractices.io.vn` |

Thêm policy: **Action** `Allow`, **Include** → `Emails` → điền email của anh
(thêm được nhiều email nếu muốn ai đó cùng test).

Khi mở trang, Cloudflare gửi mã một lần về email rồi mới cho vào.

> `cdn-dev` thì **không** đặt Access. Trình duyệt tải ảnh/audio bằng presigned
> URL không kèm phiên đăng nhập Access, chặn ở đó là toàn bộ ảnh và audio hỏng.
> Link presigned vốn đã có hạn và có chữ ký nên không đoán được.

Ngoài Access, bản dev còn trả header `X-Robots-Tag: noindex, nofollow` để Google
không lập chỉ mục — tránh việc học viên tìm ra trang dev tưởng là trang thật.

## Bước 4 — Điền cấu hình vào `.env.dev`

Tạo file `.env.dev` ở thư mục gốc (đã nằm trong `.gitignore`, token không bị
commit):

```dotenv
DEV_TUNNEL_TOKEN=<token copy ở Bước 1>
DEV_PUBLIC_ORIGIN=https://dev.aptispractices.io.vn
DEV_MINIO_PUBLIC_ORIGIN=https://cdn-dev.aptispractices.io.vn
```

> Để riêng `.env.dev` chứ không thêm vào `.env`: hai file cùng tên biến khác giá
> trị là cách nhanh nhất để deploy nhầm dev đè lên production.

## Bước 5 — Chạy

```bash
docker compose --env-file .env.dev \
  -f docker-compose.dev.yml -f docker-compose.dev-tunnel.yml up -d --build
```

Kiểm tra tunnel đã kết nối:

```bash
docker logs aptis-dev-cloudflared --tail 20
```

Thấy dòng `Registered tunnel connection` là xong. Mở
`https://dev.aptispractices.io.vn`.

## Tắt bản dev

```bash
docker compose --env-file .env.dev \
  -f docker-compose.dev.yml -f docker-compose.dev-tunnel.yml down
```

Thêm `-v` nếu muốn xoá sạch cả dữ liệu dev. Production không bị ảnh hưởng trong
mọi trường hợp.

## Khi có gì đó không chạy

**Trang mở được nhưng đăng nhập cứ văng ra** — thiếu `REFRESH_COOKIE_SECURE=true`.
Qua HTTPS trình duyệt chỉ gửi cookie refresh khi cookie có cờ Secure. File
`docker-compose.dev-tunnel.yml` đã đặt sẵn; kiểm tra xem có chạy kèm file đó
không.

**Trang trắng, console báo lỗi CORS** — `DEV_PUBLIC_ORIGIN` chưa đúng hoặc thiếu
trong `.env.dev`. Giá trị phải khớp chính xác địa chỉ trên thanh URL, kể cả
`https://`.

**Ảnh và audio của đề không hiện** — `DEV_MINIO_PUBLIC_ORIGIN` sai, hoặc chưa
thêm bản ghi `cdn-dev`, hoặc Access đang chặn `cdn-dev`.

**Upload file hỏng giữa chừng** — chưa bật **Disable Chunked Encoding** cho
`cdn-dev`.

**`docker logs aptis-dev-cloudflared` báo lỗi token** — token copy thiếu ký tự,
hoặc đang dùng nhầm token của tunnel production.
