# Kế hoạch: Không gian lớp học cho giáo viên

Trạng thái: **chờ duyệt** · Ước lượng: 9–12 ngày làm · Người viết: Claude

Bản này bám theo thiết kế `Teacher Classroom Wireframes.dc.html` khách gửi.

---

## 1. Mô hình kinh doanh

Hai dòng doanh thu mới, độc lập với Premium học viên hiện có:

| Dòng tiền | Ai trả | Cho ai |
|---|---|---|
| **Gói giáo viên** (`TEACHER_30/90/180/365`) | Giáo viên | Trả cho nền tảng |
| **Học phí lớp** | Học viên | Trả cho giáo viên, **nền tảng thu hộ rồi chia** |

Premium học viên giữ nguyên: học viên muốn tự luyện ngoài lớp thì vẫn mua như
hiện nay.

### Cách vận hành

- **Admin tạo tài khoản giáo viên**, giáo viên không tự đăng ký
- Hệ thống **tự sinh đúng một lớp** gắn với tài khoản đó
- Admin gán gói ban đầu và **bật/tắt quyền dùng ngân hàng đề hệ thống theo từng lớp**
- Giáo viên đặt lớp **Miễn phí** hoặc **Có phí** kèm giá

### Công tắc "đề hệ thống" — đòn bẩy giá

| Trạng thái | Giáo viên | Học viên trong lớp |
|---|---|---|
| **Tắt** | Chỉ giao được đề tự soạn | Chỉ làm bài được giao; các mục luyện tập khác hiện khoá 🔒 |
| **Bật** | Giao thêm được toàn bộ kho đề hệ thống | Mở khoá cả khu luyện tập trong không gian lớp |

---

## 2. Nền tảng đã có

| Đã có | Dùng cho |
|---|---|
| Vai `TEACHER` + 4 quyền | Không phải dựng lại phân quyền |
| `subscription_plans`, `orders`, `user_entitlements` | Gói giáo viên dùng lại nguyên luồng bán hàng |
| `evaluation_summaries.evaluator_type` đã có `TEACHER` | **Chấm tay dùng lại được ngay** |
| `AttemptService` (3 đường tạo lượt làm bài) | Giao bài chỉ cần gọi lại |
| 137 blueprint đề full 4 part | Giao đề full không phải làm gì thêm |
| `AdminContentService` + `PublishValidator` | Giáo viên tự soạn đề |
| `evaluation_documents` (Mongo) | Tiêu chí, nhận xét, bản sửa của AI |
| `user_part_progress` | Điểm mạnh/yếu theo Part |
| `attempt_recordings` | Ghi âm Speaking |
| MinIO + `assets` | Tài liệu lớp (file) |
| `news_posts` | Mẫu sẵn cho bảng tin lớp |
| `exam_predictions` | Mẫu sẵn cho dự đoán riêng |
| `affiliate_payouts` | **Mẫu sẵn cho chia tiền học phí** |

---

## 3. Điểm cần biết trước: highlight lỗi sai

Thiết kế yêu cầu gạch chân từng từ sai trong bài viết kèm giải thích:

> I think shopping online ~~are~~ convenient because you ~~dont~~ need to…
> ● **"are"** — Chia sai: chủ ngữ số ít "shopping" cần "is"

**Dữ liệu AI hiện tại KHÔNG có thông tin này.** Kiểm tra `evaluation_documents`
cho thấy chỉ có:

- `criteria[]` — điểm và nhận xét theo tiêu chí
- `feedback.summary / strengths / weaknesses / suggestions`
- `feedback.correctedVersion` — bản sửa toàn bài

Không có vị trí lỗi trong câu.

**Để làm được cần:** sửa prompt LLM trả thêm mảng `errors[{ text, start, end,
type, explanation }]`, thêm trường vào `EvaluationDocument`, và hiển thị.

**Rủi ro:** prompt chấm bài đang chạy ổn định trên production. Sửa prompt là
đụng vào chỗ nhạy cảm — tháng trước đã có lần prompt trả sai ngôn ngữ cho
`correctedVersion` và phải sửa gấp. Nếu làm, phải chạy thử trên bài thật trước
khi bật cho học viên.

**Đề xuất:** để mục này vào **đợt cuối**, làm riêng và kiểm kỹ. Ba đợt trước
không phụ thuộc vào nó — giáo viên vẫn xem được nhận xét AI theo tiêu chí và
bản sửa toàn bài, vốn đã hữu ích.

---

## 4. Cấu trúc dữ liệu

### V43 — Lớp học

```
classrooms
  id, teacher_user_id (UNIQUE — mỗi giáo viên đúng 1 lớp)
  name, description
  join_code (6 ký tự, UNIQUE)
  join_enabled
  system_content_enabled     -- admin bật/tắt kho đề hệ thống
  pricing_type: FREE | PAID
  price_amount               -- học phí, VND
  status: ACTIVE | ARCHIVED
  created_at, updated_at

classroom_members
  id, classroom_id, user_id
  role: STUDENT | ASSISTANT
  status: ACTIVE | REMOVED
  payment_status: NOT_REQUIRED | PENDING | PAID   -- lớp có phí
  joined_at
  UNIQUE(classroom_id, user_id)
```

