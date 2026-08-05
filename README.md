# Aptis Practice

Aptis Practice là nền tảng web luyện thi Aptis General dành cho người Việt, vận hành theo mô hình freemium/Premium. Hệ thống hỗ trợ luyện theo từng kỹ năng và Part, làm bài test đầy đủ, theo dõi lịch sử, quản trị ngân hàng câu hỏi, chấm Writing/Speaking và thanh toán Premium bằng VietQR đối soát thủ công.

> Đây là sản phẩm luyện thi độc lập. Repository không tuyên bố quan hệ chính thức với British Council, Aptis hoặc NAPAS.

## Mục lục

- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ](#công-nghệ)
- [Cấu trúc source](#cấu-trúc-source)
- [Chạy nhanh bằng Docker](#chạy-nhanh-bằng-docker)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Luồng nghiệp vụ](#luồng-nghiệp-vụ)
- [Dữ liệu và migration](#dữ-liệu-và-migration)
- [API và bảo mật](#api-và-bảo-mật)
- [Kiểm thử](#kiểm-thử)
- [Triển khai production](#triển-khai-production)
- [Giới hạn hiện tại](#giới-hạn-hiện-tại)

## Tính năng

### Học viên

- Đăng ký, xác minh email, đăng nhập, làm mới token, quên và đặt lại mật khẩu.
- Dashboard học tập, hành trình luyện tập, mục tiêu tuần và truy cập nhanh từng kỹ năng.
- Cấu trúc Aptis General theo Component và Part:
  - Grammar & Vocabulary
  - Reading
  - Listening
  - Speaking
  - Writing
- Chọn luyện theo Part hoặc làm bài test đầy đủ của kỹ năng.
- Hỗ trợ câu hỏi trắc nghiệm một/nhiều đáp án, nối cặp, sắp xếp, điền đáp án, bài viết dài và ghi âm.
- Autosave câu trả lời, giới hạn lượt phát audio và khôi phục lượt làm đang dở.
- Thi thử, đồng hồ làm bài, nộp bài và xem kết quả theo Component/Part.
- Lịch sử lượt làm, tiến độ và thống kê câu đã làm/sai.
- Nội dung Free/Premium và khóa truy cập theo entitlement thực tế.
- Chọn gói Premium và thanh toán bằng VietQR.

### VietQR và Premium

Hệ thống đang dùng VietQR mức 1, không kết nối API sao kê ngân hàng:

1. Học viên chọn gói và tạo đơn hàng.
2. Backend sinh mã chuyển khoản duy nhất, số tiền và nội dung VietQR.
3. QR có hiệu lực trên giao diện trong 10 phút và hiển thị đếm ngược.
4. Hết hạn, QR bị khóa; học viên phải bấm **Tạo mã QR mới**.
5. Backend đổi mã nội dung chuyển khoản và cấp một cửa sổ 10 phút mới.
6. Học viên bấm **Tôi đã chuyển khoản** để đưa yêu cầu vào danh sách đối soát.
7. Admin kiểm tra sao kê, xác nhận giao dịch rồi hệ thống mới kích hoạt Premium.

Tài khoản seed hiện tại:

| Trường | Giá trị |
|---|---|
| Ngân hàng | MB Bank |
| Số tài khoản | `0384896584` |
| Tên chủ tài khoản | Chưa cấu hình; cập nhật tại **Admin → Đối soát chuyển khoản → Chỉnh tài khoản** |

QR cũ bị hệ thống từ chối sau khi hết hạn, nhưng ảnh đã chụp vẫn có thể được ứng dụng ngân hàng đọc vì VietQR mức 1 không có server thanh toán để vô hiệu mã phía ngân hàng. Muốn xác nhận và hết hạn giao dịch thực sự phải tích hợp payOS, SePay, Casso hoặc Open Banking.

### Quản trị nội dung

- Danh sách, tìm kiếm và lọc bộ câu hỏi.
- Trình tạo bộ câu hỏi theo wizard nhiều bước:
  1. Thông tin và phân loại.
  2. Đề bài, hướng dẫn và tài liệu.
  3. Câu hỏi, lựa chọn, đáp án, audio/ảnh.
  4. Xem trước và hoàn tất.
- Lưu nháp khi quay lại giữa các bước.
- Quy trình nội dung: `DRAFT → IN_REVIEW → PUBLISHED`.
- Yêu cầu sửa, tạm ẩn, lưu trữ và lịch sử revision.
- Preview đúng bản học viên thấy; đáp án chỉ hiện khi người có quyền chủ động yêu cầu.
- Import câu hỏi từ Excel/ZIP và tải báo cáo dòng lỗi.
- Trường chủ đề nhập trực tiếp, quyền Free/Premium và độ hot nội dung.

### Quản trị vận hành

- Quản lý gói Premium, giá, thời hạn, trạng thái bán và thứ tự hiển thị.
- Tra cứu đơn hàng, giao dịch và hoàn tiền.
- Đối soát chuyển khoản theo mã nội dung.
- Xác nhận/từ chối yêu cầu chuyển khoản.
- Cấu hình tài khoản ngân hàng nhận tiền.
- Cấp hoặc thu hồi entitlement thủ công.
- Quản lý chiến dịch dùng thử Premium.
- Tạo báo cáo doanh thu, học tập, lượt làm và danh sách người dùng.
- Giáo viên xem bài Writing/Speaking chờ duyệt và ghi điểm lại.

## Kiến trúc

```text
┌──────────────────────┐
│ React 19 + TypeScript│
│ Vite / nginx         │
└──────────┬───────────┘
           │ REST / JSON, JWT
┌──────────▼───────────┐
│ Spring Boot 3.3      │
│ Security, JPA, Jobs  │
└───┬────────┬────────┬┘
    │        │        │
┌───▼───┐ ┌──▼────┐ ┌─▼─────┐
│ MySQL│ │MongoDB│ │ MinIO │
│ 8.4  │ │  7    │ │       │
└───┬───┘ └───────┘ └───────┘
    │
┌───▼───┐
│ Redis │  khóa job, cache/hạ tầng nền
└───────┘
```

### Phân chia dữ liệu

| Hệ thống | Trách nhiệm |
|---|---|
| MySQL | tài khoản, RBAC, cấu trúc kỳ thi, metadata câu hỏi, gói, entitlement, đơn hàng, thanh toán, tiến độ, điểm tổng hợp, job và audit |
| MongoDB | nội dung câu hỏi linh hoạt, snapshot bài làm, response chi tiết, rubric và kết quả chấm |
| MinIO | audio Listening, hình ảnh, file ghi âm Speaking, avatar, file import/export |
| Redis | khóa phân tán và các nhu cầu phối hợp tiến trình |

Không có transaction xuyên MySQL và MongoDB. Hệ thống dùng UUID do application sinh, idempotency key, snapshot và outbox event để giữ tính nhất quán.

### Nguyên tắc bắt buộc

1. Premium đọc từ `user_entitlements`, không suy ra từ một cờ giao diện.
2. Answer key không rời backend trước khi học viên nộp bài.
3. Mỗi attempt giữ snapshot riêng; sửa đề không làm thay đổi bài đã làm.
4. Không kích hoạt Premium từ URL redirect hoặc lời khai của học viên.
5. Xác nhận chuyển khoản thủ công chỉ có hiệu lực khi admin đối soát và xác nhận.
6. Webhook của cổng thanh toán tương lai phải kiểm tra chữ ký, số tiền, tiền tệ và idempotency.

## Công nghệ

### Frontend

- React 19
- TypeScript 5.6
- Vite 5
- React Router 6
- TanStack Query 5
- Zustand 5
- Tailwind CSS 3
- Axios
- `qrcode` để vẽ nội dung VietQR thành ảnh ngay trên trình duyệt

### Backend

- Java 17
- Spring Boot 3.3
- Spring Security + JWT
- Spring Data JPA/Hibernate
- Spring Data MongoDB và Redis
- Flyway
- Apache POI cho import/export Excel
- MinIO SDK
- Spring Mail
- Testcontainers

### Hạ tầng local

- MySQL 8.4
- MongoDB 7
- Redis 7
- MinIO
- nginx
- Mailpit cho kiểm thử email
- Docker Compose

## Cấu trúc source

```text
.
├── aptis-backend/
│   ├── src/main/java/vn/weconex/aptis/
│   │   ├── auth/          # đăng nhập, token, hồ sơ
│   │   ├── billing/       # gói, đơn hàng, VietQR, hoàn tiền
│   │   ├── catalog/       # Component, Part, topic, question set
│   │   ├── content/       # editor, revision, publish, preview
│   │   ├── entitlement/   # quyền Free/Premium và trial
│   │   ├── evaluation/    # chấm Writing/Speaking và teacher review
│   │   ├── practice/      # attempt, autosave, submit, scoring
│   │   └── platform/      # asset, outbox, lock, import/export, audit
│   ├── src/main/resources/db/migration/
│   ├── src/main/resources/db/mongo/
│   └── README.md
├── aptis-frontend/
│   ├── src/app/           # router và application shell
│   ├── src/api/           # API client và endpoints
│   ├── src/components/    # component dùng chung
│   ├── src/features/      # auth, catalog, practice, billing, admin
│   ├── src/lib/           # format và helper
│   └── src/types/         # DTO TypeScript
├── scripts/               # seed, smoke test và e2e
├── docker-compose.yml
├── .env.example
├── PRODUCT.md
├── DESIGN.md
└── kien-truc-he-thong-luyen-thi-aptis-mysql-mongodb-minio.md
```

## Chạy nhanh bằng Docker

### Yêu cầu

- Docker Desktop
- Git
- Tối thiểu khoảng 6 GB RAM trống cho toàn bộ stack

### Khởi động

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Bash:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Địa chỉ sau khi chạy:

| Dịch vụ | URL/cổng |
|---|---|
| Frontend | http://localhost |
| Vite dev | http://localhost:5173 |
| REST API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/api/swagger |
| OpenAPI JSON | http://localhost:8080/api/docs |
| Health | http://localhost:8080/actuator/health |
| MinIO Console | http://localhost:9001 |
| MySQL | `127.0.0.1:3307` |
| MongoDB | `127.0.0.1:27017` |
| Redis | `127.0.0.1:6379` |
| Mailpit, profile test | http://localhost:8025 |

Kiểm tra log:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

Dừng hệ thống nhưng giữ dữ liệu:

```bash
docker compose down
```

Xóa toàn bộ volume local và chạy lại migration từ đầu:

```bash
docker compose down -v
docker compose up -d --build
```

Lệnh `down -v` xóa database và file local, chỉ dùng khi chắc chắn không cần dữ liệu.

### Chạy từ IDE

Chỉ bật hạ tầng:

```bash
docker compose up -d mysql mongo minio redis
```

Backend cần JDK 17:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'local'
cd aptis-backend
mvn spring-boot:run
```

Frontend cần Node.js 22:

```bash
cd aptis-frontend
npm install
npm run dev
```

## Cấu hình môi trường

Sao chép `.env.example` thành `.env`. `.env` đã bị loại trong `.gitignore` và không được commit.

| Biến | Ý nghĩa |
|---|---|
| `MAIL_HOST`, `MAIL_PORT` | SMTP server |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | thông tin SMTP; Gmail dùng App Password |
| `MAIL_FROM` | địa chỉ gửi |
| `TRANSFER_NOTIFY_EMAIL` | hộp thư nhận thông báo học viên đã báo chuyển khoản |
| `JWT_SECRET` | khóa JWT Base64 tối thiểu 256 bit |
| `MYSQL_HOST_PORT` | cổng MySQL trên host, mặc định `3307` |
| `FRONTEND_HOST_PORT` | cổng frontend, mặc định `80` |
| `SCHEDULER_LOCK` | bật khóa job khi chạy nhiều backend instance |
| `EXPORT_PURGE_INTERVAL` | chu kỳ dọn báo cáo hết hạn |
| `SANDBOX_ASYNC_REFUND` | chỉ phục vụ mô phỏng hoàn tiền khi phát triển |

Sinh JWT secret mới:

```bash
openssl rand -base64 48
```

Mailpit chỉ chạy khi bật profile test:

```bash
docker compose --profile test up -d mailpit
```

## Luồng nghiệp vụ

### Authentication

```text
Đăng ký → email xác minh → kích hoạt tài khoản → đăng nhập
         └→ token một lần chỉ lưu dạng hash

Đăng nhập → access token 15 phút + refresh token 30 ngày
Sai mật khẩu 5 lần → khóa tạm 15 phút
```

### Luyện tập

```text
Chọn kỹ năng → chọn chế độ → chọn Part/bài test
→ tạo attempt + snapshot nội dung
→ bắt đầu → autosave → nộp
→ chấm tự động hoặc tạo evaluation job
→ tổng hợp điểm → cập nhật tiến độ → xem kết quả
```

### Nội dung

```text
DRAFT → IN_REVIEW → PUBLISHED
  ↑          │
  └── CHANGES_REQUESTED

PUBLISHED → SUSPENDED hoặc ARCHIVED
```

### Premium qua VietQR

```text
Chọn gói → tạo order → tạo QR 10 phút
→ chuyển khoản → học viên báo đã chuyển
→ admin kiểm tra sao kê
→ xác nhận payment SUCCESS
→ order PAID → subscription + entitlement
```

Nếu QR hết hạn:

```text
QR bị khóa → tạo QR mới → mã chuyển khoản mới → đếm lại 10 phút
```

### Writing/Speaking

```text
Nộp bài → evaluation job → engine chấm → lưu tiêu chí và feedback
→ giáo viên có thể review lại → kết quả hiệu lực được cập nhật
```

Engine local hiện tại là heuristic để kiểm thử kiến trúc, chưa phải AI production.

## Dữ liệu và migration

Flyway quản lý schema MySQL; Hibernate chỉ `validate`, không tự sửa bảng. Migration hiện tại từ V1 đến V19:

| Phiên bản | Nội dung chính |
|---|---|
| V1 | tài khoản, profile, RBAC, token |
| V2 | cấu trúc kỳ thi Aptis |
| V3 | asset và metadata file |
| V4 | ngân hàng câu hỏi |
| V5 | subscription và entitlement |
| V6 | đơn hàng, payment, webhook, refund |
| V7 | blueprint và attempt |
| V8 | tiến độ học tập |
| V9 | evaluation job và nền tảng |
| V10–V15 | dữ liệu tham chiếu, role, blueprint, trial và index |
| V16 | chuyển khoản thủ công và tài khoản ngân hàng |
| V17 | độ hot bộ câu hỏi |
| V18 | cấu hình tài khoản MB Bank |
| V19 | hạn QR 10 phút và tạo lại mã |

Không sửa migration đã chạy. Mọi thay đổi schema phải tạo file `V{n}__description.sql` mới.

MongoDB được khởi tạo bằng script trong `aptis-backend/src/main/resources/db/mongo`. Script chỉ tự chạy khi volume Mongo còn trống.

## API và bảo mật

### Nhóm endpoint

| Prefix | Chức năng |
|---|---|
| `/api/v1/auth` | đăng ký, đăng nhập, xác minh email, refresh và đặt lại mật khẩu |
| `/api/v1/me` | tài khoản và hồ sơ hiện tại |
| `/api/v1/exam-versions`, `/components`, `/parts`, `/topics` | catalog kỳ thi |
| `/api/v1/practice`, `/attempts` | tạo và làm bài |
| `/api/v1/mock-tests` | đề thi thử |
| `/api/v1/plans`, `/orders`, `/payments` | gói và thanh toán |
| `/api/v1/orders/{id}/bank-transfer` | tạo, lấy, báo chuyển và làm mới VietQR |
| `/api/v1/assets` | presigned upload/download |
| `/api/v1/admin` | nội dung, import/export, billing, entitlement và báo cáo |

### Bảo vệ dữ liệu

- Password dùng BCrypt.
- Access token ngắn hạn; refresh token có vòng đời và khả năng thu hồi.
- Token xác minh email/reset password chỉ lưu hash.
- RBAC kiểm tra ở backend bằng `@PreAuthorize`.
- Nội dung Premium kiểm tra entitlement tại backend.
- Presigned URL MinIO có thời hạn.
- Webhook lưu raw payload, checksum và trạng thái xác minh.
- Payment idempotent theo khóa client/provider.
- Outbox đảm bảo email/event không làm hỏng transaction nghiệp vụ.
- Dữ liệu thời gian lưu UTC.

## Kiểm thử

### Frontend

```bash
cd aptis-frontend
npm run typecheck
npm run build
```

### Backend

JDK 17 là bắt buộc:

```bash
cd aptis-backend
mvn test
```

Build bằng đúng môi trường Docker:

```bash
docker compose build backend frontend
```

### End-to-end

Các script trong `scripts/` tạo dữ liệu test, kiểm tra luồng rồi dọn lại:

```bash
bash scripts/run-e2e.sh
```

Các nhóm kiểm thử gồm:

- auth, email và token
- catalog và các dạng nội dung
- luyện tập, autosave, submit và scoring
- admin question bank, publish và preview
- import/export
- gói, order, entitlement, trial và refund
- outbox, scheduled job và distributed lock
- Writing/Speaking evaluation và teacher review

Không chạy script e2e trên database production.

## Giao diện và accessibility

- Ngôn ngữ chính: tiếng Việt.
- Design direction: “Trung tâm luyện thi điềm tĩnh”.
- Deep teal cho hành động và trạng thái chính; nền kem/trắng ấm.
- Sidebar desktop cố định, điều hướng mobile riêng.
- Control ưu tiên vùng bấm 40–44 px.
- Form có label, trạng thái focus và thông báo lỗi.
- Trạng thái không chỉ phụ thuộc vào màu sắc.
- Mục tiêu thiết kế là WCAG AA; cần audit độc lập trước khi tuyên bố tuân thủ chính thức.

Chi tiết màu sắc và guardrail nằm trong [DESIGN.md](DESIGN.md).

## Triển khai production

Trước khi đưa lên môi trường thật:

- Thay toàn bộ mật khẩu mặc định MySQL, MinIO và JWT secret.
- Không commit `.env`, backup database hoặc file người dùng.
- Bật HTTPS và cookie/security header phù hợp.
- Cấu hình CORS đúng domain.
- Dùng managed database hoặc thiết lập backup/restore định kỳ.
- Bật `SCHEDULER_LOCK=true` khi có nhiều backend instance.
- Thiết lập SMTP thật và giám sát outbox lỗi.
- Thay heuristic evaluation bằng LLM provider production.
- Tích hợp STT thật cho Speaking.
- Nếu cần tự động kích hoạt Premium, tích hợp provider có webhook xác minh.
- Đưa MinIO/public asset qua domain HTTPS riêng.
- Thiết lập monitoring, log tập trung và cảnh báo health.
- Chạy migration trên bản sao staging trước production.
- Audit accessibility, bảo mật và quyền truy cập.

## Giới hạn hiện tại

- VietQR là mức 1 và admin đối soát thủ công; hệ thống không đọc biến động số dư.
- Hạn QR 10 phút được hệ thống áp dụng cho mã đối soát, không thể ngăn ứng dụng ngân hàng đọc ảnh QR cũ.
- Chấm Writing/Speaking local là heuristic, chưa phải AI production.
- Transcription Speaking chưa kết nối dịch vụ STT production.
- Sandbox payment provider vẫn tồn tại cho phát triển/kiểm thử nhưng giao diện mua gói hiện dùng chuyển khoản VietQR.
- Một số schema cũ còn cấu trúc promotion để tương thích dữ liệu, nhưng giao diện hiện không có mã giảm giá.
- Chưa có bằng chứng hoặc chứng nhận về quan hệ chính thức với đơn vị sở hữu kỳ thi.

## Tài liệu liên quan

- [PRODUCT.md](PRODUCT.md) — mục tiêu, định vị và nguyên tắc sản phẩm.
- [DESIGN.md](DESIGN.md) — design system và accessibility guardrail.
- [aptis-backend/README.md](aptis-backend/README.md) — quy tắc backend, transaction và tích hợp provider.
- [Tài liệu kiến trúc dữ liệu chi tiết](kien-truc-he-thong-luyen-thi-aptis-mysql-mongodb-minio.md) — bảng MySQL, collection MongoDB và quy trình nghiệp vụ.
- [scripts/README.md](scripts/README.md) — seed và kiểm thử end-to-end.
- [database/README.md](database/README.md) — backup đầy đủ, dữ liệu nhạy cảm và hướng dẫn khôi phục.

## Giấy phép

Repository hiện chưa khai báo giấy phép mã nguồn mở. Mọi quyền được bảo lưu cho chủ sở hữu dự án cho đến khi có file `LICENSE` chính thức.
