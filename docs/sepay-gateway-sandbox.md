# SePay Payment Gateway — thử Sandbox

> **ĐÃ NGỪNG SỬ DỤNG — 14/10/2026.** Giao diện, API, client, script thử và cấu hình SePay Sandbox đã gỡ theo yêu cầu. Nội dung dưới đây chỉ là lịch sử kiểm thử, không dùng để setup hiện tại. Dùng [hướng dẫn production](sepay-gateway-production.md). Migration V69 và dữ liệu thử cũ được giữ để đối soát, không còn API sử dụng chúng.

Luồng này dành riêng cho admin để kiểm thử **Cổng thanh toán SePay**. Không phải webhook biến động số dư ngân hàng (`/api/v1/payments/webhooks/sepay`), và không chuyển chế độ thanh toán thật của khách hàng sang Sandbox.

## Cấu hình riêng

Trong `.env` được Git bỏ qua:

```dotenv
SEPAY_SANDBOX_MERCHANT_ID=SP-TEST-...
SEPAY_SANDBOX_SECRET_KEY=spsk_test_...
# Tùy chọn: nếu để trống, Sandbox IPN dùng cùng Secret Key Sandbox ở trên.
SEPAY_SANDBOX_IPN_SECRET=
```

Docker Compose chuyển các biến này vào backend. Khóa không trả về frontend, không ghi trong bảng đơn, không log; frontend chỉ nhận merchant, URL, các trường form và chữ ký HMAC. Chỉ nhận bộ khóa có tiền tố Sandbox; host checkout/API được cố định vào môi trường Sandbox.

Trang admin: **Đối soát chuyển khoản** (`/admin/bank-transfers`) → **Cổng thanh toán SePay · Sandbox**. Tạo đơn mô phỏng rồi mở thanh toán SePay. Số tiền thử từ 1.000 đến 5.000.000 VND. Không chuyển khoản ngân hàng thật.

## Cấu hình IPN trên SePay

Giữ **Test Mode** bật, vào **Cổng thanh toán → Cấu hình → IPN**:

- IPN URL: `https://aptispractices.io.vn/api/v1/payments/sepay/ipn/sandbox`
- Auth Type: **Secret Key**, điền giá trị tương ứng `SEPAY_SANDBOX_IPN_SECRET`; nếu biến này trống, dùng cùng Secret Key Sandbox đã cấp.
- Content Type: **application/json**.
- Kích hoạt IPN, bấm **Cập nhật**.

Không dùng URL của dự án IELTS/trycloudflare cũ. Không chọn “Không có” cho Auth Type. Không đưa khóa thử vào cấu hình webhook ngân hàng thật.

## Kiểm tra và an toàn

- Bảng riêng `sepay_sandbox_orders`, mã `APTISSB` + UUID; không tạo `orders`, thanh toán thật hay entitlement/subscription.
- IPN xác thực `X-Secret-Key`, kiểm tra mã đơn, tiền, tiền tệ, trạng thái giao dịch. Backend tra cứu lại API Sandbox để xác nhận trước khi cập nhật trạng thái thử.
- URL redirect không chứng minh đã thanh toán. Nút **Kiểm tra API** tra cứu trạng thái bằng Basic Auth từ backend.
- Cột IPN cho biết callback đã đến backend hay chưa. Có thể API xác nhận `PAID` nhưng chưa có IPN; không coi đây là thử nghiệm IPN đầu-cuối thành công.
- Chỉ admin có quyền `plan:write` sử dụng API quản lý. Callback công khai vẫn bắt buộc Secret Key.
- Gửi lại IPN chỉ thay đổi bộ đếm/thời gian nhận của đơn mô phỏng, không kéo dài gói thật.

Kiểm thử tự động dùng MySQL/Mongo/Redis Testcontainers riêng:

```powershell
cd aptis-backend
mvn '-Dtest=SepayIntegrationTest,SepayWebhookAuthTest,SepaySandboxSignatureTest' test
```