### V44 — Bài giao

```
assignments
  id, classroom_id, created_by
  title, instructions
  source_type: QUESTION_SETS | BLUEPRINT
  blueprint_id
  due_at
  status: DRAFT | PUBLISHED | CLOSED
  created_at, updated_at

assignment_question_sets
  assignment_id, question_set_id, display_order

assignment_submissions
  id, assignment_id, user_id, attempt_id
  status: NOT_STARTED | IN_PROGRESS | SUBMITTED | LATE | GRADED
  submitted_at
  teacher_score            -- NULL = giữ điểm AI
  teacher_comment
  graded_by, graded_at
  UNIQUE(assignment_id, user_id)
```

### V45 — Nội dung riêng của lớp

```
ALTER TABLE question_sets ADD COLUMN owner_teacher_id CHAR(36) NULL;

classroom_materials              -- tài liệu lớp
  id, classroom_id, created_by
  title
  material_type: FILE | LINK
  asset_id                       -- khi FILE, trỏ sang assets/MinIO
  link_url                       -- khi LINK
  created_at

classroom_posts                  -- bảng tin riêng của lớp
  id, classroom_id, created_by
  title, content
  status: PUBLISHED | HIDDEN
  created_at, updated_at

classroom_predictions            -- dự đoán riêng của giáo viên
  id, classroom_id, created_by
  part_id, title, content
  created_at, updated_at
```

### V46 — Gói giáo viên và chia tiền học phí

```
INSERT INTO subscription_plans (TEACHER_30, TEACHER_90, TEACHER_180, TEACHER_365);
INSERT INTO plan_features (giới hạn theo gói: số học viên tối đa…);

teacher_settings                 -- cấu hình gói, admin chỉnh
  id = 1 (một dòng)
  platform_fee_percent           -- % nền tảng giữ lại từ học phí
  default_max_students           -- giới hạn mặc định
  updated_at

classroom_payments               -- học viên trả học phí
  id, classroom_id, user_id, order_id
  amount, platform_fee, teacher_amount
  status: PENDING | PAID | REFUNDED
  created_at, paid_at

teacher_payouts                  -- giáo viên rút tiền học phí
  (cấu trúc giống affiliate_payouts đã có)
```

Quyền mới: `classroom:write`, `classroom:read`, `classroom:admin`.

### V47 — Highlight lỗi (đợt cuối)

Thêm `errors[]` vào `EvaluationDocument` (Mongo — không cần migration SQL) và
sửa prompt LLM.

---

## 5. Màn hình (theo thiết kế)

### Giáo viên — `/giang-day`

Sidebar: Lớp học của tôi · Bài giao · Chấm bài *(badge số bài chờ)* · Đề của
tôi · Tài liệu · Bảng tin lớp · Dự đoán đề · Cài đặt lớp · Gói giáo viên
*(thẻ đen cuối sidebar hiện gói và số ngày còn lại)*

| Màn hình | Nội dung |
|---|---|
| Chi tiết lớp | 3 tab: Học viên · Bài giao · Tiến độ. Header có nhãn giá lớp, mã lớp, nút "Mời vào lớp" và "+ Giao bài mới" |
| Tab Học viên | Bảng: avatar chữ cái, tên, bài đã làm, điểm TB, hoạt động gần nhất |
| Tab Bài giao | Thẻ từng bài: tiêu đề, nguồn đề, hạn nộp, "14/18 đã nộp", nhãn trạng thái, nút Chấm bài |
| Tab Tiến độ | Thanh ngang 5 kỹ năng, màu theo điểm: ≥70 xanh, ≥55 cam, dưới đỏ |
| Mời vào lớp | Overlay: QR, mã lớp cỡ lớn, nút sao chép link và tải QR để in |
| Giao bài mới | Chọn nguồn (radio 3 lựa chọn, "Ngân hàng đề" mờ đi khi lớp chưa bật), tiêu đề, hạn nộp |
| Soạn đề mới | Chọn Part, tiêu đề, nội dung + cột phải liệt kê đề đã soạn |
| Tài liệu | Chọn loại (file/link), tiêu đề, vùng kéo thả + cột phải liệt kê đã thêm |
| Bảng tin lớp | Tiêu đề, nội dung + cột phải liệt kê đã đăng |
| Dự đoán đề | Chọn Part, tiêu đề, chi tiết + cột phải liệt kê đã đăng |
| Chấm bài | Danh sách bài nộp → bấm mở panel trượt phải |
| Panel chấm | Ghi âm *(nếu Speaking)*, bài làm có highlight lỗi, danh sách lỗi, nhận xét AI theo tiêu chí, ô điểm giáo viên, ô nhận xét riêng |
| Cài đặt lớp | Miễn phí / Có phí + ô nhập giá |

