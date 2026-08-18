# Scripts

## Benchmark luồng luyện tập

`benchmark-practice.mjs` dùng Node 20 để đo luồng tạo/start attempt, gửi hai
autosave song song và tải lại xác nhận không mất dữ liệu. Chỉ chạy trên staging
hoặc database test vì script tạo attempt thật.

```powershell
$env:APTIS_BENCH_EMAIL='student@test.local'
$env:APTIS_BENCH_PASSWORD='password'
$env:APTIS_BENCH_PART_ID='16000000-0000-4000-8000-000000000021'
$env:APTIS_BENCH_CONCURRENCY='10'
$env:APTIS_BENCH_ITERATIONS='20'
node scripts/benchmark-practice.mjs
```

Script thoát mã `1` nếu có lỗi/mất autosave hoặc p95 vượt
`APTIS_BENCH_P95_LIMIT_MS` (mặc định 2000 ms).

Công cụ hỗ trợ phát triển. Chạy khi hệ thống đã lên (`docker compose up -d`).

## Seed dữ liệu thử

Ngân hàng đề rỗng sau khi khởi động lần đầu. Hai file dưới tạo 2 bộ câu hỏi mẫu
— một FREE, một PREMIUM — để thử luồng kiểm tra quyền truy cập mà không phải
soạn tay hay import:

```bash
docker exec -i aptis-mysql mysql -uaptis -paptis aptis < scripts/seed-sample-questions.sql
docker exec -i aptis-mongo mongosh --quiet < scripts/seed-sample-questions.js
```

Phải chạy cả hai: `.sql` tạo metadata ở MySQL, `.js` tạo nội dung ở MongoDB với
cùng UUID. Thiếu một bên thì backend báo `QUESTION_SET_CONTENT_MISSING`.

## Kiểm chứng end-to-end

Bốn bộ, tổng **206 kiểm tra** qua HTTP thật trên hệ thống đang chạy:

```bash
bash scripts/e2e-smoke.sh           # 42 kiểm tra — luồng cốt lõi
bash scripts/e2e-admin-mock-ai.sh   # 54 kiểm tra — admin nội dung, mã giảm giá, thi thử, chấm AI
bash scripts/e2e-platform.sh        # 59 kiểm tra — outbox, khóa, trial, hoàn tiền, import/export, review
bash scripts/e2e-content-types.sh   # 51 kiểm tra — import 5 dạng bài, import ZIP, webhook hoàn tiền, dọn file
```

`e2e-smoke.sh` phủ:

| Nhóm | Nội dung |
|---|---|
| Hạ tầng | nginx, SPA fallback, API proxy |
| Auth | đăng ký, xác thực email, token dùng một lần, login, JWT, RBAC |
| Bảo mật token | rotation, phát hiện reuse, thu hồi cả chuỗi token |
| Quyền nội dung | FREE mở, PREMIUM khóa, `lockReason` |
| Làm bài | tạo lượt, answer key bị lược, autosave, nộp, chấm điểm |
| Thanh toán | giá lấy từ DB, idempotency đơn hàng |
| Webhook | chữ ký sai, số tiền sai, hợp lệ, gửi lặp |
| Entitlement | Premium mở nội dung, thu hồi khóa lại |

`e2e-admin-mock-ai.sh` phủ:

| Nhóm | Nội dung |
|---|---|
| Admin soạn bài | tạo, code trùng, `itemCount`/`maxScore` dẫn xuất từ nội dung |
| Vòng đời duyệt | chặn publish tắt, submit-review, publish, chặn sửa bài đã publish, revision |
| Validate publish | bắt ≥4 lỗi trong một lượt, nội dung lỗi không publish |
| Preview | mặc định ẩn đáp án, `revealAnswers` cho editor, học viên nhận 403 |
| Mã giảm giá | phần trăm, cố định, trần giảm, min order, chuẩn hóa chữ thường |
| Áp mã vào đơn | chưa đốt lúc tạo đơn, webhook chặn giá gốc, đốt sau thanh toán, giới hạn/người |
| Thi thử | đọc blueprint 18 Part, tạo lượt, điểm theo Part và học phần, CEFR |
| Chấm AI | tạo job, worker xử lý, không retry, chốt điểm, 5 tiêu chí rubric, feedback |

