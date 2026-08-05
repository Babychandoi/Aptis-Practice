# Aptis Practice — Frontend

React 19 + TypeScript + Vite + TanStack Query + Tailwind.

## Chạy local

```bash
npm install
npm run dev     # http://localhost:5173
```

Vite proxy `/api` sang `http://localhost:8080`, nên không cần cấu hình CORS ở dev.
Backend phải chạy trước (xem `aptis-backend/README.md`).

Khi build cho môi trường khác, đặt `VITE_API_BASE_URL` trỏ tới API đầy đủ.

```bash
npm run typecheck   # tsc -b
npm run build       # typecheck + vite build
```

## Cấu trúc

```
src/
├── api/         axios client (tự refresh token), khai báo endpoint
├── app/         App, routing, layout, ProtectedRoute
├── components/  UI dùng chung
├── features/
│   ├── auth/      đăng nhập, đăng ký, profile, authStore
│   ├── catalog/   dashboard, học phần, Part
│   ├── practice/  làm bài, renderer từng dạng, kết quả, lịch sử
│   └── billing/   gói Premium, checkout
├── lib/         format tiếng Việt, lưu token
└── types/api.ts type khớp DTO backend
```

## Quy ước

**Quyền Premium do backend quyết định.** UI đọc `user.premiumActive` để hiển
thị, và đọc `canAccess`/`lockReason` trên từng bộ câu hỏi để vẽ ổ khóa. Khi
backend trả `PREMIUM_REQUIRED` thì hiện `PremiumGate`. Không có logic nào tự
suy ra quyền.

**Access token nằm trong memory**, refresh token trong localStorage
(`src/lib/tokenStorage.ts`). Interceptor refresh chủ động trước khi token hết
hạn và gộp các request đồng thời vào một lần refresh. Nếu backend chuyển
refresh token sang cookie HttpOnly thì bỏ phần localStorage đi.

**Thêm dạng bài mới**: viết renderer trong `features/practice/renderers/`, thêm
nhánh vào `ItemRenderer`, thêm nhánh vào `hasAnswer` trong `responseState.ts`.
Backend cần một `ResponseValidator` tương ứng.

**Autosave** debounce 1.5s, flush khi chuyển bộ câu hỏi, khi nộp bài, và khi
đóng tab.

**Timer** tính theo `expiresAt` tuyệt đối của backend, không trừ dần từng giây —
tab bị treo hay máy sleep thì đồng hồ vẫn đúng.

## Dạng bài đã hỗ trợ

| Dạng | Renderer |
|---|---|
| SINGLE_CHOICE, GAP_FILL_CHOICE | radio |
| MULTIPLE_CHOICE | checkbox |
| MATCHING, SPEAKER_MATCHING, HEADING_MATCHING | dropdown mỗi mục (chạy được trên mobile) |
| SENTENCE_ORDERING | nút lên/xuống |
| SHORT_TEXT | input |
| LONG_TEXT | textarea + đếm từ theo `minWords`/`maxWords` |
| AUDIO_RECORDING | MediaRecorder → upload MinIO qua presigned URL |

## Lưu ý về nội dung HTML

Nội dung câu hỏi từ MongoDB được render bằng `dangerouslySetInnerHTML`. Điều
này an toàn vì biên tập viên soạn nội dung và có bước duyệt trước khi publish
(quy trình DRAFT → IN_REVIEW → PUBLISHED). Nếu sau này cho phép người dùng
nhập HTML thì phải sanitize.

## Khu quản trị

Nằm ở `/admin`, mã nguồn trong `src/features/admin/`. Mục "Quản trị" trên thanh
điều hướng chỉ hiện khi tài khoản có quyền quản trị.

| Trang | Route |
|---|---|
| Ngân hàng câu hỏi (danh sách + chi tiết) | `/admin/question-sets` |
| Import câu hỏi (Excel và ZIP) | `/admin/imports` |
| Gói Premium | `/admin/plans` |
| Đơn hàng | `/admin/orders` |
| Hoàn tiền | `/admin/refunds` |
| Quyền người dùng và chiến dịch dùng thử | `/admin/entitlements` |
| Báo cáo | `/admin/reports` |

Quyền đọc từ `permissions` mà backend trả trong `/me`, **không suy ra từ tên
role ở client** — hai bên phải dùng chung một nguồn, nếu không giao diện sẽ hiện
thứ mà API sẽ từ chối. `usePermission()` bọc phần này.

Việc ẩn/hiện chỉ để đỡ khó dùng. Mọi endpoint admin đều có `@PreAuthorize` phía
backend, đã kiểm chứng học viên gọi thẳng API nhận đúng 403.

Trang publish phải hiện **đủ danh sách lỗi**: backend trả HTTP 200 kèm mảng
`errors` khi không đạt điều kiện (không phải lỗi HTTP), để người soạn sửa một
lượt thay vì sửa từng lỗi rồi thử lại.

## Chưa làm

- Trang "Câu đã sai" riêng (hiện chỉ có checkbox trong luyện theo Part)
- Màn soạn thảo nội dung câu hỏi trực quan — tạo/sửa nội dung vẫn qua API hoặc
  import Excel; giao diện mới làm phần duyệt, xem trước và vòng đời
- Màn quản lý người dùng / phân quyền
- Upload avatar
