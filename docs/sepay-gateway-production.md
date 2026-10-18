# SePay Payment Gateway production

Luồng checkout host trên SePay đã được tắt cho đơn mới để tránh nhầm với QR chuyển khoản trong app. QR chuyển khoản trong app vẫn dùng webhook biến động số dư ngân hàng tại `/api/v1/payments/webhooks/sepay`. Giữ API/IPN Gateway production để nhận xác nhận cho hóa đơn đã phát hành trước khi tắt.

## Cấu hình `.env`

```dotenv
SEPAY_ENABLED=false
SEPAY_ENV=production
SEPAY_MERCHANT_ID=YOUR_LIVE_MERCHANT
SEPAY_SECRET_KEY=YOUR_LIVE_SECRET
# Khóa riêng cho IPN, từ 32 ký tự. Nếu trống, dùng SEPAY_SECRET_KEY.
SEPAY_IPN_SECRET=
```

Chỉ dùng các biến production trên; các biến SePay Sandbox đã loại bỏ khỏi `.env`, Compose và file mẫu. Chỉ hỗ trợ `SEPAY_ENV=production`; khóa thử hoặc cấu hình sai bị chặn. `SEPAY_ENABLED=false` ngăn tạo checkout Gateway mới. IPN và tra cứu SePay vẫn dùng thông tin production để hoàn tất hóa đơn Gateway đã phát hành; không xóa khóa/IPN cấu hình cho tới khi các hóa đơn cũ được đối soát.

Sau khi sửa `.env`, chạy `scripts/deploy-prod.sh --no-build backend` để Docker Compose nạp lại biến. Việc đổi `.env` không tự cập nhật container đang chạy. Script kiểm tra không có người đang học trước khi restart. Không in `docker compose config` đầy đủ, môi trường container hoặc khóa vào log.

## Cấu hình SePay

Trong **Production** của Cổng thanh toán SePay (tắt Test Mode):

- IPN URL: `https://aptispractices.io.vn/api/v1/payments/sepay/ipn`
- Auth Type: **Secret Key**, nhập đúng giá trị `SEPAY_IPN_SECRET`; nếu biến trống, dùng Secret Key production.
- Content Type: `application/json`.
- Kích hoạt IPN, bấm Cập nhật.

Đây không phải endpoint `/ipn/sandbox` hoặc `/payments/webhooks/sepay`. Các cấu hình trên dashboard có thể khác nhau giữa hai môi trường; phải kiểm tra riêng production.

## Luồng cũ (không dùng cho đơn mới)

Đơn mới đủ điều kiện → checkout Aptis tạo invoice `APTISPG` + UUID và giao dịch PENDING → người dùng bấm form POST có chữ ký tới `https://pay.sepay.vn/v1/checkout/init` → quét QR trên SePay → IPN xác thực → backend tra cứu lại `https://pgapi.sepay.vn/v1/order/detail/{invoice}` → khóa đơn, ghi payment SUCCESS, cấp gói thông qua SubscriptionActivationService hiện có → checkout tự cập nhật PAID.

Giá lấy từ đơn do backend tạo, không nhận giá từ client. Redirect chỉ quay về `/checkout/{orderId}`, không cấp quyền; các tham số `success`, `error`, `cancel` không phải bằng chứng thanh toán. AI Voice mở phòng AI, Premium mở phần luyện đề.

Đơn đã có QR chuyển khoản cũ giữ nguyên phương thức cũ để không cung cấp hai mã thanh toán khác nhau. Đơn Gateway không tạo thêm QR cũ kể cả khi gọi API thủ công. Các đơn dưới 1.000đ giữ luồng chuyển khoản/đối soát cũ. Không âm thầm chuyển về phương thức khác khi cấu hình/tra cứu SePay lỗi.

## Bảo vệ giao dịch

- Khóa API/khóa IPN chỉ ở server. Frontend nhận merchant, các trường form và chữ ký, không nhận secret.
- Invoice gắn duy nhất với order/payment/merchant. Gọi checkout lại dùng cùng invoice, không tạo payment trùng. Không cấp gói từ invoice Sandbox.
- Xác thực header `X-Secret-Key` constant-time trước khi xử lý; IPN tối đa 32KB. Đối chiếu loại/trạng thái thanh toán, số tiền nguyên, VND, invoice, provider order ID; kiểm tra lại CAPTURED từ API production bằng Basic Auth.
- Receipt lưu các trường đối soát tối thiểu, không lưu toàn bộ thông tin khách hàng. Event key, checksum bất biến, khóa order và ràng buộc transaction ID duy nhất chống IPN trùng/song song/giao dịch dùng lại.
- Payment/đơn/subscription/entitlements/audit/receipt commit cùng transaction. Nếu API hoặc cấp quyền lỗi, chưa ACK thành công và không cấp quyền một phần. Kiểm tra Nhật ký IPN trên SePay để gửi lại khi cần.
- Callback đến muộn vẫn được xử lý nếu thời điểm chuyển tiền hợp lệ trước hạn đơn. Tiền chuyển ngoài hạn, đơn đã thanh toán/hủy hoặc không khớp chuyển REVIEW để admin đối soát, không tự cấp thêm gói.
- TRANSACTION_VOID chuyển REVIEW; chưa triển khai tự hoàn tiền hoặc tự thu hồi quyền từ thông báo hủy. Hoàn chuyển khoản cần quy trình đối soát thủ công, không giả báo hoàn tiền thành công.

