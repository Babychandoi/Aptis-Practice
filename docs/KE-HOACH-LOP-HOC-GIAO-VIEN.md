# Kế hoạch: Không gian lớp học cho giáo viên

Trạng thái: **chờ duyệt** · Ước lượng: 5–7 ngày làm · Người viết: Claude

---

## 1. Mục tiêu

Giáo viên có không gian riêng để mở lớp, giao bài, và theo dõi từng học viên
luyện đến đâu, sai ở chỗ nào.

Khách hàng đã nêu rõ 6 điểm:

1. Mỗi giáo viên là một nhóm riêng, không thấy lớp của người khác
2. Giao bài từ ngân hàng đề sẵn có **hoặc** tự gõ đề mới
3. Đủ cả 4 kỹ năng Nghe – Nói – Đọc – Viết và đề full kỹ năng
4. Mỗi lớp có **mã QR** để học viên quét vào lớp
5. Mỗi lớp là một không gian học tập riêng
6. Đặt hạn nộp, chấm tay đè lên điểm AI, nhắc học viên qua email

---

## 2. Nền tảng đã có — tận dụng được gì

Khảo sát code hiện tại cho thấy phần lớn thứ khó đã có sẵn:

| Đã có | Dùng cho việc gì |
|---|---|
| Vai `TEACHER` với 4 quyền (`question_set:read`, `user:read`, `evaluation:review`, `report:read`) | Không phải dựng lại phân quyền từ đầu |
| `AttemptService.createPartAttempt` / `createCustomAttempt` / `createMockTestAttempt` | Ba đường tạo lượt làm bài — giao bài chỉ cần gọi lại |
| 137 blueprint (đề full 4 part) | Giao đề full kỹ năng không phải làm gì thêm |
| `AdminContentService.create/publish` | Giáo viên tự gõ đề dùng lại được luồng này |
| `evaluation_summaries` | Nhận xét AI chi tiết cho Writing/Speaking |
| `attempt_question_sets` | Từng câu đúng/sai, điểm, thời gian làm |
| `user_part_progress`, `user_component_progress` | Điểm mạnh/yếu theo Part |
| `attempt_recordings` | File ghi âm Speaking để giáo viên nghe lại |
| `NotificationSender` | Gửi email nhắc bài |
| MinIO + `assets` | Lưu ảnh/audio nếu giáo viên tự gõ đề có media |

**Thiếu hẳn:** lớp học, thành viên lớp, bài giao, bài nộp, và ranh giới dữ liệu
giữa các giáo viên.

---

## 3. Quyết định thiết kế cần chốt trước

### 3.1. Đề giáo viên tự gõ nằm ở đâu?

**Đề xuất: dùng lại bảng `question_sets` hiện có, thêm cột `owner_teacher_id`.**

- `owner_teacher_id = NULL` → đề của hệ thống, mọi người dùng chung (như hiện nay)
- `owner_teacher_id = <id>` → đề riêng của giáo viên đó, chỉ lớp họ thấy

Lý do không tạo bảng riêng: đề giáo viên vẫn cần chấm bằng AI, vẫn cần lưu
snapshot khi học viên làm, vẫn cần hiện trong trang làm bài. Tách bảng nghĩa là
nhân đôi toàn bộ luồng đó.

Đề giáo viên **bỏ qua bước duyệt** (`submitForReview` → `publish`) vì không ai
duyệt cho họ; đặt thẳng `PUBLISHED` nhưng giới hạn phạm vi bằng `owner_teacher_id`.

### 3.2. Học viên vào lớp bằng cách nào?

**Đề xuất: mã lớp 6 ký tự + QR chứa đường dẫn `/lop/tham-gia?ma=ABC123`.**

- QR sinh ở **frontend** bằng thư viện, không cần lưu ảnh — mã lớp đã đủ, QR chỉ
  là cách hiển thị mã đó
- Học viên chưa đăng nhập quét QR → vào trang đăng ký, xong tự vào lớp
- Giáo viên bật/tắt được việc cho vào lớp bằng mã (chống người lạ)

### 3.3. Ranh giới dữ liệu giữa giáo viên

Đây là chỗ dễ sai nhất và nguy hiểm nhất — giáo viên A xem được học viên của
giáo viên B là lỗi nghiêm trọng.

**Nguyên tắc:** mọi truy vấn của giáo viên đều phải đi qua `classroom_id` mà họ
sở hữu. Không có endpoint nào cho phép giáo viên truy cập học viên theo `userId`
trực tiếp.

Sẽ viết test riêng khoá điều này, giống cách đã làm với affiliate.

### 3.4. Học viên trong lớp có cần Premium không?

**Câu hỏi cần anh quyết.** Ba phương án:

| Phương án | Ý nghĩa |
|---|---|
| A. Bài giáo viên giao thì miễn phí | Học viên free vẫn làm được bài được giao, nhưng tự luyện thì vẫn cần Premium. Giáo viên là kênh bán hàng. |
| B. Vẫn cần Premium như thường | Đơn giản nhất, không đụng gì đến `EntitlementService`. |
| C. Lớp học là gói riêng | Trung tâm mua gói theo lớp, học viên trong lớp tự động có Premium. |

Tôi nghiêng về **A** — giáo viên giao bài mà học viên không làm được thì tính
năng vô nghĩa, còn mở hết thì mất doanh thu.

---

## 4. Cấu trúc dữ liệu

### V43 — Lớp học

