# Kế hoạch: Không gian lớp học cho giáo viên

Trạng thái: **chờ duyệt** · Ước lượng: 6–8 ngày làm · Người viết: Claude

---

## 1. Mục tiêu và mô hình kinh doanh

Mở thêm một dòng doanh thu mới: **bán gói hàng tháng cho giáo viên**, bên cạnh
việc bán Premium cho học viên như hiện nay.

Giáo viên trả tiền để có không gian lớp riêng: mở lớp, giao bài, chấm, theo dõi
học viên sai ở đâu.

### Hai dòng doanh thu độc lập

| | Ai trả | Được gì |
|---|---|---|
| **Premium học viên** (đã có) | Học viên | Tự luyện: dự đoán đề, thi thử, AI chấm — phần chung của hệ thống, giữ nguyên như hiện tại |
| **Gói giáo viên** (làm mới) | Giáo viên | Mở lớp, giao bài, chấm tay, theo dõi tiến độ học viên |

Hai thứ không thay thế nhau. Học viên trong lớp vẫn có thể tự mua Premium để
luyện thêm ngoài giờ lớp.

### Công tắc "dùng đề hệ thống"

Gói giáo viên chia hai mức:

- **Không bật**: giáo viên dùng đủ công cụ lớp học, nhưng chỉ giao được **đề họ
  tự soạn**
- **Bật**: giao được thêm toàn bộ **ngân hàng đề của hệ thống** (137 đề full 4
  part + kho đề theo Part)

Admin bật/tắt theo từng lớp trong trang quản trị. Đây là đòn bẩy giá: giáo viên
muốn dùng kho đề sẵn thì trả thêm.

---

## 2. Nền tảng đã có — tận dụng được gì

Khảo sát code hiện tại cho thấy phần lớn thứ khó đã sẵn:

| Đã có | Dùng cho việc gì |
|---|---|
| Vai `TEACHER` với 4 quyền (`question_set:read`, `user:read`, `evaluation:review`, `report:read`) | Không phải dựng lại phân quyền |
| `subscription_plans` + `orders` + `user_entitlements` | **Gói giáo viên dùng lại nguyên luồng bán hàng**, chỉ thêm mã gói và entitlement mới |
| `AttemptService.createPartAttempt` / `createCustomAttempt` / `createMockTestAttempt` | Giao bài chỉ cần gọi lại |
| 137 blueprint đề full 4 part | Phần "đề full kỹ năng" không phải làm gì thêm |
| `AdminContentService.create` + `PublishValidator` | Giáo viên tự soạn đề dùng lại luồng và bộ kiểm tra này |
| `evaluation_summaries` | Nhận xét AI chi tiết Writing/Speaking — đúng thứ giáo viên cần để thấy lỗi học viên |
| `user_part_progress`, `user_component_progress` | Điểm mạnh/yếu theo Part |
| `attempt_recordings` | Ghi âm Speaking để giáo viên nghe lại |
| `EntitlementService.hasPremiumAccess` | Một chỗ duy nhất kiểm quyền — thêm quyền giáo viên vào đây |
| `NotificationSender` | Email nhắc bài |
| `BankTransferService` | Giáo viên mua gói qua chuyển khoản như học viên |

**Thiếu hẳn:** lớp học, thành viên lớp, bài giao, bài nộp, gói giáo viên, và ranh
giới dữ liệu giữa các giáo viên.

---

## 3. Quyết định thiết kế

### 3.1. Gói giáo viên — dùng lại hạ tầng bán hàng sẵn có

Thêm 2 entitlement mới:

```
TEACHER_CLASSROOM       -- mở lớp, giao bài, chấm, theo dõi
TEACHER_SYSTEM_CONTENT  -- được giao đề từ ngân hàng hệ thống
```

Thêm gói vào `subscription_plans` (giá anh quyết):

```
TEACHER_30    Gói giáo viên 30 ngày
TEACHER_90    Gói giáo viên 90 ngày
TEACHER_365   Gói giáo viên 365 ngày
```

Lý do dùng lại thay vì làm riêng: `SubscriptionActivationService` đã xử lý gia
hạn, cộng dồn thời hạn, hết hạn tự động, thông báo real-time. Làm bảng riêng là
viết lại toàn bộ những thứ đó.

**Điểm khác với gói học viên:** `TEACHER_*` cấp entitlement giáo viên chứ không
cấp `PREMIUM_CONTENT_ACCESS`. Danh sách quyền theo gói lấy từ bảng
`plan_features` đã có.

### 3.2. Công tắc "dùng đề hệ thống" đặt ở đâu

Đặt ở **từng lớp**, không phải ở giáo viên:

```
classrooms.system_content_enabled  TINYINT(1) NOT NULL DEFAULT 0
```