Admin **Đối soát chuyển khoản → Cổng thanh toán SePay · Production** xem trạng thái cấu hình và 30 receipt gần nhất. `APPLIED`: đã xác nhận/cấp gói; `REVIEW`: cần đối soát, xem reason. Quyền quản trị `plan:write` bắt buộc. Không còn khu vực SePay Sandbox.

## Kiểm thử và xác nhận go-live

Backend: `mvn '-Dtest=SepayIntegrationTest,SepayWebhookAuthTest,SepayCheckoutSignatureTest' clean test` chạy trên MySQL/Mongo/Redis Testcontainers riêng, mock các nhà cung cấp và mail. Kiểm thử Premium/AI riêng, retry/song song, quyền sở hữu, legacy QR, thiếu/sai khóa, API chưa CAPTURED, số tiền sai, rollback khi API/cấp gói lỗi, thời hạn, dùng lại giao dịch, thông báo hủy, khóa thử không dùng production và các endpoint thử cũ bị chặn.

Frontend: `npm test -- src/features/billing/CheckoutPage.test.tsx src/features/admin/SepayGatewayPanel.test.tsx`. Kiểm tra form POST tới host live, không tạo QR cũ, redirect không xác nhận thanh toán/không mời chuyển thêm tiền, thành công mở đúng sản phẩm và admin chỉ hiển thị production.

Không dùng giao dịch mô phỏng để kết luận thanh toán thật đã thành công. Sau khi endpoint chạy và dashboard live cập nhật, chủ tài khoản cần thanh toán một đơn thực để kiểm chứng IPN HTTP 200, receipt APPLIED, payment SUCCESS và quyền đúng sản phẩm. Không tự chuyển tiền thật trong smoke test.

Nguồn: [SePay bắt đầu nhanh](https://developer.sepay.vn/vi/cong-thanh-toan/bat-dau), [IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN), [SDK Node chính thức](https://github.com/sepayvn/sepay-pg-node).

## Triển khai ngày 14/10/2026

- 26 kiểm thử backend và 7 kiểm thử frontend qua, không bỏ qua. TypeScript/Vite, ESLint và build Java 17 trong Docker thành công. Migration V70 được kiểm thử trên MySQL riêng trước khi áp dụng production.
- Triển khai backend/frontend khi script báo 0 người học/đăng nhập/phiên AI đang hoạt động. Hai container healthy, migration production lên V70.
- Di chuyển nguyên giá trị hai khóa live người vận hành đã điền từ tên `SEPAY_SANDBOX_*` sang `SEPAY_MERCHANT_ID`/`SEPAY_SECRET_KEY`; khôi phục bộ khóa thử vào các biến Sandbox. `SEPAY_ENABLED=true`, `SEPAY_ENV=production`; IPN dùng chung live secret khi `SEPAY_IPN_SECRET` trống. Không in/commit khóa.
- `node scripts/check-sepay-production.mjs` xác nhận backend đang chạy khớp `.env`, API production xác thực HTTP 200, admin API chặn anonymous, IPN thiếu/sai khóa trả 401, invoice Sandbox trả 400. Authenticated CONFIGURATION_PROBE trả 200 và không tạo receipt. Đây là probe nội bộ, **không phải IPN từ một thanh toán thật**.
- Chủ tài khoản xác nhận đã cập nhật IPN ở chế độ Production. Chưa có giao dịch thanh toán thật để xác nhận IPN APPLIED/cấp gói đầu-cuối; cần chủ tài khoản thanh toán một đơn thật và đối chiếu log/receipt/quyền.
- Sau deploy/probe: bảng invoice/receipt Gateway trống; số dòng/checksum của `orders` (29), `payment_transactions` (15), `user_entitlements` (88), `bank_transfer_requests` (29) không đổi so với trước deploy. Không tạo đơn/cấp quyền/chuyển tiền thật trong smoke test.
- Tự động hoàn tiền SePay chưa hỗ trợ. Các đơn chuyển khoản/QR cũ giữ cơ chế đối soát cũ; không tự bật webhook ngân hàng bằng cấu hình Gateway.

### Gỡ SePay Sandbox theo yêu cầu

- Đã gỡ panel/API/client/service/script SePay Sandbox, loại bỏ các biến `SEPAY_SANDBOX_*` khỏi `.env`, Compose và mẫu cấu hình. Chỉ còn Gateway production trên giao diện. Các endpoint thử cũ bị deny kể cả với admin.
- Chuyển hàm ký form sang `SepayCheckoutSignature` độc lập, giữ nguyên thuật toán/chữ ký checkout thật.
- 23 kiểm thử backend và 6 kiểm thử giao diện qua; build/lint thành công. Đã triển khai khi hệ thống không có người đang học; backend/frontend healthy.
- Không xóa migration V69 đã áp dụng hoặc 3 bản ghi thử lịch sử. Không sửa khóa live, đơn đã thanh toán hoặc quyền Premium/AI. Tài liệu Sandbox được đánh dấu lịch sử, không còn là hướng dẫn setup đang hoạt động.
