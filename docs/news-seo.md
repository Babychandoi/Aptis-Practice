# SEO riêng cho bài bảng tin

## Nguyên nhân cũ

Nginx trả `index.html` của SPA cho mọi `/bang-tin/:slug`, có title/description/canonical/og:image chung. Frontend còn đặt bảng tin bên trong ProtectedRoute, dù API đã cho phép đọc tự do. Sitemap tĩnh không có bài viết.

## Luồng mới

- Nginx chuyển `/bang-tin` và `/bang-tin/:slug` tới NewsSeoController. Tất cả người dùng và bot nhận cùng HTML công khai có nội dung thật, metadata và JSON-LD; không phân biệt User-Agent.
- Chỉ đọc bài PUBLISHED. DRAFT/ARCHIVED/slug không tồn tại trả HTTP 404 và noindex. Không truy vấn câu hỏi, đáp án, phiên đăng nhập hoặc dữ liệu học viên.
- Title lấy tiêu đề bài + thương hiệu; description lấy excerpt hoặc rút gọn nội dung. Canonical dùng host cấu hình cố định `SEO_PUBLIC_ORIGIN` (mặc định production), không tin Host header.
- Metadata gồm Open Graph, Twitter card, BlogPosting, ngày đăng/sửa. Metadata ở frontend cũng cập nhật khi điều hướng bằng React Router, dọn schema/ngày của bài cũ khi rời trang.
- `/news-images/:slug` ưu tiên cover NEWS_IMAGE đã READY, sau đó ảnh NEWS_IMAGE đầu tiên trong Markdown. Nếu chưa có ảnh, sinh PNG 1200×630 riêng theo tiêu đề/ngày đăng; cache bộ nhớ tối đa 32 ảnh và có phiên bản updatedAt trong URL. Không dùng signed URL hết hạn và không mở quyền đọc asset Premium/ghi âm.
- `/sitemap.xml` tự lấy các bài PUBLISHED và lastmod từ DB, cùng các trang công khai. Không cần rebuild khi đăng/sửa/ẩn bài.
- HTML server đọc được khi JavaScript tắt hoặc lỗi. `news-bootstrap.js` lấy tên bundle hiện tại từ `/index.html` để mở giao diện React thông thường; không ghim tên file hash cũ vào backend. JavaScript chỉ nạp module/stylesheet cùng origin.
- PublicNewsLayout cho khách đọc bài và bảng tin; người đã đăng nhập giữ AppLayout cũ. Quyền làm đề và bình luận vẫn do backend xác thực như trước. Hết phiên không đẩy khách đang đọc bài sang login.

Không thay nội dung bài cũ, không migration, không sửa entitlement hoặc thanh toán. Runtime cần fontconfig/DejaVu để tạo ảnh có dấu tiếng Việt.

## Kiểm tra

```powershell
cd aptis-backend
mvn -Dtest=NewsSeoServiceTest test
```

```powershell
cd aptis-frontend
npm run typecheck
npx vitest run src/features/learning/NewsSeo.test.tsx
```

Sau deploy, kiểm tra HTML thô với User-Agent trình duyệt và bot, ảnh (Content-Type + kích thước), sitemap chứa bài mới, link sai trả 404, và đọc bài khi chưa đăng nhập. Link chia sẻ cũ có thể cần nền tảng chia sẻ quét lại cache; việc đã trả metadata đúng không bảo đảm Google lập chỉ mục hoặc thay title ngay.

Tham chiếu: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Open Graph](https://ogp.me/), [CommonMark Java: escapeHtml/sanitizeUrls](https://github.com/commonmark/commonmark-java).

Kết quả kiểm tra trước triển khai: 8/8 test SEO backend, 66/66 test frontend, build frontend và ESLint các file thay đổi đều đạt. Bộ backend đầy đủ đạt 244/245; lỗi cũ `SchemaConsistencyTest.seedsPurchasablePlans` còn kỳ vọng 5 gói trong khi migration hiện seed 11 gói (không thay migration hay số gói trong công việc SEO). Full ESLint còn cảnh báo cũ `ToolsPage.tsx:93` về dependencies useMemo, không sửa trong phạm vi này. Sửa tối thiểu kiểu trả về `baseMime` của RecordingRenderer để build TypeScript hiện tại không bị chặn, không đổi cơ chế ghi âm.

Neo hai đường dẫn nguồn thô `/Aptis/` và `/AptisPrep.com/` ở thư mục gốc trong gitignore: mẫu cũ `Aptis/` vô tình ẩn cả file Java mới dưới package `vn/weconex/aptis`, khiến code mới không hiện để commit. Vẫn giữ nguyên việc bỏ qua dữ liệu nguồn thô.

## Production — 13/10/2026

Đã build và triển khai backend + frontend bằng `scripts/deploy-prod.sh --no-build backend frontend`, không bỏ qua idle check. Lúc triển khai cả bốn chỉ số người dùng đang hoạt động đều bằng 0; backend/frontend healthy, cấu hình MinIO public endpoint, CORS và cookie secure được giữ đúng.

Chạy `scripts/check-news-seo.mjs` trên `https://aptispractices.io.vn` đạt đầy đủ 7/7 bài PUBLISHED: HTML gốc và User-Agent bot giống nhau; metadata, ảnh riêng và sitemap đúng; link sai trả 404/noindex. Trình duyệt mới chưa đăng nhập đọc được bài với JavaScript bật hoặc tắt, điều hướng React cập nhật title riêng và không có lỗi JavaScript. Kiểm tra màn hình 390px không có tràn ngang; ảnh sinh có dấu tiếng Việt đúng.

Trong lần kiểm tra đầu, Cloudflare Tunnel có timeout QUIC/502 tạm thời (origin trực tiếp vẫn đạt). Tunnel tự phục hồi; lần kiểm tra lại đầy đủ qua tên miền đã đạt. Không đổi protocol/cấu hình tunnel trong phạm vi SEO này.

```powershell
$env:PLAYWRIGHT_MODULE_PATH='C:\Users\phong\AppData\Local\npm-cache\_npx\705bc6b22212b352\node_modules\playwright\index.mjs'
node scripts/check-news-seo.mjs
```

Script dùng browser context mới, không lấy cookie admin hay đăng nhập, chỉ đọc các trang/API (lượt xem bài có thể tăng theo cơ chế hiện tại). Có thể đặt `NEWS_SEO_BASE_URL=http://localhost` để kiểm tra origin; canonical vẫn giữ domain production.
