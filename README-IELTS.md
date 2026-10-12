# IELTS Practice

Hệ thống luyện IELTS độc lập được xây dựng từ nền Spring Boot của Aptis Practice, với frontend React/TypeScript riêng. Đây là MVP chạy bằng Docker, không phải bản thi IELTS chính thức hoặc sản phẩm đã được xác nhận sẵn sàng production.

## Chạy dự án

Từ thư mục repository:

```bash
docker compose -f docker-compose.ielts.yml up -d --build
```

- Giao diện: http://localhost:8180
- Email xác thực local trong Mailpit: http://localhost:8035
- MinIO console: http://localhost:9011
- Đăng ký tài khoản, mở Mailpit và xác thực email. Không có mật khẩu admin cài sẵn.
- MySQL `ielts`, MongoDB `ielts`, tên project Docker, volumes, JWT issuer, refresh cookie và buckets đều riêng với Aptis. Chỉ frontend, Mailpit và MinIO mở cổng localhost; DB không mở cổng host.
- Cấu hình Compose này dành cho local. Khi triển khai thật, cấu hình HTTPS, SMTP thật, secrets, MinIO public endpoint và nguồn origin phù hợp; không dùng các giá trị local mặc định.

## Tách thành repository IELTS riêng

Trong checkout gốc:

```bash
python scripts/export-ielts-project.py ../IELTS-Practice
```

Trên Windows có thể dùng `py` thay `python`. Thư mục đích phải chưa tồn tại và nằm ngoài checkout gốc. Script tạo `backend/`, `frontend/`, `docs/`, `README.md`, `.gitignore` và `docker-compose.yml`; không mang Aptis frontend, bộ đề Aptis, thư mục Git, dependencies đã cài hoặc dữ liệu runtime. Trong bản xuất, chạy:

```bash
docker compose up -d --build
```

Backend giữ namespace `vn.weconex.aptis` và migrations gốc để tái sử dụng xác thực, RBAC, assets và entitlement mà không phá tương thích. Dữ liệu/catalog IELTS nằm trong collections riêng; không dùng thang điểm hay bộ đề Aptis. Migrations gốc vẫn tạo metadata Aptis trong **database IELTS mới**, nhưng giao diện IELTS không sử dụng chúng.

## Luồng học viên

1. Đăng ký/xác thực email, đăng nhập bằng JWT với refresh cookie HttpOnly.
2. Chọn Academic hoặc General Training, lọc kỹ năng, chọn đề đã xuất bản.
3. Làm bài: passage/audio/ảnh dùng chung, câu hỏi con, chọn đáp án, matching từng câu, True/False/Not Given, Yes/No/Not Given, trả lời ngắn, viết bài hoặc ghi âm.
4. Câu trả lời lưu theo hàng đợi, có version để phát hiện lưu ở nhiều cửa sổ. Khôi phục bài qua lịch sử.
5. Đồng hồ từng kỹ năng do server đặt. Hết giờ không nhận câu trả lời mới; frontend nộp câu trả lời đã lưu. Nộp khóa kỹ năng và chuyển sang kỹ năng tiếp theo theo thứ tự Listening → Reading → Writing → Speaking.
6. Đáp án/giải thích chỉ trả khi đã nộp **toàn bộ bài**. Writing/Speaking chờ giáo viên chấm. Overall chỉ có khi đủ cả 4 band.

## Tài khoản giáo viên và nhập đề mẫu

Đăng ký và xác thực `teacher@ielts.local`, sau đó dùng operator có quyền DB chạy `docs/ielts/bootstrap-teacher.sql` trên database `ielts`. SQL chỉ gán role cho đúng email đó, không kích hoạt hoặc thay đổi tài khoản khác. Trong bản export, file nằm ở `docs/bootstrap-teacher.sql`. Đăng xuất và đăng nhập lại để nhận role mới.

Trong **Quản lý đề IELTS**:

