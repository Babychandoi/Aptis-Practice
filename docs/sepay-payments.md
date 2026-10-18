# Thanh toán chuyển khoản tự động bằng SePay

Trang quản trị: **Đối soát chuyển khoản → Thanh toán tự động SePay**. Cấu hình yêu cầu quyền `plan:write`; danh sách giao dịch yêu cầu `order:read`. Gói luyện đề và AI Voice đi qua cùng luồng xác nhận thanh toán nhưng cấp quyền đúng sản phẩm riêng.

## Kích hoạt trên production

1. Trong hệ thống, chọn đúng tài khoản ngân hàng đang hoạt động và đã liên kết ở SePay.
2. Chọn **HMAC-SHA256** hoặc **API Key**. Nhập khóa của webhook hoặc bấm **Tạo khóa mới**, sao chép để dùng cùng một khóa ở SePay, rồi lưu. Khóa cần 32–256 ký tự và không có khoảng trắng ở đầu/cuối. Khóa API Access/Bearer dùng để gọi API SePay là loại khác; tính năng này dùng khóa riêng của webhook.
3. Trên SePay **Live → Tích hợp → Webhooks**, thêm webhook:
   - URL: `https://aptispractices.io.vn/api/v1/payments/webhooks/sepay`.
   - Loại sự kiện: **Tiền vào**; chọn đúng tài khoản ngân hàng.
   - Content-Type: `application/json`.
   - Xác thực: đúng kiểu và khóa đã lưu trong hệ thống.
   - Bật tự động gửi lại khi lỗi.
4. Công ty → Cấu hình chung → Cấu trúc mã thanh toán: tiền tố **AP**, hậu tố **8 chữ số**. Trong thời gian chuyển đổi, không bật bộ lọc bỏ qua giao dịch không có mã/không chọn tiền tố bắt buộc: các QR cũ chỉ có 8 chữ số cần webhook nguyên nội dung để đối chiếu.
5. Bấm **Gửi thử** ở SePay. Payload `id=0` chỉ kiểm tra xác thực và trả `{"success":true}`, không cấp gói.
6. Bật **Tự động xác nhận chuyển khoản** trong hệ thống và lưu. Kiểm tra giao dịch thanh toán thật đúng số tiền và mã của một đơn hàng; trạng thái APPLIED và đơn PAID xác nhận toàn bộ luồng ngân hàng đã kết nối.

Không gửi khóa qua chat hoặc đưa vào Git. UI chỉ trả trạng thái đã cấu hình và 4 ký tự cuối; khóa được lưu AES-GCM với khóa tách biệt mục đích, suy ra từ JWT_SECRET ổn định. Đổi JWT_SECRET cần cấu hình lại khóa webhook.

## Xử lý giao dịch

- Endpoint xác thực trước khi ghi dữ liệu. HMAC ký `{timestamp}.{raw_body}`, kiểm tra sai lệch timestamp tối đa ±5 phút. API Key yêu cầu `Authorization: Apikey ...`; không dùng JWT để chứng thực SePay.
- Mỗi `id` và mã tham chiếu ngân hàng chỉ xử lý một lần. Receipt, payment, order, subscription, entitlement, hoa hồng, audit và outbox cùng transaction. Lỗi cấp gói rollback toàn bộ để SePay gửi lại; endpoint chỉ trả success khi transaction đã commit.
- Chỉ tự cấp gói khi tiền vào đúng ngân hàng/số tài khoản đã chọn, mã chuyển khoản xác định được duy nhất, số tiền chính xác bằng đơn và tiền VND. Mã mới AP + 8 chữ số; mã số cũ được bảo lưu. Không cộng dồn khoản thiếu hoặc tự dùng khoản thừa.
- Sau khi refresh QR, lịch sử mã cũ vẫn liên kết đúng yêu cầu chuyển khoản. Kiểm tra thời điểm giao dịch theo UTC+7 do SePay gửi: từ lúc phát hành mã (dung sai 5 giây) đến hạn đơn. Hết 10 phút hiển thị QR không hủy một giao dịch ngân hàng thật trong cửa sổ đơn 30 phút.
- Webhook đến chậm nhưng tiền chuyển trước hạn đơn có thể khôi phục đơn EXPIRED. Đơn CANCELLED/REJECTED/REFUNDED không được tự cấp lại. Job hết hạn khóa bản ghi để tránh ghi đè kết quả thanh toán song song.
- Payload Gửi thử id=0, referenceCode bắt đầu SB hoặc subAccount SBSEPAY được coi là mô phỏng và không cấp quyền. Không dùng cùng khóa webhook Test mode và Live.
- Receipt REVIEW hiển thị lý do trong quản trị, gồm sai số tiền, sai ngân hàng, mã thiếu/không tìm thấy, đã thanh toán hoặc ngoài hạn. Admin đối chiếu và dùng thao tác xác nhận hiện có khi phù hợp. Receipt REVIEW có thể được đánh giá lại khi SePay replay cùng payload sau khi sửa cấu hình.