`e2e-platform.sh` phủ:

| Nhóm | Nội dung |
|---|---|
| Outbox | event không handler, phát tới handler, retry có backoff |
| Khóa phân tán | job bị bỏ qua khi khóa bị giữ, chạy lại khi nhả |
| Dùng thử | mở quyền, chặn dùng lại, chiến dịch lạ |
| Admin gói | DRAFT không bán được, kích hoạt, mã trùng, học viên nhận 403 |
| Hoàn tiền | một phần giữ quyền, chặn hoàn quá, hoàn hết thu hồi quyền |
| Entitlement | tặng tay, thu hồi tay |
| Import Excel | upload, gộp dòng cùng code, dòng lỗi, file báo lỗi, dừng ở DRAFT |
| Export | sinh file, có hạn dùng, tải được, học viên nhận 403 |
| Giáo viên chấm lại | ghi đè điểm AI, giữ bản AI, học viên chỉ thấy 1 bản |

`e2e-content-types.sh` phủ:

| Nhóm | Nội dung |
|---|---|
| Import 5 dạng bài | chọn một, chọn nhiều, nối cặp, sắp xếp, trả lời ngắn; task_type gán đúng |
| Chặn dạng không hợp lệ | dạng tự luận, answer key trỏ sai option |
| Chấm điểm thật | nộp đúng được điểm tối đa, nộp sai được 0, điểm từng phần khi nối cặp |
| Import ZIP | lọc định dạng, bỏ rác trình nén, chống zip slip, file rỗng |
| Webhook hoàn tiền | giữ PROCESSING chờ cổng, chặn chữ ký sai, thu hồi sau xác nhận, gửi lặp |
| Dọn file quá hạn | xóa khỏi MinIO, giữ lịch sử job, không đụng job còn hạn |

Phần "chấm điểm thật" là phần đáng giá nhất: answer key import sai thì học viên
trả lời đúng vẫn bị 0 điểm, mà lỗi chỉ lộ ra sau khi bộ câu hỏi đã publish.

**Cả bốn script tự dọn dữ liệu ở đầu mỗi lần chạy**, nên chạy lại được nhiều lần
và không phụ thuộc thứ tự. Mỗi bộ dùng tài khoản riêng và tự gán role cần thiết.

Đã xác nhận 206/206 pass, chạy lặp nhiều lần và đảo thứ tự.

Bộ test cần vài thứ khác cấu hình thường ngày: Mailpit (đọc token xác thực từ
thư), khóa phân tán, hoàn tiền bất đồng bộ, chu kỳ dọn file ngắn. Chạy từng bộ
trực tiếp thì phần nào thiếu cờ sẽ tự bỏ qua và in lý do.

Không phải nhớ gì cả — script bọc lo hết rồi khôi phục nguyên trạng:

```bash
bash scripts/run-e2e.sh              # cả 4 bộ
bash scripts/run-e2e.sh e2e-smoke    # một bộ
```

Script bật Mailpit, trỏ backend về đó, bật đủ cờ, chạy test, rồi trả lại cấu
hình SMTP trong `.env` và tắt Mailpit — kể cả khi bị Ctrl+C giữa chừng.

Vì sao cần Mailpit: token xác thực chỉ lưu dạng **hash** trong DB nên không lấy
ngược ra được, buộc phải đọc từ thư. Gửi qua SMTP thật thì thư bay ra ngoài,
bước xác thực email hỏng (script báo rõ kèm lệnh khắc phục), và mỗi lượt chạy
dội vài chục thư vào hộp thư thật.

Seed data (role, gói, blueprint, mã giảm giá, ngân hàng câu hỏi) **không** bị
xóa. Script chỉ dọn tài khoản, đơn hàng, lượt làm bài, entitlement và các bộ câu
hỏi do chính nó tạo (code bắt đầu bằng `E2E_`).

**Chỉ chạy trên môi trường phát triển** — script xóa dữ liệu giao dịch.

Yêu cầu duy nhất: `seed-sample-questions.*` đã chạy (bộ thứ nhất cần bộ câu hỏi
`GV_FREE_001` và `GV_PREM_001`).