- Tạo đề, thêm group theo kỹ năng/part, passage, audio/ảnh, câu hỏi con và đáp án.
- Hoặc tải file mẫu trong màn hình quản lý rồi dùng **Nhập JSON**. File mẫu có `published: false`; kiểm tra, bật xuất bản và lưu để học viên thấy đề.
- `academic-writing.json`: Task 1 dạng bảng và Task 2 bài luận.
- `general-writing.json`: Task 1 viết thư và Task 2 bài luận.
- `reading-practice.json`: passage và 7 câu hỏi, không quy đổi band.
- `speaking-practice.json`: câu hỏi Part 1, cue card Part 2 và câu hỏi thảo luận Part 3.
- Các đề mẫu được tự biên soạn cho ứng dụng, không phải đề IELTS chính thức. Listening cần giáo viên tải audio và nhập câu hỏi; không seed file audio không tồn tại.

Giáo viên chỉ sửa/chấm bài từ đề mình tạo; admin được chấm toàn bộ. File ghi âm chỉ được gắn vào bài khi thuộc học viên và đã hoàn tất upload. Download file đề/ghi âm dùng URL ký có hạn và kiểm tra tham chiếu trong bài làm.

## Quy tắc điểm

- Mỗi câu Nghe/Đọc là một đơn vị điểm. `fullLength` được kiểm tra: Listening 4 × 10 câu; Reading 3 section/40 câu; Writing 2 task/2 câu; Speaking 3 part.
- Bài ngắn hiển thị số câu đúng, không scale thành band trên 40.
- Đề Nghe/Đọc đủ 40 câu sử dụng bảng **ước lượng luyện tập**, tách Academic Reading và General Training Reading. Ngưỡng thật có thể khác theo đề.
- Writing chấm 4 tiêu chí riêng cho mỗi task; Task 2 có trọng số 2, Task 1 trọng số 1.
- Speaking chấm fluency/coherence, lexical resource, grammar/accuracy và pronunciation. MVP lấy trung bình các câu đã được giáo viên chấm; đây là ước lượng luyện tập, không mô phỏng chấm Speaking tổng thể của giám khảo thật.
- Overall là trung bình của 4 band và làm tròn tới 0.5. Điểm thiếu/chờ chấm không bị coi là 0.

Nguồn cấu trúc và tiêu chí:

- https://ielts.org/take-a-test/test-types/ielts-academic-test
- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing
- https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail

## Kiểm thử

```bash
cd ielts-frontend
npm ci
npm run test
npm run build
```

```bash
cd aptis-backend
mvn -Dtest=IeltsScoringTest,IeltsServiceTest test
```

Trong bản export, dùng `frontend` và `backend`. Các kiểm thử tập trung vào quyền sở hữu, Premium phía server, ẩn đáp án, timeout, version, nộp lại an toàn, trọng số Task 2, band/Overall và autosave liên tiếp. Xem báo cáo kiểm tra tại `docs/ielts/VALIDATION.md` (bản export: `docs/VALIDATION.md`).

## Giới hạn MVP

- Chưa chạy kiểm thử tích hợp Docker/MySQL/MongoDB/MinIO trong môi trường thực hiện; cần chạy smoke test tại máy có Docker theo hướng dẫn validation.
- Chưa có AI chấm IELTS, thi nói với giám khảo trực tiếp, điều khiển playback một lần phía server, định thời tự động từng Speaking part hoặc lựa chọn lịch thi Speaking riêng. Listening cho phép nghe lại; đồng hồ 32 phút là cấu hình luyện trên máy (khoảng 30 phút + 2 phút kiểm tra), không dùng thời gian chép đáp án của thi giấy.
- Multiple choice nhiều đáp án chấm trọn câu trong bài luyện ngắn. Với đề full-length, mỗi numbered slot phải là một question riêng có một đáp án; không dùng một item nhiều đáp án để giả làm nhiều câu có partial credit.
- Bản IELTS chưa có màn hình bán gói, thanh toán, lớp học, AI lounge hoặc import Excel/ZIP; các dịch vụ gốc vẫn nằm trong backend nhưng chưa nối vào giao diện IELTS. Premium được kiểm phía server; operator cấp quyền qua cơ chế entitlement gốc.
- Chưa có đề Reading/Listening 40 câu tự biên soạn được rà soát chuyên môn; giáo viên tạo hoặc nhập bằng editor/JSON.
- Lưu hết giờ không nhận dữ liệu chưa tới server. Một bài đóng trình duyệt sẽ tiếp tục xử lý hết giờ khi mở lại, chưa có worker tự chuyển kỹ năng khi offline.

Tài liệu API/model: `docs/ielts/ARCHITECTURE.md`.
