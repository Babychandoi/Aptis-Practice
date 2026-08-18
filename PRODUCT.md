# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người dùng chính là người Việt đang tự luyện Aptis General để chuẩn bị thi lấy chứng chỉ. Họ cần một nơi luyện tập bằng tiếng Việt, bám sát cấu trúc bài thi thật và có thể theo dõi kết quả qua nhiều lần luyện.

Hệ thống cũng phục vụ các vai trò vận hành nội dung và quản trị, gồm biên tập viên, người duyệt nội dung, giáo viên chấm bài và quản trị viên. Quản trị viên còn giữ một việc thủ công định kỳ: đối soát sao kê ngân hàng để xác nhận chuyển khoản Premium.

## Product Purpose

Aptis Practice giúp người học luyện các kỹ năng trong Aptis General, thực hành theo từng Part, tạo bài luyện tùy chọn và làm đề thi thử. Sản phẩm hỗ trợ chấm tự động cho các dạng bài phù hợp và chấm Writing/Speaking để người học nhận điểm cùng phản hồi theo tiêu chí.

Thành công nghĩa là người học có thể luyện đúng cấu trúc kỳ thi, nhận phản hồi hữu ích cho Writing/Speaking và tiếp cận một lộ trình luyện thi với chi phí hợp lý.

## Positioning

Aptis Practice tập trung vào ba giá trị kết hợp: nội dung luyện thi sát cấu trúc Aptis General thật, khả năng chấm và phản hồi Writing/Speaking, và mức giá hợp lý cho người học Việt Nam.

Điểm khác biệt về cơ chế: Speaking được chấm bằng kiến trúc lai — nhận dạng và đo chỉ số âm học chạy local (faster-whisper), phần nội dung/ngữ pháp/từ vựng do model văn bản chấm. Nhờ vậy sản phẩm giữ được giá hợp lý mà không phải gửi audio học viên tới model audio trả phí.

## Operating Context

Người học đăng ký và xác minh tài khoản, khám phá cấu trúc kỳ thi theo Component và Part, luyện từng phần hoặc bài tùy chọn, làm mock test, lưu bài trong quá trình làm, nộp bài và xem lịch sử kết quả.

Nội dung miễn phí cho phép trải nghiệm ban đầu. Nội dung Premium được mở bằng gói trả phí. Biên tập viên quản lý ngân hàng câu hỏi qua quy trình nháp → duyệt → phát hành (DRAFT → IN_REVIEW → PUBLISHED, có CHANGES_REQUESTED và SUSPENDED/ARCHIVED); giáo viên có thể tham gia chấm lại Writing/Speaking; quản trị viên quản lý gói, đơn hàng, quyền truy cập, hoàn tiền và báo cáo.

Thanh toán Premium chạy qua VietQR mức 1 và có nhịp vận hành riêng: học viên chọn gói → backend sinh mã chuyển khoản duy nhất và QR có hiệu lực 10 phút với đếm ngược → hết hạn thì phải tạo QR mới (mã nội dung đổi, cửa sổ 10 phút mới) → học viên bấm "Tôi đã chuyển khoản" → admin đối soát sao kê và xác nhận → hệ thống mới kích hoạt Premium.

## Capabilities and Constraints