QR vẫn theo chuẩn VietQR/EMVCo để ứng dụng ngân hàng đọc được; hệ thống vẽ QR từ chuỗi đầy đủ và không cần tải ảnh từ dịch vụ QR ngoài. SePay đảm nhiệm thông báo giao dịch và xác nhận tự động.

## Hoàn tiền

Webhook ngân hàng chỉ báo giao dịch, không cung cấp lệnh hoàn tiền. Provider `sepay` từ chối hoàn tự động bằng thông báo rõ ràng; không đánh dấu tiền đã hoàn hoặc thu hồi quyền khi chưa có kết quả ngân hàng. Đối soát hoàn chuyển khoản với ngân hàng theo quy trình tài chính riêng.

## Kiểm thử

`mvn -B '-Dtest=SepayWebhookAuthTest,SepayIntegrationTest' test` dùng MySQL/Mongo/Redis Testcontainers riêng và mock mail, Google, MinIO. Bao gồm HMAC raw bytes/tamper/replay, API Key, cấp Premium/AI riêng, callback trùng/song song, mã tham chiếu dùng lại, số tiền/ngân hàng/mã sai, tiền ra, QR cũ, webhook đến chậm, hạn đơn, sandbox, rollback/retry và quyền admin. Không tạo thanh toán thử trên DB production.

Tài liệu SePay: [payload và phản hồi](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), [xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc), [tạo webhook](https://developer.sepay.vn/vi/sepay-webhooks/tao-webhook).

## Bản production ngày 14/10/2026

Đã build/deploy backend/frontend; cả hai healthy, Flyway ở V68. Idle gate trước deploy: phiên làm bài, hoạt động/đăng nhập 15 phút và AI Voice đều bằng 0. Đối chiếu count và chữ ký dữ liệu trước/sau: 29 đơn, 15 payment, 88 entitlement, 29 yêu cầu chuyển khoản giữ nguyên; 29 mã hiện có được bảo lưu trong bảng lịch sử mới. Không tạo đơn, thanh toán hoặc webhook thành công giả trên production.

12 kiểm thử backend SePay và 3 kiểm thử checkout frontend đạt; build Docker Java 17, build TypeScript/Vite và ESLint các file sửa đạt. Qua tên miền production, trang admin trả 200 và hai endpoint cấu hình/giao dịch từ chối khách với 401. Webhook hiện trả 503 SERVICE_UNAVAILABLE vì chưa lưu khóa, đúng trạng thái chưa kích hoạt. Cấu hình ban đầu HMAC, enabled=false, không có secret, không có receipt giao dịch.

Việc còn cần ở tài khoản SePay: lưu cùng khóa ở hai bên, tạo webhook Live với URL đã nêu, gửi thử và bật tự xác nhận trong admin. Chưa xác minh dòng tiền thật từ SePay vì webhook Live chưa được cấu hình.
