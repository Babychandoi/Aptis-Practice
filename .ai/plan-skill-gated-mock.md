# Bài thi full: khóa theo kỹ năng, đồng hồ riêng, giấu điểm tới cuối

## Yêu cầu

Chỉ áp dụng cho bài thi thử full 5 kỹ năng (`MOCK_FULL_V1`, `component_id IS NULL`).
Luyện từng part **không đổi gì**.

1. Mỗi kỹ năng có đồng hồ riêng theo chuẩn Aptis ESOL, không dùng một đồng hồ
   tổng 162 phút:

   | Thứ tự | Kỹ năng | Thời gian |
   |---|---|---|
   | 1 | Speaking | 12 phút |
   | 2 | Listening | 40 phút |
   | 3 | Grammar & Vocabulary | 25 phút |
   | 4 | Reading | 35 phút |
   | 5 | Writing | 50 phút |

2. Nộp kỹ năng:
   - **Speaking**: tự chạy nên **tự nộp** khi ghi âm xong câu cuối.
   - Bốn kỹ năng còn lại: **bấm nút nộp**, có xác nhận.
   - Hết giờ kỹ năng nào thì **tự nộp** kỹ năng đó.

3. Kỹ năng đã nộp: khóa hẳn — không sửa, không xem lại, không quay về.

4. **Chỉ biết điểm và đúng/sai sau khi nộp đủ 5 kỹ năng.** Trong lúc thi không
   hiện điểm, đáp án hay lời giải.

## Hiện trạng

- Đồng hồ: `attempt.expiresAt` — một mốc cho cả lượt (`AttemptService.start`,
  `AttemptPage.tsx:161`).
- Nộp: chỉ có nộp **một bộ** (`/responses/{id}/score`, chấm + lộ đáp án ngay) và
  nộp **cả lượt** (`/submit`). Không có mức "kỹ năng".
- `revealed = isSubmitted || set.status === 'SCORED'` (`AttemptPage.tsx:1115`)
  → nộp lẻ một bộ là lộ đáp án giữa bài thi.
- Đã có: thứ tự kỹ năng đúng (V27), Speaking tự chạy một chiều, sidebar theo
  kỹ năng.

## Backend

### 1. Migration `V28__attempt_component_progress.sql`

```sql
CREATE TABLE attempt_component_progress (
  id            CHAR(36)  NOT NULL PRIMARY KEY,
  attempt_id    CHAR(36)  NOT NULL,
  component_id  CHAR(36)  NOT NULL,
  display_order INT       NOT NULL,   -- chép từ components, để sắp xếp không cần join
  duration_seconds INT    NOT NULL,
  started_at    DATETIME  NULL,
  expires_at    DATETIME  NULL,
  submitted_at  DATETIME  NULL,
  UNIQUE KEY uk_acp (attempt_id, component_id),
  CONSTRAINT fk_acp_attempt FOREIGN KEY (attempt_id) REFERENCES test_attempts(id)
);
```

Thời lượng lấy từ `test_blueprints.duration_seconds` của blueprint MOCK_TEST
tương ứng kỹ năng (đã đặt đúng ở V26), fallback hằng số trong code.

### 2. `AttemptService.start`

Bài full → sinh 5 dòng `attempt_component_progress` theo `components.display_order`.
Chỉ **kỹ năng đầu tiên** được `started_at`/`expires_at`; các kỹ năng sau để null,
đặt khi kỹ năng trước nộp xong. `test_attempts.expires_at` để null cho bài full
(đồng hồ tổng không còn ý nghĩa).

### 3. Endpoint mới

`POST /attempts/{attemptId}/components/{componentId}/submit`

- Xác thực chủ sở hữu, kỹ năng chưa nộp, đúng kỹ năng đang tới lượt.
- Đặt `submitted_at`; mở `started_at`/`expires_at` cho kỹ năng kế tiếp.
- Kỹ năng cuối nộp xong → gọi luôn `submit()` cho cả lượt.
- Trả `AttemptResponse` đã cập nhật.

### 4. Chặn ghi

`saveResponses`: bộ thuộc kỹ năng đã có `submitted_at` → `ApiException` 409.
Cũng chặn khi `expires_at` của kỹ năng đó đã qua (client trễ nhịp).

`scoreQuestionSet`: bài full → từ chối. Không chấm lẻ giữa bài thi.

### 5. Hết giờ phía server

Không cần job nền. Khi client gọi bất kỳ API nào, nếu kỹ năng hiện tại đã quá
`expires_at` thì tự đóng kỹ năng đó rồi mới xử lý tiếp — an toàn kể cả khi
người dùng đóng tab.

### 6. DTO

`AttemptResponse` thêm `List<ComponentProgressResponse> componentProgress`:
`componentId, componentCode, displayOrder, durationSeconds, startedAt, expiresAt,
submittedAt`.

## Frontend

### 1. Đồng hồ theo kỹ năng

`AttemptPage`: bài full dùng `expiresAt` của kỹ năng đang làm thay cho
`attempt.expiresAt`. Header hiện `Nói · còn 08:12`.

### 2. Nút nộp kỹ năng

Thay nút "Nộp bài chủ đề này" ở bài full bằng **"Nộp kỹ năng {tên}"**, có
`confirmDialog` cảnh báo không quay lại được. Speaking không có nút — tự nộp khi
`handleExamAutoAdvance` thấy đã ghi xong câu cuối của part cuối.

### 3. Khóa kỹ năng đã nộp

- Sidebar: kỹ năng đã nộp hiện dấu ✓ mờ, bấm không vào.
- `readOnly` cho mọi part thuộc kỹ năng đã nộp.
- Mở rộng logic `speakingLocked` hiện có thành `lockedComponents`.

### 4. Giấu điểm tới cuối

Bài full: ép `revealed = false` cho tới khi cả lượt `SUBMITTED`. Ẩn luôn
`SampleAnswer` và badge điểm từng bộ.

### 5. Hết giờ phía client

`useAttemptTimer` đếm về 0 → tự gọi nộp kỹ năng, hiện thông báo rồi sang kỹ năng
kế.

## Lệnh verify

- `npx tsc --noEmit` (frontend)
- `docker compose up -d --build backend` rồi soi log Flyway V28
- Kiểm DB: 5 dòng progress, chỉ dòng đầu có `expires_at`
- Thử API: nộp Speaking → Listening mở `expires_at`; ghi vào bộ Speaking → 409
- `scoreQuestionSet` trên bài full → từ chối

## Rủi ro

- **Attempt đang dở**: bài full tạo trước V28 không có dòng progress. Xử lý:
  `getAttempt` thấy bài full mà thiếu progress thì sinh bù, mốc giờ tính từ
  `started_at` của lượt.
- **Luyện từng part**: mọi nhánh mới đều gác sau `isFullMock`; đường cũ giữ nguyên.
- **`scoreQuestionSet`**: đang được dùng ở luyện tập — chỉ chặn ở bài full.
- Không đụng lịch sử/kết quả đã có.