Lý do: giáo viên có thể có lớp trả tiền cao (dùng kho đề) và lớp thường. Đặt ở
giáo viên thì không tách được.

Khi giáo viên mua gói có `TEACHER_SYSTEM_CONTENT`, hệ thống tự bật cho các lớp
của họ; admin vẫn chỉnh tay được từng lớp.

### 3.3. Đề giáo viên tự soạn nằm ở đâu

**Dùng lại bảng `question_sets`, thêm cột `owner_teacher_id`.**

- `NULL` → đề hệ thống, dùng chung (như hiện nay)
- `<id>` → đề riêng của giáo viên, chỉ lớp họ thấy

Không tách bảng riêng vì đề giáo viên vẫn cần AI chấm, vẫn cần lưu snapshot khi
học viên làm, vẫn cần hiện trong trang làm bài — tách bảng là nhân đôi toàn bộ
luồng đó.

Đề giáo viên bỏ qua bước duyệt (`submitForReview` → `publish`) vì không ai duyệt
cho họ; đặt thẳng `PUBLISHED` nhưng giới hạn phạm vi bằng `owner_teacher_id`.
Vẫn chạy qua `PublishValidator` để đề sai định dạng không lọt xuống học viên.

### 3.4. Học viên trong lớp

**Không cần mua gì để làm bài được giao.** Giáo viên đã trả tiền.

Cụ thể: `EntitlementService` thêm một nhánh — nếu lượt làm bài sinh ra từ một
`assignment` thuộc lớp đang hoạt động, thì bỏ qua kiểm tra Premium.

Phần chung của hệ thống (dự đoán đề, thi thử tự do, mẹo học) **giữ nguyên** —
vẫn cần Premium như hiện tại. Học viên muốn luyện thêm ngoài lớp thì tự mua.

### 3.5. Ranh giới dữ liệu giữa giáo viên

Chỗ nguy hiểm nhất: giáo viên A xem được học viên của giáo viên B.

**Nguyên tắc:** mọi truy vấn của giáo viên đều đi qua `classroom_id` mà họ sở
hữu. Không có endpoint nào cho phép truy cập học viên theo `userId` trực tiếp.

Sẽ viết test riêng khoá điều này.

### 3.6. Học viên vào lớp

Mã lớp 6 ký tự + QR chứa `/lop/tham-gia?ma=ABC123`.

QR sinh ở **frontend** bằng thư viện, không lưu ảnh — mã lớp đã đủ, QR chỉ là
cách hiển thị. Học viên chưa đăng nhập quét QR → đăng ký xong tự vào lớp.

Giáo viên bật/tắt được việc nhận học viên mới.

---

## 4. Cấu trúc dữ liệu

### V43 — Lớp học

```
classrooms
  id, teacher_user_id, name, description
  join_code (6 ký tự, UNIQUE)
  join_enabled            -- nhận học viên mới hay không
  system_content_enabled  -- được giao đề hệ thống hay không (admin bật)
  status: ACTIVE | ARCHIVED
  created_at, updated_at

classroom_members
  id, classroom_id, user_id
  role: STUDENT | ASSISTANT
  status: ACTIVE | REMOVED
  joined_at
  UNIQUE(classroom_id, user_id)
```

### V44 — Bài giao

```
assignments
  id, classroom_id, created_by
  title, instructions
  source_type: QUESTION_SETS | BLUEPRINT
  blueprint_id            -- khi giao đề full 4 part
  due_at                  -- NULL = không hạn
  status: DRAFT | PUBLISHED | CLOSED
  created_at, updated_at

assignment_question_sets
  assignment_id, question_set_id, display_order

assignment_submissions
  id, assignment_id, user_id
  attempt_id              -- trỏ sang lượt làm bài đã có
  status: NOT_STARTED | IN_PROGRESS | SUBMITTED | LATE | GRADED
  submitted_at
  teacher_score           -- NULL = giữ điểm AI
  teacher_comment
  graded_by, graded_at
  UNIQUE(assignment_id, user_id)
```

### V45 — Đề riêng và gói giáo viên

```
ALTER TABLE question_sets
  ADD COLUMN owner_teacher_id CHAR(36) NULL,
  ADD KEY idx_question_sets_owner (owner_teacher_id);

INSERT INTO subscription_plans (TEACHER_30, TEACHER_90, TEACHER_365);
INSERT INTO plan_features (quyền của từng gói);
```

Quyền mới: `classroom:write` (mở lớp, giao bài), `classroom:read` (trợ giảng).

---

## 5. Màn hình

### Phía giáo viên — `/giang-day`

