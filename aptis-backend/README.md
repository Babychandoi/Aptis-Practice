# Aptis Practice — Backend

Spring Boot 3.3 API cho hệ thống luyện thi Aptis. MySQL giữ dữ liệu giao dịch,
MongoDB giữ nội dung câu hỏi và snapshot bài làm, MinIO giữ file.

## Yêu cầu

- JDK 17+ — `JAVA_HOME` phải trỏ tới JDK 17. Kiểm tra bằng `mvn -v`: nếu dòng
  `Java version` hiện 1.8 thì build sẽ lỗi cú pháp (switch expression), không
  phải lỗi code.
- Maven 3.6+
- Docker (cho hạ tầng local và test tích hợp)

### Cấu hình Maven

Project tự khai báo repository trong [`.mvn/settings.xml`](.mvn/settings.xml),
được nạp tự động qua `.mvn/maven.config`. Chỉ cần gõ `mvn` như bình thường.

Lý do: settings.xml toàn cục trên một số máy nội bộ khai báo
`<mirrorOf>*</mirrorOf>` trỏ về Nexus riêng của tổ chức, chuyển hướng mọi
repository. Project này không dùng artifact nội bộ nào nên khai báo Central
trực tiếp — clone về là build được, không cần sửa cấu hình máy.

Nếu cần dùng artifact nội bộ, thêm `<repository>` vào `.mvn/settings.xml`.
**Không đặt username/password vào đó** — file được commit; dùng
`~/.m2/settings.xml` cho credential.

## Chạy bằng Docker (khuyến nghị)

Compose nằm ở thư mục gốc, chạy cả backend, frontend và hạ tầng:

```bash
cd ..                        # về thư mục chứa cả hai repo
docker compose up -d --build
```

Script MongoDB (`db/mongo/01-init-collections.js`, `02-seed-rubrics.js`) tự chạy
khi volume còn trống. Nếu volume đã tồn tại từ trước, chạy tay:

```bash
docker exec -i aptis-mongo mongosh --quiet \
  < aptis-backend/src/main/resources/db/mongo/01-init-collections.js
```

Flyway tự áp dụng V1..V15 khi backend khởi động.

## Chạy backend ngoài Docker

