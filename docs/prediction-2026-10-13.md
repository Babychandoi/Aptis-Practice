# Bản dự đoán 13/10/2026

Nguồn: nội dung do quản trị viên cung cấp trong cuộc trao đổi ngày 13/10/2026. Không tự gán nguồn cho một website khác.

## Dữ liệu

- `data/exam-predictions-2026-10-13.json`: bốn kỹ năng, topicCode đã đối chiếu, ghi chú ánh xạ và các mục chưa xác nhận (`topicCode: null`).
- `data/news-prediction-2026-10-13.md`: bài bảng tin, giữ đầy đủ danh sách ôn tập kể cả mục chưa xác nhận được liên kết.
- `scripts/update-prediction-1013.mjs`: cập nhật dự đoán và bài bảng tin trong cùng một transaction. Mặc định không ghi; ghi dữ liệu phải có `--apply`.

## Kiểm tra và xuất bản

Chạy từ thư mục gốc, dùng cùng biến `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB` như các script dữ liệu hiện có. Mặc định kết nối `127.0.0.1:3307`, database `aptis`.

```powershell
node --test scripts/update-prediction-1013.test.mjs
node scripts/update-prediction-1013.mjs --dry-run
node scripts/update-prediction-1013.mjs --apply
```

Không chạy `import-exam-predictions.mjs` hoặc `carry-speaking-predictions.mjs` cho file này trước đó: script mới đã xử lý cả bốn kỹ năng, và sẽ dừng nếu ngày 13/10 đã có dữ liệu chưa đầy đủ. Không cần rebuild hoặc khởi động lại frontend/backend.

## Quy tắc biên tập

- Reading Part 5/Part 4/Part 2+3 theo bản gốc tương ứng Part 4/Part 3/Part 2 của hệ thống. Giữ nhãn nguồn, giải thích trong bài bảng tin.
- Work from home mở bài ở Listening Part 4 thay vì Q15. University and Technology dùng đúng topic ở Part 3, không thay bằng Information Technology.
- Food và The art được bỏ trùng. Các mục Reading và Listening được liệt kê chính đều là HOT; chủ đề còn lại ở các nhóm có ghi “Backup: còn lại” là BACKUP.
- Không đưa các phiên bản khác của cùng topic HOT vào BACKUP. Việc nhận diện phiên bản chỉ dùng khi tạo phần dự phòng, không dùng để đoán liên kết cho mục chưa xác nhận.
- Writing mức vừa là section “Mức vừa”, priority BACKUP (schema chỉ có hai giá trị). Speaking dự phòng theo đúng bốn mục trong bản nguồn; không sao chép toàn bộ Speaking của ngày cũ.
- Chỉ thêm dự đoán có ít nhất một đề PUBLISHED đúng kỹ năng/Part. Không sửa chủ đề của đề, không tạo topic rỗng. Mục chưa xác nhận vẫn có trong bài tham khảo, được in cảnh báo khi kiểm tra.
- Two writers dùng topic Famous writers sau khi đối chiếu câu hỏi MongoDB về “both authors”; không gán Baloo’s restaurant vào A new restaurant khi chưa có bằng chứng đủ chắc chắn.
- Bài bảng tin gắn tối đa sáu bài HOT mỗi section (không gắn bài BACKUP), ưu tiên bộ chưa có trong các bản tin cũ. Writing gắn blueprint đúng câu lạc bộ HOT và đã xác nhận đủ bốn Part.

## Phạm vi thay đổi production

Thêm dữ liệu ngày 13/10 và bài có slug `du-doan-de-thi-ngay-13-10-chu-de-uu-tien-va-de-luyen`. Chỉ bỏ ghim các bài dự đoán cũ đang ghim; không xoá bài cũ, không đổi dữ liệu đề hay phiên học. Có khóa chống chạy hai tiến trình đồng thời, rollback nếu lỗi ghi dữ liệu và không tạo thêm bản trùng khi chạy lại.

Đã xuất bản production sau khi quản trị viên xác nhận: 250 mục dự đoán (124 HOT, 126 BACKUP), 57 bài luyện và 16 blueprint Writing. 39 mục nguồn chưa xác nhận được topic tương ứng vẫn có trong bài tham khảo; không được tạo thành liên kết dự đoán. Đối chiếu sau ghi: không có mục dự đoán thiếu đề đúng phạm vi, API production trả bài mới với đủ 57/16 liên kết; bản 11/10 chỉ bỏ ghim và giữ nguyên nội dung/liên kết.