| Màn hình | Nội dung |
|---|---|
| Danh sách lớp | Mỗi lớp: số học viên, bài đang giao, bài chờ chấm. Nhãn "Đề hệ thống: bật/tắt" |
| Chi tiết lớp | Tab: Học viên · Bài giao · Tiến độ |
| — Học viên | Tên, số bài đã làm, điểm trung bình, hoạt động gần nhất → bấm vào xem chi tiết |
| — Bài giao | "12/20 đã nộp", bấm vào xem ai nộp ai chưa |
| — Tiến độ | Điểm mạnh/yếu theo Part của cả lớp — thấy ngay lớp yếu phần nào |
| Mời vào lớp | Mã lớp cỡ lớn + QR + nút sao chép link + nút tải QR để in |
| Tạo bài giao | Chọn nguồn: ngân hàng đề (nếu lớp được bật) / đề tự soạn / đề full. Đặt hạn nộp |
| Soạn đề mới | Form theo Part, dùng lại editor của admin |
| Chấm bài | Bài làm + nhận xét AI, sửa điểm, viết nhận xét riêng, nghe ghi âm Speaking |
| Tiến độ học viên | Lịch sử, điểm theo thời gian, lỗi hay gặp |

Khi lớp **không** được bật đề hệ thống: mục "ngân hàng đề" hiện nhưng khoá, kèm
dòng "Liên hệ quản trị để mở kho đề hệ thống" — để giáo viên biết mà nâng gói.

### Phía học viên

| Màn hình | Nội dung |
|---|---|
| `/lop-hoc` | Lớp đang tham gia, bài được giao, hạn nộp, bài quá hạn nổi đỏ |
| `/lop/tham-gia?ma=` | Nhập mã hoặc quét QR |
| Trang chủ | Thêm ô "Bài được giao" khi có bài chưa làm |

### Phía admin

| Màn hình | Nội dung |
|---|---|
| Quản lý lớp | Danh sách mọi lớp, giáo viên nào, bao nhiêu học viên, **công tắc bật/tắt đề hệ thống** |
| Gói giáo viên | Thêm vào trang gói đã có, không cần màn hình mới |

---

## 6. Thứ tự làm

Chia 4 đợt, mỗi đợt xong là dùng được ngay.

### Đợt 1 — Gói giáo viên và lớp học (2 ngày)
- V43 + V45 phần gói
- Giáo viên mua gói (dùng luồng bán hàng sẵn có)
- Mở lớp, sinh mã + QR
- Học viên vào lớp bằng mã/QR
- Admin bật/tắt đề hệ thống theo lớp

### Đợt 2 — Theo dõi học viên (1–2 ngày)
- Tab Học viên và Tiến độ
- Trang tiến độ một học viên: lịch sử, điểm, lỗi hay gặp

Dùng dữ liệu đã có sẵn nên không cần đợi giao bài. Đây là giá trị lớn nhất, đến
sớm.

### Đợt 3 — Giao bài (2–3 ngày)
- V44, giao đề từ ngân hàng và đề full
- Hạn nộp, theo dõi ai nộp ai chưa
- Học viên free làm được bài giao
- Email nhắc khi được giao và trước hạn

### Đợt 4 — Đề riêng và chấm tay (2 ngày)
- Giáo viên tự soạn đề
- Chấm tay đè lên điểm AI, nhận xét riêng
- Học viên xem nhận xét giáo viên

---

## 7. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| **Giáo viên A xem được học viên của B** | Mọi truy vấn qua `classroom_id` sở hữu; test khoá riêng |
| **Học viên free làm được cả đề hệ thống ngoài lớp** | Chỉ mở quyền cho lượt làm bài sinh từ `assignment`; test khoá riêng |
| Giáo viên hết hạn gói nhưng lớp vẫn chạy | Job kiểm hạn: hết gói thì lớp chuyển chỉ-đọc, học viên vẫn xem được bài cũ |
| Mã lớp bị đoán | 6 ký tự từ bộ 31 = 887 triệu tổ hợp; thêm nút tắt nhận học viên |
| Đề giáo viên sai định dạng, AI chấm sai | Dùng lại `PublishValidator` của admin |
| Giáo viên soạn đề bậy bạ | Đề chỉ hiện trong lớp họ; admin xem được qua trang quản lý lớp |

---

## 8. Cần anh quyết trước khi bắt đầu

1. **Giá gói giáo viên** — 30/90/365 ngày bao nhiêu? Có phân biệt giá "có đề hệ
   thống" và "không" không, hay chỉ một giá rồi admin bật tay?
2. **Giới hạn số lớp / số học viên mỗi lớp** theo gói không? (mặc định: không giới hạn)
3. Học viên vào được **nhiều lớp** cùng lúc chứ? (mặc định: có)
4. Trợ giảng có cần không? (mặc định: có, chỉ xem)
5. Giáo viên hết hạn gói thì lớp xử lý sao — đóng băng hay vẫn xem được bài cũ?
   (đề xuất: chỉ-đọc, không giao bài mới)
