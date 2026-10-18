# Bản dự đoán 14/10/2026

Nguồn: nội dung quản trị viên cung cấp trong cuộc trao đổi ngày 14/10/2026. Không tự gán nguồn bên ngoài.

## Payload và xuất bản

- `data/exam-predictions-2026-10-14.json` khai báo ngày, bài bảng tin và các điểm khác so với bản 13/10; các chủ đề không đổi kế thừa mapping đã đối chiếu từ payload ngày 13/10.
- `data/news-prediction-2026-10-14.md` là nội dung đầy đủ hiển thị trong Bảng tin.
- `scripts/update-prediction-1014.mjs` hỗ trợ `--dry-run` và `--apply`, ghi dự đoán và bài tin trong cùng transaction. Không rebuild ứng dụng vì nội dung được đọc từ MySQL.

## Ghi chú ánh xạ

- Giữ cách gọi Reading Part 5/4/2+3 của nguồn và hiển thị thêm Part tương ứng trong hệ thống.
- Bỏ Reading “The First woman in space”; Listening Q16–17 bỏ Promotion Campaign, Camera và Writer’s Block đúng theo bản 14/10.
- Listening Q15 gộp mục The art bị lặp; đưa Actors về vị trí thứ hai. “2 writers” giữ mapping Famous writers đã đối chiếu. “Famous writer”, Baloo’s restaurant và các mục Speaking mới chưa có đề PUBLISHED đúng phạm vi nên vẫn có trong bài tham khảo, không tạo liên kết giả.
- Writing giữ hai mức Ưu tiên cao/Mức vừa. Speaking giữ danh sách Part 1–4 và Part 4 dự phòng theo nguồn; thêm “lần tham gia môn thể thao khắc nghiệt”.

## Production — 14/10/2026

Đã xuất bản qua MySQL trong một transaction: 251 mục dự đoán (120 HOT, 131 BACKUP), 57 bài luyện và 16 blueprint Writing. Bài `du-doan-de-thi-ngay-14-10-chu-de-uu-tien-va-de-luyen` ở trạng thái PUBLISHED và được ghim; bài 13/10 chỉ bỏ ghim, không xoá.

Đã đọc lại production API: bài 14/10 trả 200, có đủ 57 bài luyện/16 blueprint và đúng nội dung ngày; feed trả bài này đầu tiên. Trang `/bang-tin/<slug>` có title riêng và sitemap chứa URL. DB ghi nhận đúng 251 dự đoán cho bốn kỹ năng.
