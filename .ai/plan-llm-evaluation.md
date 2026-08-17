# Chấm Speaking/Writing bằng AI qua 9Router

## Yêu cầu

Thay bộ chấm heuristic (đếm từ, dò từ nối) bằng LLM thật, học theo cách law-app
tích hợp 9Router.

- Endpoint: `https://resx7wt.abc-tunnel.us/v1`
- Cần API key — endpoint trả 401 khi gọi `/v1/models` không kèm key

## Hiện trạng Aptis

Khung chấm đã có sẵn và đúng chỗ để cắm vào:

- `EvaluationEngine` — interface, đã tách sẵn để thay implementation
- `HeuristicEvaluationEngine` — bản tạm, chỉ bật khi
  `aptis.evaluation.heuristic.enabled=true`; constructor tự log cảnh báo
- `EvaluationWorker.resolveEngine()` — chọn engine ĐẦU TIÊN có `supports(type)`
  trả true, nên thứ tự bean quyết định engine nào chạy
- `EvaluationDispatcher` — batch, retry tối đa 3 lần
- `TranscriptionService` — Speaking đã được chuyển giọng nói thành chữ trước khi
  vào engine, nên LLM chỉ cần nhận transcript

Cấu hình heuristic đang bật ở cả `application-docker.yml` và `application-local.yml`.

## Cách law-app gọi 9Router

`ChatbotAIServiceImpl` — chuẩn OpenAI-compatible:

- URL: bỏ dấu `/` cuối, nếu kết thúc bằng `/v1` thì nối `/chat/completions`
- Header: `Authorization: Bearer <key>`, tùy chọn `HTTP-Referer`, `X-Title`
- Body: `{model, messages[], max_tokens, temperature, stream:false}`
- Đọc kết quả: `choices[0].message.content`
- `RestTemplate` với connect 5s / read 30s

## Thiết kế

### 1. Cấu hình `aptis.evaluation.llm`

```yaml
aptis:
  evaluation:
    llm:
      enabled: ${AI_EVAL_ENABLED:false}
      base-url: ${AI_EVAL_BASE_URL:https://resx7wt.abc-tunnel.us/v1}
      api-key: ${AI_EVAL_API_KEY:}
      model: ${AI_EVAL_MODEL:AI-PRO}
      temperature: ${AI_EVAL_TEMPERATURE:0.2}   # chấm điểm cần ổn định
      max-tokens: ${AI_EVAL_MAX_TOKENS:2048}
      timeout-seconds: ${AI_EVAL_TIMEOUT:60}
```

Nhiệt độ thấp hơn law-app (0.2 vs 0.7): chấm điểm phải nhất quán, không sáng tạo.

### 2. `LlmEvaluationEngine`

- `@ConditionalOnProperty(aptis.evaluation.llm.enabled=true)`
- `@Order(0)` — phải xếp trước heuristic vì `resolveEngine` lấy bean đầu tiên.
  Thêm `@Order(100)` cho heuristic để thứ tự tường minh, không phụ thuộc tên class.
- `engineName()` trả `llm-<model>` để đối soát trong `evaluation_documents.evaluator`

**Prompt**: system nêu vai trò giám khảo Aptis + rubric (mã, tên, trọng số, điểm
tối đa từng tiêu chí); user gửi đề bài, bài làm, ràng buộc số từ.

**Bắt buộc trả JSON** đúng shape `EvaluationResult`. Parse bằng Jackson, không
regex. LLM hay bọc JSON trong ```json — phải bóc trước khi parse.

**Kiểm tra đầu ra** — không tin LLM:
- Thiếu tiêu chí nào trong rubric → lỗi, để dispatcher retry
- Điểm ngoài `[0, maxScore]` → kẹp về biên, ghi log
- `totalScore` lệch tổng các tiêu chí → tính lại từ tiêu chí

### 3. Không đổi gì ngoài engine

`EvaluationWorker`, `EvaluationDispatcher`, job/retry, lưu document giữ nguyên.
Engine mới chỉ thay phần sinh điểm.

## Lệnh verify

1. `docker compose build backend` — biên dịch sạch
2. Bật `AI_EVAL_ENABLED=true` + key thật, xem log chọn đúng `llm-*`
3. Nộp một bài Writing thật, kiểm `evaluation_documents.evaluator`
4. Đối chiếu điểm từng tiêu chí khớp rubric, tổng khớp tổng tiêu chí
5. Tắt cờ → quay lại heuristic, luồng vẫn chạy

## Rủi ro

- **Chưa có API key**: endpoint trả 401. Không có key thì chỉ code + build được,
  không chấm thật được. Cần bạn cung cấp.
- **Không biết model nào khả dụng**: law-app dùng `AI-PRO`, nhưng chưa gọi được
  `/v1/models` để xác nhận. Để cấu hình được, mặc định `AI-PRO`.
- **Chi phí**: mỗi bài Speaking/Writing một lần gọi. Dispatcher retry 3 lần nên
  lỗi kéo dài sẽ gọi lặp — timeout và log rõ để phát hiện.
- **LLM trả sai định dạng**: đã có lớp kiểm tra + retry, nhưng nếu model quá yếu
  thì hỏng liên tục. Log nguyên văn phản hồi khi parse lỗi để chẩn đoán.
- Heuristic giữ nguyên làm bản dự phòng, không xóa.