```bash
cd ..
docker compose up -d mysql mongo minio redis mailpit
cd aptis-backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Profile `local` nối MySQL ở cổng 3306; nếu dùng compose thì MySQL nằm ở
**3307** (xem chú thích trong docker-compose.yml) — override bằng
`MYSQL_PORT=3307`.

## Địa chỉ sau khi lên

| Dịch vụ | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost:8080/api/v1 (hoặc http://localhost/api/v1 qua nginx) |
| Swagger | http://localhost:8080/api/swagger |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |
| Mailpit — xem email xác thực | http://localhost:8025 |
| MySQL | 127.0.0.1:**3307** (aptis/aptis) |

## Migration

Flyway, thư mục `src/main/resources/db/migration`:

| File | Nội dung |
|---|---|
| `V1__auth_and_users.sql` | users, roles, permissions, token |
| `V2__exam_structure.sql` | exam product → version → component → part, task type, topic |
| `V3__assets.sql` | metadata file (đặt sớm vì nhiều bảng tham chiếu) |
| `V4__question_bank.sql` | question_sets, tag, content_access_overrides |
| `V5__subscription_and_entitlement.sql` | gói, subscription, entitlement, trial |
| `V6__orders_and_payments.sql` | order, payment, webhook, refund, mã giảm giá |
| `V7__blueprints_and_attempts.sql` | blueprint, test_attempts, điểm |
| `V8__progress.sql` | tiến độ học tập |
| `V9__evaluation_jobs_and_platform.sql` | chấm AI, import/export job, audit, outbox |
| `V10__seed_reference_data.sql` | seed role, task type, cấu trúc Aptis General, gói Premium |
| `V11__user_roles_assigned_at_default.sql` | default cho `user_roles.assigned_at` |
| `V12__seed_blueprint_rules_and_promotions.sql` | rule cho 2 đề thi thử, 2 mã giảm giá mẫu |
| `V13__evaluation_summary_unique_job.sql` | một job chấm chỉ có một bản tổng hợp |
| `V14__evaluation_summary_per_evaluator.sql` | cho phép bản chấm của giáo viên bên cạnh bản AI |
| `V15__trial_seed_and_indexes.sql` | chiến dịch dùng thử mẫu, index cho job hết hạn |

`hibernate.ddl-auto=validate` — Hibernate không đổi schema, chỉ kiểm tra khớp.
Sửa schema phải viết migration mới, không sửa file đã phát hành.

## Kiến trúc

```
vn.weconex.aptis
├── common/        cấu hình, security (JWT), exception, base entity
├── auth/          đăng ký, đăng nhập, refresh token, profile
├── catalog/       cấu trúc kỳ thi (đọc)
├── content/       metadata + nội dung câu hỏi, kiểm tra quyền truy cập
├── entitlement/   quyền Premium thực tế
├── billing/       gói, đơn hàng, thanh toán, webhook, kích hoạt Premium
├── practice/      lượt làm bài, snapshot, chấm tự động
├── progress/      thống kê học tập
├── asset/         MinIO presigned URL
├── evaluation/    chấm AI, giáo viên chấm lại, rubric
└── platform/      outbox, khóa phân tán, import/export, audit, scheduled job
```

## Những chỗ không được thay đổi tùy ý

Các quy tắc dưới đây là lý do kiến trúc được thiết kế như vậy:

1. **Quyền Premium đọc từ `user_entitlements`, không từ cột `is_premium`.**
   Điểm vào duy nhất là `ContentAccessService` — nó xét status, override, rồi
   entitlement. Không kiểm tra quyền ở controller.

2. **Answer key không rời backend trước khi nộp bài.**
   `QuestionSetSanitizer` lược `answerKey` và `explanation`. Snapshot trong
   `attempt_documents` vẫn giữ đủ để chấm.

3. **Mỗi attempt có snapshot riêng.** Admin sửa câu hỏi không ảnh hưởng bài đã
   làm. Snapshot bất biến sau khi tạo.

4. **Premium chỉ kích hoạt qua webhook đã verify chữ ký**, không dựa vào URL
   redirect. Webhook idempotent theo `(provider, event_id)` hoặc checksum
   payload. Order bị khóa (`SELECT ... FOR UPDATE`) trước khi kích hoạt.

5. **Không có distributed transaction MySQL ↔ MongoDB.** Khi tạo attempt: ghi
   Mongo trước, MySQL sau — document mồ côi thì job dọn, còn attempt thiếu
   snapshot thì học viên gặp đề rỗng.

6. **Giá lấy từ `subscription_plans`, không nhận từ client.** `OrderService`
   không đọc số tiền nào từ request.

7. **Thu hồi token khi phát hiện reuse phải chạy trong transaction riêng.**
   `TokenRevoker` dùng `REQUIRES_NEW` vì `refresh()` throw ngay sau đó — nếu
   cùng transaction thì lệnh thu hồi bị rollback và token bị đánh cắp vẫn dùng
   được. Đã có test end-to-end xác nhận cả chuỗi token bị vô hiệu.

### Khoảng trống đã biết: Premium hết hạn

Quyền đọc từ `user_entitlements`, còn job `expireSubscriptions` chạy mỗi 15
phút. Giữa lúc `user_subscriptions.ends_at` qua hạn và lúc job thu hồi
entitlement, học viên vẫn truy cập được nội dung Premium — tối đa 15 phút.

Đây là đánh đổi có ý thức: kiểm tra quyền chỉ đọc một bảng nên rất nhanh. Nếu
cần chặt chẽ tuyệt đối thì cho `ContentAccessService` join thêm
`user_subscriptions`, hoặc giảm chu kỳ job.

## Test

```bash
# Unit test — không cần Docker
mvn test -Dtest=ScoringServiceTest,QuestionSetSanitizerTest,PromotionCodeTest,PublishValidatorTest,UserEntitlementTest