```
classrooms
  id, teacher_user_id, name, description
  join_code (6 ký tự, UNIQUE)      -- mã để quét QR vào lớp
  join_enabled (bật/tắt nhận học viên mới)
  status: ACTIVE | ARCHIVED
  created_at, updated_at

classroom_members
  id, classroom_id, user_id
  role: STUDENT | ASSISTANT       -- trợ giảng xem được, không sửa được
  status: ACTIVE | REMOVED
  joined_at
  UNIQUE(classroom_id, user_id)   -- không vào lớp hai lần
```

### V44 — Bài giao

```
assignments
  id, classroom_id, created_by
  title, instructions               -- lời dặn của giáo viên
  source_type: QUESTION_SETS | BLUEPRINT | CUSTOM_SET | FREE_TEXT
  blueprint_id                      -- khi giao đề full 4 part
  due_at                            -- hạn nộp, NULL = không hạn
  status: DRAFT | PUBLISHED | CLOSED
  created_at, updated_at

assignment_question_sets            -- đề được giao (từ ngân hàng hoặc tự gõ)
  assignment_id, question_set_id, display_order

assignment_submissions
  id, assignment_id, user_id
  attempt_id                        -- trỏ sang lượt làm bài đã có
  status: NOT_STARTED | IN_PROGRESS | SUBMITTED | LATE | GRADED
  submitted_at
  teacher_score                     -- điểm giáo viên chấm tay, NULL = giữ điểm AI
  teacher_comment
  graded_by, graded_at
  UNIQUE(assignment_id, user_id)
```

### V45 — Đề riêng của giáo viên

```
ALTER TABLE question_sets
  ADD COLUMN owner_teacher_id CHAR(36) NULL,
  ADD KEY idx_question_sets_owner (owner_teacher_id);
```

Kèm quyền mới: `classroom:write` (mở lớp, giao bài), `classroom:read` (trợ giảng).

---

## 5. Màn hình

### Phía giáo viên — `/giang-day`

| Màn hình | Nội dung |
|---|---|
| Danh sách lớp | Mỗi lớp: số học viên, số bài đang giao, số bài chờ chấm |
| Chi tiết lớp | Tab: Học viên · Bài giao · Tiến độ |
| — Tab Học viên | Bảng: tên, số bài đã làm, điểm trung bình, hoạt động gần nhất. Bấm vào một người → trang tiến độ cá nhân |
| — Tab Bài giao | Danh sách bài, mỗi bài hiện "12/20 đã nộp", bấm vào xem ai nộp ai chưa |
| — Tab Tiến độ | Biểu đồ điểm mạnh/yếu theo Part của cả lớp — thấy ngay lớp yếu phần nào |
| Mời vào lớp | Mã lớp cỡ lớn + **QR code** + nút sao chép đường dẫn, nút tải QR về để in |
| Tạo bài giao | Chọn nguồn: ngân hàng đề / đề full / tự gõ. Đặt hạn nộp. Chọn giao cả lớp hay vài người |
| Soạn đề mới | Form gõ đề theo Part, dùng lại editor của admin |
| Chấm bài | Xem bài làm + nhận xét AI, sửa điểm, viết nhận xét riêng |
| Tiến độ một học viên | Lịch sử làm bài, điểm theo thời gian, lỗi hay gặp, nghe lại ghi âm Speaking |

### Phía học viên

| Màn hình | Nội dung |
|---|---|
| `/lop-hoc` | Lớp đang tham gia, bài được giao, hạn nộp, bài quá hạn nổi màu đỏ |
| `/lop/tham-gia?ma=` | Nhập mã hoặc quét QR để vào lớp |
| Trang chủ | Thêm ô "Bài được giao" khi có bài chưa làm |

---

## 6. Thứ tự làm

Chia 3 đợt, mỗi đợt xong là dùng được ngay.

### Đợt 1 — Lớp học và theo dõi (2 ngày)
- V43, entity, service, phân quyền
- Giáo viên mở lớp, sinh mã + QR
- Học viên vào lớp bằng mã/QR
- Tab Học viên và Tiến độ (dùng dữ liệu đã có sẵn, không cần giao bài)

Sau đợt này giáo viên đã theo dõi được học viên — giá trị lớn nhất, đến sớm nhất.

### Đợt 2 — Giao bài (2–3 ngày)
- V44, giao đề từ ngân hàng và đề full
- Hạn nộp, theo dõi ai nộp ai chưa
- Email nhắc khi được giao và trước hạn
- Màn hình học viên xem bài được giao

### Đợt 3 — Đề riêng và chấm tay (2 ngày)
- V45, giáo viên tự gõ đề
- Chấm tay đè lên điểm AI, nhận xét riêng
- Học viên xem được nhận xét của giáo viên

---

## 7. Rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| **Giáo viên A xem được học viên của B** | Mọi truy vấn đi qua `classroom_id` sở hữu; viết test khoá riêng |
| Mã lớp bị đoán | 6 ký tự từ bộ 31 ký tự = 887 triệu tổ hợp; thêm nút tắt nhận học viên |
| Học viên free không làm được bài giao | Cần anh chốt mục 3.4 |
| Đề giáo viên gõ sai định dạng, AI chấm sai | Dùng lại `PublishValidator` đã có của admin |
| Bảng `assignment_submissions` phình to | Mỗi học viên mỗi bài một dòng — với quy mô hiện tại không đáng lo |

---

## 8. Cần anh quyết trước khi bắt đầu

1. **Mục 3.4** — học viên free có làm được bài giáo viên giao không? (tôi nghiêng về phương án A)
2. Giáo viên có được xem **ngân hàng đề đầy đủ** của hệ thống để giao không, hay chỉ một phần?
3. Một học viên vào được **nhiều lớp** cùng lúc chứ? (mặc định: có)
4. Trợ giảng có cần không, hay chỉ giáo viên? (mặc định: có, chỉ xem)
