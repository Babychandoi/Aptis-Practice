# BÁO CÁO ĐÁNH GIÁ SOURCE CODE APTIS PRACTICE

**Repository:** [Babychandoi/Aptis-Practice](https://github.com/Babychandoi/Aptis-Practice)  
**Branch được đánh giá:** [`feat/reading-parts-merge-item-scoring`](https://github.com/Babychandoi/Aptis-Practice/tree/feat/reading-parts-merge-item-scoring)  
**Commit tại thời điểm đánh giá:** `3a5866f26380c1ce13504b875558609a606b1a51`  
**PR liên quan:** [Pull Request #1](https://github.com/Babychandoi/Aptis-Practice/pull/1)  
**Ngày đánh giá:** 17/08/2026  
**Vai trò đánh giá:** PM + Senior Developer, DevOps và khách hàng khó tính

---

## Cập nhật đối chiếu và khắc phục — 18/08/2026

Các nhận định trong báo cáo đã được đối chiếu trực tiếp với source tại commit nêu
trên. Phần báo cáo phía dưới được giữ nguyên để làm lịch sử review; trạng thái mới
nhất được ghi tại đây.

| Nhận định | Kết quả đối chiếu | Cải tiến đã thực hiện |
|---|---|---|
| Autosave có thể lost update | **Đúng** | Khóa pessimistic theo attempt ở backend và gửi tuần tự ở frontend; không còn nhiều request cùng ghi đè một Mongo aggregate. |
| Timer/component có race condition | **Đúng** | `submitComponent` idempotent, command submit dùng lock; `getAttempt` read-only không còn gọi maintenance write. |
| Scoring rule không đi vào kết quả | **Đúng** | Bài `MOCK_TEST` được quy đổi theo `part_scoring_rules`, gồm `max_score`, `perfect_bonus`, `included_in_overall`; frontend dùng tổng điểm backend và ghi rõ “điểm luyện tập”. Có regression test cho Reading Part 3 và Listening Part 1. |
| Raw HTML gây XSS | **Đúng** | `PLAIN_TEXT` render bằng text node; HTML qua allowlist, loại script/SVG/event handler/URL nguy hiểm; có test payload XSS. |
| Refresh token trong localStorage | **Đúng, đã xử lý** | Refresh token chuyển sang cookie `HttpOnly`, `SameSite=Lax`, `Secure` mặc định; cookie bị giới hạn ở `/api/v1/auth`. Access token vẫn ở memory. Phiên cũ được chuyển tiếp một lần qua body rồi xoá token localStorage. |
| Worker AI giữ transaction khi gọi STT/LLM | **Đúng** | Claim job bằng atomic update; STT/LLM chạy ngoài transaction; transaction ngắn chỉ dùng khi merge kết quả. Attempt được khóa và Mongo được reload trước khi merge để an toàn nhiều replica. |
| Hai vòng polling kết quả | **Đúng** | Trong lúc `SCORING` chỉ poll attempt; feedback chỉ tải sau `COMPLETED`. |
| Frontend tải bundle lớn | **Đúng** | Route-level lazy loading; initial JS giảm từ khoảng **902 KB xuống 345 KB** (gzip từ khoảng 270 KB xuống 112 KB). |
| Không có CI/lint chạy được | **Đúng** | Thêm ESLint flat config, Vitest và GitHub Actions cho backend/frontend. |
| Dependency frontend có advisory | **Đúng tại thời điểm review** | Nâng React Router lên bản vá; `npm audit --omit=dev` hiện không còn lỗ hổng production. Advisory dev-tool của Vite 5 vẫn cần major upgrade riêng. |
| Snapshot phình dữ liệu, random DB, observability | **Đúng về rủi ro kiến trúc** | Quy tắc chấm đã được snapshot theo attempt; việc đổi mô hình snapshot nội dung và random selection vẫn cần benchmark trước khi migration. |
| Chưa có benchmark luồng luyện tập | **Đúng, đã có harness** | Thêm `scripts/benchmark-practice.mjs`: đo create/start, hai autosave song song, reload kiểm tra mất dữ liệu và xuất p50/p95/p99. Kết quả production vẫn phải chạy trên staging tương đương tải thật. |
| Admin đổi scoring rule làm lệch lịch sử | **Đúng, đã xử lý** | Attempt mới đóng băng `maxScore`, `perfectBonus`, `pointsPerCorrect`, `includedInOverall`, rule id và `updatedAt`; chấm lại ưu tiên snapshot, chỉ attempt cũ mới fallback về rule hiện tại. |

### Kết quả kiểm tra sau sửa

- Backend: `88` test pass, `0` fail, `0` error, `0` skip. Testcontainers `1.21.4`
  đã chạy thật trên Docker Engine 29 với MySQL, MongoDB, Redis và MinIO; `7/7`
  integration test pass, gồm kịch bản hai autosave đồng thời không làm mất dữ liệu.
- Frontend: ESLint, TypeScript/production build và `4/4` Vitest regression/security test
  đều pass.
- Browser E2E chạy trực tiếp trên Chrome với image Docker mới:
  - Writing đủ `11/11` câu đi qua `SCORING` tới kết quả AI `35/50`, có feedback;
  - hết giờ kỹ năng cuối của đề đủ 5 kỹ năng tự nộp đúng một lần, attempt chuyển
    `COMPLETED` và mở được trang kết quả.
- E2E phát hiện và đã sửa hai edge case: trang kết quả gọi `toFixed()` với điểm AI
  chưa có; attempt có câu AI nhưng bị bỏ trống từng kẹt `SCORING` dù không có job.
- Benchmark local Docker: `50` luồng, concurrency `5`, `0` lỗi. p95 create attempt
  `298.87 ms`, start `298.26 ms`, autosave `249.09 ms`, reload `79.76 ms` — đạt
  ngưỡng kiểm tra `2.000 ms`.
- `npm audit --omit=dev`: `0` production vulnerability.
- `git diff --check`: pass.

### Phần còn phải làm trước production

1. Theo dõi lần chạy đầu của GitHub Actions trên runner Docker sau khi push; local
   Docker đã xác nhận toàn bộ Testcontainers chạy thật và không còn auto-skip.
2. Chuyển hai kịch bản browser E2E vừa xác minh trực tiếp thành suite tự động cố định
   trên CI để chống hồi quy giao diện lâu dài.
3. Sau cửa sổ chuyển đổi phiên, bỏ hẳn trường refresh token legacy trong request body.
4. Chạy lại benchmark trên staging có cấu hình/tải gần production trước khi thay
   snapshot/reference model hoặc chiến lược chọn ngẫu nhiên; số liệu hiện tại mới là
   baseline local Docker, chưa đại diện production.

---

## 1. Phạm vi và nguyên tắc đánh giá

Báo cáo đánh giá các nội dung sau:

- Tổ chức kiến trúc và source code.
- Chất lượng triển khai, khả năng bảo trì và kiểm thử.
- Tính đúng đắn của autosave, timer, submit và scoring.
- Hiệu năng frontend/backend.
- Khả năng vận hành khi có nhiều người truy cập.
- Độ ổn định và trải nghiệm của người dùng cuối.
- Các vấn đề bảo mật trong chính luồng ứng dụng.

### Ngoại lệ theo quyết định của chủ dự án

Thư mục backup và các file `.env` được chủ dự án **cố ý lưu trên Git để phục vụ việc chuyển server bằng cách clone repository**. Vì vậy:

- Báo cáo này không coi việc đưa backup/`.env` lên Git là lỗi.
- Không trừ điểm kiến trúc, DevOps, bảo mật hoặc production readiness vì quyết định trên.
- Không đưa việc di chuyển/xóa/rotate các file này vào danh sách điều kiện chặn merge.

Những nhận xét bảo mật còn lại, chẳng hạn XSS, token phía trình duyệt và token trên query string, vẫn được đánh giá vì chúng độc lập với quyết định lưu backup.

---

## 2. Kết luận điều hành

Branch có nền tảng kiến trúc khá tốt và phạm vi tính năng lớn. Đội phát triển đã đầu tư nghiêm túc vào hệ thống luyện thi gồm snapshot đề, timer từng kỹ năng, autosave, chấm AI, STT, subscription, thanh toán và quản trị nội dung.

Tuy nhiên, phiên bản hiện tại vẫn có các lỗi ảnh hưởng trực tiếp tới độ tin cậy của một hệ thống thi:

1. Autosave có nguy cơ ghi đè và làm mất câu trả lời khi nhiều request chạy đồng thời.
2. Luồng hết giờ có thể tự đóng component rồi báo lỗi submit; kỹ năng cuối có nguy cơ làm attempt bị kẹt.
3. Cấu hình scoring trong trang quản trị chưa thực sự điều khiển kết quả mà người dùng nhìn thấy.
4. Một số nội dung được render bằng `dangerouslySetInnerHTML` nhưng chưa có lớp sanitize tương xứng.
5. Worker AI giữ transaction và database connection trong thời gian gọi STT/LLM, gây rủi ro lớn khi tải tăng.
6. Branch chưa có CI bắt buộc; frontend lint hiện không chạy được và các luồng mới quan trọng chưa có test.

### Kết luận merge

> **REQUEST CHANGES — chưa nên merge vào `main` hoặc triển khai production trước khi xử lý nhóm P0.**

### Bảng điểm tổng hợp đã loại trừ backup/`.env`

| Góc nhìn | Điểm | Nhận xét ngắn |
|---|---:|---|
| PM + Senior Developer | **5.4/10** | Kiến trúc tốt nhưng còn lỗi concurrency, state machine và scoring |
| DevOps | **5.0/10** | Nền tảng container ổn; hàng đợi AI, polling và data amplification chưa scale tốt |
| Khách hàng khó tính | **5.6/10** | Tính năng phong phú nhưng nguy cơ mất đáp án/kẹt bài làm giảm niềm tin |
| Production readiness | **5.2/10** | Có thể tiếp tục staging, chưa đủ an toàn để phát hành diện rộng |

---

# PHẦN I — ĐÁNH GIÁ DƯỚI GÓC PM + SENIOR DEVELOPER

## 3. Điểm đạt về tổ chức và kiến trúc

### 3.1. Backend được chia theo domain tương đối rõ

Source Spring Boot thể hiện hướng modular monolith hợp lý:

- Controller/service/repository/DTO được phân lớp.
- Dữ liệu quan hệ nằm trong MySQL/JPA.
- Attempt và snapshot phù hợp hơn với MongoDB.
- Redis phục vụ cache/lock/idempotency.
- MinIO đảm nhiệm object storage.
- Flyway quản lý schema migration.

Đây là hướng đi phù hợp với sản phẩm đang ở giai đoạn phát triển nhanh: chưa cần tách microservice quá sớm nhưng vẫn có ranh giới chức năng để tách sau này.

### 3.2. Có nhiều quyết định kỹ thuật tốt

- Tắt `open-in-view`, tránh query ngầm từ tầng web.
- Có pessimistic lock trong luồng submit để giảm double-submit.
- Có khái niệm outbox và idempotency.
- Có index cho nhiều truy vấn nghiệp vụ quan trọng.
- JDBC batching đã được cấu hình.
- Backend không proxy toàn bộ file MinIO mà sử dụng presigned URL.
- Có logic loại answer key trước khi gửi đề cho học viên.
- Access token có thời gian sống ngắn.
- Mật khẩu sử dụng Argon2.
- LLM output được kiểm tra theo criterion code, giới hạn khoảng điểm và tính lại tổng.
- STT phân biệt trường hợp im lặng với lỗi kỹ thuật.
- Item ID khi merge được xử lý nhằm tránh collision.

### 3.3. Frontend có cấu trúc feature tương đối tốt

- API client có type.
- React Query phù hợp cho server state.
- Zustand phù hợp cho state cục bộ của phiên làm bài.
- Có loading, error và not-found state.
- Có mic check cho Speaking.
- Có timer, transition giữa các kỹ năng và trạng thái chờ chấm.
- Production build và TypeScript typecheck đều thành công.

---

## 4. Vấn đề P0 — Autosave có nguy cơ làm mất đáp án

Frontend gom nhiều question set cần lưu rồi gửi request đồng thời bằng `Promise.all` tại [`useAutosave.ts`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-frontend/src/features/practice/useAutosave.ts#L22-L50).

Trong khi đó, mỗi request ở backend thực hiện theo hướng:

1. Đọc toàn bộ `AttemptDocument` từ MongoDB.
2. Thay đổi câu trả lời của một question set.
3. Ghi lại toàn bộ document.

Xem [`AttemptService.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/attempt/service/AttemptService.java#L481-L537).

`AttemptDocument` chưa có optimistic version. Do đó có thể xảy ra lost update:

```text
Request A đọc attempt phiên bản 1
Request B đọc attempt phiên bản 1
Request A lưu đáp án Reading → phiên bản 2
Request B lưu đáp án Speaking dựa trên phiên bản 1 → ghi đè phiên bản 2
Kết quả: đáp án Reading vừa lưu có thể biến mất
```

### Tác động

- Người dùng nhìn thấy trạng thái autosave nhưng đáp án thực tế có thể bị mất.
- `answeredCount` có thể lệch khỏi dữ liệu thật.
- Lỗi khó tái hiện trên môi trường ít người nhưng xuất hiện nhiều hơn khi mạng chậm hoặc nhiều set được lưu cùng lúc.
- Đây là lỗi làm mất niềm tin nghiêm trọng đối với hệ thống thi.

### Hướng sửa đề xuất

Ưu tiên một trong các phương án:

1. Dùng atomic Mongo update `$set` tới đúng `attemptId + questionSetId + itemId`.
2. Bổ sung `@Version` và retry có giới hạn khi optimistic conflict.
3. Tạo bulk-save endpoint và chỉ gửi một request cho mỗi lần flush.
4. Tuần tự hóa queue lưu trên frontend thay vì `Promise.all` theo question set.

Bắt buộc bổ sung integration test với hai request lưu đồng thời vào hai question set khác nhau, sau đó xác nhận cả hai câu trả lời vẫn tồn tại.

### Vấn đề liên quan khi đóng tab

Async Axios trong sự kiện `beforeunload` không đảm bảo request hoàn tất. Nên kết hợp:

- Lưu draft cục bộ vào IndexedDB/local storage phù hợp.
- `sendBeacon` hoặc request có `keepalive` nếu endpoint hỗ trợ.
- Hiển thị thời điểm server xác nhận lần lưu cuối.
- Khôi phục draft khi người dùng quay lại.

---

## 5. Vấn đề P0 — State machine hết giờ có thể làm bài thi bị kẹt

Khi đồng hồ về 0, frontend gọi submit component trong [`AttemptPage.tsx`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-frontend/src/features/practice/AttemptPage.tsx#L196-L205).

Backend lại thực hiện:

1. Gọi `closeOverdue()`.
2. `closeOverdue()` đánh dấu component đã submitted nếu hết hạn.
3. Sau đó gọi tiếp `submitComponent()`.
4. `submitComponent()` phát hiện component đã submitted và ném lỗi.

Các đoạn liên quan:

- [`AttemptService.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/attempt/service/AttemptService.java#L667-L681)
- [`ComponentProgressService.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/attempt/service/ComponentProgressService.java#L121-L178)

### Trường hợp nguy hiểm nhất

Nếu đây là kỹ năng cuối:

- Tất cả component có thể đã bị đánh dấu submitted.
- Attempt tổng vẫn còn `IN_PROGRESS`.
- Frontend không còn component đang mở.
- Không còn transition chờ.
- Nút submit cũng không được hiển thị.

Người dùng rơi vào màn hình không thể tiếp tục và không thể kết thúc bài.

### Vấn đề transaction

Luồng lấy attempt đang sử dụng `@Transactional(readOnly = true)` nhưng có thể gọi logic khởi tạo/đóng component. Việc ghi dữ liệu trong read-only transaction dễ dẫn đến hành vi không nhất quán tùy database/driver.

### Hướng sửa đề xuất

- Làm `submitComponent` idempotent: component đã đóng thì trả trạng thái hiện tại thay vì exception.
- Một command duy nhất xử lý `close expired → open next hoặc finalize attempt` trong transaction.
- Sau mỗi lần đóng component phải kiểm tra tất cả component và finalize attempt nếu đã hoàn thành.
- Không thực hiện maintenance write trong query `getAttempt` read-only.
- Bổ sung test ở bốn tình huống:
  - Submit trước hạn.
  - Submit đúng thời điểm hết hạn.
  - Submit sau hạn.
  - Reload trang sau khi kỹ năng cuối đã hết hạn.

---

## 6. Vấn đề P0 — Scoring rule chưa nối với kết quả thực tế

Hệ thống có migration và trang quản trị cho `part_scoring_rules`, nhưng runtime scoring chưa thể hiện việc sử dụng thống nhất rule này.

- [`PartScoringService.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/scoring/service/PartScoringService.java) chủ yếu phục vụ list/update/validate cấu hình.
- [`ScoringService.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/scoring/service/ScoringService.java#L48-L72) chấm theo `item.maxScore`.
- [`AttemptScoreAggregator.java`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/scoring/service/AttemptScoreAggregator.java#L74-L147) tổng hợp raw score và cho biết CEFR threshold mới là tạm thời.
- [`AttemptResultPage.tsx`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-frontend/src/features/practice/AttemptResultPage.tsx#L45-L79) tự cộng raw score để tính phần trăm.

### Tác động

- Admin sửa cấu hình nhưng điểm người dùng có thể không thay đổi.
- Kỹ năng có số lượng câu khác nhau có thể bị weighting sai.
- Điểm raw percent dễ bị hiểu là điểm Aptis chính thức.
- UI quản trị tạo cảm giác cấu hình đã có hiệu lực trong khi runtime sử dụng nguồn khác.

### Hướng sửa đề xuất

- Chỉ duy trì một scoring pipeline làm nguồn sự thật duy nhất.
- Áp dụng persisted rule ở runtime.
- Backend trả sẵn điểm theo từng kỹ năng và tổng; frontend không tự cộng lại.
- Gắn nhãn rõ `Điểm luyện tập/Điểm ước tính`, tránh dùng ngôn ngữ khẳng định là điểm chính thức nếu chưa có calibration.
- Lưu version của scoring rule vào attempt để lịch sử không thay đổi khi admin sửa rule sau này.
- Xây bộ regression fixture gồm input answer và expected score cố định.

---

## 7. Vấn đề P1 — XSS và cách lưu refresh token

Frontend render raw HTML tại nhiều vị trí bằng `dangerouslySetInnerHTML`, ví dụ [`AttemptPage.tsx`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-frontend/src/features/practice/AttemptPage.tsx#L880-L895).

Trong khi đó:

- Nội dung do admin/import đưa vào chưa có lớp sanitize allowlist rõ ràng.
- Một số payload được đánh dấu `PLAIN_TEXT` nhưng renderer vẫn có thể hiểu là HTML.
- Refresh token đang được lưu ở `localStorage`.
- Nginx chưa có Content Security Policy đủ mạnh.

Nếu một payload HTML độc hại lọt qua nội dung/import, script có thể chạy trong origin của website và đọc token phía trình duyệt.

### Hướng sửa đề xuất

- `PLAIN_TEXT` phải render bằng text node, không dùng `dangerouslySetInnerHTML`.
- Nội dung HTML hợp lệ phải được sanitize bằng allowlist, cả khi nhập và trước khi render.
- Chuyển refresh token sang cookie `HttpOnly`, `Secure`, `SameSite`.
- Bổ sung CSP theo whitelist domain thật sự cần dùng.
- Viết test với `<script>`, `onerror`, `javascript:` và SVG payload.

---

## 8. Khả năng bảo trì và chất lượng PR

[Pull Request #1](https://github.com/Babychandoi/Aptis-Practice/pull/1) có khoảng 257 file thay đổi và gần 75.000 dòng bổ sung theo thống kê PR. PR đang trộn nhiều nhóm công việc:

- Backend.
- Frontend.
- Migration.
- Question/content data.
- Media.
- Script import/chuyển đổi.
- Tài liệu và file phụ trợ.

Quy mô này làm phát sinh ba vấn đề:

1. Reviewer khó hiểu chính xác phạm vi nghiệp vụ.
2. Khó tìm regression do thay đổi nào gây ra.
3. Khó rollback độc lập một tính năng.

### File quá lớn

| File | Quy mô xấp xỉ | Nhận xét |
|---|---:|---|
| `AttemptPage.tsx` | 1.650 dòng | Trộn orchestration, timer, render nhiều dạng câu hỏi và submit |
| `QuestionSetEditorPage.tsx` | 1.050 dòng | Form/editor quá nhiều trách nhiệm |
| `AttemptService.java` | 920 dòng | Trộn create, snapshot, save, progress, submit và scoring orchestration |
| `speakingTips.ts` | 1.338 dòng | Nội dung tĩnh lớn nằm trực tiếp trong bundle JavaScript |

### Hướng tách

- Backend: `AttemptCreationService`, `AttemptAnswerService`, `AttemptProgressService`, `AttemptSubmissionService`, `AttemptQueryService`.
- Frontend: tách renderer theo question type, timer controller, autosave queue, component navigation và result state.
- Content tĩnh lớn: tải theo route hoặc chuyển sang JSON/API/CMS.
- Tách PR theo các lát nghiệp vụ có thể review và deploy độc lập.

---

## 9. Kiểm thử và release gate

### Kết quả kiểm tra frontend

| Kiểm tra | Kết quả |
|---|---|
| `npm ci` | Thành công |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm run lint` | Fail — ESLint 9 nhưng không có `eslint.config.js/mjs/cjs` |
| Frontend unit/component test | Không thấy test/spec trong source |
| `npm audit --omit=dev` | 2 cảnh báo mức moderate liên quan React Router |

Production bundle chính khoảng **885 KB JavaScript**, gzip khoảng **264 KB**. Vite cảnh báo chunk vượt 500 KB.

### Backend

Backend có test cho một số phần như schema consistency, sanitizer, entitlement, publish validator và scoring. Đây là điểm tốt.

Tuy nhiên chưa thấy coverage tương xứng cho các phần rủi ro mới:

- `AttemptService`.
- `AttemptSnapshotFactory`.
- `ComponentProgressService`.
- `LlmEvaluationEngine`.
- `LlmTranscriptionClient`.
- Concurrent autosave.
- Timer boundary và finalization.

Maven test chưa chạy được trong môi trường audit do Maven không resolve được dependency repository; không tính đây là lỗi source. Dù vậy, repository hiện không có GitHub Actions chạy CI và Dockerfile build backend bằng `-DskipTests`.

### Yêu cầu tối thiểu cho CI

Mỗi Pull Request cần bắt buộc chạy:

1. Backend compile và unit/integration test.
2. Flyway migration validation trên database sạch.
3. Frontend typecheck.
4. ESLint.
5. Frontend test.
6. Production build.
7. Dependency vulnerability scan.
8. Smoke test các API chính.

---

# PHẦN II — ĐÁNH GIÁ DƯỚI GÓC DEVOPS

## 10. Điểm tốt cho vận hành

- Backend dùng multi-stage image và chạy bằng non-root user.
- Có health/readiness check.
- Nginx bật gzip và cache cho hashed static asset.
- MinIO dùng presigned upload/download, giúp backend không trở thành đường truyền file.
- Có Hikari connection pool, JDBC batch và database index.
- Có outbox/idempotency và tùy chọn distributed scheduler lock.
- Các service chính đã được container hóa, thuận tiện cho dựng server mới.

---

## 11. Vấn đề P1 — AI worker giữ transaction quá lâu

[`EvaluationWorker`](https://github.com/Babychandoi/Aptis-Practice/blob/feat/reading-parts-merge-item-scoring/aptis-backend/src/main/java/com/aptis/backend/evaluation/service/EvaluationWorker.java) chạy trong transaction nhưng bên trong có thể:

- Tải audio dung lượng lớn.
- Gọi STT với timeout dài.
- Gọi LLM qua mạng.
- Chờ retry hoặc response từ dịch vụ bên ngoài.

### Tác động khi đông người

- Database connection bị giữ hàng chục giây hoặc lâu hơn.
- Hikari pool 20 connection có thể nhanh chóng cạn.
- Transaction/lock kéo dài làm tăng contention.
- Một nhà cung cấp AI chậm có thể kéo theo API người dùng chậm.

### Rủi ro chạy nhiều replica

Job repository chưa thể hiện cơ chế atomic claim rõ ràng như `FOR UPDATE SKIP LOCKED`. Nếu nhiều backend replica cùng polling:

- Hai worker có thể cùng nhìn thấy một job `QUEUED`.
- Trạng thái `PROCESSING` chưa commit vì transaction vẫn đang gọi AI.
- Cả hai có thể gửi request LLM tốn chi phí cho cùng một bài.

Nếu bật global distributed scheduler lock để tránh trùng, hệ thống lại chỉ còn một worker xử lý tuần tự và không scale ngang.

### Thiết kế đề xuất

```text
Transaction ngắn: atomic claim job
        ↓ commit
Worker gọi MinIO/STT/LLM ngoài transaction
        ↓
Transaction ngắn: lưu kết quả hoặc trạng thái retry
```

Bổ sung:

- Queue chuyên dụng hoặc `SKIP LOCKED` claim.
- Worker pool có giới hạn.
- Retry theo exponential backoff + jitter.
- Circuit breaker.
- Dead-letter queue.
- Idempotency key cho từng evaluation.
- Quota và cảnh báo chi phí AI.
- Tách scheduler AI khỏi scheduler import/export/outbox.

---

## 12. Polling gây tải nền lớn

Trang kết quả gọi hai endpoint mỗi 5 giây khi attempt đang `SCORING`. Tải ước tính:

| Người đang chờ | Số request nền ước tính |
|---:|---:|
| 100 | 40 request/giây |
| 500 | 200 request/giây |
| 1.000 | 400 request/giây |

Đây mới chỉ là polling trạng thái, chưa tính login, tải đề, autosave, media và admin.

### Hướng cải thiện

- Dùng một status endpoint thay vì hai endpoint.
- Dùng exponential backoff sau một khoảng thời gian chờ.
- Tốt hơn: SSE hoặc WebSocket để backend push trạng thái.
- Frontend cần kết nối SSE thật sự thay vì để controller tồn tại nhưng không sử dụng.
- Không đưa access token vào query string của SSE; query token có thể xuất hiện trong proxy log và browser history.

---

## 13. Snapshot attempt làm dữ liệu phình theo số người dùng

Khi tạo attempt, hệ thống có thể lấy nhiều published question set và copy toàn bộ nội dung vào một Mongo document.

### Tác động

- Cùng một nội dung được nhân bản cho mỗi học viên/lần thi.
- Tăng dung lượng MongoDB và chi phí backup.
- Tạo attempt chậm khi ngân hàng câu hỏi lớn.
- Response payload lớn.
- Có nguy cơ tiến gần giới hạn document 16 MB của MongoDB.
- Một user tạo nhiều attempt có thể gây write amplification lớn.

### Hướng thiết kế phù hợp hơn

- Question set có revision bất biến.
- Attempt lưu danh sách revision ID đã chọn.
- Attempt chỉ lưu answer delta, progress và scoring snapshot cần thiết.
- Materialize nội dung theo từng component/batch khi người dùng mở.
- Nếu bắt buộc snapshot đầy đủ, chia document theo component thay vì một document lớn.

---

## 14. Truy vấn random và database

Question repository sử dụng dạng `RAND(seed)` trong native query. Cách này đơn giản và cho kết quả dễ hiểu ở quy mô nhỏ, nhưng database thường phải scan/sort một lượng dữ liệu lớn khi question bank tăng.

Nên cân nhắc:

- Precomputed random key.
- Chọn candidate ID theo range rồi lọc.
- Sampling table theo component/level.
- Cache danh sách ID đủ điều kiện, sau đó shuffle ở application.

Hikari pool 20 là cấu hình hợp lý cho quy mô nhỏ, nhưng không cứu được hệ thống nếu AI worker giữ connection quá lâu.

---

## 15. Khả năng scale hạ tầng

Docker Compose hiện phù hợp cho dev hoặc production nhỏ. Khi mở rộng cần xử lý:

- MySQL/Mongo/Redis/MinIO đang là single instance.
- Chưa có failover/replication rõ ràng.
- Chưa có resource request/limit và autoscaling policy.
- Chưa có load balancer/CDN/TLS architecture trong source triển khai.
- Image MinIO dùng tag `latest`, không bảo đảm khả năng tái tạo chính xác.
- `container_name` cố định gây bất tiện khi scale replica.
- Chưa có rate limit tổng thể cho login/register/forgot password/API tốn tài nguyên.
- Chưa có quota theo user cho upload audio và AI scoring.

### Observability còn thiếu

Actuator health/metrics là bước đầu tốt, nhưng production cần thêm:

- Prometheus metrics.
- Dashboard Grafana.
- Centralized structured log.
- Trace ID xuyên frontend/API/worker.
- Alert cho error rate, p95/p99 latency, pool saturation và queue age.
- SLO cho bắt đầu bài, autosave, submit và thời gian chấm AI.
- Theo dõi chi phí LLM/STT theo user/attempt.

---

## 16. Frontend performance

Các route đang được import eager trong `App.tsx`, bao gồm cả admin, editor và study content lớn. Kết quả là bundle chính khoảng 885 KB.

### Hướng cải thiện

- `React.lazy`/`Suspense` theo route.
- Admin thành chunk riêng.
- Practice renderer tách theo question type.
- Study tips tải khi người dùng mở trang tương ứng.
- Dùng bundle analyzer để xác định dependency lớn.
- Chỉ preload route có xác suất truy cập kế tiếp cao.

Mục tiêu đề xuất:

- Main initial JS gzip dưới 150–180 KB nếu khả thi.
- Route admin không nằm trong initial bundle của học viên.
- Theo dõi LCP, INP và error rate trên thiết bị di động thực tế.

---

# PHẦN III — ĐÁNH GIÁ DƯỚI GÓC KHÁCH HÀNG KHÓ TÍNH

## 17. Điểm trải nghiệm tốt

- Có nhiều hình thức luyện: theo kỹ năng, theo part và mock test.
- Có tài khoản, verify email và reset password.
- Có phân biệt nội dung free/premium.
- Có subscription và thanh toán VietQR.
- Trang checkout có countdown, copy thông tin và kiểm tra trạng thái.
- Speaking có mic check trước khi làm bài.
- Có autosave về mặt giao diện.
- Có timer theo kỹ năng.
- Có transition và khóa kỹ năng đã hoàn thành.
- Có lịch sử luyện tập và trang kết quả.
- Feedback AI có breakdown chi tiết.
- Có loading/error/not-found state.
- Giao diện sử dụng responsive utility khá nhất quán.

Đây là bộ chức năng đủ tốt để tạo khác biệt so với một website chỉ hiển thị câu hỏi và đáp án tĩnh.

---

## 18. Điểm chưa đạt từ góc nhìn người trả tiền

### 18.1. Độ tin cậy của bài làm

Khách hàng không chấp nhận trường hợp giao diện báo autosave nhưng câu trả lời biến mất. Hệ thống cần hiển thị chính xác:

- `Đang lưu...`
- `Đã lưu lúc 22:15:08`
- `Còn 2 thay đổi chưa đồng bộ`
- `Mất kết nối — bài làm đang được giữ trên thiết bị`

Server acknowledgment phải là nguồn xác nhận, không chỉ dựa vào việc frontend đã gọi hàm save.

### 18.2. Hết giờ không được làm người dùng mắc kẹt

Khi hết giờ, trải nghiệm mong đợi là:

1. Chốt các đáp án đã lưu.
2. Hiển thị thông báo rõ ràng.
3. Chuyển sang kỹ năng kế tiếp hoặc màn hình hoàn tất.
4. Reload trang vẫn quay lại đúng trạng thái.

Không được hiển thị lỗi kỹ thuật hoặc để người dùng ở trang không có nút hành động.

### 18.3. Điểm số cần minh bạch

Website phải nói rõ:

- Điểm raw hay điểm đã scale.
- Điểm từng kỹ năng được tính thế nào.
- CEFR là ước tính hay kết quả chính thức.
- AI hay rule nào đã chấm.
- Trường hợp AI lỗi thì dùng fallback nào.

Nếu fallback chỉ dựa nhiều vào độ dài, số từ hoặc linking words, cần gắn nhãn phù hợp; không nên trình bày như một đánh giá ngôn ngữ đầy đủ.

### 18.4. Trải nghiệm chờ AI

Không nên chỉ để trạng thái `Đang chấm` và polling vô thời hạn. Nên có:

- Các bước `Đã nhận bài → Đang xử lý audio → Đang chấm → Đang tổng hợp`.
- Thời gian dự kiến hoặc vị trí queue.
- Nút tải lại trạng thái/thử lại khi job lỗi.
- Notification khi chấm xong.
- Cho phép thoát trang và xem kết quả sau.

### 18.5. Quyền riêng tư AI

Trước khi thu âm hoặc gửi bài viết sang dịch vụ AI bên ngoài, người dùng cần biết:

- Dữ liệu nào được gửi.
- Gửi tới loại nhà cung cấp nào.
- Mục đích sử dụng.
- Thời gian lưu.
- Cách yêu cầu xóa.

### 18.6. Accessibility

Chưa thấy bộ test chứng minh các tiêu chí:

- Điều hướng hoàn toàn bằng bàn phím.
- Focus đúng khi mở modal/chuyển câu.
- Screen reader đọc được timer và trạng thái save.
- Accessible name cho icon button.
- Transcript/caption phù hợp cho audio.
- Contrast ở các trạng thái disabled/error.

---

## 19. Những nội dung chưa thể xác nhận bằng trải nghiệm end-to-end

Đánh giá UX trong báo cáo dựa trên source code và production build. Chưa thực hiện được hành trình hoàn chỉnh trên một môi trường có đầy đủ:

- Backend đang chạy.
- MySQL/MongoDB/Redis/MinIO có dữ liệu thực.
- Mail service.
- Payment confirmation.
- STT/LLM provider.

Trước release cần chạy ít nhất các kịch bản E2E:

1. Đăng ký → verify email → đăng nhập.
2. User free mở bài free và bị chặn đúng ở bài premium.
3. Thanh toán → kích hoạt premium.
4. Làm bài trên mạng chập chờn → reload → khôi phục đủ đáp án.
5. Hết giờ từng kỹ năng, đặc biệt kỹ năng cuối.
6. Submit hai lần/reload sau submit.
7. AI thành công, timeout, retry và fallback.
8. Xem lịch sử và kết quả trên mobile.

---

# PHẦN IV — KẾ HOẠCH CẢI THIỆN

## 20. P0 — Bắt buộc trước khi merge/release

| STT | Hạng mục | Điều kiện hoàn thành |
|---:|---|---|
| 1 | Atomic autosave | Không mất dữ liệu khi nhiều request lưu đồng thời; có integration test |
| 2 | Timer state machine | Submit idempotent; hết giờ kỹ năng cuối tự finalize; reload không kẹt |
| 3 | Scoring pipeline | Rule admin thực sự áp dụng; backend là nguồn điểm duy nhất; có fixture test |
| 4 | XSS protection | Plain text không render HTML; HTML được sanitize; có security test |
| 5 | CI bắt buộc | Backend test + frontend typecheck/lint/test/build đều chạy trên PR |
| 6 | Sửa lint | Thêm ESLint flat config tương thích ESLint 9 |

---

## 21. P1 — Cần làm trước khi mở rộng người dùng

| STT | Hạng mục | Kết quả mong muốn |
|---:|---|---|
| 1 | Tách AI khỏi DB transaction | Không giữ connection trong lúc gọi STT/LLM |
| 2 | Atomic job claim | Không chấm trùng khi chạy nhiều replica |
| 3 | Giảm polling | Một status endpoint có backoff hoặc SSE |
| 4 | Giảm snapshot amplification | Lưu revision reference và answer delta |
| 5 | Route code splitting | Admin/content lớn không nằm trong initial bundle |
| 6 | Rate limit/quota | Hạn chế bot, upload và chi phí AI |
| 7 | Observability | Có queue age, p95 latency, pool usage, error rate và alert |
| 8 | Dependency update | Xử lý cảnh báo React Router và khóa version an toàn |

---

## 22. P2 — Cải thiện khả năng bảo trì

- Tách `AttemptPage.tsx`, `QuestionSetEditorPage.tsx` và `AttemptService.java`.
- Tách content tĩnh lớn khỏi JavaScript initial bundle.
- Chia PR theo feature/migration/content.
- Chuẩn hóa comment; loại comment không còn đúng với implementation.
- Thêm ADR cho scoring, attempt snapshot và AI queue.
- Thêm frontend component/E2E test.
- Pin image version thay cho `latest`.
- Thực hiện load test theo các luồng tạo attempt, autosave, submit và chấm AI.

---

## 23. Release gate đề xuất

Chỉ nên cho phép merge/release khi đáp ứng đầy đủ:

- [ ] Concurrent autosave test pass.
- [ ] Timer boundary/final component test pass.
- [ ] Scoring regression fixture pass.
- [ ] XSS test pass.
- [ ] Frontend lint/typecheck/test/build pass.
- [ ] Backend unit/integration test pass.
- [ ] Flyway migration chạy thành công trên database sạch và bản nâng cấp.
- [ ] Không còn cảnh báo dependency chưa được chấp nhận bằng biên bản kỹ thuật.
- [ ] Có ít nhất một reviewer backend và một reviewer frontend phê duyệt.
- [ ] Smoke test staging đầy đủ đăng nhập → làm bài → autosave → submit → scoring → history.

---

## 24. Kết luận cuối cùng

Điểm mạnh lớn nhất của Aptis Practice là **phạm vi sản phẩm tốt và nền tảng kiến trúc có định hướng**. Hệ thống không còn ở mức demo đơn giản; đã có nhiều thành phần cần thiết của một sản phẩm thương mại.

Điểm yếu lớn nhất hiện nay không nằm ở số lượng tính năng mà nằm ở **độ tin cậy của các trạng thái quan trọng**: lưu đáp án, hết giờ, kết thúc bài và tính điểm. Với sản phẩm luyện thi, bốn nội dung này phải đúng tuyệt đối trước khi tối ưu giao diện hoặc bổ sung thêm tính năng.

Sau khi xử lý nhóm P0, tách worker AI khỏi transaction và bổ sung CI/E2E test, hệ thống có thể chuyển từ mức **staging khả dụng** sang mức **production có kiểm soát**. Trước thời điểm đó, quyết định phù hợp là tiếp tục phát triển trên branch và giữ trạng thái `Request changes` đối với PR hiện tại.