- Sản phẩm dùng tiếng Việt làm ngôn ngữ giao diện chính.
- Cấu trúc nội dung phải phản ánh Aptis General theo Component, Part và dạng câu hỏi (Grammar & Vocabulary, Reading, Listening, Speaking, Writing).
- Có luyện theo Part, luyện tùy chọn, mock test, autosave, giới hạn lượt phát audio, khôi phục lượt làm dở, lịch sử bài làm và kết quả theo Component/Part.
- Chấm Writing/Speaking là cơ chế đã chốt: model văn bản qua API tương thích OpenAI/9Router cho Writing; Speaking dùng speaking-analyzer local (faster-whisper + chỉ số âm học) sinh transcript và tốc độ nói/khoảng ngắt/độ rõ, rồi model văn bản chấm nội dung, ngữ pháp, từ vựng. Backend khóa điểm Fluency/Pronunciation theo chỉ số local. Giáo viên có thể review lại và kết quả hiệu lực được cập nhật.
- Pronunciation hiện là độ rõ ước lượng dựa trên độ tin cậy ASR và tín hiệu âm thanh, chưa phải chấm phoneme theo từng âm. Giao diện và feedback phải ghi rõ giới hạn này, và không được để model văn bản nói rằng nó đã nghe audio.
- Backend không tin trực tiếp output của model: phải kiểm tra envelope, JSON hoàn chỉnh, đủ và không trùng mã tiêu chí, giới hạn điểm, CEFR và tự tính lại tổng; lỗi cuối cùng thì rơi về `heuristic-v1` và lưu đúng tên evaluator để phân biệt điểm tạm với điểm AI.
- Mặc định không gửi audio tới model trả phí (`LOCAL_SPEAKING_FALLBACK_REMOTE=false`); fallback chỉ do quản trị viên chủ động bật.
- Mô hình kinh doanh là freemium/Premium. Quyền Premium đọc từ `user_entitlements`, không suy ra từ một cờ giao diện, không kích hoạt từ URL redirect hay lời khai của học viên.
- Đáp án và lời giải không rời backend trước khi học viên nộp bài.
- Mỗi lượt làm bài giữ snapshot riêng; sửa đề sau này không làm thay đổi bài đã làm.
- Xác nhận chuyển khoản thủ công chỉ có hiệu lực khi admin đối soát và xác nhận. Hạn QR 10 phút chỉ áp cho mã đối soát của hệ thống, không ngăn được ứng dụng ngân hàng đọc ảnh QR cũ.
- Giao diện hiện không có mã giảm giá, dù schema cũ còn cấu trúc promotion để tương thích dữ liệu.
- Giá trị và tuyên bố về độ sát đề thi phải dựa trên nội dung có thể kiểm chứng; không tự tạo tuyên bố chứng thực hoặc quan hệ chính thức với đơn vị sở hữu kỳ thi.

## Brand Commitments

- Tên sản phẩm: “Aptis Practice”.
- Ngôn ngữ thương hiệu và sản phẩm chính: tiếng Việt.
- Sản phẩm phải giữ định vị luyện thi sát cấu trúc thật, chấm Writing/Speaking và giá hợp lý.
- Mô hình freemium/Premium là cam kết sản phẩm lâu dài.
- Logo, bộ nhận diện và tài sản thương hiệu cụ thể chưa được xác nhận; công việc tương lai không được tự giả định chúng đã tồn tại.

## Evidence on Hand

- Source hiện có chứa luồng học viên, quản trị nội dung, thanh toán VietQR, entitlement, mock test, attempt và evaluation.
- Migration Flyway V1–V19 đã mô hình hóa cấu trúc Aptis General, task type, gói Premium, blueprint, tiến độ học tập, chuyển khoản thủ công và hạn QR 10 phút.
- Bộ script kiểm thử end-to-end trong `scripts/` dùng để kiểm chứng các luồng nghiệp vụ chính.
- Contract JSON của model chấm bài: `docs/schemas/ai-evaluation-response.schema.json`.
- Tài liệu kiến trúc dữ liệu chi tiết: `kien-truc-he-thong-luyen-thi-aptis-mysql-mongodb-minio.md`.
- Tài khoản nhận chuyển khoản seed hiện tại là MB Bank `0384896584`; tên chủ tài khoản chưa cấu hình.
- Chưa có testimonial, case study, số liệu kết quả học viên, chứng nhận hoặc bằng chứng về quan hệ chính thức với Aptis/British Council; không được tự tạo các nội dung này.
- Chưa xác nhận logo hoặc brand guide chính thức.
- Repository chưa khai báo giấy phép; không tuyên bố open source.

## Product Principles

1. Bám sát cấu trúc và cách làm bài Aptis General trong mọi luồng luyện tập.
2. Biến kết quả Writing/Speaking thành phản hồi rõ ràng, thực tế và có thể hành động — và nói thật về giới hạn của nó.
3. Giữ trải nghiệm dễ tiếp cận và mức giá hợp lý cho người học Việt Nam.
4. Cho phép trải nghiệm giá trị thật trước khi yêu cầu nâng cấp Premium.
5. Bảo vệ tính đúng đắn của bài làm, đáp án, điểm số và quyền truy cập trả phí.

## Accessibility & Inclusion

Sản phẩm cần phục vụ người học Việt Nam trên web với nội dung rõ ràng, thao tác bàn phím, trạng thái focus, nhãn biểu mẫu và độ tương phản phù hợp. Trạng thái không được chỉ phụ thuộc vào màu sắc; control ưu tiên vùng bấm 40–44 px.

Mức tiêu chuẩn accessibility cụ thể (ví dụ WCAG 2.2 AA) vẫn là quyết định để mở, chưa được xác nhận và chưa phải yêu cầu nghiệm thu chính thức.