Frontend: `npm test -- src/features/admin/SepaySandboxPanel.test.tsx src/features/billing/CheckoutPage.test.tsx`.

Script vận hành `scripts/check-sepay-sandbox.mjs --create` chỉ tạo một bản ghi trong bảng thử và mở checkout trên trình duyệt sạch; không lấy cookie/profile admin. `--invoice=APTISSB... --inspect` tra cứu SePay API. `--pay` chỉ được phép bấm nút mô phỏng trên host `pay-sandbox.sepay.vn`. `--replay-ipn` gửi callback **thủ công** sau khi API Sandbox xác nhận CAPTURED; không coi lượt replay là IPN do nhà cung cấp tự gửi. Không ghi khóa vào lệnh, source hay kết quả kiểm thử.

## Kết quả kiểm tra ngày 14/10/2026

- 18 kiểm thử backend, 5 kiểm thử frontend: không thất bại/không bỏ qua. Build Java 17 trong Docker, TypeScript/Vite và ESLint qua.
- Phần admin Sandbox đã triển khai; backend/frontend healthy; migration V69 thành công. Lúc triển khai không có phiên học/AI đang hoạt động.
- SePay nhận form ký và mở trang thanh toán Sandbox. Đơn `APTISSBCE6B11D8BF6B4C168CBFA8F8970C7C9D`, 10.000 VND mô phỏng, được nút “Giả lập thanh toán” đưa sang CAPTURED; tra cứu API chính thức HTTP 200, đúng mã/số tiền/tiền tệ.
- Endpoint công khai trả 401 khi thiếu khóa; các API quản lý trả 401 cho người chưa đăng nhập. Replay callback thủ công trả HTTP 200; backend Java tra cứu lại SePay và ghi trạng thái thử PAID, `api_verified_at=2026-10-14 14:38:07 UTC`.
- **Chưa xác nhận IPN tự gửi từ SePay**: cần chủ tài khoản đổi URL/Auth Type trên dashboard và thử lại một đơn mới. Bộ đếm IPN=1 của đơn trên là replay thủ công, không phải bằng chứng IPN đầu-cuối.
- Trước/sau thử, số dòng và checksum của `orders` (29), `payment_transactions` (15), `user_entitlements` (88), `bank_transfer_requests` (29) không đổi. Không cấp gói thật. Tự động xác nhận webhook ngân hàng thật vẫn tắt, chưa lưu khóa thật.

### Sau khi chủ tài khoản báo đã cập nhật IPN

- Tạo đơn mới `APTISSB8525A6D208E748948D88F46301C481EE`, 10.000 VND, chỉ bấm “Giả lập thanh toán”; **không replay callback thủ công** cho đơn này.
- API SePay xác nhận CAPTURED/đúng số tiền/tiền tệ. Access log frontend ghi nhận POST từ bên ngoài vào đúng endpoint Sandbox, HTTP **401**.
- Backend giữ PENDING, `ipn_count=0`, không ghi thời điểm xác thực API: callback bị từ chối ở bước Secret Key. Cần đối chiếu giá trị khóa trong cấu hình IPN với `SEPAY_SANDBOX_IPN_SECRET` (mặc định dùng khóa API Sandbox), không chỉ chọn radio “Secret Key”. Không bỏ xác thực để cho qua.
- Số dòng/checksum của bốn bảng thanh toán/quyền thật ở trên vẫn không đổi. Chưa kết luận IPN đầu-cuối thành công; cần thử lại sau khi hai bên dùng cùng khóa IPN.

Nguồn giao thức: [Sandbox chính thức](https://developer.sepay.vn/vi/cong-thanh-toan/sandbox), [IPN chính thức](https://developer.sepay.vn/vi/cong-thanh-toan/IPN), [SDK Node chính thức](https://github.com/sepayvn/sepay-pg-node).