# Test migration khớp entity — cần Docker mà Testcontainers nhận diện được
mvn test -Dtest=SchemaConsistencyTest
```

`SchemaConsistencyTest` chạy Flyway lên MySQL thật rồi để Hibernate validate.
Trên Docker Desktop 29.x/Windows, Testcontainers có thể báo *"Could not find a
valid Docker environment"* do named pipe của CLI proxy trả HTTP 400 — đây là
vấn đề tương thích của docker-java, không phải của schema. Khi gặp lỗi đó, cách
kiểm tra tương đương là khởi động app bằng compose: `ddl-auto=validate` sẽ báo
mọi lệch schema ngay lúc start.

### Cạm bẫy khi sửa entity

Ba lỗi dưới đây chỉ lộ ra lúc chạy thật với `ddl-auto=validate`, không phải lúc
compile:

- **Cột UUID** — migration dùng `CHAR(36)`, phải khai
  `columnDefinition = "CHAR(36)"` trên cả `@Column` và `@JoinColumn`. Thiếu thì
  Hibernate mong đợi `varchar(36)`.
- **Cột DECIMAL map sang `double`** — phải khai `columnDefinition = "DECIMAL(p,s)"`.
  Không dùng `precision`/`scale` vì hai thuộc tính đó chỉ có nghĩa với `BigDecimal`.
- **Field `id` trong lớp lồng của document MongoDB** — phải có `@Field("id")`,
  nếu không Spring Data coi là `_id` và đọc ra null.

### Repository phải là interface top-level

Không gom repository vào một class holder (`class Xs { interface A {} }`) —
Spring Data không quét được interface lồng và context sẽ không khởi động được.
Entity thì gom được (xem `BillingEntities`, `ExamStructure`).

## Tích hợp cổng thanh toán thật

`SandboxPaymentProvider` chỉ dùng cho dev (`aptis.payment.sandbox.enabled=true`).
Thêm provider thật bằng cách implement `PaymentProvider`:

- `initiate` — gọi API khởi tạo của cổng, trả `paymentUrl`
- `verifySignature` — verify HMAC/RSA trên **raw body**, so sánh hằng thời gian
- `parseCallback` — lấy `orderCode` và `amount` **từ payload của cổng**

Bean được đăng ký tự động theo `providerCode()`, trùng với path
`/api/v1/payments/webhooks/{provider}`.

## Quản trị nội dung

Vòng đời `DRAFT → IN_REVIEW → PUBLISHED → SUSPENDED/ARCHIVED`, phân quyền theo
permission chứ không theo role:

| Endpoint | Permission |
|---|---|
| `POST /admin/question-sets` | `question_set:write` |
| `PATCH /admin/question-sets/{id}` | `question_set:write` |
| `POST /admin/question-sets/{id}/submit-review` | `question_set:write` |
| `POST /admin/question-sets/{id}/request-changes` | `question_set:review` |
| `POST /admin/question-sets/{id}/publish` | `question_set:publish` |
| `POST /admin/question-sets/{id}/suspend` | `question_set:publish` |
| `POST /admin/question-sets/{id}/archive` | `question_set:archive` |
| `GET /admin/question-sets/{id}/preview` | `question_set:read` |

Ràng buộc đã thực thi:

- Không publish tắt từ DRAFT — phải qua IN_REVIEW.
- Không sửa nội dung đã PUBLISHED; phải SUSPEND trước.
- `item_count` và `max_score` ở MySQL luôn dẫn xuất từ nội dung Mongo, không
  nhận từ client.
- `PublishValidator` trả **toàn bộ** lỗi trong một lượt (12 điều kiện theo §60):
  thiếu instructions, id trùng, đáp án trỏ option không tồn tại, thiếu rubric cho
  Speaking/Writing, asset chưa READY, maxScore lệch…
- `GET .../preview` mặc định trả đúng bản học viên thấy (đã lược đáp án);
  `?revealAnswers=true` để biên tập viên tự kiểm tra.
- Mỗi lần publish tạo một revision bất biến trong `question_set_revisions`.

## Chấm Speaking/Writing

```
nộp bài → EvaluationQueue tạo job → EvaluationDispatcher (10s/lần)
        → EvaluationWorker.processOne → engine chấm theo rubric
        → evaluation_documents + evaluation_summaries → chốt điểm attempt
