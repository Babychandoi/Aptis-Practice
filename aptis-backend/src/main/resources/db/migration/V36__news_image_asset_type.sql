-- Ảnh trong bài viết bảng tin.
--
-- Tách khỏi IMAGE vì bài viết đọc tự do: ảnh phải xem được khi chưa đăng nhập,
-- còn IMAGE là asset nội dung nên đi qua kiểm tra entitlement và khách bị chặn.
-- NEWS_IMAGE vào bucket aptis-public, phục vụ qua /api/v1/news/images/{id}.
--
-- Thêm vào CUỐI danh sách enum: MySQL lưu enum theo thứ tự, chèn vào giữa là
-- đổi nghĩa của mọi bản ghi phía sau.
ALTER TABLE assets
    MODIFY COLUMN asset_type ENUM(
        'IMAGE','AUDIO','VIDEO','DOCUMENT','USER_RECORDING','AVATAR',
        'IMPORT_FILE','EXPORT_FILE','NEWS_IMAGE'
    ) NOT NULL;
