# AI Voice: khôi phục kết nối và giữ ngữ cảnh

## Hợp đồng của phòng

Một phòng trên ứng dụng có thể đi qua nhiều WebSocket Gemini. Mất socket không đóng modal,
không khởi tạo lại microphone và không tạo thêm bản ghi tính thời lượng. `/reconnect` giữ
nguyên ID phòng, ngày bắt đầu, thời điểm hết hạn, model, giọng và project của phiên được resume.
Chỉ khi lease của ứng dụng hết hạn nhưng còn hạn mức ngày mới tạo lease kế tiếp.

- Setup có timeout 12 giây và có thể hủy ngay cả trước `setupComplete`.
- Socket/callback cũ bị vô hiệu hóa; lỗi lưu transcript không ngăn `/close`.
- Giữ checkpoint resumption hợp lệ. Khi checkpoint đang không resumable hoặc bị từ chối,
  mở kết nối mới với toàn bộ transcript được lưu, không chỉ 8 lượt gần nhất.
- Gemini `GoAway` được xử lý tại điểm yên lặng, hoặc trước deadline nếu cuộc nói chuyện còn tiếp diễn.
- Retry có backoff và jitter; 429 chờ ít nhất 60 giây, không bị sự kiện online/visibility bỏ qua.
- Watchdog chỉ theo dõi lượt nói chưa được đáp lại/generation bị treo, không nối lại vì người học im lặng.
- Micro khóa khi AI nói; mở lại sau khi generation kết thúc, hàng đợi âm thanh đã phát hết và 400 ms chống vọng.
  Socket ngắt giữa câu không để mic khóa vĩnh viễn vì thiếu `turnComplete`.
- Hàng đợi âm thanh được phát nối tiếp, không bỏ âm thanh đã nhận chỉ vì socket đổi.
- Tối đa 12 giây PCM chưa gửi được giữ trong RAM khi mất mạng. Khi nối lại, gửi theo FIFO
  với tốc độ tối đa khoảng 4 lần realtime, có nhường event loop; mic mới không chen lên trước đoạn cũ.

## Dữ liệu và giới hạn

Migration V61 bổ sung snapshot lịch sử, revision, prompt kết nối, giọng và ID lượt nói.
Snapshot có revision tăng dần; retry hoặc request đến trễ không tạo bản ghi trùng hay ghi đè bản mới.
Phiên cũ V60 và client đang mở trước khi deploy vẫn có đường tương thích `/turns`.
Đóng phòng không chờ model tóm tắt bên ngoài; snapshot là nguồn khôi phục chính.

Lịch sử có tối đa 200.000 ký tự, 10.000 lượt, mỗi lượt 8.000 ký tự. Không âm thầm cắt lịch sử
để vừa prompt. Khi đạt giới hạn, phòng dừng với thông báo và lưu snapshot hợp lệ cuối cùng.
Mặc định phòng mới kế thừa lịch sử gần nhất của cùng tài khoản. Khi muốn đổi hẳn cuộc trò chuyện
hoặc đạt giới hạn, người học chọn “Bắt đầu cuộc trò chuyện mới, không mang theo ngữ cảnh trước”.
Tùy chọn này tạo ranh giới ngữ cảnh mới, không xóa archive cũ; reconnect/handoff tự động luôn giữ lịch sử.
Đóng rồi mở nhanh sẽ chờ các request lưu/đóng phòng cũ hoàn tất trước khi tạo phòng kế tiếp.

Không thể cam kết “không bao giờ gián đoạn” hoặc nhớ vô hạn:

- Internet, quota nhà cung cấp, quyền mic và autoplay của trình duyệt vẫn có thể buộc phải chờ/thao tác lại.
- PCM đã gửi nhưng chưa được Gemini xác nhận/transcribe không có ACK để replay chính xác một lần.
  Mất mạng quá lâu có thể cần nhắc lại đoạn vừa nói; giao diện báo khi buffer bị tràn.
- Native session được Gemini nén ngữ cảnh; khôi phục bằng full text không phục hồi nguyên âm sắc/ngữ điệu
  của toàn bộ audio cũ, cũng không bảo đảm model truy hồi đúng mọi chi tiết trong mọi câu hỏi.
- Đóng tab/mất nguồn có thể mất phần transcript chưa kịp lưu (debounce 2 giây).

## Kiểm chứng

```powershell
cd aptis-frontend
npx vitest run src/features/conversation
npm run build
cd ../aptis-backend
mvn -B -s .mvn/settings.xml '-Dtest=AiConversation*Test' test
mvn -B -s .mvn/settings.xml '-Dtest=SchemaConsistencyTest#contextLoadsWithValidatedSchema' test
```

Smoke có tính quota thật, chỉ chạy khi chủ động chọn:

```powershell
node scripts/test-gemini-recovery.mjs --production-credential
```

Ngày 23/09/2026: smoke ba kết nối đã qua trên
`gemini-2.5-flash-native-audio-preview-12-2025`: constrained ephemeral token + native WebSocket,
resume cùng project, và kết nối mới nhớ lại dữ kiện ở lượt đầu trong transcript 32 lượt.
Không ghi vào phiên học/nghiệp vụ của người dùng; không ghi key/handle ra log.
Đây là đầu vào text tổng hợp, không phải benchmark microphone trên điện thoại.

Trước deploy cần kiểm tra cả bài thi đang làm và phòng AI Voice đang active.
Deploy backend có migration trước frontend. Không restart khi có học viên đang sử dụng.

## Bản phát hành 23/09/2026

- 44 kiểm thử frontend, 46 kiểm thử backend conversation và 2 kiểm thử MySQL/schema đều qua.
- Đã build và triển khai cả backend/frontend sau khi tất cả bộ đếm người dùng đang hoạt động về 0.
- Production lên schema V61 thành công lúc khoảng 21:44 (Asia/Ho_Chi_Minh); cả hai dịch vụ healthy.
- Domain thật và API plans trả 200; AI access khi không đăng nhập trả 401 đúng thiết kế.
- Bản sao MySQL trước migration: `D:/Aptis Practices/Aptis-Practise-Backups/mysql-ai-voice-v60-20260923-2135.sql`
  (89 bảng, 13.457.905 byte). SHA-256: `1B9E7F22CFF0D39D80BC3500839588CC06CC0263A846CC661A2374E20E86056C`.
- Không có image rollback đã ghim: Docker không tìm được image ID của container cũ khi thử gắn tag.
  V61 chỉ thêm cột; nếu phải rollback, chuẩn bị lại image của mã cũ, không tự động xóa cột/dữ liệu mới.
- Chưa có kiểm chứng microphone trên điện thoại vật lý hoặc benchmark phiên dài 2 giờ.