```

**Engine hiện tại là heuristic, KHÔNG phải AI.** `HeuristicEvaluationEngine` cho
điểm theo dấu hiệu đo được bằng máy: số từ so với `minWords`/`maxWords`, độ đa
dạng từ vựng, độ dài câu, số từ nối, dấu hiệu văn phong. Đủ để chạy và kiểm thử
toàn bộ luồng, nhưng không phản ánh chất lượng ngôn ngữ thật.

Để dùng LLM thật: implement `EvaluationEngine`, đăng ký thành bean, và tắt
`aptis.evaluation.heuristic.enabled`. Bean được chọn theo `supports(type)`.

**STT chưa tích hợp.** `TranscriptionService` chỉ đọc metadata file ghi âm và trả
transcript rỗng, nên điểm Speaking hiện dựa vào thời lượng bản ghi chứ không phải
nội dung nói. Điểm cần thay: thân method `transcribe`.

## Thi thử

`MockTestService` chọn nội dung theo `blueprint_part_rules`: đi qua từng Part
theo `display_order`, áp `difficulty_min/max`, `allow_free_content`,
`allow_premium_content` và `selection_strategy` (RANDOM / NEW_FIRST /
WEAK_FIRST / FIXED). Một bộ câu hỏi không xuất hiện hai lần trong cùng đề.

Ngân hàng đề thiếu câu ở một Part thì vẫn tạo được lượt thi nhưng ghi WARN kèm
danh sách Part thiếu — không im lặng bỏ qua.

Sau khi nộp, `AttemptScoreAggregator` tính điểm theo Part và theo học phần, kèm
CEFR ước lượng. **Thang quy đổi CEFR là tạm** — British Council không công bố
công thức; khi có dữ liệu đối chiếu thật thì thay bảng quy đổi trong
`AttemptScoreAggregator.estimateCefr`.

## Cạm bẫy transaction đã gặp

Ba lỗi cùng một họ, đều chỉ lộ ra khi chạy thật:

1. **Ghi DB sau khi bắt exception** — transaction đã bị đánh dấu rollback-only
   nên lệnh ghi cũng mất. Cần bean riêng với `REQUIRES_NEW`: xem `TokenRevoker`
   (thu hồi refresh token) và `EvaluationJobFailureRecorder` (tăng retry_count).
   Không có nó, `retry_count` mãi bằng 0 và job retry vô hạn.

2. **Self-invocation** — gọi method `@Transactional` từ trong cùng class bỏ qua
   proxy Spring, nên không có transaction nào commit. Đây là lỗi lặp lại nhiều
   lần nhất trong dự án; mọi vòng lặp "mỗi phần tử một transaction" đều phải
   tách bean: `EvaluationDispatcher`, `OutboxDispatcher`, `MaintenanceTasks`,
   `ExportPurger` (dọn từng file báo cáo), `AssetWriter` (ghi từng file trong
   gói ZIP). Để `protected` cũng không cứu được — proxy CGLIB bỏ qua luôn.

3. **Bắt exception trong method có `@Transactional`** để trả 200 kèm lý do sẽ
   gây `UnexpectedRollbackException` lúc commit. `PromotionService.preview` và
   endpoint `/promotions/check` cố tình không mở transaction.

Ngoài ra: `deleteAll` + `saveAll` trong cùng transaction cần `flush()` ở giữa —
Hibernate sắp INSERT trước DELETE, gây trùng unique key (xem
`AttemptScoreAggregator`).

### Cột DATETIME làm tròn mili giây

Cột DATETIME không khai báo phần thập phân, nên MySQL **làm tròn** giá trị có
mili giây. Với .500 trở lên, thời điểm bị đẩy sang giây kế tiếp và nằm ở tương
lai — mọi điều kiện `starts_at <= NOW()` trượt ngay sau khi ghi.

Triệu chứng thật đã gặp: khoảng một nửa số lần, học viên mua Premium xong
`premiumActive` vẫn `false` tới một giây. Sửa bằng `Timestamps.floorToSecond`
cho mọi mốc **bắt đầu** (`user_entitlements`, `user_subscriptions`,
`user_trials`). Mốc kết thúc không cần: làm tròn lên chỉ kéo dài thêm dưới một
giây.

### Ghi Mongo không rollback theo transaction MySQL

Job chấm và chấm lại đều phải **upsert** document Mongo theo khóa dẫn xuất, chứ
không insert mới: transaction MySQL rollback thì document Mongo vẫn nằm đó, lần
sau đụng unique index và hỏng mãi. Xem `EvaluationWorker` và
`TeacherReviewService`.

## Hạ tầng nền

### Outbox consumer

`OutboxDispatcher` (5 giây/lần) đọc event PENDING và gọi handler theo
`event_type`. Thêm handler mới: implement `OutboxEventHandler`, đăng ký bean —
dispatcher tự nạp.

Đặc điểm đã thực thi:

- Event không có handler → PUBLISHED chứ không retry mãi (handler có thể thêm
  sau; event vẫn giữ để đối soát).
- Handler ném exception → retry với backoff luỹ tiến 2^n giây, chặn trên 5 phút,
  tối đa `aptis.outbox.max-retry` lần rồi FAILED.
- Handler phải **idempotent**: outbox bảo đảm at-least-once.

Handler hiện có: `SUBSCRIPTION_ACTIVATED` (gửi email kích hoạt Premium).

### Distributed lock

Mặc định `NoOpSchedulerLock` — chỉ an toàn khi chạy **một** instance. Nhiều
instance phải bật:

```bash
SCHEDULER_LOCK=true docker compose up -d
```

`DistributedLock` dùng Redis `SET NX PX`, nhả bằng Lua script so token rồi mới
`DEL` — tránh instance A xóa khóa của B khi A treo quá TTL rồi tỉnh lại. TTL
mỗi job đặt dài hơn thời gian chạy dự kiến nhưng ngắn hơn chu kỳ lặp.

### Import Excel

Upload file qua Asset API rồi tạo job — dùng chung luồng upload an toàn.

Định dạng: một dòng = một câu hỏi, cột theo **tên** ở dòng tiêu đề (thêm cột mới
không vỡ file cũ). Nhiều dòng cùng `code` gộp thành một bộ nhiều câu.

```
code | part_code | component_code | title | difficulty | access_level |
instructions | prompt | option_a..e | correct_option | explanation | topic_code
```

Import đi qua `AdminContentService` nên chịu đúng ràng buộc như soạn tay và luôn
dừng ở **DRAFT** — không tự publish nội dung chưa ai xem. Dòng lỗi được gom vào
một file Excel báo lỗi (kèm số dòng) để sửa rồi import lại.

### Export báo cáo

Bốn loại: `LEARNING_REPORT`, `REVENUE_REPORT`, `ATTEMPT_DETAIL`, `USER_LIST`.
Dùng `JdbcTemplate` vì là truy vấn tổng hợp — nạp entity chỉ tốn bộ nhớ. File
kết quả lên MinIO bucket exports, có `expires_at` sau 7 ngày (báo cáo chứa dữ
liệu học viên, không giữ vô thời hạn).

## Giáo viên chấm lại

`POST /api/v1/admin/evaluations/{jobId}/review` (permission `evaluation:review`).

Điểm AI **không bị xóa**: bản cũ chuyển `is_final = false`, bản giáo viên thành
`is_final = true`. Nhờ vậy đối soát được AI lệch bao nhiêu so với người, còn học
viên chỉ thấy một điểm (API `/attempts/{id}/evaluations` ưu tiên bản TEACHER).

Chấm lại nhiều lần cập nhật bản của chính giáo viên đó, không thêm dòng.

## Hoàn tiền

`POST /api/v1/admin/orders/{orderId}/refunds` (permission `refund:write`).

- Hoàn **một phần** → đơn `PARTIALLY_REFUNDED`, **giữ nguyên quyền Premium**
  (coi như giảm giá sau bán).
- Hoàn **toàn bộ** → đơn `REFUNDED`, thu hồi subscription và mọi entitlement
  sinh từ đơn đó. Không thu hồi thì học viên vừa nhận tiền vừa còn quyền.
- Order bị khóa (`SELECT FOR UPDATE`) khi tính số còn lại, chặn hai yêu cầu đồng
  thời vượt tổng đã trả.
- Cổng trả `pending` → refund giữ `PROCESSING` chờ webhook, không đánh dấu
  SUCCESS sớm.

Cổng thật xử lý hoàn tiền bất đồng bộ, xác nhận về qua
`POST /api/v1/payments/webhooks/{provider}/refund-callbacks` (không dùng JWT,
xác thực bằng chữ ký như webhook thanh toán):

- **Quyền chỉ bị thu hồi khi cổng xác nhận.** Thu hồi ngay lúc gửi yêu cầu sẽ
  khóa nhầm học viên nếu cổng từ chối hoàn.
- Chống xử lý lặp bằng `payment_webhook_events` (theo `eventId`, không có thì
  theo checksum payload) — dùng chung bảng với webhook thanh toán.
- Refund bị khóa `SELECT FOR UPDATE` trước khi áp dụng; bản ghi đã ở trạng thái
  cuối thì webhook không đổi gì.
- Số tiền cổng báo phải khớp số đã yêu cầu, lệch thì không tự áp dụng.
- Phần còn lại được **tính lại tại thời điểm webhook về**, không dùng giá trị
  lúc gửi yêu cầu: giữa hai mốc đó có thể đã có lần hoàn khác thành công.
- `providerRefundId` trùng trên nhiều bản ghi → trả `CONFLICT` thay vì đoán.
  Xác nhận nhầm sẽ thu hồi quyền của lần hoàn khác.

Bật `aptis.payment.sandbox.async-refund` (env `SANDBOX_ASYNC_REFUND`) để cổng
sandbox chạy theo kiểu bất đồng bộ giống cổng thật.

## Dọn file báo cáo quá hạn

Báo cáo chứa dữ liệu học viên nên quá `expires_at` là **xóa hẳn file** khỏi
MinIO, không chỉ ẩn đi. Job `purgeExpiredExports` chạy mỗi giờ
(`EXPORT_PURGE_INTERVAL`, rút ngắn khi chạy e2e).

Bản ghi job vẫn giữ để còn biết ai đã xuất gì, chỉ xóa file và bỏ tham chiếu
asset. Thứ tự bắt buộc: **xóa trên MinIO trước, bỏ tham chiếu sau** — làm ngược
lại thì file nằm lại storage mà không còn gì trỏ tới để dọn. Xóa thất bại thì
bỏ qua để lượt sau thử lại, không đánh dấu đã dọn.

## Dùng thử Premium

`POST /api/v1/trials` với `campaignCode`. Quyền cấp qua `user_entitlements` với
`source_type = TRIAL` — giống hệt đường mua, nên `ContentAccessService` không
cần biết học viên đang thử hay đã trả tiền.

Chặn khi: chiến dịch không mở, hết lượt theo `max_uses_per_user`, hoặc đang có
Premium. Job `expireTrials` (15 phút/lần) thu hồi quyền khi hết hạn.

## Import dạng bài

Excel import được 5 nhóm dạng chấm tự động. Cột `task_type` quyết định cách đọc
đáp án; bỏ trống thì mặc định `SINGLE_CHOICE` nên file soạn theo mẫu cũ vẫn chạy.

| task_type | Đáp án đọc từ |
|---|---|
| `SINGLE_CHOICE`, `GAP_FILL_CHOICE` | `correct_option` — một mã phương án |
| `MULTIPLE_CHOICE` | `correct_option` — nhiều mã, phân tách dấu phẩy |
| `MATCHING`, `SPEAKER_MATCHING`, `HEADING_MATCHING` | `correct_matches` dạng `A=B, C=D`; vế trái ở `left_a`..`left_h` |
| `SENTENCE_ORDERING` | `correct_order` dạng `C,A,B`, phải liệt kê đủ mọi phương án |
| `SHORT_TEXT` | `accepted_answers` phân tách bằng `\|`, kèm cờ `case_sensitive` |

Dùng `|` chứ không phải dấu phẩy cho `accepted_answers` vì đáp án tự do có thể
chứa dấu phẩy (`1,000`).

`responseType` ghi vào Mongo là **mã validator**, không phải mã task type — sai
chỗ này thì học viên trả lời đúng vẫn bị 0 điểm mà không có lỗi nào hiện ra.
Ánh xạ nằm ở `QuestionSetImporter.responseTypeOf`.

Dạng tự luận (`LONG_TEXT`, `AUDIO_RECORDING`) không import được: chấm bằng
rubric chứ không có answer key.

`ImportType.ASSET_ZIP` nhập hàng loạt audio/ảnh. Ràng buộc an toàn trong
`AssetZipImporter`: danh sách trắng phần mở rộng, trần 50 MB/file và 500 MB/gói,
tối đa 2000 file, và **chống zip slip** — tên entry bị cắt còn phần tên file,
object key luôn sinh từ UUID nên không ghi đè được file khác.

## Chưa làm

- Import ZIP chưa gắn asset vào câu hỏi tự động; biên tập viên vẫn phải tham
  chiếu thủ công theo `originalFilename`
- Chưa có màn quản lý người dùng/phân quyền trong giao diện quản trị (API
  `user:read`/`user:write` đã có)
- Chưa có màn soạn thảo nội dung câu hỏi trực quan — tạo/sửa nội dung vẫn qua
  API hoặc import Excel; giao diện mới làm phần duyệt, xem trước và vòng đời
