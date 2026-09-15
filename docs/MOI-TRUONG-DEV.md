# Môi trường DEV

Stack riêng để thử tính năng mới mà không đụng production đang có học viên dùng.

---

## Mở lên

```bash
cd "D:/Aptis Practices/Aptis-Practice"
docker compose -f docker-compose.dev.yml up -d
```

Chờ khoảng 30 giây rồi vào **http://localhost:8090**

## Địa chỉ

| | Dev | Production |
|---|---|---|
| Giao diện | http://localhost:8090 | https://aptispractices.io.vn |
| API | http://localhost:8091 | (qua tunnel) |
| **Hộp thư** | http://localhost:8025 | SMTP thật |
| MySQL | `127.0.0.1:3308` | `127.0.0.1:3307` |
| MinIO | http://localhost:9003 | http://localhost:9001 |

## Tài khoản có sẵn

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@dev.local` | `Admin@12345` | Quản trị cấp cao |
| `teacher@dev.local` | `Teacher@12345` | Giáo viên — có lớp mã **DEV123** |
| `student@dev.local` | `Student@12345` | Học viên, đã ở trong lớp, có Premium 1 năm |
| `student2@dev.local` | `Student@12345` | Học viên, đã ở trong lớp |
| `student3@dev.local` | `Student@12345` | Học viên **chưa vào lớp** — dùng để thử nhập mã DEV123 |

Mọi tài khoản đã kích hoạt sẵn, không phải bấm link xác thực.

## Dữ liệu

Nội dung đề copy từ production (1658 đề, 137 đề full 4 part, 626 chủ đề, 570
mục dự đoán) — đủ để thử mọi màn hình.

**Không copy** dữ liệu người dùng: 0 học viên thật, 0 đơn hàng, 0 bài làm, 0
giao dịch. Thư gửi đi vào hộp thư giả ở cổng 8025, không ra ngoài.

## Tắt

```bash
# Tắt nhưng giữ dữ liệu
docker compose -f docker-compose.dev.yml down

# Xoá sạch, lần sau lên là DB trắng
docker compose -f docker-compose.dev.yml down -v
```

## Cập nhật khi có code mới

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Vì sao không đụng được production

| | Dev | Production |
|---|---|---|
| Tên project | `aptis-dev` | `aptis` |
| Container | `aptis-dev-*` | `aptis-*` |
| Volume | `aptis-dev_dev-mysql-data` | `aptis_mysql-data` |
| Port | 8090, 8091, 3308… | 80, 8080, 3307… |

Bốn thứ đều khác nhau, nên `docker compose -f docker-compose.dev.yml` không
chạm được vào container hay dữ liệu của production.

**Lưu ý duy nhất:** khi gõ lệnh cho production vẫn phải đủ cả hai file như cũ:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml <lệnh>
```

## Khác biệt so với production

| | Lý do |
|---|---|
| Chấm AI **tắt** | Bật là mỗi bài thử tốn tiền thật. Đặt `DEV_AI_EVAL_ENABLED=true` và khoá API trong `.env` nếu cần thử |
| Speaking analyzer **không chạy** | Tải model Whisper mất vài GB |
| Thư vào hộp thư giả | Không gửi nhầm cho học viên thật |
