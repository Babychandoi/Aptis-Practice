# Cá tính AI Voice: viet_friend v2

AI là bạn trò chuyện Việt–Anh hài hước, cà khịa có ngữ cảnh và có ý kiến riêng. Luyện nói
xảy ra trong hội thoại, không có chấm điểm bài thi. Giọng nam/nữ vẫn do người dùng chọn.

## Nguồn prompt đang dùng trong code

- `aptis-backend/src/main/resources/conversation/prompts/viet-friend-v2.txt`: vai trò, cách nói,
  học tiếng Anh, điều chỉnh phong cách, giới hạn và ví dụ.
- `aptis-backend/src/main/resources/conversation/prompts/viet-friend-profile.json`: cá tính mặc định.
- `AiConversationPrompt`: ghép chỉ dẫn + profile + ngữ cảnh JSON cho `AiConversationService`.
  Prompt được khóa trong ephemeral token phía backend, không phụ thuộc prompt client gửi lên.

Profile có thể thay bằng Spring property `aptis.ai-conversation.personality-resource`, ví dụ
`file:/app/config/viet-friend-profile.json` (file cần được mount và đọc được trong container).
Mặc định dùng resource đóng gói. Cả chỉ dẫn và profile được đọc khi backend khởi động;
đổi file cần build/restart phù hợp. Prompt mới chỉ áp dụng cho phiên mới; session resumption
có thể tiếp tục ngữ cảnh/chỉ dẫn của phiên cũ.

## Hành vi cần giữ

- Tui–bạn mặc định. Tao–mày khi người học chủ động mời. Đùa sắc hơn khi được yêu cầu;
  tăng độ sắc của nhận xét, không tăng số câu chửi.
- Mỗi lượt thường 1–2 câu ngắn, tối đa một câu hỏi; không cần lượt nào cũng đùa hoặc hỏi.
- Khen có lý do, sửa lỗi bằng cách dùng lại câu đúng. Không lấy lỗi phát âm/ngữ pháp,
  nói chậm hay trình độ mới học làm trò cười.
- Tiếng Anh cho hội thoại thực hành, tiếng Việt cho cá tính hoặc giúp nhanh khi bí.
  Làm theo yêu cầu English-only/Vietnamese-only.
- Tắt cà khịa ngay khi người học yêu cầu hoặc đang buồn thật. Cà khịa hành vi/tình huống,
  không công kích ngoại hình, đặc điểm nhạy cảm hoặc bịa chuyện về người thứ ba.
- Không đọc emoji/markdown/chỉ dẫn diễn xuất; giọng nói thể hiện sự hài hước.
- Khi nối lại, tiếp tục chủ đề và các tùy chọn đã được lưu trong ngữ cảnh; không chào lại.

Các lệnh bằng lời: “cà khịa mạnh hơn”, “tao–mày đi”, “đừng cà khịa”, “nghiêm túc chút”,
“nói chậm”, “dễ hơn”, “nói tiếng Việt”, “English only”, “sửa ít/nhiều”, “đừng sửa”.
Hiện đây là hành vi của model qua prompt, chưa có bộ điều khiển cá tính riêng trên UI.
Memory hiện giữ tối đa 24 dòng transcript gần nhất, chưa có hồ sơ sở thích dài hạn.

## Đánh giá

Unit test `AiConversationPromptTest` kiểm tra UTF-8, tải cấu hình, JSON chứa ký tự/heading
giả, không lẫn ngữ cảnh giữa người học và profile không hợp lệ. Test này không chứng minh
model luôn tuân thủ prompt hay chống prompt injection tuyệt đối.

Đánh giá Live có chủ đích, tiêu hao quota thật:

```powershell
node scripts/eval-gemini-persona.mjs
```

Cần `GEMINI_API_KEY` trong môi trường; model lấy từ `GEMINI_LIVE_MODEL` hoặc mặc định
`gemini-2.5-flash-native-audio-preview-12-2025`. Trên máy production, có thể dùng cờ
`--production-credential` để đọc và giải mã một key hợp lệ trong bộ nhớ tiến trình;
script không ghi key/token, không sửa bản ghi người dùng/phiên/billing.

Script dùng input text tổng hợp, output audio + transcript từ Live, tuần tự một kết nối.
Các ca: cà khịa theo ngữ cảnh, tăng/giảm độ đùa, sửa lỗi, không sửa khi được yêu cầu,
buồn thật, A2, C1 English-only, người thứ ba, nối lại tùy chọn và topic chứa lệnh giả.
Có thể chạy riêng một nhóm bằng `--scenario=heldout` (hoặc ID nhóm trong script).
Đọc transcript để đánh giá độ tự nhiên; không đánh giá độ hài bằng so khớp một câu cố định.
`firstAudioMs` tính từ gửi **text** đến audio đầu, không phải độ trễ từ lúc người dùng
dừng nói. Vẫn cần nghe thử trên điện thoại để kiểm tra phát âm, ngắt nghỉ, tiếng vọng và mạng.

Tham khảo: [Google Live API best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices)
về cấu trúc persona → hội thoại → giới hạn và dùng ví dụ cụ thể.

## Kết quả kiểm tra ngày 22/09/2026

- 12 unit test pass với resource cuối cùng.
- Model thử thật: `gemini-2.5-flash-native-audio-preview-12-2025`, voice Aoede.
- Lần thử đầu phát hiện câu dài, đùa khi lịch sử đã yêu cầu dừng và một close 1007.
  Đã chỉnh prompt; harness chuyển từ `sendClientContent` sang `sendRealtimeInput({text})`.
  Chưa kết luận căn nguyên của close 1007 chỉ từ lần thử đó.
- Lần kiểm tra 11 lượt trên 6 nhóm sau chỉnh có audio/transcript, không lỗi kết nối;
  yêu cầu dừng cà khịa trong ngữ cảnh nối lại được giữ đúng ở ca kiểm tra.
- Thêm 4 lượt trên tình huống ngoài ví dụ, rồi chạy lại 4 lượt sau tinh chỉnh cuối:
  đùa về việc tắt báo thức/tải app bỏ quên; đổi sang tao–mày khi mời; chuyển English-only,
  ngừng đùa và ngừng sửa câu khi yêu cầu. Lượt cuối đều có audio/transcript, không lỗi.
- Một câu trả lời thực tế: “Tao nghĩ mày nên đổi tên điện thoại thành ‘nghĩa địa app’...”
  Sau yêu cầu dừng đùa, câu đáp về buổi gặp bạn chỉ hỏi chủ đề âm nhạc.

Đây là mẫu kiểm tra nhỏ có xem xét transcript, không phải chứng nhận chất lượng mọi câu trả lời.
Chưa kiểm tra nghe trực tiếp đầu-cuối trên mic/loa điện thoại trong lần chỉnh prompt này.

Đã triển khai backend lên production tối 22/09/2026 sau khi kiểm tra hoạt động trả về
`0 / 0 / 0`. Backend `healthy`; trang chính và `/api/v1/plans` trả HTTP 200.
SHA-256 prompt trong JAR đang chạy khớp source:
`30656ad66308fa061693a2ccc7099e3f58834aaccc13092bbc72f91ae70a3dd8`.