### Học viên

| Màn hình | Nội dung |
|---|---|
| Lớp học của tôi | Thẻ từng lớp: tên, giáo viên, nhãn giá, nhãn "Đề hệ thống: Bật/Tắt", danh sách bài kèm hạn |
| Tham gia lớp | Ô nhập mã cỡ lớn + vùng quét QR |
| **Không gian lớp** | Sidebar riêng thay sidebar chính: Bài được giao · Tài liệu · *(Khu luyện tập)* Bảng tin · Dự đoán đề · Thi thử · 5 kỹ năng — **hiện 🔒 khi lớp chưa bật đề hệ thống** |

Điểm quan trọng: khi vào không gian lớp, **sidebar chính bị thay hoàn toàn** —
học viên ở trong "thế giới của lớp", có nút ← để thoát ra.

### Admin

| Màn hình | Nội dung |
|---|---|
| Quản lý lớp học | Bảng mọi lớp + **công tắc bật/tắt đề hệ thống** từng lớp |
| Tài khoản giáo viên | Bảng giáo viên + nút "+ Tạo tài khoản giáo viên" (họ tên, email, gói ban đầu) |
| Cấu hình gói | % nền tảng giữ lại, giới hạn học viên theo gói |

---

## 6. Ngôn ngữ thiết kế

Thiết kế dùng bảng màu khác hệ thống hiện tại:

| Vai trò | Màu |
|---|---|
| Chính | `#5b52e8` (tím) |
| Nền | `#f5f5f2` |
| Viền | `#e8e7e1` |
| Chữ phụ | `#73716b` |
| Nhấn tối | `#15161a` |
| Điểm tốt / xấu | `#16a34a` / `#d97706` / `#dc2626` |

Bo góc 12–16px, font `Be Vietnam Pro` + `JetBrains Mono` cho số liệu và nhãn.

**Cần chốt:** dùng đúng bảng màu này cho khu giáo viên *(tách biệt rõ với khu
học viên)*, hay đổi sang màu nâu/cam của hệ thống hiện tại cho đồng bộ?

---

## 7. Thứ tự làm

### Đợt 1 — Tài khoản giáo viên, lớp, gói (2–3 ngày)
- V43 + V46 phần gói
- Admin tạo tài khoản giáo viên → tự sinh lớp
- Admin bật/tắt đề hệ thống, cấu hình gói
- Giáo viên xem lớp, mời học viên bằng mã + QR
- Học viên vào lớp

### Đợt 2 — Theo dõi và nội dung lớp (2–3 ngày)
- Tab Học viên, Tiến độ
- Tài liệu lớp (file + link)
- Bảng tin lớp
- Dự đoán đề riêng
- Không gian lớp phía học viên, kèm khoá 🔒

### Đợt 3 — Giao bài và chấm (3 ngày)
- V44, giao đề từ ngân hàng / tự soạn / đề full
- Hạn nộp, theo dõi ai nộp ai chưa
- Học viên làm bài được giao không cần Premium
- Panel chấm tay đè điểm AI + nhận xét riêng
- Email nhắc

### Đợt 4 — Học phí và highlight lỗi (2–3 ngày)
- Học viên trả học phí lớp, nền tảng giữ %, giáo viên rút tiền
- Sửa prompt AI trả vị trí lỗi + hiển thị highlight
- **Chạy thử trên bài thật trước khi bật**

---

## 8. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| **Giáo viên A xem được học viên của B** | Mọi truy vấn qua `classroom_id` sở hữu; test khoá riêng |
| **Học viên free dùng được đề hệ thống ngoài lớp** | Chỉ mở quyền cho lượt làm bài sinh từ `assignment`; test khoá riêng |
| **Sửa prompt AI làm hỏng chấm bài đang chạy** | Để đợt cuối, chạy thử trên bài thật, giữ nguyên các trường cũ |
| Tiền học phí chia sai | Dùng lại mẫu của affiliate: chụp % tại thời điểm giao dịch, không tính lại |
| Giáo viên hết hạn gói | Lớp chuyển chỉ-đọc: học viên xem bài cũ, giáo viên không giao bài mới |
| Giới hạn học viên theo gói | Kiểm lúc vào lớp, báo rõ "Lớp đã đủ học viên theo gói hiện tại" |

---

## 9. Còn cần anh chốt

1. **Bảng màu**: giữ tím `#5b52e8` như thiết kế, hay đổi theo màu hệ thống hiện tại?
2. **% nền tảng giữ lại** từ học phí lớp là bao nhiêu?
3. **Giá gói giáo viên** 30/90/180/365 ngày?
4. **Giới hạn học viên** theo từng gói là bao nhiêu?
5. Học viên **chưa trả học phí** lớp có phí thì vào lớp được không, hay chặn ở
   cửa? (đề xuất: vào được, nhưng chỉ xem, phải trả mới làm bài)
